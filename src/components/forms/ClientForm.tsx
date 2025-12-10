import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientFormData, clientSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientFormProps {
  initialData?: Partial<Client>;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientForm({ initialData, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: initialData?.company_name || "",
      contact_name: initialData?.contact_name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      notes: initialData?.notes || "",
      mailing_address: initialData?.mailing_address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zip: initialData?.zip || "",
      county: initialData?.county || "",
    },
  });

  // Reset form when initialData changes to ensure updates are reflected
  useEffect(() => {
    if (initialData) {
      form.reset({
        company_name: initialData.company_name || "",
        contact_name: initialData.contact_name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        notes: initialData.notes || "",
        mailing_address: initialData.mailing_address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        zip: initialData.zip || "",
        county: initialData.county || "",
      });
    }
  }, [initialData, form]);

  const handleFormSubmit = (data: ClientFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="313-555-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Information <span className="text-destructive">*</span></h3>
          <p className="text-sm text-muted-foreground">Required for manifest generation</p>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mailing_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter city" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State *</FormLabel>
                  <FormControl>
                    <Input placeholder="MI" maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ZIP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter county" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes Section */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Special instructions, access notes, building details..." 
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Update Client" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
