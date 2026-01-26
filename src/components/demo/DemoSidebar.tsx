import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Truck,
  BarChart3,
  Package,
  MapPin,
  UserCog,
} from "lucide-react";
import { cn } from '@/lib/utils';

const demoNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/demo/dashboard' },
  { title: 'Clients', icon: Users, path: '/demo/clients' },
  { title: 'Routes', icon: Truck, path: '/demo/routes' },
  { title: 'Analytics', icon: BarChart3, path: '/demo/analytics' },
  { title: 'Trailers', icon: Package, path: '/demo/trailers' },
  { title: 'Service Zones', icon: MapPin, path: '/demo/service-zones' },
  { title: 'Employees', icon: UserCog, path: '/demo/employees' },
];

export function DemoSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-2">
          <img src="/treadset-logo.png" alt="TreadSet" className="h-8 w-auto" />
          <span className="font-semibold text-foreground">TreadSet Demo</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {demoNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  location.pathname.startsWith(item.path + '/');
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
