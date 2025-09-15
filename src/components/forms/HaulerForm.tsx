import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { CreateHaulerData, Hauler } from "@/hooks/useHaulers";

const haulerSchema = z.object({
  hauler_name: z.string().min(1, "Hauler name is required"),
  hauler_mailing_address: z.string().optional(),
  hauler_city: z.string().optional(),
  hauler_state: z.string().optional(),
  hauler_zip: z.string().optional(),
  hauler_phone: z.string().optional(),
  hauler_mi_reg: z.string().optional(),
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
      hauler_name: initialData?.hauler_name || "",
      hauler_mailing_address: initialData?.hauler_mailing_address || "",
      hauler_city: initialData?.hauler_city || "",
      hauler_state: initialData?.hauler_state || "",
      hauler_zip: initialData?.hauler_zip || "",
      hauler_phone: initialData?.hauler_phone || "",
      hauler_mi_reg: initialData?.hauler_mi_reg || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="hauler_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hauler Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter hauler name" {...field} />
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hauler_city"
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
            name="hauler_state"
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
            name="hauler_zip"
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
            name="hauler_phone"
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
          name="hauler_mi_reg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Michigan Registration</FormLabel>
              <FormControl>
                <Input placeholder="Enter MI registration number" {...field} />
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