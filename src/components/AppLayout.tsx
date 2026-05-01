import { ReactNode } from 'react';
import { TopNav } from "@/components/TopNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex-shrink-0">
        <TopNav />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-2 sm:p-4 lg:p-6 xl:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
