import { useEffect } from "react";
import { RowCarousel } from "@/components/RowCarousel";
import { clients } from "@/data/clients";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard – BSG Tire Recycling CRM";
  }, []);

  const critical = clients.filter((c) => c.capacity >= 80);
  const moderate = clients.filter((c) => c.capacity >= 50 && c.capacity < 80);

  return (
    <main className="min-h-screen bg-background">
      <header className="container py-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Netflix-style overview of clients and capacity.</p>
      </header>
      <div className="container pb-12 space-y-6">
        <RowCarousel title="All Clients" items={clients} />
        <RowCarousel title="High Capacity (80%+)" items={critical} />
        <RowCarousel title="Moderate Capacity (50–79%)" items={moderate} />
      </div>
    </main>
  );
};

export default Index;
