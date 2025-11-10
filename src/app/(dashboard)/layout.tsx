import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { WebSocketProvider } from "@/lib/websocket/provider";
import { AppShell } from "@/components/v2/AppShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <WebSocketProvider>
      <AppShell session={session}>{children}</AppShell>
    </WebSocketProvider>
  );
}