import { motion } from "framer-motion";
import { CalendarCheck, Truck, ClipboardCheck, Phone, MapPin, Recycle, Settings } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const pickupSteps = [
  {
    icon: Phone,
    title: "Request a Pickup",
    description: "Fill out our quick online form or call us. Tell us about your tire volume and preferred dates.",
  },
  {
    icon: CalendarCheck,
    title: "We Schedule You In",
    description: "We'll confirm a pickup date that works with our route and your schedule.",
  },
  {
    icon: Truck,
    title: "We Collect & Count",
    description: "Our team arrives, counts your tires, and loads them up. You get a receipt on the spot.",
  },
];

const dropoffSteps = [
  {
    icon: Phone,
    title: "Call Ahead",
    description: "Let us know you're coming. Required for 100+ tires, recommended for all.",
  },
  {
    icon: MapPin,
    title: "Visit Our Facility",
    description: "2971 Bellevue St, Detroit. Open Monday-Friday, 8:30 AM - 3:30 PM.",
  },
  {
    icon: Recycle,
    title: "We Handle the Rest",
    description: "We count, sort, and process your tires. Quick payment and you're on your way.",
  },
];

interface StepCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  stepNumber: number;
  delay: number;
}

function StepCard({ icon: Icon, title, description, stepNumber, delay }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="relative flex items-start gap-4"
    >
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {stepNumber}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <SectionHeader
            eyebrow="The Process"
            title="How It Works"
            titleAccent="Works"
            subtitle="Whether we come to you or you come to us, getting rid of old tires has never been easier."
            icon={Settings}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Pickup Service */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Pickup Service</h3>
                <p className="text-sm text-muted-foreground">For 50+ tires</p>
              </div>
            </div>
            <div className="space-y-6">
              {pickupSteps.map((step, index) => (
                <StepCard
                  key={step.title}
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  stepNumber={index + 1}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </motion.div>

          {/* Drop-off Service */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Drop-off Service</h3>
                <p className="text-sm text-muted-foreground">Any quantity welcome</p>
              </div>
            </div>
            <div className="space-y-6">
              {dropoffSteps.map((step, index) => (
                <StepCard
                  key={step.title}
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  stepNumber={index + 1}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
