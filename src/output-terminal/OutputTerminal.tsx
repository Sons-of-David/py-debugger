import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  getCombinedEditorOutput,
  subscribeTerminal,
  getTerminalVersion,
  type TerminalLine,
} from './terminalState';

interface OutputTerminalProps {
  currentStep: number;
}

const DEFAULT_HEIGHT = 128;
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 600;

export function OutputTerminal({ currentStep }: OutputTerminalProps) {
  useSyncExternalStore(subscribeTerminal, getTerminalVersion);
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef(DEFAULT_HEIGHT);

  // ── Drag-to-resize ────────────────────────────────────────────────────────
  const onDragHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;

    const onMove = (e: MouseEvent) => {
      if (dragStartY.current === null) return;
      const delta = dragStartY.current - e.clientY; // drag up → increase height
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartHeight.current + delta)));
    };
    const onUp = () => {
      dragStartY.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
  };

  const lines = getCombinedEditorOutput(currentStep);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  // ── Color by source ───────────────────────────────────────────────────────
  const colorFor = (source: TerminalLine['source']) => {
    if (source === 'viz') return 'text-emerald-600 dark:text-emerald-400';
    if (source === 'marker') return 'text-gray-400 dark:text-gray-500';
    if (source === 'error') return 'text-red-600 dark:text-red-400';
    return 'text-gray-700 dark:text-gray-200';
  };

  const renderContent = () => {
    if (!lines.length) return <div className="text-gray-400 dark:text-gray-600 italic">No output.</div>;
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className={`whitespace-pre ${colorFor(line.source)}`}>
            {line.text || '\u00A0'}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="flex-shrink-0 flex flex-col border-t border-gray-300 dark:border-gray-700">
      {/* Drag handle */}
      <div
        onMouseDown={onDragHandleMouseDown}
        className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-400 dark:hover:bg-indigo-500 cursor-row-resize transition-colors flex-shrink-0"
        title="Drag to resize output panel"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-100 dark:bg-gray-800 select-none flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Output
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xs px-1"
          title={collapsed ? 'Expand output' : 'Collapse output'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ height }}
          className="overflow-y-auto p-2 font-mono text-xs leading-relaxed bg-white dark:bg-gray-950"
        >
          {renderContent()}
        </div>
      )}
    </div>
  );
}
