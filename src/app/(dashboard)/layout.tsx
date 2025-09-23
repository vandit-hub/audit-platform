import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* @ts-expect-error Server Component passing session via fetch on client navbar */}
      <NavBar />
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}