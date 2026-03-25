import { registerVisualElement } from "../../types/elementRegistry";
import type { RenderableObjectData } from "../../types/grid";
import type { ObjDoc } from "../../../api/visualBuilder";
import { rgbToHex } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";

export class Rect extends BasicShape {

  constructor(el: any) {
    super('rect', el);
    this.color = el.color ?? [1, 0, 0];
  }

  draw(): RenderableObjectData {
    return {
      elementInfo: this,
      style: { color: rgbToHex(this.color, '#ef0bef'), opacity: this.alpha },
      shapeProps: { width: this.width, height: this.height },
    };
  }
}

export const RECT_SCHEMA: ObjDoc = {
  objName: 'Rect',
  docstring: 'A rectangle shape on the grid.',
  properties: [
    { name: 'x', type: 'int', description: 'Column (left edge).', default: '0' },
    { name: 'y', type: 'int', description: 'Row (top edge).', default: '0' },
    { name: 'width', type: 'int', description: 'Width in grid cells.', default: '1' },
    { name: 'height', type: 'int', description: 'Height in grid cells.', default: '1' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB fill color (0-255 per channel).', default: '(34, 197, 94)' },
    { name: 'visible', type: 'bool', description: 'Show or hide the rectangle.', default: 'True' },
    { name: 'alpha', type: 'float', description: 'Opacity, 0.0 (transparent) to 1.0 (opaque).', default: '1.0' },
    { name: 'animate', type: 'bool', description: 'Animate transitions to this state. Set to False for instant updates.', default: 'True' },
    { name: 'z', type: 'int', description: 'Depth layer. Lower z renders on top of higher z.', default: '0' },
  ],
  methods: [
    { name: 'delete', signature: 'delete()', docstring: 'Remove this element from the canvas and its parent panel.' },
  ],
};

registerVisualElement('rect', Rect, RECT_SCHEMA);
