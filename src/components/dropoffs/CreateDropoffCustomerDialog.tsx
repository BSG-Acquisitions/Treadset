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
  const [mailingAddress, setMailingAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [county, setCounty] = useState("");
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
        mailing_address: mailingAddress || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        county: county || null,
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
      setMailingAddress("");
      setCity("");
      setState("");
      setZip("");
      setCounty("");
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
      <DialogContent className="max-w-2xl sm:max-w-lg w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Drop-off Customer
          </DialogTitle>
          <DialogDescription>
            Create a new customer for tire drop-offs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Address Information */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Address Information (for Manifest)</h4>
              
              <div className="space-y-2">
                <Label htmlFor="mailingAddress">Mailing Address</Label>
                <Input
                  id="mailingAddress"
                  value={mailingAddress}
                  onChange={(e) => setMailingAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Detroit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="MI"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="48201"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="Wayne"
                  />
                </div>
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