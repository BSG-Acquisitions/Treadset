import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, Home, Truck, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";

const audiences = [
  {
    icon: Building2,
    title: "Tire Shops & Dealers",
    description: "Regular pickup service tailored to your volume. Flexible scheduling, competitive rates, and reliable manifests for compliance.",
    features: ["Scheduled Route Service", "Trailers for High Volume", "Compliance Documentation"],
    cta: "Schedule Business Pickup",
    href: "/public-book",
  },
  {
    icon: Home,
    title: "Homeowners & Individuals",
    description: "Drop off any quantity at our facility, or schedule a pickup for 50+ tires. Quick, easy, and environmentally responsible.",
    features: ["Walk-in Drop-offs Welcome", "Pickup for 50+ Tires", "Fair Pricing"],
    cta: "Learn About Drop-offs",
    href: "/drop-off",
  },
  {
    icon: Truck,
    title: "Transport Partners",
    description: "Join our network of licensed haulers. Special partner rates, consistent work, and professional support.",
    features: ["Partner Rates", "Steady Opportunities", "DOT Compliant"],
    cta: "Become a Partner",
    href: "/partners",
  },
];

export function WhoWeServe() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <SectionHeader
            eyebrow="Our Customers"
            title="Who We Serve"
            subtitle="From commercial tire dealers to homeowners with a few old tires, we make tire recycling simple for everyone."
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative bg-card border border-border rounded-2xl p-6 lg:p-8 h-full flex flex-col hover:border-primary/30 transition-colors duration-300">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <audience.icon className="h-7 w-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {audience.title}
                </h3>
                <p className="text-muted-foreground mb-6 flex-grow">
                  {audience.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {audience.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to={audience.href}>
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 hover:bg-primary/10 group/btn"
                  >
                    {audience.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
