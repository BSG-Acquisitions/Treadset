import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants } from '@/lib/motion';

interface PageTransitionProps {
  children: ReactNode;
  pageKey: string;
  className?: string;
}

export function PageTransition({ children, pageKey, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        className={className}
        variants={variants.pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={
          prefersReducedMotion 
            ? { duration: 0.12 }
            : { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}