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

export function isGuest(role?: Role | string | null) {
  return role === "GUEST" || role === Role.GUEST;
}

export function isAdminOrAuditor(role?: Role | string | null) {
  return isAdmin(role) || isAuditor(role);
}

export function assertAdmin(role?: Role | string | null) {
  if (!isAdmin(role)) {
    const error: Error & { status?: number } = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

export function assertAdminOrAuditor(role?: Role | string | null) {
  if (!isAdminOrAuditor(role)) {
    const error: Error & { status?: number } = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}
