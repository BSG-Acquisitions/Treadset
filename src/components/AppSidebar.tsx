import { useState } from "react";
import { 
  Home, 
  Users, 
  MapPin, 
  UserCheck, 
  BarChart3, 
  FileText, 
  PackageOpen, 
  DollarSign,
  Settings,
  CreditCard,
  PenTool,
  Truck,
  Building,
  Recycle,
  LogOut,
  Plus,
  LayoutDashboard
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { TreadSetLogo } from "@/components/TreadSetLogo";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { user, signOut, hasAnyRole } = useAuth();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    setOpenMobile(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => 
    isActive(path) 
      ? "bg-brand-primary/10 text-brand-primary font-medium border-r-2 border-brand-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  // Organized navigation for super admin
  const superAdminNavigation = {
    overview: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: ['admin', 'ops_manager', 'dispatcher', 'sales'] as const },
    ],
    scheduling: [
      { id: 'clients', label: 'Clients', icon: Users, path: '/clients', roles: ['admin', 'ops_manager', 'sales'] as const },
      { id: 'routes', label: 'Routes', icon: MapPin, path: '/routes/today', roles: ['admin', 'ops_manager', 'dispatcher'] as const },
      { id: 'employees', label: 'Employees', icon: UserCheck, path: '/employees', roles: ['admin'] as const },
    ],
    driverPortal: [
      { id: 'driver-dashboard', label: 'Driver Dashboard', icon: LayoutDashboard, path: '/driver/dashboard', roles: ['driver'] as const },
      { id: 'driver', label: 'My Routes', icon: UserCheck, path: '/routes/driver', roles: ['driver'] as const },
      { id: 'add-pickup', label: 'Add Pickup', icon: PackageOpen, path: '/book', roles: ['driver'] as const },
    ],
    haulerPortal: [
      { id: 'hauler-dashboard', label: 'Hauler Dashboard', icon: Home, path: '/hauler-dashboard', roles: ['hauler'] as const },
      { id: 'hauler-customers', label: 'My Customers', icon: Users, path: '/hauler-customers', roles: ['hauler'] as const },
      { id: 'hauler-manifests', label: 'My Manifests', icon: FileText, path: '/hauler-manifests', roles: ['hauler'] as const },
      { id: 'hauler-manifest-create', label: 'Create Manifest', icon: Plus, path: '/hauler-manifest-create', roles: ['hauler'] as const },
      { id: 'independent-haulers', label: 'Independent Haulers', icon: Truck, path: '/haulers', roles: ['admin', 'ops_manager'] as const },
      { id: 'hauler-rates', label: 'Hauler Rates', icon: DollarSign, path: '/hauler-rates', roles: ['admin', 'ops_manager'] as const },
    ],
    financial: [
      { id: 'dropoffs', label: 'Drop-offs', icon: PackageOpen, path: '/dropoffs', roles: ['admin', 'ops_manager', 'sales'] as const },
    ],
    reporting: [
      { id: 'manifests', label: 'Manifests', icon: FileText, path: '/manifests', roles: ['admin', 'ops_manager', 'dispatcher'] as const },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'ops_manager'] as const },
      { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'ops_manager'] as const },
      { id: 'michigan-reports', label: 'Michigan Reports', icon: Recycle, path: '/michigan-reports', roles: ['admin', 'ops_manager'] as const },
    ],
    administration: [
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'ops_manager'] as const },
      { id: 'integrations', label: 'Integrations', icon: CreditCard, path: '/integrations', roles: ['admin'] as const },
      { id: 'signatures', label: 'Signatures', icon: PenTool, path: '/receiver-signatures', roles: ['admin', 'ops_manager'] as const },
      { id: 'receivers', label: 'Receivers', icon: Building, path: '/receivers', roles: ['admin', 'ops_manager'] as const },
    ],
  };

  // Flat list for regular users
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: ['admin', 'ops_manager', 'dispatcher', 'sales'] as const },
    { id: 'clients', label: 'Clients', icon: Users, path: '/clients', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'routes', label: 'Routes', icon: MapPin, path: '/routes/today', roles: ['admin', 'ops_manager', 'dispatcher'] as const },
    { id: 'driver-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/driver/dashboard', roles: ['driver'] as const },
    { id: 'driver', label: 'My Routes', icon: UserCheck, path: '/routes/driver', roles: ['driver'] as const },
    { id: 'add-pickup', label: 'Add Pickup', icon: PackageOpen, path: '/book', roles: ['driver'] as const },
    { id: 'employees', label: 'Employees', icon: UserCheck, path: '/employees', roles: ['admin'] as const },
    { id: 'dropoffs', label: 'Drop-offs', icon: PackageOpen, path: '/dropoffs', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'independent-haulers', label: 'Independent Haulers', icon: Truck, path: '/haulers', roles: ['admin', 'ops_manager'] as const },
    { id: 'hauler-dashboard', label: 'Hauler Dashboard', icon: Home, path: '/hauler-dashboard', roles: ['hauler'] as const },
    { id: 'hauler-customers', label: 'My Customers', icon: Users, path: '/hauler-customers', roles: ['hauler'] as const },
    { id: 'hauler-manifests', label: 'My Manifests', icon: FileText, path: '/hauler-manifests', roles: ['hauler'] as const },
    { id: 'hauler-manifest-create', label: 'Create Manifest', icon: Plus, path: '/hauler-manifest-create', roles: ['hauler'] as const },
    { id: 'hauler-rates', label: 'Hauler Rates', icon: DollarSign, path: '/hauler-rates', roles: ['admin', 'ops_manager'] as const },
    { id: 'manifests', label: 'Manifests', icon: FileText, path: '/manifests', roles: ['admin', 'ops_manager', 'dispatcher'] as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'ops_manager'] as const },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'ops_manager'] as const },
    { id: 'michigan-reports', label: 'Michigan Reports', icon: Recycle, path: '/michigan-reports', roles: ['admin', 'ops_manager'] as const },
  ];

  const adminItems = [
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'ops_manager'] as const },
    { id: 'integrations', label: 'Integrations', icon: CreditCard, path: '/integrations', roles: ['admin'] as const },
    { id: 'signatures', label: 'Signatures', icon: PenTool, path: '/receiver-signatures', roles: ['admin', 'ops_manager'] as const },
    { id: 'receivers', label: 'Receivers', icon: Building, path: '/receivers', roles: ['admin', 'ops_manager'] as const },
  ];

  // Super admin (creator) sees everything - no other user has this privilege
  const isSuperAdmin = user?.email === 'zachdevon@bsgtires.com';

  const filteredNavItems = isSuperAdmin 
    ? navigationItems 
    : navigationItems.filter(item => 
        ([...item.roles].length === 0) || hasAnyRole([...item.roles])
      );

  const filteredAdminItems = isSuperAdmin
    ? adminItems
    : adminItems.filter(item => 
        ([...item.roles].length === 0) || hasAnyRole([...item.roles])
      );

  return (
    <Sidebar 
      className={`${isCollapsed ? "w-16" : "w-64"} transition-all duration-300 border-r border-border/40 bg-card`} 
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border/20 p-4">
        <div className="flex items-center gap-3">
          <TreadSetLogo size="sm" />
          {!isCollapsed && (
            <div className="text-sm">
              <p className="font-semibold text-foreground truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {isSuperAdmin ? (
          // Super admin sees organized categories
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.overview.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Scheduling & Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.scheduling.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Driver Portal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.driverPortal.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Hauler Portal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.haulerPortal.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Financial</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.financial.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Reports & Analytics</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.reporting.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {superAdminNavigation.administration.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          // Regular users see role-filtered navigation
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {filteredNavItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild className="h-12">
                        <NavLink 
                          to={item.path} 
                          onClick={handleNavClick}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                        >
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                          {!isCollapsed && (
                            <span className="text-sm font-medium truncate">
                              {item.label}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {filteredAdminItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
                  Administration
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {filteredAdminItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild className="h-12">
                          <NavLink 
                            to={item.path} 
                            onClick={handleNavClick}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${getNavClass(item.path)}`}
                          >
                            <item.icon className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                            {!isCollapsed && (
                              <span className="text-sm font-medium truncate">
                                {item.label}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/20 p-4">
        <Button
          variant="ghost"
          onClick={signOut}
          className={`${isCollapsed ? 'px-0 justify-center' : 'justify-start'} w-full text-destructive hover:text-destructive hover:bg-destructive/10`}
        >
          <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
          {!isCollapsed && <span className="text-sm">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}