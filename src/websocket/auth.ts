import jwt from 'jsonwebtoken';
import { prisma } from '@/server/db';

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

export async function canAccessObservation(
  userId: string,
  role: string,
  observationId: string
): Promise<boolean> {
  try {
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        audit: {
          include: {
            assignments: true
          }
        }
      }
    });

    if (!observation) {
      return false;
    }

    if (role === 'ADMIN') {
      return true;
    }

    if (role === 'AUDITOR') {
      const isAssigned = observation.audit.assignments.some(
        a => a.auditorId === userId
      );
      return isAssigned || observation.createdById === userId;
    }

    if (role === 'AUDITEE' || role === 'GUEST') {
      return observation.isPublished;
    }

    return false;
  } catch (error) {
    console.error('Error checking observation access:', error);
    return false;
  }
}