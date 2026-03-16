import { Square } from '../../shapes';
import { rgbToHex } from '../../../api/visualBuilder';
import type { Rect } from './Rect';
import { registerRenderer } from '../../views/rendererRegistry';
import { useAnimationEnabled, useAnimationDuration } from '../../../animation/animationContext';

export function RectView({ rect }: { rect: Rect }) {
  const animate = useAnimationEnabled();
  const animationDuration = useAnimationDuration();
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Square color={rgbToHex(rect.color, '#ef0bef')} opacity={rect.alpha} strokeWidth={1} animate={animate} animationDuration={animationDuration} />
    </div>
  );
}

registerRenderer<Rect>('rect', (element) => <RectView rect={element as Rect} />);
