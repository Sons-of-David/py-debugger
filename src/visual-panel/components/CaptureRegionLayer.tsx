import { useState, useCallback, useRef } from 'react';
import { CELL_SIZE } from './Grid';

export interface CaptureRegion {
  row: number;
  col: number;
  widthCells: number;
  heightCells: number;
}

interface DrawState {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface CaptureRegionLayerProps {
  active: boolean;
  persistedRegion: CaptureRegion | null;
  onRegionDrawn: (region: CaptureRegion) => void;
}

export function CaptureRegionLayer({ active, persistedRegion, onRegionDrawn }: CaptureRegionLayerProps) {
  const [drawing, setDrawing] = useState<DrawState | null>(null);
  const isDrawingRef = useRef(false);

  const getCellFromOffset = (offsetX: number, offsetY: number) => ({
    col: Math.floor(offsetX / CELL_SIZE),
    row: Math.floor(offsetY / CELL_SIZE),
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      const { row, col } = getCellFromOffset(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      isDrawingRef.current = true;
      setDrawing({ startRow: row, startCol: col, endRow: row, endCol: col });
    },
    [active]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current || !drawing) return;
      const { row, col } = getCellFromOffset(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      setDrawing((d) => (d ? { ...d, endRow: row, endCol: col } : d));
    },
    [drawing]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current || !drawing) return;
      isDrawingRef.current = false;
      const { row, col } = getCellFromOffset(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      const endRow = row;
      const endCol = col;

      const minRow = Math.max(0, Math.min(drawing.startRow, endRow));
      const minCol = Math.max(0, Math.min(drawing.startCol, endCol));
      const maxRow = Math.max(drawing.startRow, endRow);
      const maxCol = Math.max(drawing.startCol, endCol);

      const region: CaptureRegion = {
        row: minRow,
        col: minCol,
        widthCells: Math.max(1, maxCol - minCol + 1),
        heightCells: Math.max(1, maxRow - minRow + 1),
      };

      setDrawing(null);
      onRegionDrawn(region);
    },
    [drawing, onRegionDrawn]
  );

  // Preview rect while drawing
  const previewStyle = drawing
    ? (() => {
        const minRow = Math.min(drawing.startRow, drawing.endRow);
        const minCol = Math.min(drawing.startCol, drawing.endCol);
        const maxRow = Math.max(drawing.startRow, drawing.endRow);
        const maxCol = Math.max(drawing.startCol, drawing.endCol);
        return {
          position: 'absolute' as const,
          left: minCol * CELL_SIZE,
          top: minRow * CELL_SIZE,
          width: Math.max(1, maxCol - minCol + 1) * CELL_SIZE,
          height: Math.max(1, maxRow - minRow + 1) * CELL_SIZE,
          border: '2px dashed #f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.10)',
          pointerEvents: 'none' as const,
          zIndex: 102,
        };
      })()
    : null;

  // Persisted region outline (shown when not actively drawing)
  const persistedStyle =
    !drawing && persistedRegion
      ? {
          position: 'absolute' as const,
          left: persistedRegion.col * CELL_SIZE,
          top: persistedRegion.row * CELL_SIZE,
          width: persistedRegion.widthCells * CELL_SIZE,
          height: persistedRegion.heightCells * CELL_SIZE,
          border: '2px dashed rgba(249, 115, 22, 0.5)',
          pointerEvents: 'none' as const,
          zIndex: 102,
        }
      : null;

  return (
    <>
      {/* Persisted region marker */}
      {persistedStyle && <div style={persistedStyle} />}

      {/* Active draw preview */}
      {previewStyle && <div style={previewStyle} />}

      {/* Invisible overlay that captures mouse events when active */}
      {active && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            cursor: 'crosshair',
            zIndex: 101,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}
    </>
  );
}
