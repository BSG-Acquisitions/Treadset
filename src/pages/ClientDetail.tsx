import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Button } from "@/components/ui/button";

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id!);
  const { data: locations = [] } = useLocations(id);

  useEffect(() => {
    document.title = client ? `${client.company_name} – Client – BSG` : "Client – BSG";
  }, [client]);

  if (isLoading) {
    return (
      <main className="container py-10">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="container py-10">
        <p className="text-muted-foreground">Client not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">Last pickup {client.last_pickup_at ? new Date(client.last_pickup_at).toLocaleDateString() : 'Never'}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/book"><Button variant="brand">Schedule Pickup</Button></Link>
          <Link to="/routes/today"><Button variant="outline">View Today’s Routes</Button></Link>
        </div>
      </header>

      <section className="container grid md:grid-cols-3 gap-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-semibold text-foreground">${(client.lifetime_revenue || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Lifetime revenue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{locations.length}</div>
            <div className="text-sm text-muted-foreground">Active locations</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">${(client.open_balance || 0).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Open balance</div>
          </CardContent>
        </Card>
      </section>

      <section className="container grid md:grid-cols-2 gap-6 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {locations.map((loc) => (
                <li key={loc.id} className="flex items-center justify-between border-b last:border-b-0 py-3">
                  <div>
                    <div className="font-medium text-foreground">{loc.name || 'Unnamed Location'}</div>
                    <div className="text-sm text-muted-foreground">{loc.address}</div>
                    {loc.pricing_tier && (
                      <div className="text-xs text-muted-foreground">Pricing: {loc.pricing_tier.name}</div>
                    )}
                  </div>
                  <div className="text-sm text-right">
                    <div className={`font-medium ${loc.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {loc.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {client.contact_name && <li><strong>Contact:</strong> {client.contact_name}</li>}
              {client.email && <li><strong>Email:</strong> {client.email}</li>}
              {client.phone && <li><strong>Phone:</strong> {client.phone}</li>}
              {client.type && <li><strong>Type:</strong> {client.type}</li>}
              {client.sla_weeks && <li><strong>SLA:</strong> {client.sla_weeks} weeks</li>}
              {client.notes && <li><strong>Notes:</strong> {client.notes}</li>}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
