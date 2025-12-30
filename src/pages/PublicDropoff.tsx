import { motion } from "framer-motion";
import { Phone, MapPin, Clock, AlertCircle, CheckCircle2, Car, Navigation } from "lucide-react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { MichiganMap } from "@/components/public/MichiganMap";

const steps = [
  {
    number: 1,
    title: "Call Ahead (Recommended)",
    description: "Let us know you're coming. This is required for 100+ tires to ensure we have staff ready.",
    icon: Phone,
    highlight: true,
  },
  {
    number: 2,
    title: "Arrive During Business Hours",
    description: "Monday through Friday, 8:30 AM to 3:30 PM. We're located at 2971 Bellevue St, Detroit, MI 48207.",
    icon: Clock,
  },
  {
    number: 3,
    title: "Check In at the Office",
    description: "Pull up to the main office building and let our team know you're here for a tire drop-off.",
    icon: MapPin,
  },
  {
    number: 4,
    title: "We Count and Sort",
    description: "Our team will count and sort your tires by type. You're welcome to stay or wait in your vehicle.",
    icon: CheckCircle2,
  },
  {
    number: 5,
    title: "Payment and Done!",
    description: "We'll provide pricing based on tire count and type. Accept payment and you're on your way!",
    icon: Car,
  },
];

const acceptedTires = [
  "Passenger car tires (on or off rim)",
  "Light truck tires",
  "Commercial truck tires",
  "Semi/trailer tires",
  "Agricultural/tractor tires",
  "OTR (Off-The-Road) tires",
];

export default function PublicDropoff() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="pt-12 pb-8 lg:pt-20 lg:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Drop Off Your Tires
            </h1>
            <p className="text-lg text-muted-foreground">
              Bring your tires directly to our Detroit facility. Any quantity welcome, 
              no appointment needed for under 100 tires.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center"
            >
              <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
              <p className="text-lg font-bold text-primary">Mon-Fri</p>
              <p className="text-muted-foreground">8:30 AM - 3:30 PM</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-6 text-center"
            >
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
              <a href="tel:3137310817" className="text-lg font-bold text-primary hover:underline">
                (313) 731-0817
              </a>
              <p className="text-muted-foreground">Required for 100+ tires</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-6 text-center"
            >
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Location</h3>
              <p className="text-muted-foreground">2971 Bellevue St</p>
              <p className="text-muted-foreground">Detroit, MI 48207</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Step by Step Process */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Step-by-Step Process
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dropping off tires is quick and easy. Here's what to expect when you arrive.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative flex gap-6 ${
                  step.highlight 
                    ? "bg-primary/5 border-2 border-primary/20" 
                    : "bg-card border border-border"
                } rounded-2xl p-6`}
              >
                <div className="shrink-0">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    step.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-primary">STEP {step.number}</span>
                    {step.highlight && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                        IMPORTANT
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Find Us
              </h2>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">BSG Tire Recycling</p>
                    <p className="text-muted-foreground">2971 Bellevue St</p>
                    <p className="text-muted-foreground">Detroit, MI 48207</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Navigation className="h-5 w-5 text-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Directions</p>
                    <p className="text-muted-foreground">
                      Near I-75 and I-94 interchange. Take the Gratiot Ave exit 
                      and head south. Turn left on Bellevue St.
                    </p>
                  </div>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=2971+Bellevue+St+Detroit+MI+48207"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  <Navigation className="mr-2 h-4 w-4" />
                  Get Directions
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="h-80 lg:h-96"
            >
              <MichiganMap />
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Accept */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-foreground mb-4">
                What We Accept
              </h2>
              <p className="text-muted-foreground">
                We accept all types of tires, with or without rims.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-6 lg:p-8"
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {acceptedTires.map((tire) => (
                  <li key={tire} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-foreground">{tire}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Important Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 flex gap-4"
            >
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-700 mb-1">
                  100+ Tire Rule
                </h4>
                <p className="text-amber-700/80 text-sm">
                  If you're bringing more than 100 tires, please call ahead at{" "}
                  <a href="tel:3137310817" className="font-semibold underline">
                    (313) 731-0817
                  </a>{" "}
                  to schedule your drop-off. This ensures we have adequate staff 
                  available to assist you efficiently.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
