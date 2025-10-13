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
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
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

  return (
    <div className="space-y-4">
      {filteredDropoffs.map((dropoff) => {
        const totalTires = (dropoff.pte_count || 0) + (dropoff.otr_count || 0) + (dropoff.tractor_count || 0);
        
        return (
          <Card key={dropoff.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-4">
                {/* Mobile Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {dropoff.dropoff_customers?.contact_name || 'Unknown Customer'}
                    </h3>
                    {dropoff.dropoff_customers?.company_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {dropoff.dropoff_customers.company_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={dropoff.status === 'completed' ? 'default' : 'secondary'}>
                      {dropoff.status}
                    </Badge>
                    <Badge variant={getPaymentStatusColor(dropoff.payment_status || 'pending')}>
                      {dropoff.payment_status}
                    </Badge>
                  </div>
                </div>

                {/* Date and Time - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(dropoff.dropoff_date), 'MMM dd, yyyy')}
                  </div>
                  {dropoff.dropoff_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dropoff.dropoff_time}
                    </div>
                  )}
                  {dropoff.users && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="hidden sm:inline">Processed by </span>
                      {dropoff.users.first_name} {dropoff.users.last_name}
                    </div>
                  )}
                </div>

                {/* Tire Counts - Mobile Grid */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm">
                  <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{totalTires}</span>
                    <span className="text-muted-foreground">total tires</span>
                  </div>
                  
                  {dropoff.pte_count > 0 && (
                    <div className="text-muted-foreground">
                      {dropoff.pte_count} PTE
                    </div>
                  )}
                  
                  {dropoff.otr_count > 0 && (
                    <div className="text-muted-foreground">
                      {dropoff.otr_count} OTR
                    </div>
                  )}
                  
                  {dropoff.tractor_count > 0 && (
                    <div className="text-muted-foreground">
                      {dropoff.tractor_count} Tractor
                    </div>
                  )}
                </div>

                {/* Revenue and Payment - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      ${(dropoff.computed_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {getPaymentMethodIcon(dropoff.payment_method || 'cash')}
                    <span className="capitalize">{dropoff.payment_method}</span>
                  </div>

                  {dropoff.requires_manifest && (
                    <Badge variant="outline" className="w-fit">
                      <FileText className="h-3 w-3 mr-1" />
                      Manifest Required
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                {dropoff.notes && (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {dropoff.notes}
                  </p>
                )}

                {/* Actions - Mobile Full Width */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
                  {!dropoff.manifest_id && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleGenerateManifest(dropoff)}
                      disabled={generateManifest.isPending}
                      className="w-full sm:w-auto"
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
                      variant="default"
                      onClick={() => window.open(`https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/${dropoff.manifest_pdf_path}`, '_blank')}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Manifest
                    </Button>
                  )}
                  
                  {dropoff.manifest_id && !dropoff.manifest_pdf_path && (
                    <Badge variant="secondary" className="w-fit">
                      <FileText className="h-3 w-3 mr-1" />
                      Manifest Processing...
                    </Badge>
                  )}
                  
                  <div className="flex justify-end sm:ml-auto">
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
      })}
    </div>
  );
};