import { Search, Menu, User, Settings, Package, BarChart3, UserCheck, Home, Users, MapPin, DollarSign, CreditCard, PenTool, Truck, Building, FileText, PackageOpen, Container, CalendarCheck, Map, Brain, Boxes, ChevronDown, MoreHorizontal, Shield, Wrench, Database, Send } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';
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

import { TreadSetLogo } from '@/components/TreadSetLogo';
import { OrganizationSwitcher } from '@/components/auth/OrganizationSwitcher';
import { usePendingBookingCount } from '@/hooks/useBookingRequests';
import { ViewerModeBadge } from '@/components/ViewerModeBadge';

import { LiveSearch } from '@/components/LiveSearch';


interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuToggle, showMenuButton = false }: TopNavProps) {
  const { user, signOut, hasAnyRole } = useAuth();
  const location = useLocation();
  const { data: pendingBookingCount } = usePendingBookingCount();

  // Determine which dropdown/tab is active
  const getActiveSection = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname.startsWith('/clients')) return 'clients';
    if (location.pathname.startsWith('/routes') || location.pathname === '/outbound-schedule') return 'routes';
    if (location.pathname.startsWith('/inventory') || location.pathname === '/shipments') return 'inventory';
    if (location.pathname.startsWith('/trailers')) return 'trailers';
    if (location.pathname === '/analytics' || location.pathname === '/reports' || location.pathname === '/reports/compliance') return 'reports';
    // More section items
    if (location.pathname === '/dropoffs') return 'dropoffs';
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  // Common styles for nav items
  const navItemClass = (isActive: boolean) => 
    `flex items-center justify-center gap-1 sm:gap-2 h-10 sm:h-12 px-2 sm:px-3 lg:px-4 cursor-pointer border-b-2 transition-colors text-xs sm:text-sm ${
      isActive 
        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary font-medium' 
        : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
    }`;

  const dropdownItemClass = (isActive: boolean) =>
    `flex items-center gap-2 ${isActive ? 'bg-accent' : ''}`;

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
        </div>

        {/* Center - Live Search */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2 lg:mx-6 min-w-0">
          <LiveSearch />
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Viewer Mode Badge */}
          <ViewerModeBadge />
          
          {/* Organization Switcher */}
          {hasAnyRole(['admin','ops_manager','dispatcher','sales','viewer']) && <OrganizationSwitcher />}
          

          {/* User menu - Streamlined to personal/account items only */}
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
              {/* Booking Requests with badge - important action */}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/booking-requests" className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    Booking Requests
                    {(pendingBookingCount ?? 0) > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1">
                        {pendingBookingCount}
                      </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/service-zones" className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Service Zones
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Operations */}
              {hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/manifests" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Manifests
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/receiver-signatures" className="flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Receiver Signatures
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Entities */}
              {hasAnyRole(['admin', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/employees" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Employees
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/haulers" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Haulers
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/receivers" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Receivers
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Administration */}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/intelligence" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Intelligence
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/integrations" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Integrations
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
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
      <div className="hidden xl:block border-t border-border/20 bg-card/50">
        <div className="px-3 sm:px-6">
          <nav className="flex items-center justify-evenly">
            {/* Dashboard - Simple link */}
            <Link to="/dashboard" className={navItemClass(activeSection === 'dashboard')}>
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Dashboard</span>
            </Link>

            {/* Clients - Simple link */}
            {hasAnyRole(['admin', 'ops_manager', 'sales', 'viewer']) && (
              <Link to="/clients" className={navItemClass(activeSection === 'clients')}>
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Clients</span>
              </Link>
            )}

            {/* Routes Dropdown */}
            {hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'viewer']) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={navItemClass(activeSection === 'routes')}>
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Pickups</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/routes/today" className={dropdownItemClass(location.pathname.startsWith('/routes'))}>
                      <MapPin className="h-4 w-4" />
                      Today's Routes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/outbound-schedule" className={dropdownItemClass(location.pathname === '/outbound-schedule')}>
                      <Send className="h-4 w-4" />
                      Outbound
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Inventory Dropdown */}
            {FEATURE_FLAGS.INVENTORY && hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'viewer']) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={navItemClass(activeSection === 'inventory')}>
                    <Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Inventory</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/inventory" className={dropdownItemClass(location.pathname === '/inventory')}>
                      <Package className="h-4 w-4" />
                      Stock Levels
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/inventory/products" className={dropdownItemClass(location.pathname === '/inventory/products')}>
                      <Boxes className="h-4 w-4" />
                      Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/shipments" className={dropdownItemClass(location.pathname === '/shipments')}>
                      <Truck className="h-4 w-4" />
                      Shipments
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Trailers Dropdown - Already exists, keeping same structure */}
            {FEATURE_FLAGS.TRAILERS && hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'viewer']) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={navItemClass(activeSection === 'trailers')}>
                    <Container className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Trailers</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/trailers/inventory" className={dropdownItemClass(location.pathname === '/trailers/inventory')}>
                      <Container className="h-4 w-4" />
                      Inventory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/trailers/routes" className={dropdownItemClass(location.pathname === '/trailers/routes')}>
                      <MapPin className="h-4 w-4" />
                      Routes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/trailers/vehicles" className={dropdownItemClass(location.pathname === '/trailers/vehicles')}>
                      <Truck className="h-4 w-4" />
                      Vehicles
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/trailers/drivers" className={dropdownItemClass(location.pathname === '/trailers/drivers')}>
                      <UserCheck className="h-4 w-4" />
                      Driver Management
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/trailers/reports" className={dropdownItemClass(location.pathname === '/trailers/reports')}>
                      <BarChart3 className="h-4 w-4" />
                      Reports
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Reports Dropdown */}
            {hasAnyRole(['admin', 'ops_manager', 'viewer']) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={navItemClass(activeSection === 'reports')}>
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Reports</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/reports" className={dropdownItemClass(location.pathname === '/reports')}>
                      <FileText className="h-4 w-4" />
                      Reports
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/analytics" className={dropdownItemClass(location.pathname === '/analytics')}>
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/reports/compliance" className={dropdownItemClass(location.pathname === '/reports/compliance')}>
                      <Shield className="h-4 w-4" />
                      Compliance Reports
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Drop-offs - Direct link (was "More" dropdown) */}
            {hasAnyRole(['admin', 'ops_manager', 'sales', 'viewer']) && (
              <Link to="/dropoffs" className={navItemClass(activeSection === 'dropoffs')}>
                <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Drop-offs</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
