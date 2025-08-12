import { useState } from 'react';
import { Search, Bell, Menu, User, Settings, Package, BarChart3, UserCheck, Home, Users, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BSGLogo } from '@/components/BSGLogo';

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuToggle, showMenuButton = false }: TopNavProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut, hasAnyRole } = useAuth();
  const location = useLocation();

  const getCurrentTab = () => {
    if (location.pathname === '/') return 'dashboard';
    if (location.pathname.startsWith('/clients')) return 'clients';
    if (location.pathname.startsWith('/routes')) return 'routes';
    if (location.pathname === '/book') return 'book';
    if (location.pathname === '/employees') return 'employees';
    if (location.pathname === '/analytics') return 'analytics';
    if (location.pathname === '/pricing') return 'pricing';
    return 'dashboard';
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: [] as const },
    { id: 'clients', label: 'Clients', icon: Users, path: '/clients', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'routes', label: 'Routes', icon: MapPin, path: '/routes/today', roles: ['admin', 'ops_manager', 'dispatcher', 'driver'] as const },
    { id: 'book', label: 'Book', icon: Package, path: '/book', roles: ['admin', 'ops_manager', 'sales'] as const },
    { id: 'employees', label: 'Employees', icon: UserCheck, path: '/employees', roles: ['admin'] as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'ops_manager'] as const },
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
          
          <Link to="/" className="hover:opacity-80 transition-all duration-300 min-w-0">
            <BSGLogo 
              size="sm" 
              animated={true} 
              showText={true}
              className="min-w-0"
            />
          </Link>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-2 sm:mx-6 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients, routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/50 focus:bg-card focus:border-brand-primary/30 transition-all duration-300 text-sm"
            />
          </div>
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Enhanced notifications */}
          <Button variant="ghost" size="sm" className="relative hover:bg-brand-primary/10 transition-colors" aria-label="Notifications">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-brand-tire-black/70" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs bg-brand-accent">
              3
            </Badge>
          </Button>

          {/* Enhanced quick actions */}
          <Button variant="outline" size="sm" asChild className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 hidden sm:flex">
            <Link to="/book">
              <span className="font-medium">Quick Book</span>
            </Link>
          </Button>

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
      
      {/* Navigation Tabs */}
      <div className="border-t border-border/20 bg-card/50 overflow-x-auto">
        <div className="px-3 sm:px-6">
          <Tabs value={getCurrentTab()} className="w-full">
            <TabsList className="grid w-full bg-transparent h-auto p-0 min-w-max" style={{ gridTemplateColumns: `repeat(${navigationTabs.filter(tab => tab.roles.length === 0 || hasAnyRole([...tab.roles])).length}, 1fr)` }}>
              {navigationTabs
                .filter(tab => tab.roles.length === 0 || hasAnyRole([...tab.roles]))
                .map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id} 
                      asChild
                      className="data-[state=active]:bg-brand-primary/10 data-[state=active]:text-brand-primary border-b-2 border-transparent data-[state=active]:border-brand-primary rounded-none h-12 px-2 sm:px-4 whitespace-nowrap"
                    >
                      <Link to={tab.path} className="flex items-center gap-1 sm:gap-2 w-full">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{tab.label}</span>
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