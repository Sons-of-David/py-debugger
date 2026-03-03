import { Circle } from '../shapes';
import type { ClassDoc } from '../../types/visualBuilder';

interface CircleViewProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  rotation?: number;
}

export function CircleView({ color, opacity, strokeWidth, rotation = 0 }: CircleViewProps) {
  return (
    <div style={{ transform: `rotate(${rotation}deg)`, width: '100%', height: '100%' }}>
      <Circle color={color} opacity={opacity} strokeWidth={strokeWidth} />
    </div>
  );
}

export const CIRCLE_SCHEMA: ClassDoc = {
  className: 'Circle',
  constructorParams: 'pos: tuple[int, int] = (0, 0)',
  docstring: 'A circle (or ellipse) shape on the grid.',
  properties: [
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col) of the bounding box.' },
    { name: 'width', type: 'int', description: 'Width in grid cells.' },
    { name: 'height', type: 'int', description: 'Height in grid cells.' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).' },
    { name: 'visible', type: 'bool', description: 'Show or hide the circle.' },
  ],
};
