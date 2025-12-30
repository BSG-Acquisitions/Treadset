import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
  staggerChildren?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { delay: number; stagger: number }) => ({
    opacity: 1,
    transition: {
      delay: custom.delay,
      staggerChildren: custom.stagger,
    },
  }),
};

const wordVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    rotateX: -90,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 100,
    },
  },
};

export function AnimatedHeadline({ 
  children, 
  className = "",
  delay = 0,
  staggerChildren = 0.08,
}: AnimatedTextProps) {
  const words = children.split(" ");

  return (
    <motion.span
      className={`inline-flex flex-wrap justify-center gap-x-[0.25em] ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ delay, stagger: staggerChildren }}
      style={{ perspective: "1000px" }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={wordVariants}
          className="inline-block"
          style={{ transformStyle: "preserve-3d" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

interface GradientTextProps {
  children: ReactNode;
  className?: string;
}

export function GradientText({ children, className = "" }: GradientTextProps) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <span className="relative z-10 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
        {children}
      </span>
      {/* Shimmer overlay */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-clip-text"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 5,
          ease: "easeInOut",
        }}
        style={{
          WebkitBackgroundClip: "text",
        }}
      />
    </motion.span>
  );
}

interface AnimatedParagraphProps {
  children: string;
  className?: string;
  delay?: number;
}

export function AnimatedParagraph({ 
  children, 
  className = "",
  delay = 0,
}: AnimatedParagraphProps) {
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
    >
      {children}
    </motion.p>
  );
}
