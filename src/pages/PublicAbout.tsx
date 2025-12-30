import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Shield, Users, Recycle, Target, Heart } from "lucide-react";
import { EnvironmentalImpact } from "@/components/public/EnvironmentalImpact";

export default function PublicAbout() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              About BSG Tire Recycling
            </h1>
            <p className="text-xl text-muted-foreground">
              Michigan's trusted partner in sustainable tire recycling
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              className="grid lg:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    BSG Tire Recycling was founded with a simple mission: to provide Michigan 
                    businesses and individuals with a reliable, professional tire recycling service 
                    that prioritizes environmental responsibility.
                  </p>
                  <p>
                    Over the years, we've grown from a small operation to one of Michigan's 
                    leading tire recyclers, serving hundreds of businesses across the state. 
                    Our commitment to quality service and environmental stewardship has never wavered.
                  </p>
                  <p>
                    Today, we process thousands of tires every month, diverting them from 
                    landfills and giving them new life through responsible recycling practices.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Recycle className="w-24 h-24 text-primary mx-auto mb-4" />
                    <p className="text-2xl font-bold text-primary">Old Tires</p>
                    <p className="text-2xl font-bold">=</p>
                    <p className="text-2xl font-bold text-primary">New Possibilities</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Mission & Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Guiding principles that drive everything we do
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Leaf,
                title: "Environmental Stewardship",
                description: "Every tire we recycle is one less in a landfill. We're committed to sustainable practices that protect Michigan's environment."
              },
              {
                icon: Shield,
                title: "Regulatory Compliance",
                description: "Fully compliant with EPA and Michigan DEQ regulations. Licensed, insured, and operating to the highest standards."
              },
              {
                icon: Users,
                title: "Community Focus",
                description: "We serve Michigan communities with pride, providing jobs and services that make a real difference locally."
              },
              {
                icon: Target,
                title: "Reliability",
                description: "When we say we'll be there, we're there. Our customers count on us for consistent, dependable service."
              },
              {
                icon: Heart,
                title: "Customer First",
                description: "From scheduling to completion, we make tire recycling as easy as possible for our customers."
              },
              {
                icon: Recycle,
                title: "Innovation",
                description: "We continuously improve our processes and technology to better serve our customers and the environment."
              }
            ].map((value, index) => (
              <motion.div
                key={value.title}
                className="bg-card rounded-2xl p-8 border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Environmental Impact */}
      <EnvironmentalImpact />

      {/* Service Area */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">Proudly Serving Michigan</h2>
            <p className="text-muted-foreground text-lg mb-8">
              From Metro Detroit to Southeast Michigan, we provide comprehensive tire recycling 
              services to businesses and individuals throughout the region. Our network of 
              routes and transport partners ensures we can serve you efficiently, no matter 
              where you're located.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/services">View Our Services</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Get in Touch</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Work With Us?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Join the hundreds of Michigan businesses who trust BSG for their tire recycling needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/public-book">Schedule a Pickup</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/partners">Become a Partner</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
