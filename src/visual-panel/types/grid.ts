import type { VisualBuilderElementBase } from "../../api/visualBuilder";

export interface PanelStyle {
  borderClass: string;
  backgroundClass: string;
  titleBgClass: string;
  titleTextClass: string;
}

export interface InteractionData {
  elemId: number;
  x: number;
  y: number;
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

