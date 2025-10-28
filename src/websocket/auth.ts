import jwt from 'jsonwebtoken';
import { prisma } from '@/server/db';
import { canAccessObservation as rbacCanAccessObservation } from '@/lib/rbac-queries';

export interface JWTPayload {
  userId: string;
  role: string;
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

/**
 * Check if user can access an observation via WebSocket.
 *
 * This function delegates to the centralized RBAC logic in rbac-queries.ts
 * to ensure WebSocket authorization stays in sync with API route authorization.
 *
 * Authorization rules:
 * - CFO: Full access to all observations (short-circuit)
 * - CXO_TEAM: Full access to all observations
 * - AUDIT_HEAD: Access if (audit.auditHeadId === userId) OR has AuditAssignment
 * - AUDITOR: Access if has AuditAssignment for the audit
 * - AUDITEE: Access if has ObservationAssignment for the observation
 * - GUEST: Access if observation is in scope OR (published AND approved)
 *
 * @param userId - User ID requesting access
 * @param role - User role from RBAC v2 (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
 * @param observationId - Observation ID to check access for
 * @returns Promise<boolean> - true if user can access, false otherwise
 */
export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    return await rbacCanAccessObservation(userId, role, observationId);
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}