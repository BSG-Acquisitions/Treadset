import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserPlus } from "lucide-react";
import { useCreateDropoffCustomer } from "@/hooks/useDropoffCustomers";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useAuth } from "@/contexts/AuthContext";

interface CreateDropoffCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateDropoffCustomerDialog = ({ open, onOpenChange }: CreateDropoffCustomerDialogProps) => {
  const { user } = useAuth();
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState("one_time");
  const [pricingTierId, setPricingTierId] = useState("");
  const [requiresManifest, setRequiresManifest] = useState(false);
  const [requiresInvoicing, setRequiresInvoicing] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: pricingTiers = [] } = usePricingTiers();
  const createCustomer = useCreateDropoffCustomer();

  const handleSubmit = async () => {
    try {
      await createCustomer.mutateAsync({
        organization_id: user?.currentOrganization?.id || "",
        contact_name: contactName,
        company_name: companyName || null,
        email: email || null,
        phone: phone || null,
        customer_type: customerType as 'regular' | 'one_time',
        pricing_tier_id: pricingTierId || null,
        requires_manifest: requiresManifest,
        requires_invoicing: requiresInvoicing,
        notes: notes || null,
      });

      // Reset form
      setContactName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setCustomerType("one_time");
      setPricingTierId("");
      setRequiresManifest(false);
      setRequiresInvoicing(false);
      setNotes("");
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Drop-off Customer
          </DialogTitle>
          <DialogDescription>
            Create a new customer for tire drop-offs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(85vh-180px)] overflow-y-auto pr-2">{/* Content wrapper for scrolling */}
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerType">Customer Type</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time Customer</SelectItem>
                  <SelectItem value="regular">Regular Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {customerType === 'regular' && (
              <div className="space-y-2">
                <Label htmlFor="pricingTier">Pricing Tier</Label>
                <Select value={pricingTierId} onValueChange={setPricingTierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name} - PTE: ${tier.pte_rate}, OTR: ${tier.otr_rate}, Tractor: ${tier.tractor_rate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requires Manifest</Label>
                <div className="text-sm text-muted-foreground">
                  Always generate manifests for this customer
                </div>
              </div>
              <Switch
                checked={requiresManifest}
                onCheckedChange={setRequiresManifest}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Invoice Billing</Label>
                <div className="text-sm text-muted-foreground">
                  This customer is billed via invoice
                </div>
              </div>
              <Switch
                checked={requiresInvoicing}
                onCheckedChange={setRequiresInvoicing}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes about this customer..."
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
            disabled={!contactName || createCustomer.isPending}
          >
            {createCustomer.isPending ? "Creating..." : "Create Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};