import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, Truck, MapPin, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";

export function CTASection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 lg:p-16"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/20 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/20 translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative text-center max-w-3xl mx-auto">
            <SectionHeader
              eyebrow="Get Started"
              title="Ready to Recycle Your Tires?"
              titleAccent="Tires"
              subtitle="Whether you have 5 tires or 5,000, we're here to help. Schedule a pickup or drop them off at our facility."
              icon={Recycle}
              light
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            >
              <Link to="/public-book">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-xl px-8 py-6 text-lg h-auto group"
                >
                  <Truck className="mr-2 h-5 w-5" />
                  Schedule Pickup
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              
              <Link to="/drop-off">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg h-auto group"
                >
                  <MapPin className="mr-2 h-5 w-5" />
                  Drop-off Info
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-10 flex items-center justify-center gap-2 text-primary-foreground/80"
            >
              <Phone className="h-5 w-5" />
              <span>Questions? Call us at </span>
              <a href="tel:3137310817" className="font-semibold text-white hover:underline">
                (313) 731-0817
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
