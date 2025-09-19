import { useState } from 'react';
import { Search, Bell, Menu, User, Settings, Package, BarChart3, UserCheck, Home, Users, MapPin, DollarSign, CreditCard, PenTool, Truck, Building, FileText, PackageOpen } from 'lucide-react';
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
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { BSGLogoActual } from '@/components/BSGLogoActual';
import { OrganizationSwitcher } from '@/components/auth/OrganizationSwitcher';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { LiveSearch } from '@/components/LiveSearch';

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuToggle, showMenuButton = false }: TopNavProps) {
  const { user, signOut, hasAnyRole } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAllAsRead } = useNotifications();

  const getCurrentTab = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname.startsWith('/clients')) return 'clients';
    if (location.pathname.startsWith('/routes')) return 'routes';
    if (location.pathname.startsWith('/driver')) return 'driver';
    
    if (location.pathname === '/employees') return 'employees';
    if (location.pathname === '/analytics') return 'analytics';
    if (location.pathname === '/pricing') return 'pricing';
    if (location.pathname === '/reports') return 'reports';
    if (location.pathname === '/dropoffs') return 'dropoffs';
    return 'dashboard';
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: [] as const },
    { id: 'clients', label: 'Clients', icon: Users, path: '/clients', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'routes', label: 'Routes', icon: MapPin, path: '/routes/today', roles: ['admin', 'ops_manager', 'dispatcher', 'driver'] as const },
    { id: 'driver', label: 'Driver Hub', icon: UserCheck, path: '/driver/dashboard', roles: ['driver'] as const },
    { id: 'employees', label: 'Employees', icon: UserCheck, path: '/employees', roles: ['admin'] as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'ops_manager'] as const },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'ops_manager'] as const },
    { id: 'dropoffs', label: 'Drop-offs', icon: PackageOpen, path: '/dropoffs', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'pricing', label: 'Pricing', icon: DollarSign, path: '/pricing', roles: ['admin', 'ops_manager'] as const },
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
            <BSGLogoActual 
              size="sm" 
              className="flex-shrink-0"
            />
          </Link>
        </div>

        {/* Center - Live Search */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2 lg:mx-6 min-w-0">
          <LiveSearch />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Organization Switcher */}
          <OrganizationSwitcher />
          
          {/* Enhanced notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-brand-primary/10 transition-colors" aria-label="Notifications">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-brand-tire-black/70" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-brand-accent flex items-center justify-center min-w-[20px]">
                  {unreadCount > 0 ? unreadCount : null}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'No unread notifications'}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div 
                      key={notification.id}
                      className="p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.is_read ? 'bg-muted' : 'bg-brand-accent'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            notification.is_read ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {unreadCount > 0 && (
                <div className="border-t border-border p-3">
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm"
                    onClick={() => markAllAsRead()}
                    disabled={isMarkingAllAsRead}
                  >
                    {isMarkingAllAsRead ? 'Marking as read...' : 'Mark all as read'}
                  </Button>
                </div>
              )}
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
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/integrations" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Integrations
                </Link>
              </DropdownMenuItem>
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