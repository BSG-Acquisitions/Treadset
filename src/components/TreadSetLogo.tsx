interface TreadSetLogoProps {
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

export function TreadSetLogo({ 
  size = "md", 
  className = "" 
}: TreadSetLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/treadset-logo.png" 
        alt="TreadSet - Old Tires= New Possibilities" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
}