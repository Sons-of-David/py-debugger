import { registerVisualElement } from "../../types/elementRegistry";
import type { ObjDoc } from "../../../api/visualBuilder";
import { rgbToHex } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";
import { POSITION_PROPS, SIZED_PROPS, colorProp, COMMON_TAIL_PROPS, DELETE_METHOD } from "../schemaHelpers";

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
    ...POSITION_PROPS,
    ...SIZED_PROPS,
    colorProp('(16, 185, 129)'),
    { name: 'angle', type: 'float', description: 'Direction in degrees clockwise from up. 0=up, 90=right, 180=down, 270=left.', default: '0' },
    ...COMMON_TAIL_PROPS,
  ],
  methods: [
    DELETE_METHOD,
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
