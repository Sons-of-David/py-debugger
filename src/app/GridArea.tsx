// =============================================================================
// GridArea.tsx — Visual Panel shell: toolbar + Grid wrapper
//
// Responsibilities:
//   - Toolbar: zoom controls, align-grid, screenshot / GIF capture, text-box toggle
//   - Interaction dispatch: click / drag / input events → Python executor → onTrace
//   - Text box state: owns TextBox[] internally; exposes serialize / load on
//     GridAreaHandle for parent-driven save, load, and reset
//   - Capture: screenshot region selection, canvas rendering, PNG download;
//              GIF region handoff to App (onCreateGif)
//   - Viewport control: scrollViewport and clipViewport exposed to parent via ref
//   - Trace-mode overlay: transparent div that blocks element clicks and fires
//     onTraceClickAttempt so App can show "exit trace to interact" feedback
// =============================================================================

import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { renderFrameToCanvas } from '../capture/canvasRenderer';
import { Grid, type GridHandle, CELL_SIZE } from '../visual-panel/components/Grid';
import { useGridState } from '../visual-panel/hooks/useGridState';
import type { VisualBuilderElementBase } from '../api/visualBuilder';
import { executeClickHandler, executeDragHandler, executeInputChanged, type TraceStageInfo, type DragType } from '../python-engine/executor';
import { appendError } from '../output-terminal/terminalState';
import { migrateTextBox, type TextBox } from '../text-boxes/types';

import type { CaptureRegion } from '../visual-panel/components/CaptureRegionLayer';

/* ---------- Shared Tailwind class groups ---------- */

const buttonBase =
  "px-3 py-1 rounded text-sm font-medium transition-colors";

const buttonNeutral =
  `${buttonBase} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;

const buttonDisabled =
  `${buttonNeutral} disabled:opacity-50`;

const panelHeader =
  "flex-shrink-0 h-10 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between";

export interface GridAreaHandle {
  loadVisualBuilderObjects: (elements: VisualBuilderElementBase[]) => void;
  scrollViewport: (x: number, y: number) => void;
  clipViewport: (w: number, h: number) => void;
  serialize: () => unknown;
  load: (state: unknown) => void;
}

interface GridAreaProps {
  darkMode: boolean;
  mouseEnabled: boolean;
  hideToolbar?: boolean;
  /** Visual elements to display; updated reactively when currentStep changes. */
  elements?: VisualBuilderElementBase[];
  /** Elem IDs that changed at this step; null = full snapshot (animate all). */
  changedIds?: Set<number> | null;
  /** True when the current code has viz blocks; enables interactive element handlers. */
  interactiveEnabled?: boolean;
  /** editor: called when a click produces a traced mini-timeline. */
  onTrace?: (result: TraceStageInfo) => void;
  appMode?: 'idle' | 'trace' | 'interactive';
  projectName?: string;
  onCreateGif?: (region: CaptureRegion | null) => void;
  isCreatingGif?: boolean;
  allowGif?: boolean;
  /** Called when the user clicks the visual panel while in trace mode. */
  onTraceClickAttempt?: () => void;
}

export const GridArea = forwardRef<GridAreaHandle, GridAreaProps>(
  function GridArea({ darkMode, mouseEnabled, hideToolbar = false, elements, changedIds, interactiveEnabled = false, onTrace, appMode = 'idle', projectName = 'visual-panel', onCreateGif, isCreatingGif = false, allowGif = false, onTraceClickAttempt }, ref) {
    const {
      objects,
      zoom,
      zoomIn,
      zoomOut,
      setZoom,
      panels,
      loadVisualBuilderObjects,
    } = useGridState();

    useEffect(() => {
      loadVisualBuilderObjects(elements ?? []);
    }, [elements, loadVisualBuilderObjects]);

    const gridRef = useRef<GridHandle>(null);
    const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
    const [addingTextBox, setAddingTextBox] = useState(false);
    const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);

    // Capture region state
    const [captureRegion, setCaptureRegion] = useState<CaptureRegion | null>(null);
    const [capturingRegionMode, setCapturingRegionMode] = useState(false);
    // When set, the next drawn region triggers a GIF instead of a screenshot
    const pendingGifRef = useRef(false);

    const handleZoom = useCallback(
      (delta: number) => {
        setZoom(zoom + delta);
      },
      [zoom, setZoom]
    );

    const handleAlignGrid = useCallback(() => {
      gridRef.current?.alignGrid();
    }, []);

    // ---------------------------------------------------------------------------
    // Element interaction handlers: click, input change, drag (move/resize)
    // ---------------------------------------------------------------------------

    // TODO: Why are these handled in the GridArea instead of the Grid? 
    // Also, these are all very similar — can they be unified into a single handler with a parameter for the type of interaction?
    const handleElementClick = useCallback(async (elemId: number, x: number, y: number) => {
      if (!interactiveEnabled) return;
      const result = await executeClickHandler(elemId, y, x);
      if (result.error) { appendError(result.error); return; }
      if (result.timeline.length > 0) onTrace?.(result);        
    }, [interactiveEnabled, onTrace]);

    const handleElementInput = useCallback(async (elemId: number, text: string) => {
      if (!interactiveEnabled) return;
      const result = await executeInputChanged(elemId, text);
      if (result.error) { appendError(result.error); return; }
      if (result.timeline.length > 0) onTrace?.(result);
    }, [interactiveEnabled, onTrace]);

    const handleElementDrag = useCallback(async (elemId: number, x: number, y: number, dragType: DragType) => {
      if (!interactiveEnabled) return;
      const result = await executeDragHandler(elemId, y, x, dragType);
      if (result.error) { appendError(result.error); return; }
      if (result.timeline.length > 0) onTrace?.(result);
    }, [interactiveEnabled, onTrace]);

    // ---------------------------------------------------------------------------
    // Text box handlers
    // ---------------------------------------------------------------------------

    const handleTextBoxAdded = useCallback((box: TextBox) => {
      setTextBoxes((prev) => [...prev, box]);
      setSelectedTextBoxId(box.id);
      setAddingTextBox(false);
    }, []);

    const handleTextBoxChange = useCallback((updated: TextBox) => {
      setTextBoxes((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }, []);

    const handleTextBoxDelete = useCallback((id: string) => {
      setTextBoxes((prev) => prev.filter((b) => b.id !== id));
      setSelectedTextBoxId(null);
    }, []);

    // ---------------------------------------------------------------------------
    // Capture handlers
    // ---------------------------------------------------------------------------

    /** Render the selected region to a canvas directly from element data. */
    const captureFrameCanvas = useCallback((region: CaptureRegion | null): HTMLCanvasElement => {
      const r = region ?? { col: 0, row: 0, widthCells: 50, heightCells: 50 };
      const canvas = document.createElement('canvas');
      canvas.width = r.widthCells * CELL_SIZE;
      canvas.height = r.heightCells * CELL_SIZE;
      const ctx = canvas.getContext('2d')!;
      renderFrameToCanvas(elements ?? [], ctx, r, darkMode);
      return canvas;
    }, [elements, darkMode]);

    const captureFrameData = useCallback((region: CaptureRegion | null): string => {
      return captureFrameCanvas(region).toDataURL('image/png');
    }, [captureFrameCanvas]);

    useImperativeHandle(ref, () => ({
      loadVisualBuilderObjects,
      captureFrameData,
      captureFrameCanvas,
      scrollViewport: (x: number, y: number) => gridRef.current?.scrollTo(x, y),
      clipViewport: (w: number, h: number) => gridRef.current?.clipTo(w, h),
      serialize: () => ({ textBoxes }),
      load: (state: unknown) => {
        const s = state as { textBoxes?: unknown[] } | null | undefined;
        setTextBoxes(
          (s?.textBoxes ?? []).map((raw) => migrateTextBox(raw as Record<string, unknown>))
        );
      },
    }), [loadVisualBuilderObjects, captureFrameData, captureFrameCanvas, textBoxes]);

    const downloadDataUrl = (dataUrl: string, filename: string) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    /** Called when a region is drawn — either triggers screenshot or GIF depending on pendingGifRef. */
    const handleCaptureRegionDrawn = useCallback((region: CaptureRegion) => {
      setCapturingRegionMode(false);

      if (pendingGifRef.current) {
        pendingGifRef.current = false;
        setCaptureRegion(null);
        onCreateGif?.(region);
        return;
      }

      // Screenshot path — synchronous, no spinner needed
      const dataUrl = captureFrameData(region);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadDataUrl(dataUrl, `${projectName}-${timestamp}.png`);
      setCaptureRegion(null);
    }, [captureFrameData, onCreateGif, projectName]);

    const handleScreenshotClick = useCallback(() => {
      pendingGifRef.current = false;
      setCapturingRegionMode(true);
    }, []);

    const handleGifClick = useCallback(() => {
      if (captureRegion) {
        const region = captureRegion;
        setCaptureRegion(null);
        onCreateGif?.(region);
      } else {
        pendingGifRef.current = true;
        setCapturingRegionMode(true);
      }
    }, [captureRegion, onCreateGif]);

    return (
      <div className="h-full flex flex-col">
        {!hideToolbar && (
          <div className={panelHeader}>
            {/* Visual controls */}
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className={buttonNeutral}>
                -
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={zoomIn} className={buttonNeutral}>
                +
              </button>
              <button
                onClick={handleAlignGrid}
                className={buttonNeutral}
                title="Align grid to viewport"
              >
                ⊞
              </button>
              <button
                onClick={handleScreenshotClick}
                className={`${buttonDisabled}${capturingRegionMode && !pendingGifRef.current ? ' ring-2 ring-inset ring-orange-500' : ''}`}
                title="Screenshot: click then draw a region on the grid"
              >
                📷
              </button>
              {appMode === 'trace' && allowGif && (
                <button
                  onClick={handleGifClick}
                  disabled={isCreatingGif}
                  className={`${buttonDisabled}${capturingRegionMode && pendingGifRef.current ? ' ring-2 ring-inset ring-orange-500' : ''}`}
                  title="Export full trace as GIF"
                >
                  {isCreatingGif ? '⏳' : '🎬'}
                </button>
              )}
              <button
                onClick={() => setAddingTextBox((v) => !v)}
                className={`${buttonNeutral}${addingTextBox ? ' ring-2 ring-inset ring-indigo-500' : ''}`}
                title="Add text annotation (click-drag on grid)"
              >
                T+
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {appMode === 'trace' && !capturingRegionMode && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={onTraceClickAttempt}
            />
          )}
          <Grid
            ref={gridRef}
            objects={objects}
            changedIds={changedIds}
            panels={panels}
            zoom={zoom}
            onZoom={handleZoom}
            darkMode={darkMode}
            mouseEnabled={mouseEnabled}
            onElementClick={handleElementClick}
            onElementDrag={handleElementDrag}
            onElementInput={handleElementInput}
            textBoxes={textBoxes}
            selectedTextBoxId={selectedTextBoxId}
            addingTextBox={addingTextBox}
            onSelectTextBox={setSelectedTextBoxId}
            onTextBoxAdded={handleTextBoxAdded}
            onTextBoxChange={handleTextBoxChange}
            onTextBoxDelete={handleTextBoxDelete}
            capturingRegion={capturingRegionMode}
            captureRegionBounds={captureRegion}
            onCaptureRegionDrawn={handleCaptureRegionDrawn}
          />
        </div>
      </div>
    );
  }
);
