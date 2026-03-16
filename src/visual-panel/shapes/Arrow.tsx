import { motion } from 'framer-motion';
import type { ArrowOrientation } from '../types/grid';

interface ArrowProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  orientation?: ArrowOrientation;
  rotation?: number;
  animate?: boolean;
  animationDuration?: number;
}

const ORIENTATION_DEGREES: Record<ArrowOrientation, number> = {
  up: 180,
  right: 270,
  down: 0,
  left: 90,
};

export function Arrow({
  color = '#10b981',
  opacity = 1,
  strokeWidth = 0,
  orientation = 'up',
  rotation = 0,
  animate = false,
  animationDuration = 300,
}: ArrowProps) {
  const baseRotation = ORIENTATION_DEGREES[orientation] ?? 0;
  const fill = color;
  const stroke = strokeWidth > 0 ? color : 'none';
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      animate={{ rotate: baseRotation + rotation }}
      transition={transition}
    >
      <motion.polygon
        points="50,80 20,30 40,30 40,10 60,10 60,30 80,30"
        animate={{ fill, fillOpacity: opacity, stroke }}
        transition={transition}
      />
    </motion.svg>
  );
}
