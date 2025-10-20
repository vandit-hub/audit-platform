import Badge from "./ui/Badge";

export default function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "ADMIN"
      ? "error"
      : role === "AUDITOR"
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