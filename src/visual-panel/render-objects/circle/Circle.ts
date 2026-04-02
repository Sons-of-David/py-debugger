import { registerVisualElement } from "../../types/elementRegistry";
import type { ObjDoc } from "../../../api/visualBuilder";
import { rgbToHex } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";
import { POSITION_PROPS, SIZED_PROPS, colorProp, COMMON_TAIL_PROPS, DELETE_METHOD } from "../schemaHelpers";

export class Circle extends BasicShape {

  constructor(el: any) {
    super('circle', el);
    this.color = el.color ?? [1, 0, 0];
  }

  draw() {
    return {
      elementInfo: this,
      style: { color: rgbToHex(this.color, '#3b82f6'), opacity: this.alpha },
      shapeProps: { width: this.width, height: this.height },
    };
  }
}

export const CIRCLE_SCHEMA: ObjDoc = {
  objName: 'Circle',
  docstring: 'A circle (or ellipse) shape on the grid.',
  properties: [
    ...POSITION_PROPS,
    ...SIZED_PROPS,
    colorProp('(59, 130, 246)'),
    ...COMMON_TAIL_PROPS,
  ],
  methods: [DELETE_METHOD],
};

registerVisualElement('circle', Circle, CIRCLE_SCHEMA);
