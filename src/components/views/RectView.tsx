import { Square } from '../shapes';
import type { ClassDoc } from '../../types/visualBuilder';

interface RectViewProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  rotation?: number;
}

export function RectView({ color, opacity, strokeWidth, rotation = 0 }: RectViewProps) {
  return (
    <div style={{ transform: `rotate(${rotation}deg)`, width: '100%', height: '100%' }}>
      <Square color={color} opacity={opacity} strokeWidth={strokeWidth} />
    </div>
  );
}

export const RECT_SCHEMA: ClassDoc = {
  className: 'Rect',
  constructorParams: 'pos: tuple[int, int] = (0, 0)',
  docstring: 'A rectangle shape on the grid.',
  properties: [
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col) of the rectangle.' },
    { name: 'width', type: 'int', description: 'Width in grid cells.' },
    { name: 'height', type: 'int', description: 'Height in grid cells.' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).' },
    { name: 'visible', type: 'bool', description: 'Show or hide the rectangle.' },
  ],
};
