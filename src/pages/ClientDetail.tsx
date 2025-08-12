import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getClientById } from "@/data/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Button } from "@/components/ui/button";

export default function ClientDetail() {
  const { id } = useParams();
  const client = id ? getClientById(id) : undefined;

  useEffect(() => {
    document.title = client ? `${client.name} – Client – BSG` : "Client – BSG";
  }, [client]);

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
          <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
          <p className="text-sm text-muted-foreground">Last pickup {new Date(client.lastPickup).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/book"><Button variant="brand">Schedule Pickup</Button></Link>
          <Link to="/routes/today"><Button variant="outline">View Today’s Routes</Button></Link>
        </div>
      </header>

      <section className="container grid md:grid-cols-3 gap-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Capacity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <CapacityGauge value={client.capacity} />
            <div>
              <div className="text-2xl font-semibold text-foreground">{client.capacity}%</div>
              <div className="text-sm text-muted-foreground">Across all locations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{client.locations.length}</div>
            <div className="text-sm text-muted-foreground">Active locations</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">OK</div>
            <div className="text-sm text-muted-foreground">No active issues</div>
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
              {client.locations.map((loc) => (
                <li key={loc.id} className="flex items-center justify-between border-b last:border-b-0 py-3">
                  <div>
                    <div className="font-medium text-foreground">{loc.name}</div>
                    <div className="text-sm text-muted-foreground">{loc.address}</div>
                  </div>
                  <CapacityGauge value={loc.capacity} size={56} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {client.activity.map((a, i) => (
                <li key={i} className="text-sm text-foreground">• {a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
