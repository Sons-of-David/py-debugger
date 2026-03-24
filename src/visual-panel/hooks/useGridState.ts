import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  CellPosition,
  RenderableObjectData,
  OccupantInfo,
  PanelStyle,
  InteractionData,
} from '../types/grid';
import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import { cellKey } from '../types/grid';
import { PanelCell } from '../render-objects';
import { hasHandler } from '../handlersState';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

interface GridObject {
  id: string;
  data: RenderableObjectData;
  position: CellPosition;
  zOrder: number;
}


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

  const zOrderCounter = useRef(0);

  const panelAutoSizes = useMemo(() => {
    const sizes = new Map<string, { width: number; height: number }>();

    const computeSize = (panelId: string): { width: number; height: number } => {
      if (sizes.has(panelId)) return sizes.get(panelId)!;

      const panelObj = objects.get(panelId);
      if (!panelObj?.data.panel) return { width: 1, height: 1 };

      let maxRow = 0;
      let maxCol = 0;

      for (const [, child] of objects) {
        if (child.data.panelId !== panelId) continue;

        let w = 1, h = 1;
        if (child.data.panel) {
          const nested = computeSize(child.data.panel.id);
          w = nested.width;
          h = nested.height;
        } else {
          w = child.data.shapeProps?.width ?? 1;
          h = child.data.shapeProps?.height ?? 1;
        }

        maxRow = Math.max(maxRow, child.position.row - panelObj.position.row + h);
        maxCol = Math.max(maxCol, child.position.col - panelObj.position.col + w);
      }

      const declaredW = panelObj.data.panel.width ?? 1;
      const declaredH = panelObj.data.panel.height ?? 1;
      const size = { width: Math.max(declaredW, maxCol), height: Math.max(declaredH, maxRow) };
      sizes.set(panelId, size);
      return size;
    };

    for (const [panelId, obj] of objects) {
      if (obj.data.panel) computeSize(panelId);
    }

    return sizes;
  }, [objects]);

  const { cells, overlayCells, occupancyMap } = useMemo((): {
    cells: Map<string, RenderableObjectData>;
    overlayCells: Map<string, RenderableObjectData>;
    occupancyMap: Map<string, OccupantInfo[]>;
  } => {
    const cellMap = new Map<string, RenderableObjectData>();
    const overlayMap = new Map<string, RenderableObjectData>();
    const occMap = new Map<string, OccupantInfo[]>();
    const sortedObjects = Array.from(objects.values()).sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));

    const addOccupant = (row: number, col: number, info: OccupantInfo) => {
      const key = cellKey(row, col);
      const list = occMap.get(key);
      if (list) list.push(info);
      else occMap.set(key, [info]);
    };

    // Populate occupancy for panels (positions are already absolute)
    for (const obj of sortedObjects) {
      if (!obj.data.panel?.id) continue;
      const autoSize = panelAutoSizes.get(obj.data.panel.id);
      const pw = autoSize?.width ?? 1;
      const ph = autoSize?.height ?? 1;
      const { row, col } = obj.position;
      for (let r = 0; r < ph; r++) {
        for (let c = 0; c < pw; c++) {
          addOccupant(row + r, col + c, {
            cellData: obj.data,
            originRow: row,
            originCol: col,
            isPanel: true,
            zOrder: obj.zOrder,
          });
        }
      }
    }

    const setOrOverlay = (key: string, cellData: RenderableObjectData) => {
      if (!cellMap.has(key)) {
        cellMap.set(key, cellData);
      } else {
        let n = 0;
        while (overlayMap.has(`${key},${n}`)) n++;
        overlayMap.set(`${key},${n}`, cellData);
      }
    };

    // Unified pass: all non-panel objects (positions are already absolute)
    for (const obj of sortedObjects) {
      if (obj.data.panel) continue;
      const position = {
        row: Math.max(0, Math.min(49, obj.position.row)),
        col: Math.max(0, Math.min(49, obj.position.col)),
      };

      const objW = obj.data.shapeProps?.width ?? 1;
      const objH = obj.data.shapeProps?.height ?? 1;
      const resolvedRenderableObjectData: RenderableObjectData = { ...obj.data };
      setOrOverlay(cellKey(position.row, position.col), resolvedRenderableObjectData);

      for (let r = 0; r < objH; r++) {
        for (let c = 0; c < objW; c++) {
          addOccupant(position.row + r, position.col + c, {
            cellData: resolvedRenderableObjectData,
            originRow: position.row,
            originCol: position.col,
            isPanel: false,
            zOrder: obj.zOrder,
          });
        }
      }
    }

    for (const [, list] of occMap) {
      if (list.length > 1) list.sort((a, b) => a.zOrder - b.zOrder);
    }

    return { cells: cellMap, overlayCells: overlayMap, occupancyMap: occMap };
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
      if (!obj.data.panel) continue;
      const autoSize = panelAutoSizes.get(obj.data.panel.id);
      result.push({
        id: obj.data.panel.id,
        row: obj.position.row,
        col: obj.position.col,
        width: autoSize?.width ?? 1,
        height: autoSize?.height ?? 1,
        title: obj.data.panel.title,
        panelStyle: obj.data.panel.panelStyle,
        showBorder: obj.data.panel.showBorder,
      });
    }

    return result;
  }, [objects, panelAutoSizes]);

  const loadVisualBuilderObjects = useCallback((elements: VisualBuilderElementBase[]) => {
    // ── Tree node types ─────────────────────────────────────────────────────
    interface PanelTreeNode { el: VisualBuilderElementBase; gridId: string; children: TreeNodeEntry[]; }
    interface LeafTreeNode  { el: VisualBuilderElementBase; gridId: string; }
    type TreeNodeEntry = PanelTreeNode | LeafTreeNode;
    const isPanelNode = (n: TreeNodeEntry): n is PanelTreeNode => 'children' in n;

    setObjects(() => {
      const next = new Map<string, GridObject>();
      let idx = 0;
      let z = zOrderCounter.current++;

      // ── Build panel tree ────────────────────────────────────────────────
      // Panel grid ID = panel-e{_elem_id}. Children reference parents by
      // el.panelId (Python _elem_id string), so no translation map is needed.

      const panelNodeMap = new Map<string, PanelTreeNode>();
      const allNodes: TreeNodeEntry[] = [];

      const addNode = (el: VisualBuilderElementBase, presetGridId?: string) => {
        if (el.type === 'panel') {
          const gridId = `panel-e${(el as any)._elem_id}`;
          const node: PanelTreeNode = { el, gridId, children: [] };
          panelNodeMap.set(gridId, node);
          allNodes.push(node);
        } else {
          const rawElemId = (el as { _elemId?: number })._elemId;
          const gridId = presetGridId ?? (rawElemId != null ? `elem-${rawElemId}` : `${idx++}`);
          allNodes.push({ el, gridId });
        }
      };

      type ExpandableElement = VisualBuilderElementBase & { expand: () => Array<{ _gridId?: string } & VisualBuilderElementBase> };
      const isExpandable = (e: VisualBuilderElementBase): e is ExpandableElement =>
        'expand' in e && typeof (e as ExpandableElement).expand === 'function';

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

      // ── Emit helpers ────────────────────────────────────────────────────

      const emitPanel = (node: PanelTreeNode, parentGridId: string | undefined, absRow: number, absCol: number) => {
        const elAny = node.el as any;
        const { gridId } = node;
        const width = elAny.width ?? 5;
        const height = elAny.height ?? 5;
        const panelCell = new PanelCell({ id: gridId, title: elAny.name, showBorder: elAny.show_border ?? false });
        next.set(gridId, {
          id: gridId,
          data: {
            objectId: gridId,
            elementInfo: panelCell as any,
            panel: { id: gridId, width, height, title: elAny.name, panelStyle: elAny.panelStyle, showBorder: elAny.show_border ?? false },
            shapeProps: { width, height },
            zOrder: z,
            userZ: elAny.z ?? 0,
            ...(parentGridId ? { panelId: parentGridId } : {}),
          },
          position: { row: absRow, col: absCol },
          zOrder: z++,
        });
      };

      const emitLeaf = (node: LeafTreeNode, parentGridId: string | undefined, absRow: number, absCol: number, parentAlpha: number) => {
        const { el } = node;
        const elAny = el as any;
        if (!('draw' in el && typeof (el as { draw?: unknown }).draw === 'function')) return;
        const drawResult = (el as { draw: () => Record<string, unknown> }).draw();
        const elemId = elAny._elemId as number | undefined;
        const clickData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'on_click')
          ? { elemId, x: el.x, y: el.y } : undefined;
        const dragData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'on_drag')
          ? { elemId, x: el.x, y: el.y } : undefined;
        const inputData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'input_changed')
          ? { elemId, x: el.x, y: el.y } : undefined;
        next.set(node.gridId, {
          id: node.gridId,
          data: {
            ...(drawResult as RenderableObjectData),
            objectId: node.gridId,
            panelId: parentGridId,
            zOrder: z,
            userZ: elAny.z ?? 0,
            animate: (el as { animate?: boolean }).animate,
            clickData,
            dragData,
            inputData,
            parentAlpha,
          },
          position: { row: absRow, col: absCol },
          zOrder: z++,
        });
      };

      // ── DFS traversal ───────────────────────────────────────────────────
      // Pre-order: parents emitted before children (required by cells memo).
      // visible=false prunes the entire subtree.
      // inheritedAlpha accumulates the product of all ancestor panel alphas.

      const traverse = (node: TreeNodeEntry, parentGridId: string | undefined, originRow: number, originCol: number, inheritedAlpha: number) => {
        if (node.el.visible === false) return;
        const absRow = originRow + node.el.y;
        const absCol = originCol + node.el.x;
        if (isPanelNode(node)) {
          emitPanel(node, parentGridId, absRow, absCol);
          const childAlpha = inheritedAlpha * ((node.el as { alpha?: number }).alpha ?? 1);
          for (const child of node.children) traverse(child, node.gridId, absRow, absCol, childAlpha);
        } else {
          emitLeaf(node, parentGridId, absRow, absCol, inheritedAlpha);
        }
      };

      for (const node of rootChildren) traverse(node, undefined, 0, 0, 1);

      return next;
    });
  }, []);

  return {
    cells,
    overlayCells,
    zoom,
    occupancyMap,
    zoomIn,
    zoomOut,
    setZoom,
    panels,
    loadVisualBuilderObjects,
  };
}
