import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { ClientSegment } from "@/hooks/useClientAnalyticsDeep";
import { useNavigate } from "react-router-dom";

interface ClientHealthPanelProps {
  growingClients: ClientSegment[];
  stableClients: ClientSegment[];
  decliningClients: ClientSegment[];
  newClients: ClientSegment[];
  atRiskClients: ClientSegment[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

function ClientCard({ client, type }: { client: ClientSegment; type: 'growing' | 'stable' | 'declining' | 'new' | 'atRisk' }) {
  const navigate = useNavigate();
  
  const getIcon = () => {
    switch (type) {
      case 'growing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-blue-500" />;
      case 'new': return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'atRisk': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getBadgeVariant = () => {
    switch (type) {
      case 'growing': return 'default';
      case 'declining': return 'destructive';
      case 'stable': return 'secondary';
      case 'new': return 'outline';
      case 'atRisk': return 'destructive';
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/clients/${client.client_id}`)}
    >
      <div className="flex items-center gap-3 min-w-0">
        {getIcon()}
        <div className="min-w-0">
          <p className="font-medium truncate">{client.company_name}</p>
          <p className="text-xs text-muted-foreground">
            {client.current_pickups} pickups • {formatCurrency(client.current_revenue)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {type !== 'new' && type !== 'atRisk' && (
          <Badge variant={getBadgeVariant()} className="text-xs">
            {client.change_percent > 0 ? '+' : ''}{Math.round(client.change_percent)}%
          </Badge>
        )}
        {type === 'atRisk' && (
          <Badge variant="destructive" className="text-xs">
            {client.days_since_pickup}d ago
          </Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function SegmentCard({ 
  title, 
  clients, 
  type, 
  emptyMessage 
}: { 
  title: string; 
  clients: ClientSegment[]; 
  type: 'growing' | 'stable' | 'declining' | 'new' | 'atRisk';
  emptyMessage: string;
}) {
  const getHeaderClass = () => {
    switch (type) {
      case 'growing': return 'border-l-4 border-l-green-500';
      case 'declining': return 'border-l-4 border-l-red-500';
      case 'stable': return 'border-l-4 border-l-blue-500';
      case 'new': return 'border-l-4 border-l-purple-500';
      case 'atRisk': return 'border-l-4 border-l-orange-500';
    }
  };

  return (
    <Card className={getHeaderClass()}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          <Badge variant="outline" className="ml-2">{clients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
        ) : (
          clients.slice(0, 5).map(client => (
            <ClientCard key={client.client_id} client={client} type={type} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ClientHealthPanel({
  growingClients,
  stableClients,
  decliningClients,
  newClients,
  atRiskClients,
}: ClientHealthPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SegmentCard 
          title="🚀 Growing Clients" 
          clients={growingClients} 
          type="growing"
          emptyMessage="No growing clients this period"
        />
        <SegmentCard 
          title="⚠️ At-Risk Clients" 
          clients={atRiskClients} 
          type="atRisk"
          emptyMessage="No at-risk clients detected"
        />
        <SegmentCard 
          title="📉 Declining Clients" 
          clients={decliningClients} 
          type="declining"
          emptyMessage="No declining clients this period"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentCard 
          title="✨ New Clients" 
          clients={newClients} 
          type="new"
          emptyMessage="No new clients this period"
        />
        <SegmentCard 
          title="📊 Stable Clients" 
          clients={stableClients} 
          type="stable"
          emptyMessage="No stable clients this period"
        />
      </div>
    </div>
  );
}
