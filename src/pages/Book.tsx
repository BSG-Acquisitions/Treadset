import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  date: z.string(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Book() {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    document.title = "Book a Pickup – BSG";
  }, []);

  const onSubmit = (data: FormData) => {
    console.log("Demo submit", data);
    toast({ title: "Request submitted", description: "We’ll contact you soon. (Demo)" });
    reset();
  };

  return (
    <main className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Book a Pickup</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" {...register("company")} aria-invalid={!!errors.company} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Location Address</Label>
              <Input id="address" {...register("address")} aria-invalid={!!errors.address} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Preferred Date</Label>
                <Input id="date" type="date" {...register("date")} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} {...register("notes")} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="brand">Submit</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
