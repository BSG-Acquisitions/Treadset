import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Shield, DollarSign, Clock, CheckCircle, FileText, Award, Handshake, ClipboardList, Zap } from "lucide-react";
import { SectionHeader } from "@/components/public/SectionHeader";

export default function PublicPartners() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <SectionHeader
            eyebrow="Transport Partner Program"
            title="Partner With BSG"
            titleAccent="BSG"
            subtitle="Join Michigan's premier tire recycling network. Special pricing for registered transport partners."
            size="large"
            icon={Truck}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mt-8"
          >
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/partner-apply">Apply for Partnership</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <SectionHeader
              eyebrow="Benefits"
              title="Why Partner With Us"
              titleAccent="Partner"
              subtitle="We've built a reliable network for tire haulers who need consistent, professional service"
              icon={Handshake}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: "Competitive Partner Rates",
                description: "Special pricing available for registered transport partners with valid DOT numbers and Michigan registration."
              },
              {
                icon: Clock,
                title: "Priority Service",
                description: "Partners get priority scheduling and faster turnaround times at our facility."
              },
              {
                icon: Shield,
                title: "Reliable Network",
                description: "Join a trusted network of professional haulers serving businesses across Michigan."
              },
              {
                icon: FileText,
                title: "Simple Documentation",
                description: "Streamlined manifest and documentation process for every load."
              },
              {
                icon: Award,
                title: "EPA Compliant",
                description: "All recycling operations are fully compliant with EPA and Michigan DEQ regulations."
              },
              {
                icon: Truck,
                title: "Dedicated Support",
                description: "Direct line to our operations team for scheduling and support."
              }
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <SectionHeader
                eyebrow="Requirements"
                title="Partnership Requirements"
                subtitle="To become a BSG Transport Partner, you'll need the following"
                icon={ClipboardList}
              />
            </div>

            <motion.div 
              className="bg-card rounded-3xl p-8 lg:p-12 border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Valid DOT Number",
                  "Michigan Registration",
                  "Current Business License",
                  "Proof of Insurance",
                  "MC Number (if applicable)",
                  "Fleet Information"
                ].map((req, index) => (
                  <div key={req} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{req}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <SectionHeader
              eyebrow="Simple Process"
              title="How It Works"
              titleAccent="Works"
              subtitle="Simple steps to become a partner"
              icon={Zap}
            />
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Apply", description: "Fill out our partnership application with your business details and credentials." },
                { step: "2", title: "Review", description: "Our team reviews your application and verifies your documentation." },
                { step: "3", title: "Start Hauling", description: "Once approved, you'll receive partner pricing and can start bringing loads." }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <SectionHeader
              eyebrow="Join Our Network"
              title="Ready to Join Our Network?"
              titleAccent="Network"
              subtitle="Apply today and start benefiting from partner rates and priority service."
              light
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link to="/partner-apply">Apply Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
