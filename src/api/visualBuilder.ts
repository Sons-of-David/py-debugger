// Visual Builder element types (serialized from Python)

export type ArrayDirection = 'right' | 'left' | 'down' | 'up';

// Raw deserialized Python object from Pyodide — field types are not statically known
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawPyEl = Record<string, any>;

export interface VisualBuilderElementBase {
  type: string;               // shape type
  x: number;                  // horizontal position (column)
  y: number;                  // vertical position (row)
  visible?: boolean;          // optional, default true
  alpha?: number;             // optional, default 1
  z?: number;                 // depth layer: lower = closer = rendered on top, default 0
  panelId?: string;
  _elemId?: number;           // stable identity from Python _elem_id; used as React key
}

// Schema for Monaco autocomplete, hover, and API reference panel
export interface PropertyDoc {
  name: string;
  type: string;
  description: string;
  default?: string;
}

export interface ObjDoc {
  objName: string;
  docstring: string;
  properties: PropertyDoc[];
  methods?: { name: string; signature: string; docstring: string }[];
  constants?: { name: string; value: string }[];
}

import { getAllSchemas } from '../visual-panel/types/elementRegistry';

import '../visual-panel/render-objects/panel/PanelView';
import '../visual-panel/render-objects/rect/Rect';
import '../visual-panel/render-objects/circle/Circle';
import '../visual-panel/render-objects/arrow/Arrow';
import '../visual-panel/render-objects/label/Label';
import '../visual-panel/render-objects/array/arrayShapes';
import '../visual-panel/render-objects/line/Line';

export function getVisualElemSchema(): ObjDoc[] {
  return getAllSchemas();
}

export const VISUAL_ELEM_SCHEMA: ObjDoc[] = getVisualElemSchema();

export { FUNCTIONS_SCHEMA } from './functionsSchema';

export function rgbToHex(rgb?: [number, number, number], defaultColor: string = '#10b981') {
  if (!rgb) return defaultColor;
  return '#' + rgb.map(x => Math.max(0, Math.min(255, Math.floor(x))).toString(16).padStart(2,'0')).join('');
}
