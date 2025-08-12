import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants } from '@/lib/motion';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration, className }: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  return (
    <motion.div
      className={className}
      variants={variants.fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        delay,
        ...(duration && { duration }),
        ...(!prefersReducedMotion && { 
          duration: duration || 0.2, 
          ease: [0.2, 0.8, 0.2, 1] 
        }),
        ...(prefersReducedMotion && { duration: 0.12 }),
      }}
    >
      {children}
    </motion.div>
  );
}