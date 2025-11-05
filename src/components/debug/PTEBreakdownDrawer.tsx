import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListChecks } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface PTEBreakdownDrawerProps {
  organizationId: string;
}

export function PTEBreakdownDrawer({ organizationId }: PTEBreakdownDrawerProps) {
  const [open, setOpen] = useState(false);
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');

  const { data: events = [] } = useQuery({
    queryKey: ['pte-breakdown', organizationId, yesterday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recycling_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('event_date', yesterday)
        .order('pte_equivalent', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  const manifestEvents = events.filter(e => e.source_type === 'manifest');
  const dropoffEvents = events.filter(e => e.source_type === 'dropoff');
  const pickupEvents = events.filter(e => e.source_type === 'pickup');
  
  const totalPTEs = events.reduce((sum, e) => sum + (e.pte_equivalent || 0), 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <ListChecks className="mr-2 h-4 w-4" />
          PTE Breakdown
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Yesterday's PTE Calculation Breakdown</SheetTitle>
          <SheetDescription>
            {format(addDays(new Date(), -1), 'MMMM d, yyyy')} - Unified source of truth (no double counting)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Total Events</div>
              <div className="text-2xl font-bold">{events.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Manifests</div>
              <div className="text-2xl font-bold text-blue-600">{manifestEvents.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Drop-offs</div>
              <div className="text-2xl font-bold text-green-600">{dropoffEvents.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Pickups</div>
              <div className="text-2xl font-bold text-purple-600">{pickupEvents.length}</div>
            </div>
          </div>

          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="text-sm text-muted-foreground mb-1">Total PTEs (with conversions)</div>
            <div className="text-3xl font-bold text-primary">{totalPTEs.toLocaleString()}</div>
          </div>

          {/* Event List */}
          <div>
            <h3 className="font-semibold mb-3">Event Details</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">PTE</TableHead>
                  <TableHead className="text-right">OTR</TableHead>
                  <TableHead className="text-right">Tractor</TableHead>
                  <TableHead className="text-right">Total PTEs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.event_id}>
                    <TableCell>
                      <Badge 
                        variant={
                          event.source_type === 'manifest' ? 'default' : 
                          event.source_type === 'dropoff' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {event.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.source_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right">{event.pte_count}</TableCell>
                    <TableCell className="text-right">{event.otr_count}</TableCell>
                    <TableCell className="text-right">{event.tractor_count}</TableCell>
                    <TableCell className="text-right font-bold">{event.pte_equivalent}</TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No events found for yesterday
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Calculation Explanation */}
          <div className="rounded-lg border bg-muted/50 p-4 text-sm">
            <h4 className="font-semibold mb-2">Michigan PTE Conversion Formula:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Passenger Tires (PTE): 1:1 ratio</li>
              <li>• OTR Tires: 1:15 ratio (each OTR = 15 PTEs)</li>
              <li>• Tractor/Semi Tires: 1:5 ratio (each = 5 PTEs)</li>
            </ul>
            <div className="mt-3 p-2 bg-background rounded font-mono text-xs">
              Total PTEs = PTE + (OTR × 15) + (Tractor × 5)
            </div>
          </div>

          {/* Deduplication Rules */}
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-4 text-sm">
            <h4 className="font-semibold mb-2">Deduplication Rules:</h4>
            <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
              <li>Completed manifests are the canonical source</li>
              <li>Drop-offs are ONLY included if they lack a completed manifest</li>
              <li>Pickups are ONLY included if they have no manifest at all</li>
            </ol>
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              This ensures each PTE is counted exactly once.
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}