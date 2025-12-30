import { ReactNode } from "react";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 pt-16 lg:pt-20">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
