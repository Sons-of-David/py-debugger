import { registerVisualElement } from "../../types/elementRegistry";
import type { RenderableObjectData } from "../../types/grid";
import type { ObjDoc } from "../../../api/visualBuilder";
import { rgbToHex } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";
import { POSITION_PROPS, SIZED_PROPS, colorProp, COMMON_TAIL_PROPS, DELETE_METHOD } from "../schemaHelpers";

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
    ...POSITION_PROPS,
    ...SIZED_PROPS,
    colorProp('(34, 197, 94)'),
    ...COMMON_TAIL_PROPS,
  ],
  methods: [DELETE_METHOD],
};

registerVisualElement('rect', Rect, RECT_SCHEMA);
