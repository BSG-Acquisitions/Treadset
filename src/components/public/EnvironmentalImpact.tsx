import { motion } from "framer-motion";
import { Leaf, Recycle, TreePine, Users } from "lucide-react";
import { usePublicStats } from "@/hooks/usePublicStats";
import { useEffect, useState } from "react";
import { SectionHeader } from "./SectionHeader";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  delay?: number;
}

function AnimatedValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums">
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

function StatCard({ icon, value, label, suffix = "", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-card border border-border rounded-2xl p-6 lg:p-8 text-center hover:border-primary/30 transition-colors duration-300">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          {icon}
        </div>
        <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
          <AnimatedValue value={value} suffix={suffix} />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

export function EnvironmentalImpact() {
  const { data: stats, isLoading } = usePublicStats();

  const impactStats = [
    {
      icon: <Recycle className="h-6 w-6" />,
      value: stats?.ytd_tires || 0,
      label: "Tires Recycled This Year",
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      value: Math.round((stats?.landfill_diverted_lbs || 0) / 1000),
      label: "Tons Diverted from Landfill",
      suffix: "K lbs",
    },
    {
      icon: <TreePine className="h-6 w-6" />,
      value: Math.round((stats?.co2_saved_lbs || 0) / 2000),
      label: "CO₂ Emissions Prevented",
      suffix: " tons",
    },
    {
      icon: <Users className="h-6 w-6" />,
      value: stats?.active_clients || 0,
      label: "Michigan Businesses Served",
      suffix: "+",
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <SectionHeader
            eyebrow="Our Impact"
            title="Our Environmental Impact"
            titleAccent="Impact"
            subtitle="Every tire we recycle is a tire saved from the landfill. See the difference we're making together for Michigan and the planet."
            icon={Leaf}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {impactStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              delay={index * 0.1}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          * Environmental impact calculated based on industry-standard recycling metrics
        </motion.p>
      </div>
    </section>
  );
}
