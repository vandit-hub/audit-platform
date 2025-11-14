"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Eye,
  CheckSquare,
  FileText,
  Settings,
  MessageSquare,
  ChevronDown,
  Upload
} from 'lucide-react';
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
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { isCFOOrCXOTeam, isAuditHead, isAuditee, isCFO, isGuest } from '@/lib/rbac';

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userRole = session?.user?.role;

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine active page based on pathname
  const getCurrentPage = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/plants')) return 'plants';
    if (pathname.startsWith('/audits')) return 'audits';
    if (pathname.startsWith('/observations')) return 'observations';
    if (pathname.startsWith('/checklists')) return 'checklists';
    if (pathname.startsWith('/reports')) return 'reports';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/ai')) return 'ai-assistant';
    return 'dashboard';
  };

  const currentPage = getCurrentPage();

  // Role-based menu items
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      visible: true // All roles can see dashboard
    },
    {
      id: 'plants',
      label: 'Plants',
      icon: Building2,
      href: '/plants',
      visible: userRole && isCFOOrCXOTeam(userRole)
    },
    {
      id: 'audits',
      label: 'Audits',
      icon: ClipboardList,
      href: '/audits',
      visible: userRole && !isAuditee(userRole)
    },
    {
      id: 'observations',
      label: 'Observations',
      icon: Eye,
      href: '/observations',
      visible: true // All roles can see observations
    },
    {
      id: 'checklists',
      label: 'Checklists',
      icon: CheckSquare,
      href: '/checklists',
      visible: userRole && !isAuditee(userRole)
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      href: '/reports',
      visible: userRole && (isCFOOrCXOTeam(userRole) || isAuditHead(userRole))
    },
  ];

  const toolsMenuItems = [
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: MessageSquare,
      href: '/ai',
      visible: userRole && !isAuditee(userRole) && !isGuest(userRole)
    },
  ];

  const adminMenuItems = [
    {
      id: 'users',
      label: 'Users',
      icon: Settings,
      href: '/admin/users',
      visible: userRole && isCFOOrCXOTeam(userRole)
    },
    {
      id: 'import',
      label: 'Import',
      icon: Upload,
      href: '/admin/import',
      visible: userRole && isCFO(userRole)
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.visible);
  const visibleToolsItems = toolsMenuItems.filter(item => item.visible);
  const visibleAdminItems = adminMenuItems.filter(item => item.visible);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b h-14 flex items-center" style={{ borderColor: 'var(--border-color-regular)' }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{
                  background: 'var(--c-palUiBlu600)',
                }}
              >
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span
                  className="text-sm leading-tight"
                  style={{
                    color: 'var(--c-texPri)',
                    fontWeight: 600
                  }}
                >
                  Audit Manager
                </span>
                <span
                  className="text-xs leading-tight"
                  style={{
                    color: 'var(--c-texSec)',
                  }}
                >
                  Compliance Platform
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel style={{ color: 'var(--c-texTer)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPage === item.id}
                      tooltip={item.label}
                      style={{
                        color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                        fontWeight: currentPage === item.id ? 500 : 400,
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

        {visibleToolsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel style={{ color: 'var(--c-texTer)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleToolsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={currentPage === item.id}
                        tooltip={item.label}
                        style={{
                          color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                          fontWeight: currentPage === item.id ? 500 : 400,
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

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel style={{ color: 'var(--c-texTer)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={currentPage === item.id}
                        tooltip={item.label}
                        style={{
                          color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                          fontWeight: currentPage === item.id ? 500 : 400,
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

      <SidebarFooter className="border-t py-2" style={{ borderColor: 'var(--border-color-regular)' }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton
                size="lg"
                className="hover:bg-sidebar-accent/50"
                asChild
              >
                <DropdownMenuTrigger>
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback
                      className="text-xs rounded-lg"
                      style={{
                        background: 'var(--c-palUiBlu600)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      {getInitials(session?.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left leading-tight">
                    <span className="truncate text-sm" style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>
                      {session?.user?.name || 'User'}
                    </span>
                    <span className="truncate text-xs capitalize" style={{ color: 'var(--c-texSec)' }}>
                      {session?.user?.role?.replace('_', ' ') || 'User'}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" style={{ color: 'var(--c-texSec)' }} />
                </DropdownMenuTrigger>
              </SidebarMenuButton>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
                align="start"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>
                      {session?.user?.name || 'User'}
                    </span>
                    <span className="text-xs capitalize" style={{ color: 'var(--c-texSec)' }}>
                      {session?.user?.role?.replace('_', ' ') || 'User'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} style={{ color: 'var(--c-texPri)' }}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
