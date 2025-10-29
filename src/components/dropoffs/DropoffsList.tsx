import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Package,
  User,
  Building2,
  CreditCard,
  MoreHorizontal,
  Edit,
  Receipt,
  Loader2,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useGenerateDropoffManifest } from "@/hooks/useDropoffManifest";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"] & {
  dropoff_customers?: {
    contact_name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  users?: {
    first_name?: string | null;
    last_name?: string | null;
    email: string;
  } | null;
  pricing_tiers?: {
    name: string;
  } | null;
};

interface DropopffsListProps {
  dropoffs: Dropoff[];
  loading: boolean;
  searchTerm: string;
}

export const DropoffsList = ({ dropoffs, loading, searchTerm }: DropopffsListProps) => {
  const generateManifest = useGenerateDropoffManifest();
  
  const filteredDropoffs = dropoffs.filter(dropoff => 
    dropoff.dropoff_customers?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dropoff.dropoff_customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dropoff.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group dropoffs by time period
  const groupDropoffsByPeriod = (dropoffList: Dropoff[]) => {
    const now = new Date();
    const groups: Record<string, Dropoff[]> = {
      'This Week': [],
      'Last Week': [],
      'This Month': [],
      'Last Month': [],
      'Older': []
    };

    dropoffList.forEach(dropoff => {
      const date = new Date(dropoff.dropoff_date);
      
      if (isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) })) {
        groups['This Week'].push(dropoff);
      } else if (isWithinInterval(date, { start: startOfWeek(subDays(now, 7)), end: endOfWeek(subDays(now, 7)) })) {
        groups['Last Week'].push(dropoff);
      } else if (isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })) {
        groups['This Month'].push(dropoff);
      } else if (isWithinInterval(date, { start: startOfMonth(subDays(now, 30)), end: endOfMonth(subDays(now, 30)) })) {
        groups['Last Month'].push(dropoff);
      } else {
        groups['Older'].push(dropoff);
      }
    });

    // Remove empty groups and return as array
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const handleGenerateManifest = (dropoff: Dropoff) => {
    generateManifest.mutate(dropoff);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'invoiced':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-3 w-3" />;
      case 'cash':
        return <DollarSign className="h-3 w-3" />;
      case 'check':
        return <Receipt className="h-3 w-3" />;
      case 'invoice':
        return <FileText className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredDropoffs.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {searchTerm ? 'No drop-offs match your search' : 'No drop-offs found'}
        </p>
      </div>
    );
  }

  const groupedDropoffs = groupDropoffsByPeriod(filteredDropoffs);

  const renderDropoffCard = (dropoff: Dropoff) => {
    const totalTires = (dropoff.pte_count || 0) + (dropoff.otr_count || 0) + (dropoff.tractor_count || 0);
    
    return (
      <Card key={dropoff.id} className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base truncate">
                    {dropoff.dropoff_customers?.contact_name || 'Unknown Customer'}
                  </h3>
                  {dropoff.dropoff_customers?.company_name && (
                    <Badge variant="outline" className="text-xs">
                      {dropoff.dropoff_customers.company_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(dropoff.dropoff_date), 'MMM dd, yyyy')}
                  </span>
                  {dropoff.dropoff_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dropoff.dropoff_time}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge variant={getPaymentStatusColor(dropoff.payment_status || 'pending')}>
                  {dropoff.payment_status}
                </Badge>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{totalTires}</span>
                <span className="text-muted-foreground">tires</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  ${(dropoff.computed_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {getPaymentMethodIcon(dropoff.payment_method || 'cash')}
                <span className="capitalize text-xs">{dropoff.payment_method}</span>
              </div>
            </div>

            {/* Tire Breakdown */}
            {(dropoff.pte_count > 0 || dropoff.otr_count > 0 || dropoff.tractor_count > 0) && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                {dropoff.pte_count > 0 && <span>{dropoff.pte_count} PTE</span>}
                {dropoff.otr_count > 0 && <span>{dropoff.otr_count} OTR</span>}
                {dropoff.tractor_count > 0 && <span>{dropoff.tractor_count} Tractor</span>}
              </div>
            )}

            {/* Notes */}
            {dropoff.notes && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {dropoff.notes}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {!dropoff.manifest_id && dropoff.requires_manifest && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleGenerateManifest(dropoff)}
                  disabled={generateManifest.isPending}
                >
                  {generateManifest.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Manifest
                </Button>
              )}
              
              {dropoff.manifest_id && dropoff.manifest_pdf_path && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/${dropoff.manifest_pdf_path}`, '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Manifest
                </Button>
              )}
              
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Drop-off
                    </DropdownMenuItem>
                    {dropoff.manifest_id && dropoff.manifest_pdf_path && (
                      <DropdownMenuItem onClick={() => window.open(`https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/${dropoff.manifest_pdf_path}`, '_blank')}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Manifest
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </DropdownMenuItem>
                    {dropoff.payment_status === 'pending' && (
                      <DropdownMenuItem>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {groupedDropoffs.map(([period, dropoffList]) => (
        <Collapsible key={period} defaultOpen>
          <div className="rounded-md border">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                <h3 className="font-semibold">{period}</h3>
                <Badge variant="secondary">{dropoffList.length}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {dropoffList.reduce((sum, d) => sum + (d.computed_revenue || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-3">
                {dropoffList.map((dropoff) => renderDropoffCard(dropoff))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
};