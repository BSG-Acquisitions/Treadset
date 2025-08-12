import { Variants } from "framer-motion";

// Motion Design Tokens
export const motionTokens = {
  // Durations (milliseconds)
  duration: {
    fast: 0.12,
    base: 0.2,
    slow: 0.32,
    sleep: 0.6,
  },
  
  // Easing curves
  easing: {
    standard: [0.2, 0.8, 0.2, 1] as const,
    enter: [0.16, 1, 0.3, 1] as const,
    exit: [0.4, 0, 0.2, 1] as const,
  },
  
  // Z-index elevation
  elevation: {
    z0: 0,  // base card
    z1: 10, // hover
    z2: 20, // modal
    z3: 30, // nav
  },
  
  // Transform values
  transform: {
    scale: {
      hover: 1.02,
      active: 0.98,
      lift: 1.04,
    },
    perspective: 1200,
    tilt: {
      subtle: 2,
      moderate: 5,
      strong: 8,
    },
  },
} as const;

// Animation variants for common patterns
export const motionVariants = {
  // Fade transitions
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },

  // Slide up entrance
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  // Scale in
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  // 3D hover lift
  hoverLift3D: {
    initial: { 
      scale: 1, 
      rotateY: 0, 
      rotateX: 0,
      z: motionTokens.elevation.z0 
    },
    hover: { 
      scale: motionTokens.transform.scale.hover,
      rotateY: motionTokens.transform.tilt.subtle,
      rotateX: -motionTokens.transform.tilt.subtle / 2,
      z: motionTokens.elevation.z1,
    },
    tap: { 
      scale: motionTokens.transform.scale.active,
    }
  },

  // Stagger container
  staggerContainer: {
    initial: {},
    animate: {},
  },

  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.98 },
  },

  // Quick actions reveal
  quickActions: {
    initial: { opacity: 0, y: 10, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.9 },
  },

  // Shimmer skeleton
  shimmer: {
    initial: { x: "-100%" },
    animate: { x: "100%" },
  },
} as const;

// Transition presets
export const transitions = {
  fast: { duration: motionTokens.duration.fast, ease: motionTokens.easing.standard },
  base: { duration: motionTokens.duration.base, ease: motionTokens.easing.standard },
  slow: { duration: motionTokens.duration.slow, ease: motionTokens.easing.standard },
  enter: { duration: motionTokens.duration.base, ease: motionTokens.easing.enter },
  exit: { duration: motionTokens.duration.base, ease: motionTokens.easing.exit },
  
  // Spring animations for gauges/counters
  spring: {
    type: "spring" as const,
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  // Gentle bounce for interactions
  bounce: {
    type: "spring" as const,
    damping: 10,
    stiffness: 400,
    mass: 0.8,
  },

  // Stagger timing
  stagger: {
    staggerChildren: 0.1,
    delayChildren: 0.1,
  },

  // Shimmer repeat
  shimmerRepeat: {
    duration: 1.5,
    ease: "linear" as const,
    repeat: Infinity,
    repeatDelay: 0.5
  },
} as const;

// Reduced motion variants (respects prefers-reduced-motion)
export const reducedMotionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  slideUp: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  scaleIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  hoverLift3D: {
    initial: { scale: 1 },
    hover: { scale: 1 },
    tap: { scale: 1 }
  },

  staggerContainer: {
    initial: {},
    animate: {},
  },

  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  quickActions: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  shimmer: {
    initial: { x: "0%" },
    animate: { x: "0%" },
  },
} as const;

// Utility to get appropriate variants based on motion preference
export const getMotionVariants = (prefersReducedMotion: boolean) => {
  return prefersReducedMotion ? reducedMotionVariants : motionVariants;
};