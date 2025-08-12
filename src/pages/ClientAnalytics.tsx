import { useEffect } from "react";
import { ClientAnalyticsDashboard } from "@/components/analytics/ClientAnalyticsDashboard";
import { TopNav } from "@/components/TopNav";

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
        <div className="relative z-10 py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-primary to-brand-primary-dark bg-clip-text text-transparent">
              Client Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Comprehensive insights into your 2025 tire recycling operations and client performance
            </p>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto p-6">
        <ClientAnalyticsDashboard />
      </div>
    </div>
  );
}