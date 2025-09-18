import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  DollarSign, 
  Package,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type DropoffCustomer = Database["public"]["Tables"]["dropoff_customers"]["Row"] & {
  pricing_tiers?: { name: string; pte_rate: number; otr_rate: number; tractor_rate: number } | null;
};

interface DropoffCustomersListProps {
  customers: DropoffCustomer[];
  loading: boolean;
  searchTerm: string;
  onSelectCustomer: (customerId: string) => void;
}

export const DropoffCustomersList = ({ 
  customers, 
  loading, 
  searchTerm,
  onSelectCustomer 
}: DropoffCustomersListProps) => {
  
  const filteredCustomers = customers.filter(customer => 
    customer.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

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

  if (filteredCustomers.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {searchTerm ? 'No customers match your search' : 'No drop-off customers found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredCustomers.map((customer) => (
        <Card key={customer.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{customer.contact_name}</h3>
                    {customer.company_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {customer.company_name}
                      </p>
                    )}
                  </div>
                  <Badge variant={customer.customer_type === 'regular' ? 'default' : 'secondary'}>
                    {customer.customer_type}
                  </Badge>
                  {!customer.is_active && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{customer.total_dropoffs || 0}</span>
                    <span className="text-muted-foreground">drop-offs</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      ${(customer.lifetime_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted-foreground">revenue</span>
                  </div>

                  {customer.last_dropoff_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Last: {format(new Date(customer.last_dropoff_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Special Flags */}
                <div className="flex gap-2">
                  {customer.requires_manifest && (
                    <Badge variant="outline">Requires Manifest</Badge>
                  )}
                  {customer.requires_invoicing && (
                    <Badge variant="outline">Invoice Billing</Badge>
                  )}
                  {customer.pricing_tiers && (
                    <Badge variant="outline">
                      {customer.pricing_tiers.name} Pricing
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                {customer.notes && (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {customer.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => onSelectCustomer(customer.id)}
                  size="sm"
                >
                  Process Drop-off
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Customer
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Customer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};