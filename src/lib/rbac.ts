import { Role } from "@prisma/client";

export function isAdmin(role?: Role | string | null) {
  return role === "ADMIN" || role === Role.ADMIN;
}

export function isAuditor(role?: Role | string | null) {
  return role === "AUDITOR" || role === Role.AUDITOR;
}

export function isAuditee(role?: Role | string | null) {
  return role === "AUDITEE" || role === Role.AUDITEE;
}

export function isAdminOrAuditor(role?: Role | string | null) {
  return isAdmin(role) || isAuditor(role);
}

export function assertAdmin(role?: Role | string | null) {
  if (!isAdmin(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

export function assertAdminOrAuditor(role?: Role | string | null) {
  if (!isAdminOrAuditor(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}