import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  centered?: boolean;
  icon?: LucideIcon;
  size?: "default" | "large";
  light?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  centered = true,
  icon: Icon,
  size = "default",
  light = false,
  className = "",
}: SectionHeaderProps) {
  // Split title around the accent word if provided
  const renderTitle = () => {
    if (!titleAccent) {
      return title;
    }

    const parts = title.split(titleAccent);
    if (parts.length === 1) {
      return title;
    }

    return (
      <>
        {parts[0]}
        <span className="relative inline-block">
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            {titleAccent}
          </span>
        </span>
        {parts[1]}
      </>
    );
  };

  const titleSizeClasses = size === "large" 
    ? "text-4xl md:text-5xl lg:text-6xl" 
    : "text-3xl lg:text-4xl";

  const textColorClasses = light 
    ? "text-primary-foreground" 
    : "text-foreground";

  const mutedColorClasses = light 
    ? "text-primary-foreground/80" 
    : "text-muted-foreground";

  const eyebrowBgClasses = light 
    ? "bg-white/10 text-primary-foreground" 
    : "bg-primary/10 text-primary";

  const accentLineClasses = light 
    ? "bg-white/30" 
    : "bg-gradient-to-r from-transparent via-primary to-transparent";

  return (
    <div className={`${centered ? "text-center" : ""} ${className}`}>
      {/* Eyebrow */}
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className={`inline-flex items-center gap-2 mb-4 ${centered ? "justify-center" : ""}`}
        >
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${eyebrowBgClasses}`}>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </span>
        </motion.div>
      )}

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        viewport={{ once: true }}
        className={`${titleSizeClasses} font-bold tracking-tight ${textColorClasses} mb-3`}
      >
        {renderTitle()}
      </motion.h2>

      {/* Accent Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        viewport={{ once: true }}
        className={`h-0.5 w-12 ${accentLineClasses} ${centered ? "mx-auto" : ""} mb-4`}
      />

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          viewport={{ once: true }}
          className={`text-lg ${mutedColorClasses} ${centered ? "max-w-2xl mx-auto" : ""}`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
