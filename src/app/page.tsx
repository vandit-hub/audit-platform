import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto p-4">
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
      </main>
    </div>
  );
}