import { registerVisualElement } from "../../types/elementRegistry";
import type { ObjDoc, VisualBuilderElementBase, RawPyEl } from "../../../api/visualBuilder";
import { POSITION_PROPS, SIZED_PROPS, COMMON_TAIL_PROPS, DELETE_METHOD } from "../schemaHelpers";

export class Label implements VisualBuilderElementBase {
  type = 'label' as const;
  x: number;
  y: number;
  visible: boolean = true;
  label?: string;
  width?: number;
  height?: number;
  color?: [number, number, number];
  fontSize?: number;
  alpha: number;
  z: number;
  panelId?: string;

  constructor(el: RawPyEl) {
    this.x = el.x ?? 0;
    this.y = el.y ?? 0;
    this.visible = el.visible ?? true;
    this.label = el.label;
    this.width = el.width ?? 1;
    this.height = el.height ?? 1;
    this.color = el.color;
    this.fontSize = el.fontSize;
    this.alpha = el.alpha ?? 1;
    this.z = el.z ?? 0;
    this.panelId = el.panelId;
    
  }


}

export const LABEL_SCHEMA: ObjDoc = {
  objName: 'Label',
  docstring: 'Text label.',
  properties: [
    { name: 'label', type: 'str', description: 'Display text.', default: '""' },
    ...POSITION_PROPS,
    ...SIZED_PROPS,
    { name: 'font_size', type: 'int', description: 'Font size in pixels.', default: '14' },
    { name: 'color', type: 'tuple[int, int, int] | None', description: 'RGB text color.', default: 'None' },
    ...COMMON_TAIL_PROPS,
  ],
  methods: [DELETE_METHOD],
};

registerVisualElement('label', Label, LABEL_SCHEMA);
