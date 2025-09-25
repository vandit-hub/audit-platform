import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import { WebSocketProvider } from "@/lib/websocket/provider";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </div>
    </WebSocketProvider>
  );
}