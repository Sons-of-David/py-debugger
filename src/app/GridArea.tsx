import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { toCanvas } from 'html-to-image';
import { Grid, type GridHandle, CELL_SIZE } from '../visual-panel/components/Grid';
import { useGridState } from '../visual-panel/hooks/useGridState';
import type { VisualBuilderElementBase } from '../api/visualBuilder';
import { executeClickHandler, executeDragHandler, executeInputChanged, type TraceStageInfo, type DragType } from '../python-engine/executor';
import { appendError } from '../output-terminal/terminalState';
import type { TextBox } from '../text-boxes/types';
import type { VizRange } from '../python-engine/viz-block-parser';
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
  captureFrameData: (region: CaptureRegion | null) => Promise<string | null>;
  captureFrameCanvas: (region: CaptureRegion | null) => Promise<HTMLCanvasElement | null>;
  scrollViewport: (x: number, y: number) => void;
  clipViewport: (w: number, h: number) => void;
}

interface GridAreaProps {
  darkMode: boolean;
  mouseEnabled: boolean;
  textBoxes: TextBox[];
  onTextBoxesChange: (boxes: TextBox[]) => void;
  hideToolbar?: boolean;
  /** Visual elements to display; updated reactively when currentStep changes. */
  elements?: VisualBuilderElementBase[];
  /** Combined-editor: viz block ranges for the current code, used for auto-tracing clicks. */
  combinedVizRanges?: VizRange[];
  /** Combined-editor: called when a click produces a traced mini-timeline. */
  onCombinedTrace?: (result: TraceStageInfo) => void;
  appMode?: 'idle' | 'trace' | 'interactive';
  onCreateGif?: (region: CaptureRegion | null) => void;
  isCreatingGif?: boolean;
  allowGif?: boolean;
}

export const GridArea = forwardRef<GridAreaHandle, GridAreaProps>(
  function GridArea({ darkMode, mouseEnabled, textBoxes, onTextBoxesChange, hideToolbar = false, elements, combinedVizRanges, onCombinedTrace, appMode = 'idle', onCreateGif, isCreatingGif = false, allowGif = false }, ref) {
    const {
      cells,
      overlayCells,
      zoom,
      zoomIn,
      zoomOut,
      setZoom,
      panels,
      loadVisualBuilderObjects,
      occupancyMap,
    } = useGridState();

    useEffect(() => {
      loadVisualBuilderObjects(elements ?? []);
    }, [elements, loadVisualBuilderObjects]);

    const gridRef = useRef<GridHandle>(null);
    const [isCapturing, setIsCapturing] = useState(false);
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

    const handleElementClick = useCallback(async (elemId: number, x: number, y: number) => {
      if (combinedVizRanges) {
        const result = await executeClickHandler(elemId, y, x);
        if (result.error) { appendError(result.error); return; }
        if (result.timeline.length > 0) onCombinedTrace?.(result);
        return;
      }
    }, [combinedVizRanges, onCombinedTrace]);

    const handleElementInput = useCallback(async (elemId: number, text: string) => {
      if (!combinedVizRanges) return;
      const result = await executeInputChanged(elemId, text);
      if (result.error) { appendError(result.error); return; }
      if (result.timeline.length > 0) onCombinedTrace?.(result);
    }, [combinedVizRanges, onCombinedTrace]);

    const handleElementDrag = useCallback(async (elemId: number, x: number, y: number, dragType: DragType) => {
      if (!combinedVizRanges) return;
      const result = await executeDragHandler(elemId, y, x, dragType);
      if (result.error) { appendError(result.error); return; }
      if (result.timeline.length > 0) onCombinedTrace?.(result);
    }, [combinedVizRanges, onCombinedTrace]);

    const handleTextBoxAdded = useCallback((box: TextBox) => {
      onTextBoxesChange([...textBoxes, box]);
      setSelectedTextBoxId(box.id);
      setAddingTextBox(false);
    }, [textBoxes, onTextBoxesChange]);

    const handleTextBoxChange = useCallback((updated: TextBox) => {
      onTextBoxesChange(textBoxes.map((b) => (b.id === updated.id ? updated : b)));
    }, [textBoxes, onTextBoxesChange]);

    const handleTextBoxDelete = useCallback((id: string) => {
      onTextBoxesChange(textBoxes.filter((b) => b.id !== id));
      setSelectedTextBoxId(null);
    }, [textBoxes, onTextBoxesChange]);

    /** Render the grid element to a cropped canvas (shared by screenshot and GIF paths). */
    const captureFrameCanvas = useCallback(async (region: CaptureRegion | null): Promise<HTMLCanvasElement | null> => {
      const element = gridRef.current?.captureElement();
      if (!element) return null;

      // toCanvas avoids the PNG encode/decode round-trip of toPng
      const fullCanvas = await toCanvas(element, {
        pixelRatio: 1,
        backgroundColor: darkMode ? '#111827' : '#f3f4f6',
        skipFonts: true,
        cacheBust: false,
      });

      let sx: number, sy: number, sw: number, sh: number;
      if (region) {
        sx = region.col * CELL_SIZE * zoom;
        sy = region.row * CELL_SIZE * zoom;
        sw = region.widthCells * CELL_SIZE * zoom;
        sh = region.heightCells * CELL_SIZE * zoom;
      } else {
        sx = element.scrollLeft;
        sy = element.scrollTop;
        sw = element.clientWidth;
        sh = element.clientHeight;
      }

      const cropped = document.createElement('canvas');
      cropped.width = sw;
      cropped.height = sh;
      const ctx = cropped.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      return cropped;
    }, [darkMode, zoom]);

    const captureFrameData = useCallback(async (region: CaptureRegion | null): Promise<string | null> => {
      const canvas = await captureFrameCanvas(region);
      return canvas ? canvas.toDataURL('image/png') : null;
    }, [captureFrameCanvas]);

    useImperativeHandle(ref, () => ({
      loadVisualBuilderObjects,
      captureFrameData,
      captureFrameCanvas,
      scrollViewport: (x: number, y: number) => gridRef.current?.scrollTo(x, y),
      clipViewport: (w: number, h: number) => gridRef.current?.clipTo(w, h),
    }), [loadVisualBuilderObjects, captureFrameData, captureFrameCanvas]);

    const downloadDataUrl = (dataUrl: string, filename: string) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    /** Called when a region is drawn — either triggers screenshot or GIF depending on pendingGifRef. */
    const handleCaptureRegionDrawn = useCallback(async (region: CaptureRegion) => {
      setCapturingRegionMode(false);

      if (pendingGifRef.current) {
        pendingGifRef.current = false;
        setCaptureRegion(null);
        onCreateGif?.(region);
        return;
      }

      // Screenshot path
      if (isCapturing) return;
      setIsCapturing(true);
      try {
        const dataUrl = await captureFrameData(region);
        if (dataUrl) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          downloadDataUrl(dataUrl, `visual-panel-${timestamp}.png`);
        }
      } catch (err) {
        console.error('Screenshot failed:', err);
      } finally {
        setIsCapturing(false);
        setCaptureRegion(null);
      }
    }, [isCapturing, captureFrameData, onCreateGif]);

    const handleScreenshotClick = useCallback(() => {
      if (isCapturing) return;
      pendingGifRef.current = false;
      setCapturingRegionMode(true);
    }, [isCapturing]);

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
                disabled={isCapturing}
                className={`${buttonDisabled}${capturingRegionMode && !pendingGifRef.current ? ' ring-2 ring-inset ring-orange-500' : ''}`}
                title="Screenshot: click then draw a region on the grid"
              >
                {isCapturing ? '⏳' : '📷'}
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

        <div className="flex-1 overflow-hidden">
          <Grid
            ref={gridRef}
            cells={cells}
            overlayCells={overlayCells}
            occupancyMap={occupancyMap}
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
