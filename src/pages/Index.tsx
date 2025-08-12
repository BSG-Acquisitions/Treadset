import { useEffect } from "react";
import { RowCarousel } from "@/components/RowCarousel";
import { useClients } from "@/hooks/useClients";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard – BSG Tire Recycling CRM";
  }, []);

  const { data: clientsData, isLoading } = useClients({ 
    sortBy: 'updated_at', 
    sortOrder: 'desc',
    limit: 50 
  });

  const clients = clientsData?.data || [];

  // Calculate dashboard metrics using real data
  const highValueClients = clients.filter(c => (c.lifetime_revenue || 0) > 5000);
  const recentPickups = clients
    .filter(c => c.last_pickup_at && new Date(c.last_pickup_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(b.last_pickup_at || 0).getTime() - new Date(a.last_pickup_at || 0).getTime());
  const outstandingBalances = clients.filter(c => (c.open_balance || 0) > 0);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <header className="container py-6">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </header>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="container py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of clients and business metrics.</p>
        </div>
        <Link to="/clients">
          <Button>View All Clients</Button>
        </Link>
      </header>
      <div className="container pb-12 space-y-6">
        <RowCarousel 
          title="All Clients" 
          items={clients.map(c => ({ 
            id: c.id, 
            name: c.company_name, 
            capacity: Math.round((c.lifetime_revenue || 0) / 1000), // Revenue in thousands
            lastPickup: c.last_pickup_at || "" 
          }))} 
        />
        <RowCarousel 
          title="High Value Clients ($5K+)" 
          items={highValueClients.map(c => ({ 
            id: c.id, 
            name: c.company_name, 
            capacity: Math.round((c.lifetime_revenue || 0) / 1000),
            lastPickup: c.last_pickup_at || "" 
          }))} 
        />
        <RowCarousel 
          title="Recent Pickups (Last 7 Days)" 
          items={recentPickups.map(c => ({ 
            id: c.id, 
            name: c.company_name, 
            capacity: Math.round((c.lifetime_revenue || 0) / 1000),
            lastPickup: c.last_pickup_at || "" 
          }))} 
        />
        <RowCarousel 
          title="Outstanding Balances" 
          items={outstandingBalances.map(c => ({ 
            id: c.id, 
            name: c.company_name, 
            capacity: Math.round(c.open_balance || 0),
            lastPickup: c.last_pickup_at || "" 
          }))} 
        />
      </div>
    </main>
  );
};

export default Index;
