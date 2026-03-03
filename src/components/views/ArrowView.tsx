import { Arrow } from '../shapes';
import type { ArrowOrientation } from '../../types/grid';
import type { ClassDoc } from '../../types/visualBuilder';

interface ArrowViewProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  orientation?: ArrowOrientation;
  rotation?: number;
}

export function ArrowView({ color, opacity, strokeWidth, orientation, rotation }: ArrowViewProps) {
  return (
    <Arrow
      color={color}
      opacity={opacity}
      strokeWidth={strokeWidth}
      orientation={orientation}
      rotation={rotation}
    />
  );
}

export const ARROW_SCHEMA: ClassDoc = {
  className: 'Arrow',
  constructorParams: 'pos: tuple[int, int] = (0, 0)',
  docstring: 'An arrow shape on the grid. Points in the given orientation and can be rotated.',
  properties: [
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col) of the bounding box.' },
    { name: 'width', type: 'int', description: 'Width in grid cells.' },
    { name: 'height', type: 'int', description: 'Height in grid cells.' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).' },
    { name: 'orientation', type: 'str', description: '"up", "down", "left", or "right". Default "up".' },
    { name: 'rotation', type: 'int', description: 'Additional rotation in degrees. Default 0.' },
    { name: 'visible', type: 'bool', description: 'Show or hide the arrow.' },
  ],
};
