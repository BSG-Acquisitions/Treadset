import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNav } from "@/components/TopNav";
import { SandboxModeBanner } from "@/components/SandboxModeBanner";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar - Hidden on desktop xl+, shown on mobile/tablet */}
        <div className="xl:hidden">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation */}
          <div className="flex-shrink-0">
            <div className="xl:hidden flex items-center h-14 px-4 border-b border-border/40 bg-card">
              <SidebarTrigger className="mr-2">
                <Button variant="ghost" size="sm" className="xl:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="font-semibold text-lg text-foreground">TreadSet CRM</h1>
            </div>
            <div className="hidden xl:block">
              <TopNav />
            </div>
          </div>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-2 sm:p-4 lg:p-6 xl:p-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Floating TEST MODE indicator */}
      <SandboxModeBanner />
    </SidebarProvider>
  );
}