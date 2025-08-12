import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface CapacityGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  animateOnMount?: boolean;
}

export function CapacityGauge({ 
  value, 
  size = 80, 
  strokeWidth = 8, 
  label,
  animateOnMount = true 
}: CapacityGaugeProps) {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const prefersReducedMotion = useReducedMotion();

  // Animated value using Framer Motion springs
  const springValue = useSpring(animateOnMount ? 0 : value, {
    damping: 15,
    stiffness: 150,
    mass: 1,
  });

  const animatedValue = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    springValue.set(value);
    
    const unsubscribe = animatedValue.on("change", (latest) => {
      setDisplayValue(latest);
    });

    return unsubscribe;
  }, [value, springValue, animatedValue, prefersReducedMotion]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  const getColorClass = () => {
    if (displayValue >= 90) return "stroke-brand-warning";
    if (displayValue >= 70) return "stroke-brand-primary"; 
    return "stroke-brand-success";
  };

  const getGlowClass = () => {
    if (displayValue >= 90) return "drop-shadow-[0_0_8px_hsl(var(--brand-warning)/0.4)]";
    if (displayValue >= 70) return "drop-shadow-[0_0_8px_hsl(var(--brand-primary)/0.4)]"; 
    return "drop-shadow-[0_0_8px_hsl(var(--brand-success)/0.4)]";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-secondary/30"
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={cn(getColorClass(), getGlowClass())}
            style={{
              strokeDasharray,
            }}
            animate={{
              strokeDashoffset: prefersReducedMotion ? strokeDashoffset : strokeDashoffset,
            }}
            transition={
              prefersReducedMotion 
                ? { duration: 0 }
                : { 
                    duration: 1.2, 
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.2 
                  }
            }
          />
        </svg>
        
        {/* Animated center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span 
            className={cn(
              "font-bold text-foreground",
              size >= 80 ? "text-lg" : "text-sm"
            )}
            key={displayValue}
            initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: [0.16, 1, 0.3, 1],
              delay: prefersReducedMotion ? 0 : 0.8
            }}
          >
            {displayValue}%
          </motion.span>
        </div>
      </div>
      
      {label && (
        <motion.span 
          className="text-xs text-muted-foreground text-center font-medium"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: prefersReducedMotion ? 0 : 0.3,
            delay: prefersReducedMotion ? 0 : 1
          }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}