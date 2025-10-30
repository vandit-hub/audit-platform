import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '@/server/db';
import {
  isCFO,
  isCXOTeam,
  isAuditHead,
  isAuditor,
  isAuditee,
  isGuest
} from '@/lib/rbac';
import { getUserScope, isObservationInScope } from '@/lib/scope';

export interface JWTPayload {
  userId: string;
  role: Role | string;
  email?: string;
  iat?: number;
  exp?: number;
}

export async function verifyWebSocketToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET not configured');
      return null;
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET) as JWTPayload;

    if (!decoded.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      email: user.email
    };
  } catch (error) {
    console.error('WebSocket token verification error:', error);
    return null;
  }
}

export async function canAccessObservation(
  userId: string,
  role: Role | string,
  observationId: string
): Promise<boolean> {
  try {
    if (!userId || !role) {
      return false;
    }

    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      select: {
        id: true,
        auditId: true,
        createdById: true,
        isPublished: true,
        audit: {
          select: {
            id: true,
            auditHeadId: true,
            createdAt: true,
            visibilityRules: true,
            assignments: {
              select: {
                auditorId: true
              }
            }
          }
        },
        assignments: {
          select: {
            auditeeId: true
          }
        }
      }
    });

    if (!observation || !observation.audit) {
      return false;
    }

    // CFO override - always allowed
    if (isCFO(role)) {
      return true;
    }

    // CXO Team can view all observations
    if (isCXOTeam(role)) {
      return true;
    }

    const { audit } = observation;

    // Audit Heads: allowed for audits they lead, otherwise respect visibility rules
    if (isAuditHead(role)) {
      if (audit.auditHeadId === userId) {
        return true;
      }

      return passesVisibilityRules(
        audit.visibilityRules,
        audit.createdAt,
        observation.auditId
      );
    }

    // Auditors: allowed if assigned to audit or creator, otherwise visibility rules
    if (isAuditor(role)) {
      const isAssignedAuditor = audit.assignments.some(
        assignment => assignment.auditorId === userId
      );

      if (isAssignedAuditor || observation.createdById === userId) {
        return true;
      }

      return passesVisibilityRules(
        audit.visibilityRules,
        audit.createdAt,
        observation.auditId
      );
    }

    // Auditees: must be directly assigned to observation
    if (isAuditee(role)) {
      return observation.assignments.some(
        assignment => assignment.auditeeId === userId
      );
    }

    // Guests: require scope-based access and published observations
    if (isGuest(role)) {
      const scope = await getUserScope(userId);
      if (!scope) {
        return false;
      }

      const inScope = isObservationInScope(
        { id: observation.id, auditId: observation.auditId },
        scope
      );

      return inScope && observation.isPublished;
    }

    return false;
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}

function passesVisibilityRules(
  rules: any,
  auditCreatedAt: Date | null,
  auditId: string
): boolean {
  if (!rules) {
    return false;
  }

  if (rules === 'show_all') {
    return true;
  }

  if (rules === 'hide_all') {
    return false;
  }

  if (rules === 'last_12m') {
    if (!auditCreatedAt) {
      return false;
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    return auditCreatedAt >= twelveMonthsAgo;
  }

  if (typeof rules === 'object') {
    const explicit = (rules as any)?.explicit;
    if (explicit && Array.isArray(explicit.auditIds)) {
      return explicit.auditIds.includes(auditId);
    }
  }

  return false;
}