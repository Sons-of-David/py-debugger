import { motion } from 'framer-motion';

interface ArrowProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  angle?: number;
  animate?: boolean;
  animationDuration?: number;
}

export function Arrow({
  color = '#10b981',
  opacity = 1,
  strokeWidth = 0,
  angle = 0,
  animate = false,
  animationDuration = 300,
}: ArrowProps) {
  // SVG polygon points down by default; angle 0 = up, so offset by 180°
  const cssRotation = angle + 180;
  const fill = color;
  const stroke = strokeWidth > 0 ? color : 'none';
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };

  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      animate={{ rotate: cssRotation }}
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
