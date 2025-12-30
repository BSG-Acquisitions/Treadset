import { MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePublicStats } from "@/hooks/usePublicStats";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SectionHeader } from "./SectionHeader";

export function ServiceAreaPreview() {
  const { data: stats } = usePublicStats();
  const [zipCode, setZipCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ served: boolean; message: string } | null>(null);

  const serviceRegions = stats?.service_regions || [
    { name: "Metro Detroit", days: ["Monday", "Friday"] },
    { name: "Southeast Michigan", days: ["Tuesday", "Wednesday"] },
    { name: "Greater Detroit Area", days: ["Thursday"] },
  ];

  const handleCheckZip = async () => {
    if (!zipCode || zipCode.length !== 5) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('public-booking', {
        body: { action: 'check-zone', zipCode }
      });

      if (error) throw error;

      if (data?.zone) {
        const serviceDays = data.zone.primary_service_days
          ?.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1))
          ?.join(" & ") || "scheduled days";
        setResult({
          served: true,
          message: `Great news! We service your area on ${serviceDays}.`
        });
      } else {
        setResult({
          served: false,
          message: "We may still be able to help! Contact us for service availability in your area."
        });
      }
    } catch (error) {
      console.error('Error checking ZIP:', error);
      setResult({
        served: false,
        message: "Contact us to check if we service your area."
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <SectionHeader
            eyebrow="Service Area"
            title="We're In Your Area This Week"
            titleAccent="This Week"
            subtitle="Our trucks are on the road throughout Southeast Michigan every week. Check if we service your area."
            icon={MapPin}
          />
        </div>

        {/* Service Regions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {serviceRegions.slice(0, 3).map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-center gap-2 text-primary mb-3">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">
                  {region.days.join(" & ")}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {region.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Regular service routes
              </p>
            </motion.div>
          ))}
        </div>

        {/* ZIP Code Checker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Check If We Service Your Area
              </h3>
            </div>
            
            <div className="flex gap-3 mb-4">
              <Input
                type="text"
                placeholder="Enter ZIP code"
                value={zipCode}
                onChange={(e) => {
                  setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5));
                  setResult(null);
                }}
                className="text-center text-lg font-medium"
                maxLength={5}
              />
              <Button 
                onClick={handleCheckZip}
                disabled={checking || zipCode.length !== 5}
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-6"
              >
                {checking ? "Checking..." : "Check"}
              </Button>
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  result.served 
                    ? "bg-green-500/10 border border-green-500/20" 
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${
                  result.served ? "text-green-600" : "text-amber-600"
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    result.served ? "text-green-700" : "text-amber-700"
                  }`}>
                    {result.message}
                  </p>
                  {result.served && (
                    <Link to="/public-book" className="inline-block mt-2">
                      <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10">
                        Schedule a Pickup →
                      </Button>
                    </Link>
                  )}
                  {!result.served && (
                    <Link to="/contact" className="inline-block mt-2">
                      <Button size="sm" variant="outline">
                        Contact Us →
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
