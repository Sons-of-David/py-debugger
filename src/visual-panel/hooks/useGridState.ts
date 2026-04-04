import { useState, useCallback, useMemo } from 'react';
import type {
  PanelStyle,
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

  // ── Emit helpers ──────────────────────────────────────────────────────────

  const emitPanel = (node: PanelTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, inheritedAlpha: number) => {
    const { gridId } = node;
    next.set(gridId, {
      element: node.el,
      info: {
        id: gridId,
        position: { row: absRow, col: absCol },
        zOrder: z++,
        parentAlpha: inheritedAlpha,
        panelId: parentGridId,
      },
    });
  };

  const emitLeaf = (node: LeafTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, parentAlpha: number) => {
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
      info: {
        id: node.gridId,
        position: { row: absRow, col: absCol },
        zOrder: z++,
        parentAlpha,
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

  const traverse = (node: TreeNodeEntry, parentGridId: string | undefined, originRow: number, originCol: number, inheritedAlpha: number) => {
    if (node.el.visible === false) return;
    const absRow = originRow + node.el.y;
    const absCol = originCol + node.el.x;
    if (isPanelNode(node)) {
      emitPanel(node, parentGridId, absRow, absCol, inheritedAlpha);
      const childAlpha = inheritedAlpha * ((node.el as { alpha?: number }).alpha ?? 1);
      for (const child of node.children) traverse(child, node.gridId, absRow, absCol, childAlpha);
    } else {
      emitLeaf(node, parentGridId, absRow, absCol, inheritedAlpha);
    }
  };

  for (const node of rootChildren) traverse(node, undefined, 0, 0, 1);

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

  const panelAutoSizes = useMemo(() => {
    const sizes = new Map<string, { width: number; height: number }>();

    const computeSize = (panelId: string): { width: number; height: number } => {
      if (sizes.has(panelId)) return sizes.get(panelId)!;

      const panelObj = objects.get(panelId);
      if (!panelObj || panelObj.element.type !== 'panel') return { width: 1, height: 1 };

      let maxRow = 0;
      let maxCol = 0;

      for (const [, child] of objects) {
        if (child.info.panelId !== panelId) continue;

        let w = 1, h = 1;
        if (child.element.type === 'panel') {
          const nested = computeSize(child.info.id);
          w = nested.width;
          h = nested.height;
        } else {
          w = (child.element as BasicShape).width ?? 1;
          h = (child.element as BasicShape).height ?? 1;
        }

        maxRow = Math.max(maxRow, child.info.position.row - panelObj.info.position.row + h);
        maxCol = Math.max(maxCol, child.info.position.col - panelObj.info.position.col + w);
      }

      const panelEl = panelObj.element as Panel;
      const declaredW = panelEl.width ?? 5;
      const declaredH = panelEl.height ?? 5;
      const size = { width: Math.max(declaredW, maxCol), height: Math.max(declaredH, maxRow) };
      sizes.set(panelId, size);
      return size;
    };

    for (const [panelId, obj] of objects) {
      if (obj.element.type === 'panel') computeSize(panelId);
    }

    return sizes;
  }, [objects]);

  const positionedObjects = useMemo((): Map<string, GridObject> => {
    const objectMap = new Map<string, GridObject>();

    for (const obj of objects.values()) {
      if (obj.element.type === 'panel') continue;
      const position = {
        row: Math.max(0, Math.min(49, obj.info.position.row)),
        col: Math.max(0, Math.min(49, obj.info.position.col)),
      };
      // Clamp position into a new GridObject so the stored position stays unclamped
      objectMap.set(obj.info.id, { element: obj.element, info: { ...obj.info, position } });
    }

    return objectMap;
  }, [objects]);

  const panels = useMemo(() => {
    const result: Array<{
      id: string;
      row: number;
      col: number;
      width: number;
      height: number;
      title?: string;
      panelStyle?: PanelStyle;
      showBorder?: boolean;
      invalidReason?: string;
    }> = [];

    for (const [, obj] of objects) {
      if (obj.element.type !== 'panel') continue;
      const panelEl = obj.element as Panel;
      const autoSize = panelAutoSizes.get(obj.info.id);
      result.push({
        id: obj.info.id,
        row: obj.info.position.row,
        col: obj.info.position.col,
        width: autoSize?.width ?? 1,
        height: autoSize?.height ?? 1,
        title: panelEl.name,
        panelStyle: panelEl.panelStyle,
        showBorder: panelEl.show_border ?? false,
      });
    }

    return result;
  }, [objects, panelAutoSizes]);

  const loadVisualBuilderObjects = useCallback((elements: VisualBuilderElementBase[]) => {
    setObjects(() => buildGridObjects(elements));
  }, []);

  return {
    objects: positionedObjects,
    zoom,
    zoomIn,
    zoomOut,
    setZoom,
    panels,
    loadVisualBuilderObjects,
  };
}
