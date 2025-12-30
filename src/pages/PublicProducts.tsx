import { PublicLayout } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Recycle, Leaf, Truck, CheckCircle, Phone, ArrowRight, Palette, Construction, Fuel } from "lucide-react";
import { SectionHeader } from "@/components/public/SectionHeader";
import { useState } from "react";

// Product images
import usedTiresImg from "@/assets/products/used-tires.jpeg";
import tireShredsImg from "@/assets/products/tire-shreds.jpeg";
import mulchBlackImg from "@/assets/products/mulch-black.jpeg";
import mulchRedImg from "@/assets/products/mulch-red.jpeg";
import mulchBrownImg from "@/assets/products/mulch-brown.jpeg";
import steelWireImg from "@/assets/products/steel-wire.jpeg";
import facilityDisplayImg from "@/assets/facility/products-display.jpeg";

// Logo images for credentials section
import egleLogo from "@/assets/logos/egle.jpeg";
import detroitNewsLogo from "@/assets/logos/detroit-news.jpeg";
import michiganFarmNewsLogo from "@/assets/logos/michigan-farm-news.jpeg";

const mulchImages = {
  Red: mulchRedImg,
  Black: mulchBlackImg,
  Brown: mulchBrownImg,
};

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
    accent: "from-blue-500 to-blue-600",
    image: usedTiresImg
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
    colors: ["Red", "Black", "Brown"] as const,
    icon: Palette,
    cta: "Inquire About Pricing",
    ctaLink: "/contact",
    accent: "from-amber-500 to-orange-600",
    image: mulchBlackImg
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
    accent: "from-slate-500 to-slate-700",
    image: steelWireImg
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
    accent: "from-green-500 to-emerald-600",
    image: tireShredsImg
  }
];

function MulchColorSelector({ colors, onColorChange, selectedColor }: { 
  colors: readonly string[], 
  onColorChange: (color: string) => void,
  selectedColor: string 
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-sm font-medium">Available Colors:</span>
      <div className="flex gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedColor === color 
                ? "ring-2 ring-primary ring-offset-2" 
                : "border-border hover:scale-110"
            } ${
              color === "Red" ? "bg-red-600" :
              color === "Black" ? "bg-gray-900" :
              "bg-amber-800"
            }`}
            title={color}
            aria-label={`Select ${color} mulch`}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{selectedColor}</span>
    </div>
  );
}

export default function PublicProducts() {
  const [selectedMulchColor, setSelectedMulchColor] = useState<string>("Black");

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={facilityDisplayImg} 
            alt="BSG Tire Recycling facility showing recycled products" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        </div>
        
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
                  
                  {/* Color selector for mulch */}
                  {product.colors && (
                    <MulchColorSelector 
                      colors={product.colors}
                      selectedColor={selectedMulchColor}
                      onColorChange={setSelectedMulchColor}
                    />
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
                
                {/* Product Image */}
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="aspect-[4/3] rounded-3xl overflow-hidden relative group">
                    <img 
                      src={product.colors ? mulchImages[selectedMulchColor as keyof typeof mulchImages] : product.image}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br ${product.accent} text-white text-sm font-medium`}>
                        <product.icon className="w-4 h-4" />
                        {product.title}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-16 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Certified & Recognized
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
            <div className="flex flex-col items-center gap-3">
              <img 
                src={egleLogo} 
                alt="Michigan EGLE - Environment, Great Lakes & Energy" 
                className="h-16 md:h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
              />
              <span className="text-xs text-muted-foreground">Licensed Facility</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <img 
                src={detroitNewsLogo} 
                alt="The Detroit News" 
                className="h-12 md:h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
              />
              <span className="text-xs text-muted-foreground">Featured In</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <img 
                src={michiganFarmNewsLogo} 
                alt="Michigan Farm News" 
                className="h-12 md:h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
              />
              <span className="text-xs text-muted-foreground">Featured In</span>
            </div>
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
