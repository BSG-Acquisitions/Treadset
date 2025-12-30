import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Recycle, Leaf, Truck, CheckCircle, Phone, ArrowRight, Palette, Construction, Fuel } from "lucide-react";
import { SectionHeader } from "@/components/public/SectionHeader";

const products = [
  {
    id: "used-tires",
    title: "Quality Used Tires",
    subtitle: "Pick Your Own",
    description: "Browse our selection of quality inspected used tires. Every tire is air tested and checked for tread depth to ensure safety and reliability.",
    features: [
      "Air pressure tested",
      "Tread depth verified",
      "Visual inspection for damage",
      "Walk-in selection available",
      "Affordable pricing"
    ],
    icon: Package,
    cta: "Visit Our Facility",
    ctaLink: "/drop-off",
    accent: "from-blue-500 to-blue-600"
  },
  {
    id: "rubber-mulch",
    title: "Rubber Mulch",
    subtitle: "Three Premium Colors",
    description: "Eco-friendly rubber mulch made from recycled tires. Perfect for landscaping, playgrounds, and sports surfaces. Available in Red, Black, and Brown.",
    features: [
      "Long-lasting durability",
      "Won't fade, rot, or attract insects",
      "Excellent drainage",
      "Safe for playgrounds (ASTM certified)",
      "Environmentally responsible"
    ],
    colors: ["Red", "Black", "Brown"],
    icon: Palette,
    cta: "Inquire About Pricing",
    ctaLink: "/contact",
    accent: "from-amber-500 to-orange-600"
  },
  {
    id: "recycled-steel",
    title: "Recycled Steel Wire",
    subtitle: "Industrial Grade",
    description: "High-quality steel wire extracted from recycled tires. Clean, sorted, and ready for industrial applications and steel recycling facilities.",
    features: [
      "Clean extracted steel",
      "Sorted and baled",
      "Bulk quantities available",
      "Competitive pricing",
      "Sustainable sourcing"
    ],
    icon: Construction,
    cta: "Request Quote",
    ctaLink: "/contact",
    accent: "from-slate-500 to-slate-700"
  },
  {
    id: "tire-shreds",
    title: "Tire Shreds",
    subtitle: "Various Sizes Available",
    description: "Processed tire shreds available in multiple sizes for various applications including tire-derived fuel, civil engineering, and landscaping.",
    features: [
      "Multiple size options",
      "Tire-derived fuel (TDF)",
      "Civil engineering fill",
      "Drainage applications",
      "Export available"
    ],
    icon: Fuel,
    cta: "Learn More",
    ctaLink: "/contact",
    accent: "from-green-500 to-emerald-600"
  }
];

export default function PublicProducts() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <SectionHeader
            eyebrow="Our Products"
            title="Sustainable Tire Products"
            titleAccent="Products"
            subtitle="From quality used tires to recycled materials, we give tires new life through responsible processing"
            size="large"
            icon={Package}
          />
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-24">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                id={product.id}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                {/* Content */}
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.accent} flex items-center justify-center`}>
                      <product.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {product.subtitle}
                    </span>
                  </div>
                  
                  <h2 className="text-3xl lg:text-4xl font-bold mb-4">{product.title}</h2>
                  <p className="text-lg text-muted-foreground mb-6">{product.description}</p>
                  
                  {/* Color swatches for mulch */}
                  {product.colors && (
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-sm font-medium">Available Colors:</span>
                      <div className="flex gap-2">
                        {product.colors.map((color) => (
                          <div
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 border-border flex items-center justify-center ${
                              color === "Red" ? "bg-red-600" :
                              color === "Black" ? "bg-gray-900" :
                              "bg-amber-800"
                            }`}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button asChild size="lg">
                    <Link to={product.ctaLink}>
                      {product.cta}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                
                {/* Visual */}
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <div className={`aspect-[4/3] rounded-3xl bg-gradient-to-br ${product.accent} p-8 flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative text-center text-white">
                      <product.icon className="w-24 h-24 mx-auto mb-4 opacity-90" />
                      <p className="text-xl font-semibold">{product.title}</p>
                      <p className="text-white/80 mt-2">Premium Quality</p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Environmental Impact */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <SectionHeader
              eyebrow="Sustainability"
              title="Every Product Tells a Story"
              titleAccent="Story"
              subtitle="Each of our products represents tires saved from landfills and given new purpose. When you choose BSG products, you're choosing sustainability."
              icon={Leaf}
            />
            
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Recycle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">100%</h3>
                <p className="text-muted-foreground">Of every tire is recycled or reused</p>
              </div>
              
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">Zero</h3>
                <p className="text-muted-foreground">Tires sent to landfills</p>
              </div>
              
              <div className="bg-card rounded-2xl p-6 border border-border/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">Local</h3>
                <p className="text-muted-foreground">Michigan & Ohio operations</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <SectionHeader
              eyebrow="Get Started"
              title="Interested in Our Products?"
              titleAccent="Products"
              subtitle="Contact us for pricing, availability, and bulk order inquiries. We're here to help you find the right solution."
              light
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="tel:3137310817">
                  <Phone className="mr-2 w-4 h-4" />
                  (313) 731-0817
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
