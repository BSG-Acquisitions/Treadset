import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants } from '@/lib/motion';

interface SlideUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function SlideUp({ children, delay = 0, className }: SlideUpProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  return (
    <motion.div
      className={className}
      variants={variants.slideUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        delay,
        ...(!prefersReducedMotion && { 
          duration: 0.2, 
          ease: [0.16, 1, 0.3, 1] 
        }),
        ...(prefersReducedMotion && { duration: 0.12 }),
      }}
    >
      {children}
    </motion.div>
  );
}