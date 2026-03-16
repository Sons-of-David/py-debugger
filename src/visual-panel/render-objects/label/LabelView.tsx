import { motion } from 'framer-motion';
import type { Label } from './Label';
import { rgbToHex } from '../../../api/visualBuilder';
import { registerRenderer } from '../../views/rendererRegistry';
import { useAnimationEnabled, useAnimationDuration } from '../../../animation/animationContext';

interface LabelViewProps {
  label: Label;
}

export function LabelView({ label }: LabelViewProps) {
  const animate = useAnimationEnabled();
  const animationDuration = useAnimationDuration();
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };
  const color = label.color ? rgbToHex(label.color) : undefined;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.span
        className="font-mono text-center whitespace-pre-wrap"
        animate={{ opacity: label.alpha, color, fontSize: label.fontSize ?? undefined }}
        transition={transition}
      >
        {label.label ?? ''}
      </motion.span>
    </div>
  );
}

registerRenderer<Label>('label', (element) => <LabelView label={element as Label} />);
