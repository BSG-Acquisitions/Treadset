import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Factory } from "lucide-react";

interface CreateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateGeneratorDialog = ({ open, onOpenChange }: CreateGeneratorDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    generator_name: "",
    generator_mailing_address: "",
    generator_city: "",
    generator_state: "MI",
    generator_zip: "",
    generator_phone: "",
    generator_county: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.generator_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Generator name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('generators')
        .insert({
          generator_name: formData.generator_name,
          generator_mailing_address: formData.generator_mailing_address || null,
          generator_city: formData.generator_city || null,
          generator_state: formData.generator_state || 'MI',
          generator_zip: formData.generator_zip || null,
          generator_phone: formData.generator_phone || null,
          generator_county: formData.generator_county || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generator "${formData.generator_name}" created successfully`,
      });
      
      // Invalidate queries to refresh the generators list
      queryClient.invalidateQueries({ queryKey: ['generators'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      // Reset form and close dialog
      setFormData({
        generator_name: "",
        generator_mailing_address: "",
        generator_city: "",
        generator_state: "MI",
        generator_zip: "",
        generator_phone: "",
        generator_county: "",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating generator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create generator",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Add New Generator
          </DialogTitle>
          <DialogDescription>
            Create a new generator (tire source) for manifests
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generator_name">Generator Name *</Label>
            <Input
              id="generator_name"
              value={formData.generator_name}
              onChange={(e) => setFormData({ ...formData, generator_name: e.target.value })}
              placeholder="Company or facility name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generator_mailing_address">Mailing Address</Label>
            <Input
              id="generator_mailing_address"
              value={formData.generator_mailing_address}
              onChange={(e) => setFormData({ ...formData, generator_mailing_address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="generator_city">City</Label>
              <Input
                id="generator_city"
                value={formData.generator_city}
                onChange={(e) => setFormData({ ...formData, generator_city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generator_state">State</Label>
              <Input
                id="generator_state"
                value={formData.generator_state}
                onChange={(e) => setFormData({ ...formData, generator_state: e.target.value })}
                placeholder="MI"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="generator_zip">ZIP Code</Label>
              <Input
                id="generator_zip"
                value={formData.generator_zip}
                onChange={(e) => setFormData({ ...formData, generator_zip: e.target.value })}
                placeholder="48101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generator_phone">Phone</Label>
              <Input
                id="generator_phone"
                value={formData.generator_phone}
                onChange={(e) => setFormData({ ...formData, generator_phone: e.target.value })}
                placeholder="(734) 555-0100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="generator_county">County</Label>
            <Input
              id="generator_county"
              value={formData.generator_county}
              onChange={(e) => setFormData({ ...formData, generator_county: e.target.value })}
              placeholder="Wayne"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Generator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};