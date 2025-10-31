import Badge from "./ui/Badge";

export default function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "CFO"
      ? "error"
      : role === "CXO_TEAM"
      ? "error"
      : role === "AUDITOR"
      ? "primary"
      : role === "AUDIT_HEAD"
      ? "primary"
      : role === "AUDITEE"
      ? "success"
      : "neutral";

  return (
    <Badge variant={variant as any}>
      {role}
    </Badge>
  );
}