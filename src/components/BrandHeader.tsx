import { Recycle, RotateCcw, Zap } from "lucide-react";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  className?: string;
}

export function BrandHeader({ 
  title = "BSG Tire Recycling", 
  subtitle = "Sustainable Solutions for Industrial Waste", 
  showLogo = true,
  className = ""
}: BrandHeaderProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 tire-pattern opacity-30" />
      
      {/* Main Header */}
      <div className="relative z-10 py-8 px-6">
        <div className="flex items-center gap-6">
          {showLogo && (
            <div className="flex-shrink-0">
              {/* Circular logo with tire pattern */}
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                <div className="absolute inset-0 recycling-gradient rounded-full opacity-20 animate-float" />
                <div className="relative w-full h-full bg-brand-tire-black rounded-full flex items-center justify-center border-4 border-brand-primary shadow-elevation-lg">
                  <div className="text-white">
                    <RotateCcw className="w-6 h-6 md:w-8 md:h-8 animate-pulse-glow" />
                  </div>
                </div>
                {/* Rotating accent rings */}
                <div className="absolute inset-0 border-2 border-brand-primary/30 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-2 border border-brand-recycling/40 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-brand-primary via-brand-recycling to-brand-primary-dark bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-brand-tire-black/70 text-lg md:text-xl mt-2">
              {subtitle}
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
                <Recycle className="w-4 h-4 text-brand-primary" />
                <span className="text-sm font-medium text-brand-primary">100% Recycled</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-recycling/10 border border-brand-recycling/20 rounded-full">
                <Zap className="w-4 h-4 text-brand-recycling" />
                <span className="text-sm font-medium text-brand-recycling">Eco-Friendly</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="h-2 brand-gradient" />
    </div>
  );
}