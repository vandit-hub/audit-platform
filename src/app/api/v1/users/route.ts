import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { isCFO, isCXOTeam, isAuditHead, isAuditor } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedRole = searchParams.get("role") || undefined;
  const userRole = session.user.role;

  // RBAC: Determine who can fetch which users
  // CFO and CXO_TEAM can fetch all users (any role)
  // AUDIT_HEAD and AUDITOR can only fetch AUDITEE users (for assignment purposes)
  if (!isCFO(userRole) && !isCXOTeam(userRole)) {
    if (isAuditHead(userRole) || isAuditor(userRole)) {
      // Audit Head and Auditor can only fetch AUDITEE users
      if (requestedRole !== "AUDITEE") {
        return NextResponse.json({ 
          ok: false, 
          error: "Forbidden. Audit Head and Auditor can only fetch AUDITEE users for assignment purposes." 
        }, { status: 403 });
      }
    } else {
      // Other roles (AUDITEE, GUEST) cannot fetch user lists
      return NextResponse.json({ 
        ok: false, 
        error: "Forbidden" 
      }, { status: 403 });
    }
  }

  const users = await prisma.user.findMany({
    where: { role: requestedRole ? (requestedRole as any) : undefined, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: "asc" }
  });

  return NextResponse.json({ ok: true, users });
}