import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { useCreateHauler } from "@/hooks/useHaulers";

interface CreateHaulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateHaulerDialog = ({ open, onOpenChange }: CreateHaulerDialogProps) => {
  const [haulerName, setHaulerName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [miReg, setMiReg] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevents duplicate submissions

  const createHauler = useCreateHauler();

  const handleSubmit = async () => {
    // Immediately block duplicate submissions
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createHauler.mutateAsync({
        hauler_name: haulerName,
        hauler_mailing_address: mailingAddress || undefined,
        hauler_city: city || undefined,
        hauler_state: state || undefined,
        hauler_zip: zip || undefined,
        hauler_phone: phone || undefined,
        hauler_mi_reg: miReg || undefined,
        email: email || undefined,
      });

      // Reset form
      setHaulerName("");
      setMailingAddress("");
      setCity("");
      setState("");
      setZip("");
      setPhone("");
      setMiReg("");
      setEmail("");
      setIsSubmitting(false);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating hauler:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-lg w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Add Hauler
          </DialogTitle>
          <DialogDescription>
            Create a new hauler for tire transportation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
          <div className="space-y-2">
            <Label htmlFor="haulerName">Company Name *</Label>
            <Input
              id="haulerName"
              value={haulerName}
              onChange={(e) => setHaulerName(e.target.value)}
              placeholder="Don Jay Transport"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
          </div>

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

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="48201"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="miReg">Michigan Registration</Label>
            <Input
              id="miReg"
              value={miReg}
              onChange={(e) => setMiReg(e.target.value)}
              placeholder="MI registration number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!haulerName || isSubmitting || createHauler.isPending}
          >
            {isSubmitting || createHauler.isPending ? "Creating..." : "Create Hauler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
