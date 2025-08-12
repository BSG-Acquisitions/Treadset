import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMotionVariants, motionTokens } from '@/lib/motion';

interface HoverLift3DProps {
  children: ReactNode;
  className?: string;
  intensity?: 'subtle' | 'moderate' | 'strong';
  disabled?: boolean;
}

export function HoverLift3D({ 
  children, 
  className, 
  intensity = 'subtle',
  disabled = false 
}: HoverLift3DProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getMotionVariants(prefersReducedMotion);

  if (disabled || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const tiltAmount = motionTokens.transform.tilt[intensity];
  
  const customVariants = {
    ...variants.hoverLift3D,
    hover: {
      ...variants.hoverLift3D.hover,
      rotateY: tiltAmount,
      rotateX: -tiltAmount / 2,
    }
  };

  return (
    <motion.div
      className={className}
      variants={customVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{
        perspective: motionTokens.transform.perspective,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  );
}