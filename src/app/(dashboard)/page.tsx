export default function DashboardHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-gray-500 text-sm">Audits (coming soon)</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-gray-500 text-sm">Observations (coming soon)</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-gray-500 text-sm">Plants</div>
          <div className="text-2xl font-bold">Use the Plants page to add</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-gray-500 text-sm">Users</div>
          <div className="text-2xl font-bold">Invite via API</div>
        </div>
      </div>
    </div>
  );
}