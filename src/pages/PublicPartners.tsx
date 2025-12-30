import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Shield, DollarSign, Clock, CheckCircle, FileText, Award, Handshake, ClipboardList, Zap, Smartphone, PenTool } from "lucide-react";
import { SectionHeader } from "@/components/public/SectionHeader";

// Images
import tireManifestImg from "@/assets/technology/tire-manifest.jpeg";
import treadsetSignatureImg from "@/assets/technology/treadset-signature.png";
import techSigningImg from "@/assets/team/tech-signing.jpeg";
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
                  "Michigan Tire Hauler License",
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

      {/* TreadSet Technology Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <SectionHeader
              eyebrow="Powered by TreadSet"
              title="Digital Tire Manifest System"
              titleAccent="TreadSet"
              subtitle="Our partners benefit from TreadSet's cutting-edge digital manifest and tracking technology"
              icon={Smartphone}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Technology Images */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border/50">
                <img 
                  src={tireManifestImg} 
                  alt="TreadSet digital tire manifest interface" 
                  className="w-full h-auto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden shadow-lg border border-border/50">
                  <img 
                    src={treadsetSignatureImg} 
                    alt="TreadSet digital signature capture" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="rounded-xl overflow-hidden shadow-lg border border-border/50">
                  <img 
                    src={techSigningImg} 
                    alt="Technician using TreadSet signature system" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </motion.div>

            {/* Technology Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold mb-6">Streamlined Operations for Partners</h3>
              <div className="space-y-4">
                {[
                  {
                    icon: FileText,
                    title: "Digital Manifests",
                    description: "Paperless manifest generation with instant access to all documentation"
                  },
                  {
                    icon: PenTool,
                    title: "Electronic Signatures",
                    description: "Capture signatures on-site with our mobile app for faster processing"
                  },
                  {
                    icon: Clock,
                    title: "Real-Time Tracking",
                    description: "Track loads, inventory, and payments in real-time through your partner dashboard"
                  },
                  {
                    icon: Shield,
                    title: "Compliance Ready",
                    description: "All documentation meets EPA and Michigan DEQ requirements automatically"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="flex gap-4 p-4 rounded-xl bg-card border border-border/50"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
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
