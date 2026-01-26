import { DemoLayout } from '@/components/demo/DemoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar } from 'lucide-react';
import { DEMO_SERVICE_ZONES } from '@/lib/demo';

export default function DemoServiceZones() {
  const zones = DEMO_SERVICE_ZONES;

  return (
    <DemoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service Zones</h1>
            <p className="text-muted-foreground">{zones.length} active zones</p>
          </div>
          <Button disabled>Add Zone</Button>
        </div>

        {/* Zones Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-4 w-4 rounded-full" 
                    style={{ backgroundColor: zone.color }}
                  />
                  <CardTitle>{zone.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{zone.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Service Days:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {zone.service_days.map((day) => (
                      <Badge key={day} variant="secondary" className="text-xs">
                        {day.substring(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Counties:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {zone.county_list.map((county) => (
                      <Badge key={county} variant="outline" className="text-xs">
                        {county}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoLayout>
  );
}
