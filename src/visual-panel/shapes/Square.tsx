import { motion } from 'framer-motion';

interface SquareProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  animate?: boolean;
  animationDuration?: number;
}

export function Square({
  color = '#10b981',
  opacity = 1,
  strokeWidth = 2,
  animate = false,
  animationDuration = 300,
}: SquareProps) {
  const fill = color;
  const stroke = strokeWidth > 0 ? color : 'none';
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <motion.rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={100 - strokeWidth}
        height={100 - strokeWidth}
        animate={{ fill, fillOpacity: opacity, stroke }}
        transition={transition}
      />
    </svg>
  );
}
