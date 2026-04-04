// =============================================================================
// Grid.tsx — infinite scrollable canvas: renders all visual elements
//
// Responsibilities:
//   - Canvas: 50×50 cell grid with zoom, scroll, and optional clip dimensions
//   - Object rendering: positions RenderableObjectData objects as animated
//     motion.div elements; skips animation for unchanged elements (changedIds)
//   - Z-ordering: sorts objects by userZ then zOrder before painting
//   - Drag protocol: mousedown → throttled mousemove (in-flight guard) →
//     window-level mouseup so drag end fires even if mouse leaves the grid
//   - Input widget: activates an overlay <input> on input-type elements
//   - Text boxes layer: delegates to TextBoxesLayer
//   - Capture region layer: delegates to CaptureRegionLayer
//   - Viewport API: scrollTo, clipTo, alignGrid exposed via GridHandle ref
// =============================================================================

import { useRef, useCallback, useMemo, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { GridSingleObject, type RenderableObject } from './GridSingleObject';
import type { GridObject } from '../types/grid';
import type { TextBox } from '../../text-boxes/types';
import { TextBoxesLayer } from '../../text-boxes/TextBoxesLayer';
import { CaptureRegionLayer, type CaptureRegion } from './CaptureRegionLayer';

// ── Constants ──────────────────────────────────────────────────────────────

export const CELL_SIZE = 40;
const GRID_COLS = 50;
const GRID_ROWS = 50;

// ── Types ──────────────────────────────────────────────────────────────────

interface GridProps {
  objects: Map<string, GridObject>;
  /** Elem IDs that changed at this step; null = full snapshot (animate all). */
  changedIds?: Set<number> | null;
  zoom: number;
  onZoom: (delta: number) => void;
  darkMode?: boolean;
  mouseEnabled?: boolean;
  onElementClick?: (elemId: number, x: number, y: number) => void;
  onElementDrag?: (elemId: number, x: number, y: number, dragType: 'start' | 'mid' | 'end') => Promise<void> | void;
  onElementInput?: (elemId: number, text: string) => void;
  // Text box props
  textBoxes?: TextBox[];
  selectedTextBoxId?: string | null;
  addingTextBox?: boolean;
  onSelectTextBox?: (id: string | null) => void;
  onTextBoxAdded?: (box: TextBox) => void;
  onTextBoxChange?: (box: TextBox) => void;
  onTextBoxDelete?: (id: string) => void;
  // Capture region props
  capturingRegion?: boolean;
  captureRegionBounds?: CaptureRegion | null;
  onCaptureRegionDrawn?: (region: CaptureRegion) => void;
}

export interface GridHandle {
  alignGrid: () => void;
  captureElement: () => HTMLDivElement | null;
  scrollTo: (x: number, y: number) => void;
  clipTo: (w: number, h: number) => void;
}

// ── Main Grid component ────────────────────────────────────────────────────

export const Grid = forwardRef<GridHandle, GridProps>(function Grid({
  objects,
  changedIds,
  zoom,
  onZoom,
  darkMode = false,
  mouseEnabled = false,
  onElementClick,
  onElementDrag,
  onElementInput,
  textBoxes = [],
  selectedTextBoxId = null,
  addingTextBox = false,
  onSelectTextBox,
  onTextBoxAdded,
  onTextBoxChange,
  onTextBoxDelete,
  capturingRegion = false,
  captureRegionBounds = null,
  onCaptureRegionDrawn,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridContentRef = useRef<HTMLDivElement>(null);
  const [clipDims, setClipDims] = useState<{ w: number; h: number } | null>(null);

  // ── Drag state ──────────────────────────────────────────────────────────
  const dragStateRef = useRef<{ elemId: number; lastRow: number; lastCol: number; panelOriginCol: number; panelOriginRow: number } | null>(null);
  const dragCallInFlightRef = useRef(false);

  // Stable ref to avoid stale closures in window-level event listeners
  const onElementDragRef = useRef(onElementDrag);
  useEffect(() => {
    onElementDragRef.current = onElementDrag;
  });

  // Window-level mouseup so drag end fires even if mouse leaves the grid
  useEffect(() => {
    const handleMouseUp = () => {
      if (!dragStateRef.current) return;
      const { elemId, lastRow, lastCol } = dragStateRef.current;
      dragStateRef.current = null;
      dragCallInFlightRef.current = false;
      onElementDragRef.current?.(elemId, lastCol, lastRow, 'end');
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const getCellFromMouseEvent = useCallback((e: React.MouseEvent): [number, number] => {
    const container = containerRef.current;
    if (!container) return [0, 0];
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left + container.scrollLeft) / zoom / CELL_SIZE;
    const y = (e.clientY - rect.top + container.scrollTop) / zoom / CELL_SIZE;
    return [Math.max(0, Math.floor(y)), Math.max(0, Math.floor(x))];
  }, [zoom]);

  const handleDragStart = useCallback((elemId: number, x: number, y: number, panelOriginCol: number, panelOriginRow: number) => {
    dragStateRef.current = { elemId, lastRow: y, lastCol: x, panelOriginCol, panelOriginRow };
    Promise.resolve(onElementDragRef.current?.(elemId, x, y, 'start'))
      .finally(() => { dragCallInFlightRef.current = false; });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStateRef.current || dragCallInFlightRef.current) return;
    const [absRow, absCol] = getCellFromMouseEvent(e);
    const { elemId, lastRow, lastCol, panelOriginCol, panelOriginRow } = dragStateRef.current;
    const col = absCol - panelOriginCol;
    const row = absRow - panelOriginRow;
    if (row === lastRow && col === lastCol) return;
    dragStateRef.current.lastRow = row;
    dragStateRef.current.lastCol = col;
    dragCallInFlightRef.current = true;
    // Wrap in Promise.resolve so the in-flight flag clears whether the handler
    // returns a Promise (async) or void (sync / not defined).
    Promise.resolve(onElementDragRef.current?.(elemId, col, row, 'mid'))
      .finally(() => { dragCallInFlightRef.current = false; });
  }, [getCellFromMouseEvent]);

  // ── Grid setup ──────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    alignGrid: () => {
      const container = containerRef.current;
      if (!container) return;
      const scaledCellSize = CELL_SIZE * zoom;
      const offsetLeft = container.scrollLeft % scaledCellSize;
      const offsetTop = container.scrollTop % scaledCellSize;
      container.scrollTo({
        left: container.scrollLeft - offsetLeft,
        top: container.scrollTop - offsetTop,
        behavior: 'smooth',
      });
    },
    captureElement: () => containerRef.current,
    scrollTo: (x: number, y: number) => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = x * CELL_SIZE * zoom;
      container.scrollTop = y * CELL_SIZE * zoom;
    },
    clipTo: (w: number, h: number) => setClipDims({ w, h }),
  }), [zoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        onZoom(delta);
      }
    },
    [onZoom]
  );

  const gridLineColor = darkMode ? '#4b5563' : '#d1d5db';
  const gridBgColor = darkMode ? '#1f2937' : '#ffffff';

  const objectsToRender = useMemo((): RenderableObject[] => {
    const result: RenderableObject[] = [];

    for (const [, gridObj] of objects) {
      const col = gridObj.absElement.x;
      const row = gridObj.absElement.y;
      result.push({
        key: gridObj.info.id,
        row, col, obj: gridObj,
        widthCells: (gridObj.absElement as { width?: number }).width ?? 1,
        heightCells: (gridObj.absElement as { height?: number }).height ?? 1,
      });
    }

    result.sort((a, b) =>
      (b.obj.absElement.z ?? 0) - (a.obj.absElement.z ?? 0) ||
      a.obj.info.zOrder - b.obj.info.zOrder
    );

    return result;
  }, [objects]);

  const renderedObjects = useMemo(() => {
    return objectsToRender.map((obj) => (
      <GridSingleObject
        key={obj.key}
        obj={obj}
        mouseEnabled={mouseEnabled}
        onElementClick={onElementClick}
        onElementDragStart={handleDragStart}
        onElementInput={onElementInput}
        changedIds={changedIds}
      />
    ));
  }, [objectsToRender, mouseEnabled, onElementClick, handleDragStart, onElementInput, changedIds]);


  return (
    <div
      ref={containerRef}
      className={`bg-gray-100 dark:bg-gray-900 ${clipDims ? '' : 'w-full h-full overflow-auto'}`}
      style={clipDims ? {
        width: clipDims.w * CELL_SIZE * zoom,
        height: clipDims.h * CELL_SIZE * zoom,
        overflow: 'hidden',
        flexShrink: 0,
      } : undefined}
      onWheel={handleWheel}
      onMouseDown={() => { if (selectedTextBoxId) onSelectTextBox?.(null); }}
      onMouseMove={handleMouseMove}
    >
      <div
        ref={gridContentRef}
        className="origin-top-left relative"
        style={{
          transform: `scale(${zoom})`,
          width: CELL_SIZE * GRID_COLS,
          minHeight: CELL_SIZE * GRID_ROWS,
        }}
      >
        {/* Background grid */}
        <div
          style={{
            width: CELL_SIZE * GRID_COLS,
            height: CELL_SIZE * GRID_ROWS,
            backgroundColor: gridBgColor,
            backgroundImage: `linear-gradient(to right, ${gridLineColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            // Shift by -0.5px so grid lines straddle cell boundaries rather than
            // sitting at the left/top edge of each cell. Without this, objects placed
            // at col*CELL_SIZE overlap the left/top grid line but not the right/bottom
            // one, making shapes appear asymmetrically offset toward the top-left.
            backgroundPosition: '-0.5px -0.5px',
          }}
        />

        {/* Objects layer */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-none">
            {renderedObjects}
          </div>
        </div>

        {/* Text boxes layer */}
        <div
          className="absolute inset-0"
          style={{ pointerEvents: addingTextBox ? 'auto' : 'none' }}
        >
          <div className="relative w-full h-full">
            <TextBoxesLayer
              textBoxes={textBoxes}
              selectedId={selectedTextBoxId}
              zoom={zoom}
              addingTextBox={addingTextBox}
              onSelectTextBox={onSelectTextBox ?? (() => {})}
              onTextBoxAdded={onTextBoxAdded ?? (() => {})}
              onTextBoxChange={onTextBoxChange ?? (() => {})}
              onTextBoxDelete={onTextBoxDelete ?? (() => {})}
            />
          </div>
        </div>

        {/* Capture region layer */}
        <div className="absolute inset-0" style={{ pointerEvents: capturingRegion ? 'auto' : 'none' }}>
          <div className="relative w-full h-full">
            <CaptureRegionLayer
              active={capturingRegion}
              persistedRegion={captureRegionBounds}
              onRegionDrawn={onCaptureRegionDrawn ?? (() => {})}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
