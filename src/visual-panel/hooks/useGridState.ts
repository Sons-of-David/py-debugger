import { useState, useCallback, useMemo } from 'react';
import type {
  OccupantInfo,
  PanelStyle,
  InteractionData,
  GridObject,
} from '../types/grid';
import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import type { Panel } from '../render-objects/panel';
import type { BasicShape } from '../render-objects/BasicShape';
import { cellKey } from '../types/grid';
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

  const { objects: positionedObjects, overlayObjects, occupancyMap } = useMemo((): {
    objects: Map<string, GridObject>;
    overlayObjects: Map<string, GridObject>;
    occupancyMap: Map<string, OccupantInfo[]>;
  } => {
    const objectMap = new Map<string, GridObject>();
    const overlayMap = new Map<string, GridObject>();
    const occMap = new Map<string, OccupantInfo[]>();
    const sortedObjects = Array.from(objects.values()).sort((a, b) => a.info.zOrder - b.info.zOrder);

    const addOccupant = (row: number, col: number, info: OccupantInfo) => {
      const key = cellKey(row, col);
      const list = occMap.get(key);
      if (list) list.push(info);
      else occMap.set(key, [info]);
    };

    // Populate occupancy for panels (positions are already absolute)
    for (const obj of sortedObjects) {
      if (obj.element.type !== 'panel') continue;
      const autoSize = panelAutoSizes.get(obj.info.id);
      const pw = autoSize?.width ?? 1;
      const ph = autoSize?.height ?? 1;
      const { row, col } = obj.info.position;
      for (let r = 0; r < ph; r++) {
        for (let c = 0; c < pw; c++) {
          addOccupant(row + r, col + c, {
            objectData: obj,
            originRow: row,
            originCol: col,
            zOrder: obj.info.zOrder,
          });
        }
      }
    }

    const setOrOverlay = (key: string, gridObj: GridObject) => {
      if (!objectMap.has(key)) {
        objectMap.set(key, gridObj);
      } else {
        let n = 0;
        while (overlayMap.has(`${key},${n}`)) n++;
        overlayMap.set(`${key},${n}`, gridObj);
      }
    };

    // Unified pass: all non-panel objects (positions are already absolute)
    for (const obj of sortedObjects) {
      if (obj.element.type === 'panel') continue;
      const position = {
        row: Math.max(0, Math.min(49, obj.info.position.row)),
        col: Math.max(0, Math.min(49, obj.info.position.col)),
      };
      const objW = (obj.element as BasicShape).width ?? 1;
      const objH = (obj.element as BasicShape).height ?? 1;
      // Clamp position into a new GridObject so the stored position stays unclamped
      const clamped: GridObject = { element: obj.element, info: { ...obj.info, position } };
      setOrOverlay(cellKey(position.row, position.col), clamped);

      for (let r = 0; r < objH; r++) {
        for (let c = 0; c < objW; c++) {
          addOccupant(position.row + r, position.col + c, {
            objectData: clamped,
            originRow: position.row,
            originCol: position.col,
            zOrder: obj.info.zOrder,
          });
        }
      }
    }

    for (const [, list] of occMap) {
      if (list.length > 1) list.sort((a, b) => a.zOrder - b.zOrder);
    }

    return { objects: objectMap, overlayObjects: overlayMap, occupancyMap: occMap };
  }, [objects, panelAutoSizes]);

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
    overlayObjects,
    zoom,
    occupancyMap,
    zoomIn,
    zoomOut,
    setZoom,
    panels,
    loadVisualBuilderObjects,
  };
}
