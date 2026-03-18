import { Arrow as ArrowShape } from '../../shapes';
import { rgbToHex } from '../../../api/visualBuilder';
import type { Arrow } from './Arrow';
import { registerRenderer } from '../../views/rendererRegistry';
import { useAnimationEnabled, useAnimationDuration } from '../../../animation/animationContext';

interface ArrowViewProps {
  arrow: Arrow;
}

export function ArrowView({ arrow }: ArrowViewProps) {
  const animate = useAnimationEnabled();
  const animationDuration = useAnimationDuration();
  return (
    <ArrowShape
      color={rgbToHex(arrow.color, '#10b981')}
      opacity={arrow.alpha}
      strokeWidth={1}
      angle={arrow.angle}
      animate={animate}
      animationDuration={animationDuration}
    />
  );
}

registerRenderer<Arrow>('arrow', (element) => <ArrowView arrow={element as Arrow} />);
