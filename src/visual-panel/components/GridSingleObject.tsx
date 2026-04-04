import { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAnimationEnabled, useAnimationDuration } from '../../animation/animationContext';
import type { GridObject, InteractionData } from '../types/grid';
import { renderElement } from '../views/rendererRegistry';
import type { BasicShape } from '../render-objects/BasicShape';

import '../render-objects/rect/RectView';
import '../render-objects/circle/CircleView';
import '../render-objects/arrow/ArrowView';
import '../render-objects/label/LabelView';
import '../render-objects/array/ArrayValueView';
import '../render-objects/array/Array2DView';
import '../render-objects/panel/PanelView';
import '../render-objects/line/LineView';
import '../render-objects/input/InputView';

// CELL_SIZE is intentionally kept in sync with Grid.tsx; not imported from there to avoid a circular dep.
const CELL_SIZE = 40;

export interface RenderableObject {
  key: string;
  row: number;
  col: number;
  obj: GridObject;
  widthCells: number;
  heightCells: number;
}

function coordsFromElementEvent(e: React.MouseEvent, data: InteractionData): [number, number] {
  return [
    data.x + Math.floor(e.nativeEvent.offsetX / CELL_SIZE),
    data.y + Math.floor(e.nativeEvent.offsetY / CELL_SIZE),
  ];
}

export const GridSingleObject = memo(function GridSingleObject({
  obj,
  mouseEnabled,
  onElementClick,
  onElementDragStart,
  onElementInput,
  changedIds,
}: {
  obj: RenderableObject;
  mouseEnabled: boolean;
  onElementClick?: (elemId: number, x: number, y: number) => void;
  onElementDragStart?: (elemId: number, x: number, y: number, panelOriginCol: number, panelOriginRow: number) => void;
  onElementInput?: (elemId: number, text: string) => void;
  changedIds?: Set<number> | null;
}) {
  const { widthCells, heightCells } = obj;
  const [flashing, setFlashing] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const globalAnimationsEnabled = useAnimationEnabled();
  const animationDuration = useAnimationDuration();

  const { element, absElement, info } = obj.obj;
  const shape = element as BasicShape;

  // Per-element animate flag: false overrides the global toggle to force jump mode.
  const animationsEnabled = globalAnimationsEnabled && shape.animate !== false;

  useEffect(() => {
    if (inputActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputActive]);

  if (widthCells <= 0 || heightCells <= 0) return null;

  const elemVisible = absElement.visible !== false;
  const isInvalid = !!info.invalidReason;

  const { clickData, dragData, inputData } = info;
  const isClickable = mouseEnabled && !!clickData && !!onElementClick;
  const isDraggable = mouseEnabled && !!dragData && !!onElementDragStart;
  const isInput = mouseEnabled && !!inputData && !!onElementInput;

  const handleClick = isClickable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        const [x, y] = coordsFromElementEvent(e, clickData!);
        onElementClick!(clickData!.elemId, x, y);
        setFlashing(true);
        setTimeout(() => setFlashing(false), 300);
      }
    : isInput
      ? () => {
          setInputText('');
          setInputActive(true);
        }
      : undefined;

  const handleMouseDown = isDraggable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const [x, y] = coordsFromElementEvent(e, dragData!);
        onElementDragStart!(dragData!.elemId, x, y, obj.col - dragData!.x, obj.row - dragData!.y);
      }
    : undefined;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setInputActive(false);
      onElementInput!(inputData!.elemId, inputText);
    } else if (e.key === 'Escape') {
      setInputActive(false);
    }
  };

  const cursorClass = isDraggable ? ' cursor-grab pointer-events-auto' : (isClickable || isInput) ? ' cursor-pointer pointer-events-auto' : '';

  // Skip animation for elements that didn't change this step.
  // id encodes the elem id: "elem-42" or "panel-e42" → 42.
  const oidMatch = /(\d+)$/.exec(info.id);
  const elemId = oidMatch ? parseInt(oidMatch[1]) : null;
  const didChange = changedIds == null || elemId === null || changedIds.has(elemId);

  const transition = animationsEnabled && didChange
    ? { duration: animationDuration / 1000, ease: 'easeOut' as const }
    : { duration: 0 };

  return (
    <motion.div
      className={`absolute${cursorClass}`}
      initial={{ opacity: 0 }}
      animate={{
        left: obj.col * CELL_SIZE,
        top: obj.row * CELL_SIZE,
        width: CELL_SIZE * widthCells,
        height: CELL_SIZE * heightCells,
        opacity: elemVisible ? (absElement.alpha ?? 1) : 0,
      }}
      transition={transition}
      style={{ zIndex: 10, pointerEvents: elemVisible ? undefined : 'none' }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`
          transition-colors relative
          ${element.type
            // No border when an element is present: a 1px border with box-sizing:border-box
            // shrinks the content area from 40×40 to 38×38, scaling the SVG at 0.95.
            // That makes shape coordinates drift from cell centers for multi-cell elements.
            ? ''
            : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}
          ${isInvalid ? 'opacity-50 grayscale' : ''}
        `}
        style={{ width: '100%', height: '100%' }}
      >
        {renderElement(absElement)}
      </div>
      {inputActive && (
        <input
          ref={inputRef}
          className="absolute inset-0 w-full h-full bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100 font-mono text-sm px-2 rounded outline-none ring-2 ring-white"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => setInputActive(false)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {flashing && (
        <div className="absolute inset-0 bg-white/60 rounded pointer-events-none" />
      )}
    </motion.div>
  );
});
