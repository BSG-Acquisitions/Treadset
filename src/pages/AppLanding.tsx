import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TreadSetLogo } from "@/components/TreadSetLogo";
import { Button } from "@/components/ui/button";
import { Check, Truck, FileText, BarChart3 } from "lucide-react";

export default function AppLanding() {
  const features = [
    { icon: Truck, text: "Real-time route optimization" },
    { icon: FileText, text: "Digital manifests & compliance" },
    { icon: BarChart3, text: "Complete business analytics" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <TreadSetLogo size="xl" />
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tire Logistics, Simplified
          </h1>
          <p className="text-muted-foreground text-lg">
            The complete platform for tire recycling operations management
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="min-w-[140px]">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[140px]">
            <Link to="/contact">Request a Demo</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="pt-6 space-y-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center justify-center gap-3 text-muted-foreground"
            >
              <Check className="h-5 w-5 text-primary" />
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <p className="text-sm text-muted-foreground pt-8">
          © {new Date().getFullYear()} TreadSet. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
