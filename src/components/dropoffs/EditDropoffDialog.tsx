import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, CreditCard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { calculateTotalPTE } from "@/lib/michigan-conversions";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"] & {
  clients?: {
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
  
  // Tire counts
  const [pteCount, setPteCount] = useState("");
  const [otrCount, setOtrCount] = useState("");
  const [tractorCount, setTractorCount] = useState("");
  
  // Editable rates
  const [pteRate, setPteRate] = useState("");
  const [otrRate, setOtrRate] = useState("");
  const [tractorRate, setTractorRate] = useState("");
  
  // Payment info
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [notes, setNotes] = useState("");
  const [manualRevenue, setManualRevenue] = useState("");

  // Initialize from dropoff data
  useEffect(() => {
    if (dropoff) {
      setPteCount(String(dropoff.pte_count || 0));
      setOtrCount(String(dropoff.otr_count || 0));
      setTractorCount(String(dropoff.tractor_count || 0));
      setPteRate(dropoff.unit_price_pte ? String(dropoff.unit_price_pte) : "");
      setOtrRate(dropoff.unit_price_otr ? String(dropoff.unit_price_otr) : "");
      setTractorRate(dropoff.unit_price_tractor ? String(dropoff.unit_price_tractor) : "");
      setPaymentMethod(dropoff.payment_method || "cash");
      setPaymentStatus(dropoff.payment_status || "paid");
      setNotes(dropoff.notes || "");
      setManualRevenue(String(dropoff.computed_revenue || 0));
    }
  }, [dropoff]);

  // Calculate subtotals
  const pteSubtotal = (Number(pteCount) || 0) * (Number(pteRate) || 0);
  const otrSubtotal = (Number(otrCount) || 0) * (Number(otrRate) || 0);
  const tractorSubtotal = (Number(tractorCount) || 0) * (Number(tractorRate) || 0);
  const calculatedTotal = pteSubtotal + otrSubtotal + tractorSubtotal;

  // Auto-populate revenue when calculated total changes
  useEffect(() => {
    if (calculatedTotal > 0) {
      setManualRevenue(calculatedTotal.toFixed(2));
    }
  }, [calculatedTotal]);

  const computedPTE = calculateTotalPTE({
    pte_count: Number(pteCount || 0),
    otr_count: Number(otrCount || 0),
    tractor_count: Number(tractorCount || 0),
  });

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

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      pte_count: Number(pteCount || 0),
      otr_count: Number(otrCount || 0),
      tractor_count: Number(tractorCount || 0),
      unit_price_pte: Number(pteRate) || null,
      unit_price_otr: Number(otrRate) || null,
      unit_price_tractor: Number(tractorRate) || null,
      computed_revenue: Number(manualRevenue || 0),
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      notes: notes || null,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Drop-off</DialogTitle>
          <DialogDescription>
            Update tire counts and payment information for {dropoff.clients?.company_name || dropoff.clients?.contact_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tire Counts with Rates */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tire Counts & Pricing</Label>
            <p className="text-sm text-muted-foreground">Enter tire counts and rate per tire for each type</p>
            
            {/* Passenger Tires */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base">Passenger Tires</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Count</Label>
                  <Input
                    type="number"
                    value={pteCount}
                    onChange={(e) => setPteCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rate per tire</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={pteRate}
                      onChange={(e) => setPteRate(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {pteSubtotal > 0 && (
                <div className="text-sm text-right text-muted-foreground">
                  {pteCount} × ${pteRate} = <span className="font-medium text-foreground">${pteSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">1 tire = 1 PTE • Car/Light Truck</div>
            </div>

            {/* OTR Tires */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base">OTR Tires</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Count</Label>
                  <Input
                    type="number"
                    value={otrCount}
                    onChange={(e) => setOtrCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rate per tire</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={otrRate}
                      onChange={(e) => setOtrRate(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {otrSubtotal > 0 && (
                <div className="text-sm text-right text-muted-foreground">
                  {otrCount} × ${otrRate} = <span className="font-medium text-foreground">${otrSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">1 tire = 15 PTE • Heavy Equipment</div>
            </div>

            {/* Semi Tires */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base">Semi Tires</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Count</Label>
                  <Input
                    type="number"
                    value={tractorCount}
                    onChange={(e) => setTractorCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rate per tire</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={tractorRate}
                      onChange={(e) => setTractorRate(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {tractorSubtotal > 0 && (
                <div className="text-sm text-right text-muted-foreground">
                  {tractorCount} × ${tractorRate} = <span className="font-medium text-foreground">${tractorSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">1 tire = 5 PTE • 18-Wheeler/Semi</div>
            </div>
          </div>

          {/* Pricing Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" />
                <span className="font-medium">Pricing Summary</span>
              </div>
              <div className="space-y-2 text-sm">
                {pteSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>{pteCount} Passenger × ${pteRate}</span>
                    <span>${pteSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {otrSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>{otrCount} OTR × ${otrRate}</span>
                    <span>${otrSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {tractorSubtotal > 0 && (
                  <div className="flex justify-between">
                    <span>{tractorCount} Semi × ${tractorRate}</span>
                    <span>${tractorSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Total PTE</span>
                  <span>{computedPTE}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Calculated Total</span>
                  <span className="text-primary">${calculatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Collected */}
          <div className="space-y-3">
            <Label htmlFor="revenue" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Revenue Collected
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                min="0"
                value={manualRevenue}
                onChange={(e) => setManualRevenue(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pre-filled from pricing summary. Edit to override if actual amount differs.
            </p>
          </div>

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
