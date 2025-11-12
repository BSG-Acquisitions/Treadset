import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2 } from "lucide-react";

interface EditPickupRevenueDialogProps {
  pickupId: string;
  manifestId?: string;
  clientName: string;
  currentRevenue?: number;
  trigger?: React.ReactNode;
}

export function EditPickupRevenueDialog({
  pickupId,
  manifestId,
  clientName,
  currentRevenue = 0,
  trigger,
}: EditPickupRevenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [revenue, setRevenue] = useState<string>(currentRevenue.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    const revenueAmount = parseFloat(revenue);
    
    if (isNaN(revenueAmount) || revenueAmount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid revenue amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update pickup revenue
      const { error: pickupError } = await supabase
        .from('pickups')
        .update({
          computed_revenue: revenueAmount,
          final_revenue: revenueAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pickupId);

      if (pickupError) throw pickupError;

      // Update manifest total if manifest exists
      if (manifestId) {
        const { error: manifestError } = await supabase
          .from('manifests')
          .update({
            total: revenueAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', manifestId);

        if (manifestError) throw manifestError;
      }

      toast({
        title: "Revenue Updated",
        description: `Revenue for ${clientName} has been set to $${revenueAmount.toFixed(2)}`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating revenue:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update revenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <DollarSign className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Revenue</DialogTitle>
          <DialogDescription>
            Manually enter the revenue amount for {clientName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="revenue">Revenue Amount ($)</Label>
            <Input
              id="revenue"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Revenue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
