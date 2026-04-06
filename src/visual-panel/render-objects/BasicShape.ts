import type { VisualBuilderElementBase, RawPyEl } from "../../api/visualBuilder";

export abstract class BasicShape implements VisualBuilderElementBase {
  type: string;
  x: number;
  y: number;
  visible: boolean = true;
  alpha: number;
  z: number;
  panelId?: string;
  width: number;
  height: number;
  color?: [number, number, number];
  _elemId?: number;
  animate: boolean;

  constructor(type: string, el: RawPyEl) {
    this.type = type;
    this.x = el.x ?? 0;
    this.y = el.y ?? 0;
    this.visible = el.visible ?? true;
    this.alpha = el.alpha ?? 1;
    this.z = el.z ?? 0;
    this.panelId = el.panelId;

    this.width = el.width ?? 1;
    this.height = el.height ?? 1;
    this.color = el.color ?? [1, 0, 0];
    this._elemId = el._elem_id;
    this.animate = el.animate ?? true;
  }
}
