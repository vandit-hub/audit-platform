"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/v2/sidebar";
import { AppHeader } from "@/components/v2/AppHeader";
import { AppSidebar } from "@/components/v2/AppSidebar";
import RoleBadge from "@/components/RoleBadge";

const TITLE_MAP: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  plants: "Plants",
  audits: "Audits",
  observations: "Observations",
  reports: "Reports",
  ai: "AI Assistant",
  admin: "Administration",
};

function resolveTitle(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  if (pathname === "/") return "Dashboard";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  const [root] = segments;
  if (root === "audits" && segments.length > 1) {
    return "Audit Details";
  }
  if (root === "observations" && segments.length > 1) {
    return "Observation Details";
  }

  return TITLE_MAP[root] ?? "Dashboard";
}

interface AppShellProps {
  session: Session;
  children: ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  // Ensure Session context remains hydrated even if prop changes
  const { data: liveSession } = useSession();
  const activeSession = liveSession ?? session;
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset className="min-w-0">
        <AppHeader
          title={title}
          rightSlot={
            <div className="flex items-center gap-2">
              {activeSession?.user?.role ? (
                <RoleBadge role={activeSession.user.role} />
              ) : null}
              {activeSession?.user?.email ? (
                <span className="hidden text-sm text-neutral-500 md:block">
                  {activeSession.user.email}
                </span>
              ) : null}
            </div>
          }
        />
        <div
          className="flex flex-1 flex-col min-w-0"
          style={{ background: "var(--c-bacPri)" }}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

