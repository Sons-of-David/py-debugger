import { registerVisualElement } from "../../types/elementRegistry";
import type { ObjDoc } from "../../../api/visualBuilder";
import { rgbToHex } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";

export class Arrow extends BasicShape {
  angle: number;

  constructor(el: any) {
    super('arrow', el);
    this.color = el.color ?? [1, 0, 0];
    this.angle = el.angle ?? 0;
  }

  draw() {
    return {
      elementInfo: this,
      style: { color: rgbToHex(this.color, '#10b981'), opacity: this.alpha },
      shapeProps: {
        width: this.width,
        height: this.height,
        angle: this.angle,
      },
    };
  }
}

export const ARROW_SCHEMA: ObjDoc = {
  objName: 'Arrow',
  docstring: 'An arrow shape on the grid. Use angle to control direction: 0=up, 90=right, 180=down, 270=left. Use Arrow.UP/DOWN/LEFT/RIGHT constants or set_orientation() for convenience.',
  properties: [
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col) of the bounding box.', default: '(0, 0)' },
    { name: 'width', type: 'int', description: 'Width in grid cells.', default: '1' },
    { name: 'height', type: 'int', description: 'Height in grid cells.', default: '1' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).', default: '(16, 185, 129)' },
    { name: 'angle', type: 'float', description: 'Direction in degrees clockwise from up. 0=up, 90=right, 180=down, 270=left.', default: '0' },
    { name: 'visible', type: 'bool', description: 'Show or hide the arrow.', default: 'True' },
    { name: 'alpha', type: 'float', description: 'Opacity, 0.0 (transparent) to 1.0 (opaque).', default: '1.0' },
    { name: 'animate', type: 'bool', description: 'Animate transitions to this state. Set to False for instant updates.', default: 'True' },
    { name: 'z', type: 'int', description: 'Depth layer. Lower z renders on top of higher z.', default: '0' },
  ],
  methods: [
    { name: 'delete', signature: 'delete()', docstring: 'Remove this element from the canvas and its parent panel.' },
    { name: 'set_orientation', signature: "set_orientation(direction: str)", docstring: "Set angle from a direction string: 'up', 'right', 'down', or 'left'." },
  ],
  constants: [
    { name: 'UP', value: '0' },
    { name: 'RIGHT', value: '90' },
    { name: 'DOWN', value: '180' },
    { name: 'LEFT', value: '270' },
  ],
};

registerVisualElement('arrow', Arrow, ARROW_SCHEMA);
