import { RotateCcw, Recycle } from "lucide-react";
import { motion } from "framer-motion";

interface BSGLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8", 
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24"
};

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl"
};

export function BSGLogo({ 
  size = "md", 
  animated = true, 
  showText = true, 
  className = "" 
}: BSGLogoProps) {
  return (
    <motion.div
      className={`flex items-center gap-3 group cursor-pointer ${className}`}
      initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.8 }}
    >
      {/* Logo Icon */}
      <div className="relative">
        {/* Glow effect background */}
        {animated && (
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-recycling rounded-xl blur-md ${sizeClasses[size]}`}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          />
        )}
        
        {/* Main logo container */}
        <div className={`relative ${sizeClasses[size]} bg-gradient-to-br from-brand-primary via-brand-recycling to-brand-primary-dark rounded-xl flex items-center justify-center shadow-elevation-md group-hover:shadow-elevation-lg transition-all duration-300 overflow-hidden`}>
          {/* Background pattern */}
          <div className="absolute inset-0 tire-pattern opacity-20" />
          
          {/* Rotating outer ring */}
          <div className="absolute inset-1 border-2 border-brand-primary-light/30 rounded-lg">
            <motion.div
              className="w-full h-full flex items-center justify-center"
              animate={animated ? { rotate: 360 } : undefined}
              transition={animated ? { duration: 8, repeat: Infinity, ease: "linear" } : undefined}
              whileHover={animated ? { rotate: 180 } : undefined}
            >
              <RotateCcw className={`${size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-12 w-12"} text-white drop-shadow-sm`} />
            </motion.div>
          </div>
          
          {/* Inner recycling icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Recycle className={`${size === "xs" ? "h-2 w-2" : size === "sm" ? "h-3 w-3" : size === "md" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-8 w-8"} text-white/60`} />
          </div>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <div className="hidden sm:block min-w-0 flex-shrink-0">
          <h1 className={`font-bold bg-gradient-to-r from-brand-primary to-brand-primary-dark bg-clip-text text-transparent ${textSizeClasses[size]} whitespace-nowrap`}>
            TreadSet
          </h1>
          {size !== "xs" && size !== "sm" && (
            <p className={`text-brand-tire-black/60 font-medium ${size === "md" ? "text-xs" : size === "lg" ? "text-sm" : "text-base"} whitespace-nowrap`}>
              Old Tires= New Possibilities
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}