export default function RoleBadge({ role }: { role: string }) {
  const color =
    role === "ADMIN"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : role === "AUDITOR"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : role === "AUDITEE"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span className={`text-xs px-2 py-1 rounded border ${color}`}>{role}</span>
  );
}