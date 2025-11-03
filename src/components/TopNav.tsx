import { useState } from 'react';
import { Search, Bell, Menu, User, Settings, Package, BarChart3, UserCheck, Home, Users, MapPin, DollarSign, CreditCard, PenTool, Truck, Building, FileText, PackageOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSandboxMode } from '@/contexts/SandboxModeContext';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TreadSetLogo } from '@/components/TreadSetLogo';
import { OrganizationSwitcher } from '@/components/auth/OrganizationSwitcher';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useContextualNotifications } from '@/hooks/useContextualNotifications';
import { useAnalyzePickupPatterns } from '@/hooks/usePickupPatterns';
import { formatDistanceToNow } from 'date-fns';
import { LiveSearch } from '@/components/LiveSearch';
import { EnhancedNotificationCenter } from '@/components/notifications/EnhancedNotificationCenter';

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuToggle, showMenuButton = false }: TopNavProps) {
  const { user, signOut, hasAnyRole } = useAuth();
  const { isSandboxMode } = useSandboxMode();
  const location = useLocation();
  const { unreadCount } = useEnhancedNotifications();
  useContextualNotifications(); // Enable background checks
  const analyzePatterns = useAnalyzePickupPatterns();

  const getCurrentTab = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname.startsWith('/clients')) return 'clients';
    if (location.pathname.startsWith('/routes')) return 'routes';
    if (location.pathname.startsWith('/driver')) return 'driver';
    if (location.pathname === '/haulers') return 'haulers';
    if (location.pathname === '/employees') return 'employees';
    if (location.pathname === '/analytics') return 'analytics';
    if (location.pathname === '/reports') return 'reports';
    if (location.pathname === '/dropoffs') return 'dropoffs';
    return 'dashboard';
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: [] as const },
    { id: 'clients', label: 'Clients', icon: Users, path: '/clients', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'routes', label: 'Routes', icon: MapPin, path: '/routes/today', roles: ['admin', 'ops_manager', 'dispatcher'] as const },
    { id: 'driver', label: 'My Routes', icon: UserCheck, path: '/routes/driver', roles: ['driver'] as const },
    { id: 'employees', label: 'Employees', icon: UserCheck, path: '/employees', roles: ['admin'] as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'ops_manager'] as const },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'ops_manager'] as const },
    { id: 'dropoffs', label: 'Drop-offs', icon: PackageOpen, path: '/dropoffs', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'haulers', label: 'Independent Haulers', icon: Truck, path: '/haulers', roles: ['admin', 'ops_manager'] as const },
  ];



  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-elevation-md">
      {/* Brand accent stripe */}
      <div className="h-1 brand-gradient" />
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left side - Logo and menu */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <Link to="/" className="hover:opacity-80 transition-all duration-300 flex-shrink-0">
            <TreadSetLogo 
              size="sm" 
              className="flex-shrink-0"
            />
          </Link>
          
          {isSandboxMode && (
            <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
              <Bell className="h-3 w-3" />
              TEST MODE
            </Badge>
          )}
        </div>

        {/* Center - Live Search */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2 lg:mx-6 min-w-0">
          <LiveSearch />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Organization Switcher */}
          {hasAnyRole(['admin','ops_manager','dispatcher','sales']) && <OrganizationSwitcher />}
          
          {/* Enhanced notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-brand-primary/10 transition-colors" aria-label="Notifications">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-brand-tire-black/70" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-brand-accent flex items-center justify-center min-w-[20px] animate-pulse">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="end">
              <EnhancedNotificationCenter />
            </PopoverContent>
          </Popover>


          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              {hasAnyRole(['admin','ops_manager']) && (
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin']) && (
                <DropdownMenuItem asChild>
                  <Link to="/integrations" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Integrations
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager']) && (
                <DropdownMenuItem asChild>
                  <Link to="/receiver-signatures" className="flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Receiver Signatures
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager']) && (
                <DropdownMenuItem asChild>
                  <Link to="/haulers" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Haulers
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager']) && (
                <DropdownMenuItem asChild>
                  <Link to="/receivers" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Receivers
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'dispatcher']) && (
                <DropdownMenuItem asChild>
                  <Link to="/manifests" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Manifests
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
                <DropdownMenuItem 
                  onClick={() => analyzePatterns.mutate()}
                  disabled={analyzePatterns.isPending}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  {analyzePatterns.isPending ? 'Analyzing...' : 'Analyze Pickup Patterns'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Navigation Tabs - Only shown on desktop xl+ screens */}
      <div className="hidden xl:block border-t border-border/20 bg-card/50 overflow-x-auto">
        <div className="px-3 sm:px-6">
          <Tabs value={getCurrentTab()} className="w-full">
            <TabsList className="grid w-full bg-transparent h-auto p-0 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${navigationTabs.filter(tab => tab.roles.length === 0 || hasAnyRole([...tab.roles])).length}, minmax(0, 1fr))` }}>
              {navigationTabs
                .filter(tab => tab.roles.length === 0 || hasAnyRole([...tab.roles]))
                .map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id} 
                      asChild
                      className="data-[state=active]:bg-brand-primary/10 data-[state=active]:text-brand-primary border-b-2 border-transparent data-[state=active]:border-brand-primary rounded-none h-10 sm:h-12 px-1 sm:px-2 lg:px-4 whitespace-nowrap min-w-0"
                    >
                      <Link to={tab.path} className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{tab.label}</span>
                      </Link>
                    </TabsTrigger>
                  );
                })}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </header>
  );
}