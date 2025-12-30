import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Recycle } from "lucide-react";
import { usePublicStats } from "@/hooks/usePublicStats";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

function AnimatedNumber({ value, duration = 2 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {displayValue.toLocaleString()}
    </span>
  );
}

export function LiveTireCounter() {
  const { data: stats, isLoading } = usePublicStats();
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (stats && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [stats, hasAnimated]);

  const weeklyTires = stats?.weekly_tires || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="text-primary"
      >
        <Recycle className="h-5 w-5" />
      </motion.div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">This Week:</span>
        <span className="text-lg font-bold text-primary">
          {isLoading ? (
            <span className="animate-pulse">---</span>
          ) : (
            <AnimatedNumber value={weeklyTires} />
          )}
        </span>
        <span className="text-sm font-medium text-muted-foreground">Tires Recycled</span>
      </div>
      
      {/* Live indicator */}
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-1.5"
      >
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium text-muted-foreground">LIVE</span>
      </motion.div>
    </motion.div>
  );
}
