interface BSGLogoActualProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6",
  sm: "h-8", 
  md: "h-10",
  lg: "h-16",
  xl: "h-24"
};

export function BSGLogoActual({ 
  size = "md", 
  className = "" 
}: BSGLogoActualProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/0ff7d5f4-66bb-4f5c-89ec-851bc6c4a2df.png" 
        alt="BSG Tire Recycling" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
}