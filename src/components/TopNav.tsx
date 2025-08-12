import { useState } from 'react';
import { Search, Bell, Menu, User, Settings, RotateCcw } from 'lucide-react';
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
import { Link } from 'react-router-dom';

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuToggle, showMenuButton = false }: TopNavProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-elevation-md">
      {/* Brand accent stripe */}
      <div className="h-1 brand-gradient" />
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Logo and menu */}
        <div className="flex items-center gap-4">
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
          
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
            {/* Enhanced BSG Logo */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-primary-dark rounded-xl flex items-center justify-center shadow-elevation-md group-hover:shadow-elevation-lg transition-all duration-300">
                <RotateCcw className="h-5 w-5 text-white group-hover:rotate-180 transition-transform duration-500" />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-brand-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-brand-primary to-brand-primary-dark bg-clip-text text-transparent">
                BSG Tire Recycling
              </h1>
              <p className="text-xs text-brand-tire-black/60 font-medium">Industrial Waste Solutions</p>
            </div>
          </Link>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients, routes, pickups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/50 focus:bg-card focus:border-brand-primary/30 transition-all duration-300"
            />
          </div>
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center gap-2">
          {/* Enhanced notifications */}
          <Button variant="ghost" size="sm" className="relative hover:bg-brand-primary/10 transition-colors" aria-label="Notifications">
            <Bell className="h-5 w-5 text-brand-tire-black/70" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-brand-accent">
              3
            </Badge>
          </Button>

          {/* Enhanced quick actions */}
          <Button variant="outline" size="sm" asChild className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
            <Link to="/book">
              <span className="hidden sm:inline font-medium">Quick Book</span>
              <span className="sm:hidden font-medium">Book</span>
            </Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <User className="h-5 w-5" />
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
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
    </header>
  );
}