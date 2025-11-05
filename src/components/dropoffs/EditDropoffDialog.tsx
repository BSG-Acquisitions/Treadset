import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, FileText, CreditCard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { calculateTotalPTE } from "@/lib/michigan-conversions";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"] & {
  dropoff_customers?: {
    contact_name: string;
    company_name?: string | null;
  } | null;
};

interface EditDropoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropoff: Dropoff | null;
}

export const EditDropoffDialog = ({ open, onOpenChange, dropoff }: EditDropoffDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pteCount, setPteCount] = useState("");
  const [otrCount, setOtrCount] = useState("");
  const [tractorCount, setTractorCount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (dropoff) {
      setPteCount(String(dropoff.pte_count || 0));
      setOtrCount(String(dropoff.otr_count || 0));
      setTractorCount(String(dropoff.tractor_count || 0));
      setPaymentMethod(dropoff.payment_method || "cash");
      setPaymentStatus(dropoff.payment_status || "paid");
      setNotes(dropoff.notes || "");
    }
  }, [dropoff]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('dropoffs')
        .update(updates)
        .eq('id', dropoff!.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dropoffs'] }),
        queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-tire-totals'] }),
        queryClient.invalidateQueries({ queryKey: ['yesterday-tire-totals'] }),
        queryClient.invalidateQueries({ queryKey: ['monthly-tire-totals'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-stats'] }),
      ]);
      toast({
        title: "Success",
        description: "Drop-off updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (!dropoff) return null;

  const ptePrice = dropoff.unit_price_pte || 0;
  const otrPrice = dropoff.unit_price_otr || 0;
  const tractorPrice = dropoff.unit_price_tractor || 0;

const subtotal = (Number(pteCount || 0) * ptePrice) + 
                (Number(otrCount || 0) * otrPrice) + 
                (Number(tractorCount || 0) * tractorPrice);

  const computedPTE = calculateTotalPTE({
    pte_count: Number(pteCount || 0),
    otr_count: Number(otrCount || 0),
    tractor_count: Number(tractorCount || 0),
  });

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      pte_count: Number(pteCount || 0),
      otr_count: Number(otrCount || 0),
      tractor_count: Number(tractorCount || 0),
      computed_revenue: subtotal,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      notes: notes || null,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Drop-off</DialogTitle>
          <DialogDescription>
            Update tire counts and payment information for {dropoff.dropoff_customers?.contact_name}
            {dropoff.dropoff_customers?.company_name && ` (${dropoff.dropoff_customers.company_name})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tire Counts */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tire Counts by Type</Label>
            <p className="text-sm text-muted-foreground">Update tire quantities - make sure to select the correct tire type</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pte" className="flex items-center gap-2 text-base">
                  Passenger Tires
                </Label>
                <Input
                  id="edit-pte"
                  type="number"
                  value={pteCount}
                  onChange={(e) => setPteCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>${ptePrice}/tire • Car/Light Truck</div>
                  <div className="font-medium">1 tire = 1 PTE</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-otr" className="flex items-center gap-2 text-base">
                  OTR Tires
                </Label>
                <Input
                  id="edit-otr"
                  type="number"
                  value={otrCount}
                  onChange={(e) => setOtrCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>${otrPrice}/tire • Heavy Equipment</div>
                  <div className="font-medium">1 tire = 15 PTE</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tractor" className="flex items-center gap-2 text-base">
                  Semi Tires
                </Label>
                <Input
                  id="edit-tractor"
                  type="number"
                  value={tractorCount}
                  onChange={(e) => setTractorCount(e.target.value)}
                  placeholder="0"
                />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>${tractorPrice}/tire • 18-Wheeler/Semi</div>
                  <div className="font-medium">1 tire = 5 PTE</div>
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
                      <span>{tractorCount} Semi × ${tractorPrice}</span>
                      <span>${(Number(tractorCount) * tractorPrice).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total PTE</span>
                    <span>{computedPTE}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-3">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
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
            disabled={updateMutation.isPending || (!pteCount && !otrCount && !tractorCount)}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};