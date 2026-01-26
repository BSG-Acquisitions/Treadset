import { DemoLayout } from '@/components/demo/DemoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin } from 'lucide-react';
import { DEMO_TRAILERS } from '@/lib/demo';

export default function DemoTrailers() {
  const trailers = DEMO_TRAILERS;
  
  const emptyCount = trailers.filter(t => t.current_status === 'empty').length;
  const fullCount = trailers.filter(t => t.current_status === 'full').length;
  const waitingCount = trailers.filter(t => t.current_status === 'waiting_unload').length;

  return (
    <DemoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trailer Inventory</h1>
            <p className="text-muted-foreground">{trailers.length} trailers in fleet</p>
          </div>
          <Button disabled>Add Trailer</Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-green-600">{emptyCount}</p>
              <p className="text-sm text-muted-foreground">Empty</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-red-600">{fullCount}</p>
              <p className="text-sm text-muted-foreground">Full</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{waitingCount}</p>
              <p className="text-sm text-muted-foreground">Waiting Unload</p>
            </CardContent>
          </Card>
        </div>

        {/* Trailer Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {trailers.map((trailer) => (
            <Card key={trailer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle>{trailer.trailer_number}</CardTitle>
                  </div>
                  <StatusBadge status={trailer.current_status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{trailer.current_location}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Capacity: </span>
                  <span className="font-medium">{trailer.capacity_ptes.toLocaleString()} PTEs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    empty: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Empty' },
    full: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Full' },
    waiting_unload: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Waiting Unload' },
    in_transit: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Transit' },
  };
  
  const config = variants[status] || variants.empty;
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
