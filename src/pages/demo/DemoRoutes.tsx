import { DemoLayout } from '@/components/demo/DemoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Clock, Package } from 'lucide-react';
import { DEMO_PICKUPS } from '@/lib/demo';

export default function DemoRoutes() {
  const pickups = DEMO_PICKUPS;
  
  const completedCount = pickups.filter(p => p.status === 'completed').length;
  const inProgressCount = pickups.filter(p => p.status === 'in_progress').length;
  const scheduledCount = pickups.filter(p => p.status === 'scheduled').length;
  
  const totalPtes = pickups.reduce((sum, p) => sum + p.pte_count, 0);

  return (
    <DemoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Today's Routes</h1>
            <p className="text-muted-foreground">{pickups.length} pickups scheduled</p>
          </div>
          <Button disabled>Add Pickup</Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            label="Total Pickups" 
            value={pickups.length.toString()} 
            icon={<Truck className="h-4 w-4" />}
          />
          <SummaryCard 
            label="Completed" 
            value={completedCount.toString()} 
            icon={<Package className="h-4 w-4" />}
          />
          <SummaryCard 
            label="In Progress" 
            value={inProgressCount.toString()} 
            icon={<Clock className="h-4 w-4" />}
          />
          <SummaryCard 
            label="Total PTEs" 
            value={totalPtes.toLocaleString()} 
            icon={<Package className="h-4 w-4" />}
          />
        </div>

        {/* Routes List */}
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Route Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pickups.map((pickup, index) => (
                <div key={pickup.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{pickup.client.company_name}</h3>
                          <StatusBadge status={pickup.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {pickup.client.physical_address}, {pickup.client.physical_city}, {pickup.client.physical_state}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{pickup.preferred_window}</span>
                        </div>
                        {pickup.notes && (
                          <p className="mt-2 text-sm text-muted-foreground italic">
                            Note: {pickup.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">{pickup.pte_count} PTEs</p>
                      <div className="text-sm text-muted-foreground">
                        {pickup.otr_count > 0 && <span>{pickup.otr_count} OTR</span>}
                        {pickup.tractor_count > 0 && <span className="ml-2">{pickup.tractor_count} Tractor</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoLayout>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    completed: { variant: 'default', label: 'Completed' },
    in_progress: { variant: 'secondary', label: 'In Progress' },
    scheduled: { variant: 'outline', label: 'Scheduled' },
  };
  
  const config = variants[status] || variants.scheduled;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
