import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateReceiverData, Receiver } from "@/hooks/useReceivers";

const receiverSchema = z.object({
  receiver_name: z.string().min(1, "Receiver name is required"),
  receiver_mailing_address: z.string().optional(),
  receiver_city: z.string().optional(),
  receiver_state: z.string().optional(),
  receiver_zip: z.string().optional(),
  receiver_phone: z.string().optional(),
  collection_site_reg: z.string().optional(),
});

interface ReceiverFormProps {
  initialData?: Partial<Receiver>;
  onSubmit: (data: CreateReceiverData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReceiverForm({ initialData, onSubmit, onCancel, isLoading }: ReceiverFormProps) {
  const form = useForm<CreateReceiverData>({
    resolver: zodResolver(receiverSchema),
    defaultValues: {
      receiver_name: initialData?.receiver_name || "",
      receiver_mailing_address: initialData?.receiver_mailing_address || "",
      receiver_city: initialData?.receiver_city || "",
      receiver_state: initialData?.receiver_state || "",
      receiver_zip: initialData?.receiver_zip || "",
      receiver_phone: initialData?.receiver_phone || "",
      collection_site_reg: initialData?.collection_site_reg || "",
    },
  });

  // Reset form when initialData changes to ensure updates are reflected
  useEffect(() => {
    if (initialData) {
      form.reset({
        receiver_name: initialData.receiver_name || "",
        receiver_mailing_address: initialData.receiver_mailing_address || "",
        receiver_city: initialData.receiver_city || "",
        receiver_state: initialData.receiver_state || "",
        receiver_zip: initialData.receiver_zip || "",
        receiver_phone: initialData.receiver_phone || "",
        collection_site_reg: initialData.collection_site_reg || "",
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="receiver_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receiver Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter receiver name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="receiver_mailing_address"
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="receiver_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Enter city" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receiver_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="Enter state" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="receiver_zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input placeholder="Enter ZIP code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receiver_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="collection_site_reg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MI Scrap Tire Collection Site Reg. #</FormLabel>
              <FormControl>
                <Input placeholder="Enter collection site registration number" {...field} />
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
            {isLoading ? "Saving..." : "Save Receiver"}
          </Button>
        </div>
      </form>
    </Form>
  );
}