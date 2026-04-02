import type { PropertyDoc } from '../../api/visualBuilder';

export const POSITION_PROPS: PropertyDoc[] = [
  { name: 'x', type: 'int', description: 'Column (left edge).', default: '0' },
  { name: 'y', type: 'int', description: 'Row (top edge).', default: '0' },
];

export const SIZED_PROPS: PropertyDoc[] = [
  { name: 'width', type: 'int', description: 'Width in grid cells.', default: '1' },
  { name: 'height', type: 'int', description: 'Height in grid cells.', default: '1' },
];

export function colorProp(defaultColor: string): PropertyDoc {
  return { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).', default: defaultColor };
}

export const COMMON_TAIL_PROPS: PropertyDoc[] = [
  { name: 'visible', type: 'bool', description: 'Show or hide.', default: 'True' },
  { name: 'alpha', type: 'float', description: 'Opacity, 0.0 (transparent) to 1.0 (opaque).', default: '1.0' },
  { name: 'animate', type: 'bool', description: 'Animate transitions to this state. Set to False for instant updates.', default: 'True' },
  { name: 'z', type: 'int', description: 'Depth layer. Lower z renders on top of higher z.', default: '0' },
];

export const DELETE_METHOD = {
  name: 'delete',
  signature: 'delete()',
  docstring: 'Remove this element from the canvas and its parent panel.',
};
