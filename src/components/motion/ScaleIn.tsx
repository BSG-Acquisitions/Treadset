import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants } from '@/lib/motion';

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ScaleIn({ children, delay = 0, className }: ScaleInProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  return (
    <motion.div
      className={className}
      variants={variants.scaleIn}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        delay,
        ...(!prefersReducedMotion && { 
          duration: 0.12, 
          ease: [0.2, 0.8, 0.2, 1] 
        }),
        ...(prefersReducedMotion && { duration: 0.12 }),
      }}
    >
      {children}
    </motion.div>
  );
}