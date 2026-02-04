import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Clock, 
  Building2,
  MapPin,
  Package,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { useOutboundManifests, usePendingOutboundManifests, OutboundManifestWithRelations } from '@/hooks/useOutboundManifests';
import { OutboundReceiverDialog } from '@/components/driver/OutboundReceiverDialog';

export default function DriverOutboundManifests() {
  const [selectedManifest, setSelectedManifest] = useState<OutboundManifestWithRelations | null>(null);
  const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);

  const { data: allManifests = [], isLoading: allLoading, refetch: refetchAll } = useOutboundManifests();
  const { data: pendingManifests = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingOutboundManifests();

  useEffect(() => {
    document.title = "Outbound Manifests – TreadSet";
  }, []);

  const completedManifests = allManifests.filter(m => m.status === 'COMPLETED');

  const handleCompleteDelivery = (manifest: OutboundManifestWithRelations) => {
    setSelectedManifest(manifest);
    setReceiverDialogOpen(true);
  };

  const handleReceiverComplete = () => {
    setReceiverDialogOpen(false);
    setSelectedManifest(null);
    refetchAll();
    refetchPending();
  };

  const renderManifestCard = (manifest: OutboundManifestWithRelations, showCompleteButton: boolean = false) => (
    <Card key={manifest.id} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{manifest.manifest_number}</span>
              <Badge 
                variant={manifest.status === 'COMPLETED' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {manifest.status === 'COMPLETED' ? 'Completed' : 'Pending Receiver'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{manifest.origin_entity?.legal_name}</span>
              <span>→</span>
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{manifest.destination_entity?.legal_name}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                <span>{manifest.material_form}</span>
              </div>
              <div>
                {manifest.total_pte?.toLocaleString()} PTE
              </div>
              <div>
                {format(new Date(manifest.created_at), 'MMM d, yyyy')}
              </div>
            </div>

            {/* Signature Status */}
            <div className="flex items-center gap-3 text-xs">
              {manifest.generator_signed_at && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Generator
                </span>
              )}
              {manifest.hauler_signed_at && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Hauler
                </span>
              )}
              {manifest.receiver_signed_at ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Receiver
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" />
                  Awaiting Receiver
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {showCompleteButton && !manifest.receiver_signed_at && (
              <Button 
                size="sm"
                onClick={() => handleCompleteDelivery(manifest)}
              >
                Complete Delivery
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              asChild
            >
              <Link to={`/manifests/${manifest.id}`}>
                View
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <BrandHeader 
            title="Outbound Manifests"
            subtitle="Your outbound material deliveries"
          />
          <Button asChild>
            <Link to="/driver/outbound/new">
              <Plus className="h-4 w-4 mr-2" />
              New Outbound
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingManifests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedManifests.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              All ({allManifests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : pendingManifests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Pending Deliveries</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All your outbound manifests have been completed
                  </p>
                  <Button asChild>
                    <Link to="/driver/outbound/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Outbound Manifest
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingManifests.map(manifest => renderManifestCard(manifest, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {allLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : completedManifests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Completed Manifests</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed outbound manifests will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {completedManifests.map(manifest => renderManifestCard(manifest, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {allLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : allManifests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Outbound Manifests</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first outbound manifest to get started
                  </p>
                  <Button asChild>
                    <Link to="/driver/outbound/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Outbound Manifest
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allManifests.map(manifest => renderManifestCard(manifest, !manifest.receiver_signed_at))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Receiver Signature Dialog */}
        <OutboundReceiverDialog
          manifest={selectedManifest}
          open={receiverDialogOpen}
          onOpenChange={setReceiverDialogOpen}
          onComplete={handleReceiverComplete}
        />
      </main>
    </div>
  );
}
