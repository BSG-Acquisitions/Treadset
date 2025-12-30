import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Truck, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const applicationSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  dotNumber: z.string().min(1, "DOT number is required"),
  mcNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  fleetSize: z.string().optional(),
  notes: z.string().optional(),
});

type ApplicationData = z.infer<typeof applicationSchema>;

export default function PublicPartnerApply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema),
  });

  const onSubmit = async (data: ApplicationData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('public-partner-application', {
        body: data
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <PublicLayout>
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <motion.div 
              className="max-w-lg mx-auto text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Application Received!</h1>
              <p className="text-muted-foreground mb-8">
                Thank you for applying to become a BSG Transport Partner. Our team will review your application and contact you within 2-3 business days.
              </p>
              <Button asChild>
                <a href="/">Return Home</a>
              </Button>
            </motion.div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-12 lg:py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Truck className="w-4 h-4" />
              Partner Application
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Apply to Become a Partner
            </h1>
            <p className="text-muted-foreground">
              Fill out the form below and our team will review your application
            </p>
          </motion.div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Company Information */}
              <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Company Information</h2>
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input 
                      id="companyName" 
                      {...register("companyName")}
                      className="mt-1.5"
                    />
                    {errors.companyName && (
                      <p className="text-destructive text-sm mt-1">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dotNumber">DOT Number *</Label>
                      <Input 
                        id="dotNumber" 
                        {...register("dotNumber")}
                        className="mt-1.5"
                      />
                      {errors.dotNumber && (
                        <p className="text-destructive text-sm mt-1">{errors.dotNumber.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="mcNumber">MC Number (if applicable)</Label>
                      <Input 
                        id="mcNumber" 
                        {...register("mcNumber")}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fleetSize">Fleet Size / Number of Trucks</Label>
                    <Input 
                      id="fleetSize" 
                      {...register("fleetSize")}
                      placeholder="e.g., 5 trucks"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input 
                      id="contactName" 
                      {...register("contactName")}
                      className="mt-1.5"
                    />
                    {errors.contactName && (
                      <p className="text-destructive text-sm mt-1">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        type="email"
                        {...register("email")}
                        className="mt-1.5"
                      />
                      {errors.email && (
                        <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input 
                        id="phone" 
                        type="tel"
                        {...register("phone")}
                        className="mt-1.5"
                      />
                      {errors.phone && (
                        <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Business Address</h2>
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input 
                      id="address" 
                      {...register("address")}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        {...register("city")}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input 
                        id="state" 
                        {...register("state")}
                        defaultValue="MI"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input 
                        id="zip" 
                        {...register("zip")}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Additional Information</h2>
                <div>
                  <Label htmlFor="notes">Tell us about your business</Label>
                  <Textarea 
                    id="notes" 
                    {...register("notes")}
                    rows={4}
                    placeholder="Types of tires you typically haul, service areas, etc."
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
