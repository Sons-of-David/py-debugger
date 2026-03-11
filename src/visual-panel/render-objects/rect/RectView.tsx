import { Square } from '../../shapes';
import { rgbToHex } from '../../../api/visualBuilder';
import type { Rect } from './Rect';
import { registerRenderer } from '../../views/rendererRegistry';
import { useAnimationEnabled } from '../../../animation/animationContext';

export function RectView({ rect }: { rect: Rect }) {
  const animate = useAnimationEnabled();
  return (
    <div style={{ transform: `rotate(${0}deg)`, width: '100%', height: '100%' }}>
      <Square color={rgbToHex(rect.color, '#ef0bef')} opacity={rect.alpha} strokeWidth={1} animate={animate} />
    </div>
  );
}

registerRenderer<Rect>('rect', (element) => <RectView rect={element as Rect} />);
