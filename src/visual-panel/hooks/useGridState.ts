import { useState, useCallback, useMemo } from 'react';
import type {
  InteractionData,
  GridObject,
} from '../types/grid';
import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import type { Panel } from '../render-objects/panel';
import { hasHandler } from '../handlersState';

// ── Tree node types ──────────────────────────────────────────────────────────
interface PanelTreeNode { el: VisualBuilderElementBase; gridId: string; children: TreeNodeEntry[]; }
interface LeafTreeNode  { el: VisualBuilderElementBase; gridId: string; }
type TreeNodeEntry = PanelTreeNode | LeafTreeNode;
const isPanelNode = (n: TreeNodeEntry): n is PanelTreeNode => 'children' in n;

type ExpandableElement = VisualBuilderElementBase & {
  expand: () => Array<{ _gridId?: string } & VisualBuilderElementBase>;
};
const isExpandable = (e: VisualBuilderElementBase): e is ExpandableElement =>
  'expand' in e && typeof (e as ExpandableElement).expand === 'function';

/**
 * Pure function: converts a flat VisualBuilderElementBase array into the
 * Map<gridId, GridObject> used by useGridState.  
 * Used to move from relative coordinates (e.g. element x/y relative to panel) to absolute coordinates 
 * (element x/y relative to the grid), and to determine panels' bound to fit their children.
 * 
 * Exported for unit testing.
 */
export function buildGridObjects(elements: VisualBuilderElementBase[]): Map<string, GridObject> {
  const next = new Map<string, GridObject>();
  let idx = 0;

  // ── Build panel tree ──────────────────────────────────────────────────────
  // Panel grid ID = panel-e{_elem_id}. Children reference parents by
  // el.panelId (Python _elem_id string), so no translation map is needed.

  const panelNodeMap = new Map<string, PanelTreeNode>();
  const allNodes: TreeNodeEntry[] = [];

  const addNode = (el: VisualBuilderElementBase, presetGridId?: string) => {
    if (el.type === 'panel') {
      const rawElemId = el._elemId ?? (el as { _elem_id?: string | number })._elem_id;
      const gridId = `panel-e${rawElemId}`;
      const node: PanelTreeNode = { el, gridId, children: [] };
      panelNodeMap.set(gridId, node);
      allNodes.push(node);
    } else {
      const rawElemId = (el as { _elemId?: number })._elemId;
      const gridId = presetGridId ?? (rawElemId != null ? `elem-${rawElemId}` : `${idx++}`);
      allNodes.push({ el, gridId });
    }
  };

  for (const el of elements) {
    if (isExpandable(el)) {
      for (const sub of el.expand()) addNode(sub, sub._gridId);
    } else {
      addNode(el);
    }
  }

  const rootChildren: TreeNodeEntry[] = [];
  for (const node of allNodes) {
    const parentNode = node.el.panelId ? panelNodeMap.get(`panel-e${node.el.panelId}`) : undefined;
    if (parentNode) parentNode.children.push(node);
    else rootChildren.push(node);
  }

  // ── Emit helpers ──────────────────────────────────────────────────────────

  const emitPanel = (node: PanelTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, inheritedAlpha: number, inheritedZ: number, traverseOrder: number) => {
    const { gridId } = node;
    const panelEl = node.el as { alpha?: number; z?: number };

    // Increase width and height to fit all children.
    const panelEl2 = node.el as Panel;
    let maxCol = panelEl2.width  ?? 5, maxRow = panelEl2.height ?? 5;
    for (const child of node.children) {
      const childObj = next.get(child.gridId);
      if (!childObj) continue; // visible=false, not emitted
      const cw = (childObj.absElement as { width?: number }).width ?? 1;
      const ch = (childObj.absElement as { height?: number }).height ?? 1;
      maxCol = Math.max(maxCol, childObj.absElement.x - absCol + cw);
      maxRow = Math.max(maxRow, childObj.absElement.y - absRow + ch);
    }
    const width  = maxCol;
    const height = maxRow;
    
    next.set(gridId, {
      element: node.el,
      absElement: { ...node.el, x: absCol, y: absRow, alpha: inheritedAlpha * (panelEl.alpha ?? 1), z: inheritedZ + (panelEl.z ?? 0), width, height } as VisualBuilderElementBase,
      info: {
        id: gridId,
        zOrder: traverseOrder,
        panelId: parentGridId,
      },
    });
  };

  const emitLeaf = (node: LeafTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, parentAlpha: number, inheritedZ: number, traverseOrder: number) => {
    const { el } = node;
    const elemId = el._elemId;
    const clickData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'on_click')
      ? { elemId, x: el.x, y: el.y } : undefined;
    const dragData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'on_drag')
      ? { elemId, x: el.x, y: el.y } : undefined;
    const inputData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'input_changed')
      ? { elemId, x: el.x, y: el.y } : undefined;
    next.set(node.gridId, {
      element: node.el,
      absElement: { ...node.el, x: absCol, y: absRow, alpha: parentAlpha * (el.alpha ?? 1), z: inheritedZ + (el.z ?? 0) },
      info: {
        id: node.gridId,
        zOrder: traverseOrder,
        panelId: parentGridId,
        clickData,
        dragData,
        inputData,
      },
    });
  };

  // ── DFS traversal ─────────────────────────────────────────────────────────
  // Accumulating absolute numbers: position (absRow/absCol), alpha, and z, and removing invisible elements.  
  // The traversal order is used to determine z-order when multiple elements have the same z value.
  // Note that we use post order, so panel could compute their width/height based on their children.  
  // However, the tranversal order uses pre-order to make sure the panels are below their children.

  let traverseOrder = 0;

  const traverse = (
        node: TreeNodeEntry, 
        parentGridId: string | undefined, 
        originRow: number, originCol: number, inheritedAlpha: number, 
        inheritedZ: number) => {
    if (node.el.visible === false) return;
    traverseOrder++;
    const absRow = originRow + node.el.y;
    const absCol = originCol + node.el.x;
    if (isPanelNode(node)) {
      const panelOrder = traverseOrder;
      const panelEl = node.el as { alpha?: number; z?: number };
      const childAlpha = inheritedAlpha * (panelEl.alpha ?? 1);
      const childZ = inheritedZ + (panelEl.z ?? 0);
      for (const child of node.children) traverse(child, node.gridId, absRow, absCol, childAlpha, childZ);
      emitPanel(node, parentGridId, absRow, absCol, inheritedAlpha, inheritedZ, panelOrder);
    } else {
      emitLeaf(node, parentGridId, absRow, absCol, inheritedAlpha, inheritedZ, traverseOrder);
    }
  };

  for (const node of rootChildren) traverse(node, undefined, 0, 0, 1, 0);

  return next;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export function useGridState() {
  // ── Zoom Level ─────────────────────────────────────────────────────
  const [zoom, setZoomLevel] = useState(1);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const setZoom = useCallback((value: number) => {
    setZoomLevel(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)));
  }, []);

  // ── objects ─────────────────────────────────────────────────────

  const [objects, setObjects] = useState<Map<string, GridObject>>(new Map());

  const positionedObjects = useMemo((): Map<string, GridObject> => {
    const objectMap = new Map<string, GridObject>();

    // TODO: This is a temporary fix to clamp objects within the 50x50 grid. 
    //       We should not draw objects completely outside the grid, and only draw them partially
    //       if they are partially outside.
    for (const obj of objects.values()) {
      const clampedX = Math.max(0, Math.min(49, obj.absElement.x));
      const clampedY = Math.max(0, Math.min(49, obj.absElement.y));
      // Clamp absElement so the stored (unclamped) absElement stays unchanged
      objectMap.set(obj.info.id, {
        element: obj.element,
        absElement: { ...obj.absElement, x: clampedX, y: clampedY },
        info: obj.info,
      });
    }

    return objectMap;
  }, [objects]);

  const loadGridObjects = useCallback((elements: VisualBuilderElementBase[]) => {
    setObjects(() => buildGridObjects(elements));
  }, []);

  return {
    objects: positionedObjects,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    loadGridObjects,
  };
}
