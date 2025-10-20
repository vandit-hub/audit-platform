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
      <div className="min-h-screen bg-neutral-50">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </WebSocketProvider>
  );
}