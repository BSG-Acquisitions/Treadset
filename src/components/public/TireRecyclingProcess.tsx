import { motion } from "framer-motion";
import { Truck, Search, Scissors, Cog, Package, ArrowRight, Recycle } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const processSteps = [
  {
    step: 1,
    title: "Collection",
    description: "Tires are collected from businesses across Michigan and Ohio through our pickup service, drop-offs, and transport partners.",
    icon: Truck,
    color: "from-blue-500 to-blue-600",
    details: ["Scheduled pickups", "Drop-off facility", "Partner network"]
  },
  {
    step: 2,
    title: "Inspection & Sorting",
    description: "Every tire is inspected for quality. Usable tires are set aside for resale, while damaged tires proceed to recycling.",
    icon: Search,
    color: "from-amber-500 to-orange-500",
    details: ["Quality assessment", "Tread depth check", "Air pressure test"]
  },
  {
    step: 3,
    title: "Shredding",
    description: "Tires are fed through industrial shredders that break them down into smaller pieces while separating steel and rubber.",
    icon: Scissors,
    color: "from-red-500 to-red-600",
    details: ["Industrial shredders", "Steel extraction", "Size reduction"]
  },
  {
    step: 4,
    title: "Processing",
    description: "Shredded material is further processed. Steel is cleaned and baled. Rubber is ground and colored for mulch or sized for shreds.",
    icon: Cog,
    color: "from-purple-500 to-purple-600",
    details: ["Steel cleaning", "Rubber grinding", "Color treatment"]
  },
  {
    step: 5,
    title: "New Products",
    description: "Materials become valuable products: quality used tires, colorful rubber mulch, recycled steel, and tire shreds for various applications.",
    icon: Package,
    color: "from-green-500 to-emerald-600",
    details: ["Used tires", "Rubber mulch", "Recycled steel", "Tire shreds"]
  }
];

export function TireRecyclingProcess() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <SectionHeader
          eyebrow="Our Process"
          title="How Tire Recycling Works"
          titleAccent="Works"
          subtitle="See how we transform old tires into valuable products through our sustainable recycling process"
          icon={Recycle}
        />

        {/* Process Timeline */}
        <div className="mt-16 relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-500 via-red-500 via-purple-500 to-green-500 opacity-30" />
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative"
              >
                {/* Step Card */}
                <div className="bg-card rounded-2xl p-6 border border-border/50 h-full hover:border-primary/30 transition-colors group">
                  {/* Step Number & Icon */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">STEP</span>
                      <span className={`text-2xl font-bold bg-gradient-to-br ${step.color} bg-clip-text text-transparent`}>
                        {step.step}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {step.description}
                  </p>
                  
                  {/* Details */}
                  <div className="flex flex-wrap gap-2">
                    {step.details.map((detail) => (
                      <span
                        key={detail}
                        className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Arrow Connector - Desktop */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-4 top-24 z-10">
                    <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">100%</div>
            <div className="text-sm text-muted-foreground">Tire Utilization</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">0</div>
            <div className="text-sm text-muted-foreground">Landfill Waste</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">4+</div>
            <div className="text-sm text-muted-foreground">Products Created</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="text-3xl font-bold text-primary mb-1">MI & OH</div>
            <div className="text-sm text-muted-foreground">States Served</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
