import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants } from '@/lib/motion';

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerList({ children, className, staggerDelay = 0.1 }: StaggerListProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  return (
    <motion.div
      className={className}
      variants={variants.staggerContainer}
      initial="initial"
      animate="animate"
      transition={
        prefersReducedMotion 
          ? { duration: 0.1 }
          : {
              staggerChildren: staggerDelay,
              delayChildren: 0.1,
            }
      }
    >
      {children}
    </motion.div>
  );
}