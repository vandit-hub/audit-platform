import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const assignAuditeeSchema = z.object({
  auditeeId: z.string().min(1, "Auditee ID is required")
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  // RBAC v2: Authorization check
  // Allowed roles: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR
  if (!isCFO(role) && !isCXOTeam(role) && !isAuditHead(role) && !isAuditor(role)) {
    return NextResponse.json({
      ok: false,
      error: "Forbidden. Only CFO, CXO Team, Audit Head, or Auditor can assign auditees."
    }, { status: 403 });
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const input = assignAuditeeSchema.parse(body);

  // Load observation
  const observation = await prisma.observation.findUnique({
    where: { id }
  });

  if (!observation) {
    return NextResponse.json({
      ok: false,
      error: "Observation not found"
    }, { status: 404 });
  }

  // Load auditee user
  const auditeeUser = await prisma.user.findUnique({
    where: { id: input.auditeeId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  if (!auditeeUser) {
    return NextResponse.json({
      ok: false,
      error: "Auditee user not found"
    }, { status: 404 });
  }

  // Verify user has AUDITEE role
  if (!isAuditee(auditeeUser.role)) {
    return NextResponse.json({
      ok: false,
      error: "User is not an auditee. Only users with AUDITEE role can be assigned to observations."
    }, { status: 400 });
  }

  // Check if assignment already exists
  const existingAssignment = await prisma.observationAssignment.findUnique({
    where: {
      observationId_auditeeId: {
        observationId: id,
        auditeeId: input.auditeeId
      }
    }
  });

  if (existingAssignment) {
    return NextResponse.json({
      ok: false,
      error: "This auditee is already assigned to this observation"
    }, { status: 400 });
  }

  // Create ObservationAssignment
  const assignment = await prisma.observationAssignment.create({
    data: {
      observationId: id,
      auditeeId: input.auditeeId,
      assignedById: session.user.id
    },
    include: {
      auditee: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  // Log audit event
  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "ASSIGN_AUDITEE",
    actorId: session.user.id,
    diff: {
      auditeeId: input.auditeeId,
      auditeeName: auditeeUser.name,
      auditeeEmail: auditeeUser.email,
      assignedBy: session.user.id
    }
  });

  return NextResponse.json({
    ok: true,
    assignment: assignment,
    message: "Successfully assigned auditee to observation"
  });
}
