/**
 * RBAC v2 - Role-Based Access Control Library
 *
 * This library implements the RBAC v2 permission system with 5 primary roles:
 * - CFO: Organization-level superuser with full access to all operations
 * - CXO_TEAM: Manages plants, audits, assigns users, configures visibility
 * - AUDIT_HEAD: Leads assigned audits, approves/rejects observations
 * - AUDITOR: Creates and edits draft observations, submits for approval
 * - AUDITEE: Responds to assigned observations with limited field access
 * - GUEST: Read-only access with scope restrictions (optional)
 *
 * CFO SHORT-CIRCUIT PRINCIPLE:
 * CFO is the organization superuser and bypasses ALL access restrictions.
 * Every assertion function (except assertCFO itself) checks for CFO FIRST
 * and returns early if true, allowing CFO to perform any operation.
 *
 * PREDICATES vs ASSERTIONS:
 * - Predicates (is*): Return boolean, safe to call anywhere
 * - Assertions (assert*): Throw 403 error if unauthorized, use in API routes
 *
 * @module rbac
 */

import { Role } from "@prisma/client";

// ============================================================================
// ROLE PREDICATES
// ============================================================================

/**
 * Checks if the role is CFO (Chief Financial Officer).
 * CFO is the organization-level superuser with full access to all operations.
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is CFO, false otherwise
 */
export function isCFO(role?: Role | string | null): boolean {
  return role === "CFO" || role === Role.CFO;
}

/**
 * Checks if the role is CXO_TEAM (CXO Team member).
 * CXO Team manages plants, audits, assigns users, and configures visibility.
 * They cannot author or approve observations.
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is CXO_TEAM, false otherwise
 */
export function isCXOTeam(role?: Role | string | null): boolean {
  return role === "CXO_TEAM" || role === Role.CXO_TEAM;
}

/**
 * Checks if the role is AUDIT_HEAD (Audit Head).
 * Audit Heads lead assigned audits, approve/reject observations,
 * and can delete observations while audit is open. They can also
 * create and edit draft observations like auditors.
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is AUDIT_HEAD, false otherwise
 */
export function isAuditHead(role?: Role | string | null): boolean {
  return role === "AUDIT_HEAD" || role === Role.AUDIT_HEAD;
}

/**
 * Checks if the role is AUDITOR.
 * Auditors create and edit draft observations and submit them for approval.
 * They cannot approve or delete observations.
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is AUDITOR, false otherwise
 */
export function isAuditor(role?: Role | string | null): boolean {
  return role === "AUDITOR" || role === Role.AUDITOR;
}

/**
 * Checks if the role is AUDITEE.
 * Auditees have assignment-based access to observations and can edit
 * only designated auditee fields (feedback, target dates, action plans).
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is AUDITEE, false otherwise
 */
export function isAuditee(role?: Role | string | null): boolean {
  return role === "AUDITEE" || role === Role.AUDITEE;
}

/**
 * Checks if the role is GUEST.
 * Guests have read-only access with scope restrictions.
 * This role is optional and maintained for backward compatibility.
 *
 * @param role - The role to check (can be Role enum, string, null, or undefined)
 * @returns true if role is GUEST, false otherwise
 */
export function isGuest(role?: Role | string | null): boolean {
  return role === "GUEST" || role === Role.GUEST;
}

// ============================================================================
// ASSERTION FUNCTIONS (with CFO short-circuit)
// ============================================================================

/**
 * Asserts that the role is CFO.
 * Throws a 403 Forbidden error if the role is not CFO.
 *
 * NOTE: This is the only assertion that does NOT have CFO short-circuit,
 * since it IS checking for CFO specifically.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role is not CFO
 */
export function assertCFO(role?: Role | string | null): void {
  if (!isCFO(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * Asserts that the role is CFO or CXO_TEAM.
 * Used for operations that manage audits, plants, and organizational settings.
 *
 * CFO SHORT-CIRCUIT: CFO always passes this check.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role is not CFO or CXO_TEAM
 */
export function assertCFOOrCXOTeam(role?: Role | string | null): void {
  if (isCFO(role)) return; // CFO short-circuit

  if (!isCXOTeam(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * Asserts that the role is AUDIT_HEAD.
 * Used for operations like approving/rejecting observations.
 *
 * CFO SHORT-CIRCUIT: CFO always passes this check.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role is not CFO or AUDIT_HEAD
 */
export function assertAuditHead(role?: Role | string | null): void {
  if (isCFO(role)) return; // CFO short-circuit

  if (!isAuditHead(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * Asserts that the role is AUDITOR or AUDIT_HEAD.
 * Used for operations like creating observations or submitting for approval.
 * Audit Heads inherit auditor capabilities.
 *
 * CFO SHORT-CIRCUIT: CFO always passes this check.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role is not CFO, AUDITOR, or AUDIT_HEAD
 */
export function assertAuditorOrAuditHead(role?: Role | string | null): void {
  if (isCFO(role)) return; // CFO short-circuit

  if (!isAuditor(role) && !isAuditHead(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * Asserts that the role is CFO, CXO_TEAM, or AUDIT_HEAD.
 * Used for operations that require management or approval authority.
 *
 * CFO SHORT-CIRCUIT: CFO always passes this check.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role is not CFO, CXO_TEAM, or AUDIT_HEAD
 */
export function assertCFOOrCXOOrAuditHead(role?: Role | string | null): void {
  if (isCFO(role)) return; // CFO short-circuit

  if (!isCXOTeam(role) && !isAuditHead(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * Asserts that the role has auditor capabilities (AUDITOR or AUDIT_HEAD).
 * Used when checking if a user can perform auditor-level operations.
 *
 * CFO SHORT-CIRCUIT: CFO always passes this check.
 *
 * @param role - The role to check
 * @throws Error with status 403 if role does not have auditor capabilities
 */
export function assertAnyAuditor(role?: Role | string | null): void {
  if (isCFO(role)) return; // CFO short-circuit

  if (!isAuditor(role) && !isAuditHead(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

// ============================================================================
// COMBINATION HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if the role is CFO or CXO_TEAM.
 * Convenience function for checking management roles.
 *
 * @param role - The role to check
 * @returns true if role is CFO or CXO_TEAM, false otherwise
 */
export function isCFOOrCXOTeam(role?: Role | string | null): boolean {
  return isCFO(role) || isCXOTeam(role);
}

/**
 * Checks if the role is AUDITOR or AUDIT_HEAD.
 * Convenience function for checking roles that can author observations.
 *
 * @param role - The role to check
 * @returns true if role is AUDITOR or AUDIT_HEAD, false otherwise
 */
export function isAuditorOrAuditHead(role?: Role | string | null): boolean {
  return isAuditor(role) || isAuditHead(role);
}

/**
 * Checks if the role can manage audits (create, edit, lock, complete).
 * Management capabilities are limited to CFO and CXO_TEAM.
 *
 * @param role - The role to check
 * @returns true if role can manage audits (CFO or CXO_TEAM), false otherwise
 */
export function canManageAudits(role?: Role | string | null): boolean {
  return isCFO(role) || isCXOTeam(role);
}

/**
 * Checks if the role can author observations (create and edit drafts).
 * Authoring capabilities are available to CFO, AUDIT_HEAD, and AUDITOR.
 *
 * @param role - The role to check
 * @returns true if role can author observations, false otherwise
 */
export function canAuthorObservations(role?: Role | string | null): boolean {
  return isCFO(role) || isAuditHead(role) || isAuditor(role);
}

/**
 * Checks if the role can approve or reject observations.
 * Approval authority is limited to CFO and AUDIT_HEAD.
 *
 * @param role - The role to check
 * @returns true if role can approve observations (CFO or AUDIT_HEAD), false otherwise
 */
export function canApproveObservations(role?: Role | string | null): boolean {
  return isCFO(role) || isAuditHead(role);
}

// ============================================================================
// TEMPORARY MIGRATION SHIMS
// ⚠️ WARNING: These functions exist ONLY to prevent breaking 29 API route files
// ⚠️ These MUST be removed and all files updated in Task 5
// ⚠️ They map old ADMIN role to CFO for temporary compatibility
// ============================================================================

/**
 * @deprecated TEMPORARY MIGRATION SHIM - Maps ADMIN to CFO. Remove in Task 5.
 * @internal
 */
export function isAdmin(role?: Role | string | null): boolean {
  return isCFO(role);
}

/**
 * @deprecated TEMPORARY MIGRATION SHIM - Remove in Task 5.
 * @internal
 */
export function isAdminOrAuditor(role?: Role | string | null): boolean {
  return isCFO(role) || isAuditHead(role) || isAuditor(role);
}

/**
 * @deprecated TEMPORARY MIGRATION SHIM - Remove in Task 5.
 * @internal
 */
export function assertAdmin(role?: Role | string | null): void {
  if (!isCFO(role)) {
    const e: any = new Error("Forbidden");
    e.status = 403;
    throw e;
  }
}

/**
 * @deprecated TEMPORARY MIGRATION SHIM - Remove in Task 5.
 * @internal
 */
export function assertAdminOrAuditor(role?: Role | string | null): void {
  assertAuditorOrAuditHead(role);
}
