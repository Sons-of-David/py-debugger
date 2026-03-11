import type { Label } from './Label';
import { rgbToHex } from '../../../api/visualBuilder';
import { registerRenderer } from '../../views/rendererRegistry';
import { useAnimationEnabled } from '../../../animation/animationContext';

interface LabelViewProps {
  label: Label;
}

export function LabelView({ label }: LabelViewProps) {
  const animate = useAnimationEnabled();
  const style: React.CSSProperties = { opacity: label.alpha };
  if (animate) style.transition = 'color 250ms ease, opacity 250ms ease';
  if (label.color) style.color = rgbToHex(label.color);
  if (label.fontSize != null) style.fontSize = label.fontSize;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className="font-mono text-center whitespace-pre-wrap"
        style={style}
      >
        {label.label ?? ''}
      </span>
    </div>
  );
}

registerRenderer<Label>('label', (element) => <LabelView label={element as Label} />);
