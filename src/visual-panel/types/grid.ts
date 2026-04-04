import type { VisualBuilderElementBase } from "../../api/visualBuilder";

export interface CellPosition {
  row: number;
  col: number;
}

// Styling properties for cells
export interface ElementStyle {
  color?: string;       // Fill/text color
  lineWidth?: number;   // Border/stroke thickness (1-5)
  opacity?: number;     // 0-1
  fontSize?: number;    // px
}

export interface PanelStyle {
  borderClass: string;
  backgroundClass: string;
  titleBgClass: string;
  titleTextClass: string;
}

export const PANEL_STYLE_DEFAULT: PanelStyle = {
  borderClass: 'border-2 border-dashed',
  backgroundClass: 'bg-slate-50/50 dark:bg-slate-800/50',
  titleBgClass: 'bg-slate-50 dark:bg-slate-700',
  titleTextClass: 'text-slate-600 dark:text-slate-300',
};

export interface InteractionData {
  elemId: number;
  x: number;
  y: number;
}

export interface OccupantInfo {
  objectData: GridObject;
  originRow: number;
  originCol: number;
  zOrder: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
}

export interface ExtraGridInfo {
  id: string;               // grid ID ("elem-42", "panel-e3")
  panelId?: string;
  zOrder: number;
  clickData?: InteractionData;
  dragData?: InteractionData;
  inputData?: InteractionData;
  invalidReason?: string;
}

export interface GridObject {
  element: VisualBuilderElementBase; // original element, kept for possible future use
  absElement: VisualBuilderElementBase;
  info: ExtraGridInfo;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseKey(key: string): CellPosition {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

export function getArrayOffset(direction: 'right' | 'left' | 'down' | 'up', index: number): { rowDelta: number; colDelta: number } {
  switch (direction) {
    case 'left':
      return { rowDelta: 0, colDelta: -index };
    case 'down':
      return { rowDelta: index, colDelta: 0 };
    case 'up':
      return { rowDelta: -index, colDelta: 0 };
    case 'right':
    default:
      return { rowDelta: 0, colDelta: index };
  }
}
