import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Eye,
  CheckSquare,
  FileText,
  Settings,
  MessageSquare,
  ChevronDown
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
} from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { user, logout } = useAuth();

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['cfo', 'admin', 'audit_head', 'auditor', 'auditee'] 
    },
    { 
      id: 'plants', 
      label: 'Plants', 
      icon: Building2, 
      roles: ['cfo', 'admin', 'audit_head'] 
    },
    { 
      id: 'audits', 
      label: 'Audits', 
      icon: ClipboardList, 
      roles: ['cfo', 'admin', 'audit_head', 'auditor'] 
    },
    { 
      id: 'observations', 
      label: 'Observations', 
      icon: Eye, 
      roles: ['cfo', 'admin', 'audit_head', 'auditor', 'auditee'] 
    },
    { 
      id: 'checklists', 
      label: 'Checklists', 
      icon: CheckSquare, 
      roles: ['cfo', 'admin', 'audit_head', 'auditor'] 
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText, 
      roles: ['cfo', 'admin', 'audit_head'] 
    },
  ];

  const toolsMenuItems = [
    { 
      id: 'ai-assistant', 
      label: 'AI Assistant', 
      icon: MessageSquare, 
      roles: ['cfo', 'admin', 'audit_head', 'auditor', 'auditee'] 
    },
  ];

  const adminMenuItems = [
    { 
      id: 'admin', 
      label: 'Settings', 
      icon: Settings, 
      roles: ['cfo', 'admin'] 
    },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const visibleToolsItems = toolsMenuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  const visibleAdminItems = adminMenuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b h-14 flex items-center" style={{ borderColor: 'var(--border-color-regular)' }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2">
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
            </div>
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
                      onClick={() => onNavigate(item.id)}
                      isActive={currentPage === item.id}
                      tooltip={item.label}
                      style={{
                        color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                        fontWeight: currentPage === item.id ? 500 : 400,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
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
                        onClick={() => onNavigate(item.id)}
                        isActive={currentPage === item.id}
                        tooltip={item.label}
                        style={{
                          color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                          fontWeight: currentPage === item.id ? 500 : 400,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
                        onClick={() => onNavigate(item.id)}
                        isActive={currentPage === item.id}
                        tooltip={item.label}
                        style={{
                          color: currentPage === item.id ? 'var(--c-texPri)' : 'var(--c-texSec)',
                          fontWeight: currentPage === item.id ? 500 : 400,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left leading-tight">
                    <span className="truncate text-sm" style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>
                      {user?.name}
                    </span>
                    <span className="truncate text-xs capitalize" style={{ color: 'var(--c-texSec)' }}>
                      {user?.role.replace('_', ' ')}
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
                    <span style={{ color: 'var(--c-texPri)', fontWeight: 500 }}>{user?.name}</span>
                    <span className="text-xs capitalize" style={{ color: 'var(--c-texSec)' }}>
                      {user?.role.replace('_', ' ')}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} style={{ color: 'var(--c-texPri)' }}>
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
