import type { VisualBuilderElement } from "./visualBuilder";

export class Rect implements VisualBuilderElement {
  type: 'rect' = 'rect';
  position: [number, number];
  visible: boolean = true;
  width: number;
  height: number;
  color?: [number, number, number];
  alpha: number;

  constructor(el: VisualBuilderElement) {
    this.position = el.position;
    this.visible = el.visible ?? true;
    this.width = el.width ?? 1;
    this.height = el.height ?? 1;
    this.color = el.color;
    this.alpha = el.alpha ?? 1;
  }

  // Add a drawing method
  draw() {
    // return the object structure used in useGridState
    return {
      shape: 'rectangle',
      style: { color: this.color ? this.rgbToHex(this.color) : '#ef0bef', opacity: this.alpha },
      shapeProps: { width: this.width, height: this.height },
    };
  }

  private rgbToHex(rgb?: [number, number, number]): string {
    if (!rgb) return '#22c55e';
    return '#' + rgb.map(x => Math.max(0, Math.min(255, Math.floor(x))).toString(16).padStart(2,'0')).join('');
  }
}

export class Circle implements VisualBuilderElement {
  type: 'circle' = 'circle';
  position: [number, number];
  visible: boolean = true;
  width: number;
  height: number;
  color?: [number, number, number];
  alpha: number;
  panelId?: string;

  constructor(el: VisualBuilderElement) {
    this.position = el.position;
    this.visible = el.visible ?? true;
    this.width = el.width ?? 1;
    this.height = el.height ?? 1;
    this.color = el.color;
    this.alpha = el.alpha ?? 1;
    this.panelId = el.panelId;
  }

  draw() {
    return {
      shape: 'circle',
      style: { color: this.rgbToHex(this.color, '#3b82f6'), opacity: this.alpha },
      shapeProps: { width: this.width, height: this.height },
    };
  }

  private rgbToHex(rgb?: [number, number, number], defaultColor: string = '#3b82f6') {
    if (!rgb) return defaultColor;
    return '#' + rgb.map(x => Math.max(0, Math.min(255, Math.floor(x))).toString(16).padStart(2,'0')).join('');
  }
}

export class Arrow implements VisualBuilderElement {
  type: 'arrow' = 'arrow';
  position: [number, number];
  visible: boolean = true;
  width: number;
  height: number;
  orientation: 'up' | 'down' | 'left' | 'right';
  rotation: number;
  color?: [number, number, number];
  alpha: number;
  panelId?: string;

  constructor(el: VisualBuilderElement) {
    this.position = el.position;
    this.visible = el.visible ?? true;
    this.width = el.width ?? 1;
    this.height = el.height ?? 1;
    this.orientation = (el.orientation as 'up' | 'down' | 'left' | 'right') ?? 'up';
    this.rotation = el.rotation ?? 0;
    this.color = el.color;
    this.alpha = el.alpha ?? 1;
    this.panelId = el.panelId;
  }

  draw() {
    return {
      shape: 'arrow',
      style: { color: this.rgbToHex(this.color, '#10b981'), opacity: this.alpha },
      shapeProps: {
        width: this.width,
        height: this.height,
        orientation: this.orientation,
        rotation: this.rotation,
      },
    };
  }

  private rgbToHex(rgb?: [number, number, number], defaultColor: string = '#10b981') {
    if (!rgb) return defaultColor;
    return '#' + rgb.map(x => Math.max(0, Math.min(255, Math.floor(x))).toString(16).padStart(2,'0')).join('');
  }
}