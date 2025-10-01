import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientFormData, clientSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { useLocations } from "@/hooks/useLocations";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientFormProps {
  initialData?: Partial<Client>;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientForm({ initialData, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const { data: pricingTiers = [] } = usePricingTiers();
  const [tagInput, setTagInput] = useState("");

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: initialData?.company_name || "",
      contact_name: initialData?.contact_name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      notes: initialData?.notes || "",
      tags: initialData?.tags || [],
      sla_weeks: initialData?.sla_weeks || undefined,
      pricing_tier_id: initialData?.pricing_tier_id || undefined,
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
        tags: initialData.tags || [],
        sla_weeks: initialData.sla_weeks || undefined,
        pricing_tier_id: initialData.pricing_tier_id || undefined,
        mailing_address: initialData.mailing_address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        zip: initialData.zip || "",
        county: initialData.county || "",
      });
    }
  }, [initialData, form]);

  const watchedTags = form.watch("tags") || [];

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !watchedTags.includes(trimmedTag)) {
      form.setValue("tags", [...watchedTags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue("tags", watchedTags.filter(tag => tag !== tagToRemove));
  };

  const handleFormSubmit = (data: ClientFormData) => {
    onSubmit(data);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sla_weeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SLA Weeks</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="2" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mailing Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mailing_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
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
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Detroit" {...field} />
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
                  <FormLabel>State</FormLabel>
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
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input placeholder="48207" {...field} />
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
                  <FormLabel>County</FormLabel>
                  <FormControl>
                    <Input placeholder="Wayne" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="pricing_tier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Tier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pricingTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} {tier.rate && `($${tier.rate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input
                    placeholder="Type a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => tagInput && addTag(tagInput)}
                  />
                  {watchedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {watchedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..." 
                  rows={4}
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