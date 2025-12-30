import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Shield, Users, Recycle, Target, Heart, Info, Sparkles, MapPin } from "lucide-react";
import { EnvironmentalImpact } from "@/components/public/EnvironmentalImpact";
import { SectionHeader } from "@/components/public/SectionHeader";

// Images
import bsgTruckImg from "@/assets/facility/bsg-truck.jpeg";
import teamPhotoImg from "@/assets/team/team-huge-tires.jpeg";
import detroitSkylineImg from "@/assets/facility/detroit-skyline.jpeg";
export default function PublicAbout() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <SectionHeader
            eyebrow="About Us"
            title="About BSG Tire Recycling"
            titleAccent="BSG"
            subtitle="Michigan's trusted partner in sustainable tire recycling"
            size="large"
            icon={Info}
          />
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
                <SectionHeader
                  eyebrow="Who We Are"
                  title="Our Story"
                  centered={false}
                />
                <div className="space-y-4 text-muted-foreground mt-6">
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
                <div className="aspect-square rounded-3xl overflow-hidden">
                  <img 
                    src={bsgTruckImg} 
                    alt="BSG Tire Recycling truck ready for pickup service" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-12">
              <SectionHeader
                eyebrow="Our Team"
                title="The People Behind BSG"
                titleAccent="People"
                subtitle="Our dedicated team makes tire recycling simple and reliable"
                icon={Users}
              />
            </div>
            <motion.div
              className="rounded-3xl overflow-hidden shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <img 
                src={teamPhotoImg} 
                alt="The BSG Tire Recycling team" 
                className="w-full h-auto"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <SectionHeader
              eyebrow="What We Believe"
              title="Our Mission & Values"
              titleAccent="Values"
              subtitle="Guiding principles that drive everything we do"
              icon={Sparkles}
            />
          </div>

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
      <section className="py-20 bg-muted/30 relative overflow-hidden">
        {/* Detroit Skyline Background */}
        <div className="absolute inset-0">
          <img 
            src={detroitSkylineImg} 
            alt="Detroit skyline" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-muted/80 via-muted/90 to-muted" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <SectionHeader
              eyebrow="Licensed in Michigan & Ohio"
              title="Proudly Serving Michigan & Ohio"
              titleAccent="Michigan & Ohio"
              subtitle="From Metro Detroit across Southeast Michigan and into Ohio, we provide comprehensive tire recycling services to businesses and individuals throughout the region. Our network of routes and transport partners ensures we can serve you efficiently, no matter where you're located."
              icon={MapPin}
              overImage
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
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
            <SectionHeader
              eyebrow="Let's Work Together"
              title="Ready to Work With Us?"
              titleAccent="Work With Us"
              subtitle="Join the hundreds of Michigan businesses who trust BSG for their tire recycling needs."
              light
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
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
