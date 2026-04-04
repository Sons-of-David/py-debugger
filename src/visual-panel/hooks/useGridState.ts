import { useState, useCallback, useMemo } from 'react';
import type {
  InteractionData,
  GridObject,
} from '../types/grid';
import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import type { Panel } from '../render-objects/panel';
import type { BasicShape } from '../render-objects/BasicShape';
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
 * Map<gridId, GridObject> used by useGridState.  Exported for unit testing.
 */
export function buildGridObjects(elements: VisualBuilderElementBase[]): Map<string, GridObject> {
  const next = new Map<string, GridObject>();
  let idx = 0;
  let z = 0;

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

  // ── Panel size computation ────────────────────────────────────────────────

  // TODO: have a grownup fix this stuff
  const computePanelSize = (node: PanelTreeNode, panelAbsCol: number, panelAbsRow: number): { width: number; height: number } => {
    let maxRow = 0, maxCol = 0;
    for (const child of node.children) {
      const childAbsRow = panelAbsRow + child.el.y;
      const childAbsCol = panelAbsCol + child.el.x;
      let w: number, h: number;
      if (isPanelNode(child)) {
        const nested = computePanelSize(child, childAbsCol, childAbsRow);
        w = nested.width; h = nested.height;
      } else {
        w = (child.el as BasicShape).width ?? 1;
        h = (child.el as BasicShape).height ?? 1;
      }
      maxRow = Math.max(maxRow, childAbsRow - panelAbsRow + h);
      maxCol = Math.max(maxCol, childAbsCol - panelAbsCol + w);
    }
    const panelEl = node.el as Panel;
    return {
      width:  Math.max(panelEl.width  ?? 5, maxCol),
      height: Math.max(panelEl.height ?? 5, maxRow),
    };
  };

  // ── Emit helpers ──────────────────────────────────────────────────────────

  const emitPanel = (node: PanelTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, inheritedAlpha: number, inheritedZ: number) => {
    const { gridId } = node;
    const panelEl = node.el as { alpha?: number; z?: number };
    const { width, height } = computePanelSize(node, absCol, absRow);
    next.set(gridId, {
      element: node.el,
      absElement: { ...node.el, x: absCol, y: absRow, alpha: inheritedAlpha * (panelEl.alpha ?? 1), z: inheritedZ + (panelEl.z ?? 0), width, height } as VisualBuilderElementBase,
      info: {
        id: gridId,
        zOrder: z++,
        panelId: parentGridId,
      },
    });
  };

  const emitLeaf = (node: LeafTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, parentAlpha: number, inheritedZ: number) => {
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
        zOrder: z++,
        panelId: parentGridId,
        clickData,
        dragData,
        inputData,
      },
    });
  };

  // ── DFS traversal ─────────────────────────────────────────────────────────
  // Pre-order: parents emitted before children (required by cells memo).
  // visible=false prunes the entire subtree.
  // inheritedAlpha accumulates the product of all ancestor panel alphas.
  // inheritedZ accumulates the sum of all ancestor panel z values.

  const traverse = (node: TreeNodeEntry, parentGridId: string | undefined, originRow: number, originCol: number, inheritedAlpha: number, inheritedZ: number) => {
    if (node.el.visible === false) return;
    const absRow = originRow + node.el.y;
    const absCol = originCol + node.el.x;
    if (isPanelNode(node)) {
      emitPanel(node, parentGridId, absRow, absCol, inheritedAlpha, inheritedZ);
      const panelEl = node.el as { alpha?: number; z?: number };
      const childAlpha = inheritedAlpha * (panelEl.alpha ?? 1);
      const childZ = inheritedZ + (panelEl.z ?? 0);
      for (const child of node.children) traverse(child, node.gridId, absRow, absCol, childAlpha, childZ);
    } else {
      emitLeaf(node, parentGridId, absRow, absCol, inheritedAlpha, inheritedZ);
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

  const loadVisualBuilderObjects = useCallback((elements: VisualBuilderElementBase[]) => {
    setObjects(() => buildGridObjects(elements));
  }, []);

  return {
    objects: positionedObjects,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    loadVisualBuilderObjects,
  };
}
