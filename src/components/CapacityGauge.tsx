import { motion } from "framer-motion";
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

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    if (animateOnMount) {
      // Simple timeout-based animation instead of framer-motion springs
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, prefersReducedMotion, animateOnMount]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  
  // Add safety check to prevent NaN
  const safeDisplayValue = isNaN(displayValue) ? 0 : Math.max(0, Math.min(100, displayValue));
  const strokeDashoffset = circumference - (safeDisplayValue / 100) * circumference;

  const getColorClass = () => {
    if (safeDisplayValue >= 80) return "stroke-emerald-500";
    if (safeDisplayValue >= 60) return "stroke-green-500"; 
    if (safeDisplayValue >= 40) return "stroke-yellow-500";
    if (safeDisplayValue >= 20) return "stroke-orange-500";
    return "stroke-red-500";
  };

  const getGlowClass = () => {
    if (safeDisplayValue >= 80) return "drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]";
    if (safeDisplayValue >= 60) return "drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]"; 
    if (safeDisplayValue >= 40) return "drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]";
    if (safeDisplayValue >= 20) return "drop-shadow-[0_0_6px_rgba(249,115,22,0.4)]";
    return "drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]";
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
            className="text-muted-foreground/20"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={cn(getColorClass(), getGlowClass(), "transition-all duration-1000 ease-out")}
            style={{
              strokeDasharray,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className={cn(
              "font-bold text-foreground transition-all duration-300",
              size >= 80 ? "text-lg" : "text-sm"
            )}
          >
            {Math.round(safeDisplayValue)}%
          </span>
        </div>
      </div>
      
      {label && (
        <span className="text-xs text-muted-foreground text-center font-medium">
          {label}
        </span>
      )}
    </div>
  );
}