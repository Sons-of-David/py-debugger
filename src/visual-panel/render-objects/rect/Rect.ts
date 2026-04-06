import { registerVisualElement } from "../../types/elementRegistry";
import type { ObjDoc, RawPyEl } from "../../../api/visualBuilder";
import { BasicShape } from "../BasicShape";
import { POSITION_PROPS, SIZED_PROPS, colorProp, COMMON_TAIL_PROPS, DELETE_METHOD } from "../schemaHelpers";

export class Rect extends BasicShape {

  constructor(el: RawPyEl) {
    super('rect', el);
    this.color = el.color ?? [1, 0, 0];
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
