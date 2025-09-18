import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDropoffCustomers } from "@/hooks/useDropoffCustomers";
import { useCreateDropoff } from "@/hooks/useDropoffs";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, FileText, CreditCard, DollarSign } from "lucide-react";

interface ProcessDropoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomerId?: string | null;
}

export const ProcessDropoffDialog = ({ open, onOpenChange, selectedCustomerId }: ProcessDropoffDialogProps) => {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState(selectedCustomerId || "");
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  const [pteCount, setPteCount] = useState("");
  const [otrCount, setOtrCount] = useState("");
  const [tractorCount, setTractorCount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [requiresManifest, setRequiresManifest] = useState(false);
  const [notes, setNotes] = useState("");
  
  // New customer fields
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");

  const { data: customers = [], isLoading: isLoadingCustomers, error: customersError } = useDropoffCustomers();
  const { data: pricingTiers = [] } = usePricingTiers();
  const createDropoff = useCreateDropoff();

  const selectedCustomer = customers.find(c => c.id === customerId);
  const defaultPricingTier = pricingTiers.find(pt => pt.name === "Standard") || pricingTiers[0];

  // Calculate pricing
  const ptePrice = (selectedCustomer?.pricing_tiers?.pte_rate || defaultPricingTier?.pte_rate || 0);
  const otrPrice = (selectedCustomer?.pricing_tiers?.otr_rate || defaultPricingTier?.otr_rate || 0);
  const tractorPrice = (selectedCustomer?.pricing_tiers?.tractor_rate || defaultPricingTier?.tractor_rate || 0);

  const subtotal = (Number(pteCount || 0) * ptePrice) + 
                  (Number(otrCount || 0) * otrPrice) + 
                  (Number(tractorCount || 0) * tractorPrice);

  useEffect(() => {
    if (selectedCustomerId) {
      setCustomerId(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleSubmit = async () => {
    try {
      let dropoffCustomerId = customerId;
      
      // If creating new customer, we'll need to create them first
      // For now, we'll require selecting existing customer
      if (!dropoffCustomerId) {
        throw new Error("Please select a customer");
      }

      await createDropoff.mutateAsync({
        organization_id: user?.currentOrganization?.id || "", 
        dropoff_customer_id: dropoffCustomerId,
        pte_count: Number(pteCount || 0),
        otr_count: Number(otrCount || 0),
        tractor_count: Number(tractorCount || 0),
        unit_price_pte: ptePrice,
        unit_price_otr: otrPrice,
        unit_price_tractor: tractorPrice,
        computed_revenue: subtotal,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'invoice' ? 'pending' : 'paid',
        requires_manifest: requiresManifest,
        notes: notes || null,
        status: 'completed'
      });

      // Reset form
      setCustomerId("");
      setPteCount("");
      setOtrCount("");
      setTractorCount("");
      setPaymentMethod("cash");
      setRequiresManifest(false);
      setNotes("");
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing dropoff:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Tire Drop-off
          </DialogTitle>
          <DialogDescription>
            Record a new tire drop-off transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-3">
            <Label>Customer</Label>
            {customers.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                No customers found. Please create a customer first using the "Add Customer" button on the dropoffs page.
              </div>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <span>{customer.contact_name}</span>
                        {customer.company_name && (
                          <span className="text-muted-foreground">
                            ({customer.company_name})
                          </span>
                        )}
                        <Badge variant={customer.customer_type === 'regular' ? 'default' : 'secondary'}>
                          {customer.customer_type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tire Counts */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tire Counts</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pte">PTE Count</Label>
                <Input
                  id="pte"
                  type="number"
                  value={pteCount}
                  onChange={(e) => setPteCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-sm text-muted-foreground">
                  ${ptePrice}/tire
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otr">OTR Count</Label>
                <Input
                  id="otr"
                  type="number"
                  value={otrCount}
                  onChange={(e) => setOtrCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-sm text-muted-foreground">
                  ${otrPrice}/tire
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tractor">Tractor Count</Label>
                <Input
                  id="tractor"
                  type="number"
                  value={tractorCount}
                  onChange={(e) => setTractorCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-sm text-muted-foreground">
                  ${tractorPrice}/tire
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          {subtotal > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Pricing Summary</span>
                </div>
                <div className="space-y-2 text-sm">
                  {Number(pteCount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>{pteCount} PTE × ${ptePrice}</span>
                      <span>${(Number(pteCount) * ptePrice).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(otrCount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>{otrCount} OTR × ${otrPrice}</span>
                      <span>${(Number(otrCount) * otrPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(tractorCount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>{tractorCount} Tractor × ${tractorPrice}</span>
                      <span>${(Number(tractorCount) * tractorPrice).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="invoice">Invoice Later</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Requires Manifest
                </Label>
                <div className="text-sm text-muted-foreground">
                  Generate manifest document for this drop-off
                </div>
              </div>
              <Switch
                checked={requiresManifest}
                onCheckedChange={setRequiresManifest}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this drop-off..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!customerId || (!pteCount && !otrCount && !tractorCount) || createDropoff.isPending || customers.length === 0}
          >
            {createDropoff.isPending ? "Processing..." : "Process Drop-off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};