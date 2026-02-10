import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CreateHaulerData, Hauler } from "@/hooks/useHaulers";

const haulerSchema = z.object({
  hauler_name: z.string().min(1, "Company name is required"),
  hauler_mailing_address: z.string().optional(),
  hauler_city: z.string().optional(),
  hauler_state: z.string().optional(),
  hauler_zip: z.string().optional(),
  hauler_phone: z.string().optional(),
  hauler_mi_reg: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

interface HaulerFormProps {
  initialData?: Partial<Hauler>;
  onSubmit: (data: CreateHaulerData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function HaulerForm({ initialData, onSubmit, onCancel, isLoading }: HaulerFormProps) {
  const form = useForm<CreateHaulerData>({
    resolver: zodResolver(haulerSchema),
    defaultValues: {
      hauler_name: initialData?.hauler_name || initialData?.company_name || "",
      hauler_mailing_address: initialData?.hauler_mailing_address || initialData?.mailing_address || "",
      hauler_city: initialData?.hauler_city || initialData?.city || "",
      hauler_state: initialData?.hauler_state || initialData?.state || "",
      hauler_zip: initialData?.hauler_zip || initialData?.zip || "",
      hauler_phone: initialData?.hauler_phone || initialData?.phone || "",
      hauler_mi_reg: initialData?.hauler_mi_reg || "",
      email: initialData?.email || "",
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        hauler_name: initialData.hauler_name || initialData.company_name || "",
        hauler_mailing_address: initialData.hauler_mailing_address || initialData.mailing_address || "",
        hauler_city: initialData.hauler_city || initialData.city || "",
        hauler_state: initialData.hauler_state || initialData.state || "",
        hauler_zip: initialData.hauler_zip || initialData.zip || "",
        hauler_phone: initialData.hauler_phone || initialData.phone || "",
        hauler_mi_reg: initialData.hauler_mi_reg || "",
        email: initialData.email || "",
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="hauler_name"
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
          name="hauler_mailing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mailing Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter mailing address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="hauler_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hauler_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hauler_zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP</FormLabel>
                <FormControl>
                  <Input placeholder="ZIP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="hauler_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} />
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
                <Input type="email" placeholder="Email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hauler_mi_reg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State Registration</FormLabel>
              <FormControl>
                <Input placeholder="MI registration number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Hauler"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
