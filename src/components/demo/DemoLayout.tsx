import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoLayoutProps {
  children: ReactNode;
}

export function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col">
        {/* Demo Mode Banner - Always visible at top */}
        <DemoModeBanner />
        
        <div className="flex flex-1">
          {/* Demo Sidebar - Hidden on desktop xl+, shown on mobile/tablet */}
          <div className="xl:hidden">
            <DemoSidebar />
          </div>
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Navigation for mobile */}
            <div className="xl:hidden flex items-center h-14 px-4 border-b border-border/40 bg-card">
              <SidebarTrigger className="mr-2">
                <Button variant="ghost" size="sm" className="xl:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="font-semibold text-lg text-foreground">TreadSet Demo</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden xl:block">
              <DemoTopNav />
            </div>
            
            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
              <div className="container mx-auto p-2 sm:p-4 lg:p-6 xl:p-8 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DemoTopNav() {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-card px-6">
      <div className="flex items-center gap-4">
        <img src="/treadset-logo.png" alt="TreadSet" className="h-8 w-auto" />
        <span className="text-lg font-semibold text-foreground">TreadSet CRM</span>
      </div>
      
      <nav className="flex-1 flex items-center gap-6 ml-8">
        <DemoNavLink to="/demo/dashboard">Dashboard</DemoNavLink>
        <DemoNavLink to="/demo/clients">Clients</DemoNavLink>
        <DemoNavLink to="/demo/routes">Routes</DemoNavLink>
        <DemoNavLink to="/demo/analytics">Analytics</DemoNavLink>
        <DemoNavLink to="/demo/trailers">Trailers</DemoNavLink>
      </nav>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Demo User</span>
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

function DemoNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  return (
    <Link
      to={to}
      className={cn(
        "text-sm font-medium transition-colors hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}
