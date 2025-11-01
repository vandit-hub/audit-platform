"use client";

import Badge from "./ui/Badge";

export default function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "CFO"
      ? "primary"
      : role === "CXO_TEAM"
      ? "primary"
      : role === "AUDIT_HEAD"
      ? "warning"
      : role === "AUDITOR"
      ? "neutral"
      : role === "AUDITEE"
      ? "neutral"
      : "neutral";

  return (
    <Badge variant={variant as any}>
      {role}
    </Badge>
  );
}