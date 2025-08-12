import { useEffect } from "react";
import { ClientAnalyticsDashboard } from "@/components/analytics/ClientAnalyticsDashboard";
import { TopNav } from "@/components/TopNav";
import { BSGLogo } from "@/components/BSGLogo";

export default function ClientAnalytics() {
  useEffect(() => {
    document.title = "Client Analytics – BSG Tire Recycling";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      {/* Header with subtle background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background to-secondary/20 border-b border-border/20">
        <div className="absolute inset-0 tire-pattern opacity-20" />
        <div className="relative z-10 py-6 sm:py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <BSGLogo size="lg" animated={true} showText={false} />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-primary-dark bg-clip-text text-transparent">
                  Client Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base lg:text-lg">
                  Comprehensive insights into your 2025 tire recycling operations and client performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <ClientAnalyticsDashboard />
      </div>
    </div>
  );
}