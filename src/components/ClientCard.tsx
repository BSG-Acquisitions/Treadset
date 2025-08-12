import { Card, CardContent } from "@/components/ui/card";
import { CapacityGauge } from "./CapacityGauge";
import { Link } from "react-router-dom";

interface ClientCardProps {
  id: string;
  name: string;
  capacity: number;
  lastPickup: string;
}

export function ClientCard({ id, name, capacity, lastPickup }: ClientCardProps) {
  return (
    <Link to={`/clients/${id}`} className="focus:outline-none">
      <Card className="group overflow-hidden transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="shrink-0">
            <CapacityGauge value={capacity} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">Last pickup {new Date(lastPickup).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
