import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, MapPin, Clock, CheckCircle, Recycle, Briefcase } from "lucide-react";
import { ServiceAreaPreview } from "@/components/public/ServiceAreaPreview";
import { SectionHeader } from "@/components/public/SectionHeader";

// Images
import workerTabletImg from "@/assets/team/worker-tablet.jpeg";
import bsgBuildingImg from "@/assets/facility/bsg-building.jpeg";
import industrialTiresImg from "@/assets/facility/industrial-tires.jpeg";
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

export default function PublicServices() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="What We Do"
            title="Our Services"
            titleAccent="Services"
            subtitle="Comprehensive tire recycling solutions for businesses and individuals across Michigan"
            size="large"
            icon={Briefcase}
          />
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Pickup Service */}
            <motion.div 
              className="group relative bg-card rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl"
              {...fadeInUp}
            >
              {/* Image Header */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={workerTabletImg} 
                  alt="BSG technician using tablet to manage tire pickup" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/90 backdrop-blur flex items-center justify-center">
                    <Truck className="w-7 h-7 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="p-8 lg:p-10">
                <h2 className="text-2xl lg:text-3xl font-bold mb-4">Pickup Service</h2>
                <p className="text-muted-foreground mb-6">
                  We come to you. Schedule a pickup and our professional team will collect your tires at your location.
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Minimum 50 tires per pickup</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Commercial and individual customers</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Flexible scheduling options</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>All tire types accepted</span>
                  </div>
                </div>

                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/public-book">Schedule a Pickup</Link>
                </Button>
              </div>
            </motion.div>

            {/* Drop-off Service */}
            <motion.div 
              className="group relative bg-card rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl"
              {...fadeInUp}
              transition={{ delay: 0.1 }}
            >
              {/* Image Header */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={bsgBuildingImg} 
                  alt="BSG Tire Recycling facility in Detroit" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/90 backdrop-blur flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="p-8 lg:p-10">
                <h2 className="text-2xl lg:text-3xl font-bold mb-4">Drop-off Service</h2>
                <p className="text-muted-foreground mb-6">
                  Bring your tires to our Detroit facility. Open to everyone with no minimum quantity required.
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Monday - Friday, 8:30 AM - 3:30 PM</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>2971 Bellevue St, Detroit, MI 48207</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>No minimum quantity</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>100+ tires? Call ahead to schedule</span>
                  </div>
                </div>

                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link to="/drop-off">Drop-off Details</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Accepted Tires */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <SectionHeader
              eyebrow="Tire Types"
              title="What We Accept"
              titleAccent="Accept"
              subtitle="We recycle all types of tires, with or without rims"
              icon={Recycle}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Passenger", icon: "🚗" },
              { name: "Light Truck", icon: "🛻" },
              { name: "Commercial", icon: "🚛" },
              { name: "Semi/Tractor", icon: "🚚" },
              { name: "Agricultural", icon: "🚜" },
              { name: "OTR/Mining", icon: "⚙️" },
            ].map((tire, index) => (
              <motion.div
                key={tire.name}
                className="bg-card rounded-xl p-6 text-center border border-border/50"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="text-4xl mb-3 block">{tire.icon}</span>
                <span className="font-medium text-sm">{tire.name}</span>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Recycle className="w-4 h-4" />
              With or without rims accepted
            </div>
          </motion.div>
        </div>
      </section>

      {/* Service Area */}
      <ServiceAreaPreview />

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <SectionHeader
              eyebrow="Get Started"
              title="Ready to Get Started?"
              titleAccent="Get Started"
              subtitle="Whether you have 1 tire or 1,000, we have a solution for you."
              light
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link to="/public-book">Schedule a Pickup</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/drop-off">Drop Off Tires</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
