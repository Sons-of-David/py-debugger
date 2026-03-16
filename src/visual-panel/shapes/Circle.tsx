import { motion } from 'framer-motion';

interface CircleProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  animate?: boolean;
  animationDuration?: number;
}

export function Circle({
  color = '#10b981',
  opacity = 1,
  strokeWidth = 2,
  animate = false,
  animationDuration = 300,
}: CircleProps) {
  const fill = color;
  const stroke = strokeWidth > 0 ? color : 'none';
  const radius = 50 - strokeWidth / 2;
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <motion.ellipse
        cx="50"
        cy="50"
        rx={radius}
        ry={radius}
        animate={{ fill, fillOpacity: opacity, stroke }}
        transition={transition}
      />
    </svg>
  );
}
