"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Eye,
  FileText,
  Settings,
  Upload,
  Users,
  MessageSquare,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/v2/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/v2/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";
import {
  isCFO,
  isCFOOrCXOTeam,
  isAuditHead,
  isAuditee,
  isGuest,
} from "@/lib/rbac";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  visible: boolean;
  exact?: boolean;
};

function getInitials(value?: string | null) {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const mainItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      visible: true,
      exact: true,
    },
    {
      id: "plants",
      label: "Plants",
      href: "/plants",
      icon: Building2,
      visible: !!role && isCFOOrCXOTeam(role),
    },
    {
      id: "audits",
      label: "Audits",
      href: "/audits",
      icon: ClipboardList,
      visible: !!role && !isAuditee(role),
    },
    {
      id: "observations",
      label: "Observations",
      href: "/observations",
      icon: Eye,
      visible: true,
    },
    {
      id: "reports",
      label: "Reports",
      href: "/reports",
      icon: FileText,
      visible: !!role && (isCFOOrCXOTeam(role) || isAuditHead(role)),
    },
  ];

  const toolsItems: NavItem[] = [
    {
      id: "ai",
      label: "AI Assistant",
      href: "/ai",
      icon: MessageSquare,
      visible: !!role && !isAuditee(role) && !isGuest(role),
    },
  ];

  const adminItems: NavItem[] = [
    {
      id: "users",
      label: "Users",
      href: "/admin/users",
      icon: Users,
      visible: !!role && isCFOOrCXOTeam(role),
    },
    {
      id: "import",
      label: "Import",
      href: "/admin/import",
      icon: Upload,
      visible: !!role && isCFO(role),
    },
    {
      id: "settings",
      label: "Settings",
      href: "/admin",
      icon: Settings,
      visible: false,
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href || pathname === "/";
    }
    return pathname.startsWith(item.href);
  };

  const visibleMain = mainItems.filter((item) => item.visible);
  const visibleTools = toolsItems.filter((item) => item.visible);
  const visibleAdmin = adminItems.filter((item) => item.visible);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className="border-b h-14 flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 px-4"
        style={{ borderColor: "var(--border-color-regular)" }}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0"
                style={{ background: "var(--c-palUiBlu600)" }}
              >
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span
                  className="text-sm leading-tight whitespace-nowrap"
                  style={{ color: "var(--c-texPri)", fontWeight: 600 }}
                >
                  Audit Manager
                </span>
                <span
                  className="text-xs leading-tight whitespace-nowrap"
                  style={{ color: "var(--c-texSec)" }}
                >
                  Compliance Platform
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2 group-data-[collapsible=icon]:py-0">
        {visibleMain.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              style={{
                color: "var(--c-texTer)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Main
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMain.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive(item)}
                        tooltip={item.label}
                        asChild
                        style={{
                          color: isActive(item)
                            ? "var(--c-texPri)"
                            : "var(--c-texSec)",
                          fontWeight: isActive(item) ? 500 : 400,
                        }}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleTools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              style={{
                color: "var(--c-texTer)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleTools.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive(item)}
                        tooltip={item.label}
                        asChild
                        style={{
                          color: isActive(item)
                            ? "var(--c-texPri)"
                            : "var(--c-texSec)",
                          fontWeight: isActive(item) ? 500 : 400,
                        }}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel
              style={{
                color: "var(--c-texTer)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => {
                  if (!item.visible) return null;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive(item)}
                        tooltip={item.label}
                        asChild
                        style={{
                          color: isActive(item)
                            ? "var(--c-texPri)"
                            : "var(--c-texSec)",
                          fontWeight: isActive(item) ? 500 : 400,
                        }}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter
        className="border-t py-2 group-data-[collapsible=icon]:py-0"
        style={{ borderColor: "var(--border-color-regular)" }}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="hover:bg-sidebar-accent/50"
                  data-active={false}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback
                      className="text-xs rounded-lg"
                      style={{
                        background: "var(--c-palUiBlu600)",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(session?.user?.name || session?.user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left leading-tight">
                    <span
                      className="truncate text-sm"
                      style={{ color: "var(--c-texPri)", fontWeight: 500 }}
                    >
                      {session?.user?.name ?? session?.user?.email}
                    </span>
                    <span
                      className="truncate text-xs capitalize"
                      style={{ color: "var(--c-texSec)" }}
                    >
                      {session?.user?.role?.replace("_", " ").toLowerCase()}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

