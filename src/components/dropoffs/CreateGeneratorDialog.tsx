import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Factory } from "lucide-react";

interface CreateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateGeneratorDialog = ({ open, onOpenChange }: CreateGeneratorDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
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
    
    if (!user?.currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Organization not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create client instead of generator - this prevents duplicates
      const { data, error } = await supabase
        .from('clients')
        .insert({
          organization_id: user.currentOrganization.id,
          company_name: formData.generator_name,
          contact_name: formData.generator_name, // Same as company name for generators
          mailing_address: formData.generator_mailing_address || null,
          city: formData.generator_city || null,
          state: formData.generator_state || 'MI',
          zip: formData.generator_zip || null,
          phone: formData.generator_phone || null,
          county: formData.generator_county || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Client "${formData.generator_name}" created successfully`,
      });
      
      // Invalidate queries to refresh the clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-table'] });
      
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
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
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
            Create a new client as a tire source for drop-offs
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