import { useEffect, useRef, useState } from 'react';
import { getDebuggerOutputUpToStep } from './terminalState';

interface OutputTerminalProps {
  currentStep: number;
  appMode: 'idle' | 'trace' | 'interactive' | 'debug_in_event';
}

export function OutputTerminal({ currentStep, appMode }: OutputTerminalProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const output = getDebuggerOutputUpToStep(currentStep);
  const lines = output ? output.split('\n') : [];
  // Remove trailing empty line from a final newline
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const hasOutput = lines.length > 0;
  const isActive = appMode === 'trace' || appMode === 'debug_in_event';

  // Track whether the user has scrolled up from the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
  };

  // Auto-scroll to bottom when output grows, but only if already at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [output]);

  return (
    <div className="flex-shrink-0 border-t border-gray-300 dark:border-gray-700 bg-gray-950 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 dark:bg-gray-800 select-none">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Output
          {isActive && hasOutput && (
            <span className="ml-2 text-gray-500 font-normal normal-case tracking-normal">
              ({lines.length} line{lines.length !== 1 ? 's' : ''})
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-200 transition-colors text-xs px-1"
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
          className="h-32 overflow-y-auto p-2 font-mono text-xs leading-relaxed"
        >
          {hasOutput ? (
            lines.map((line, i) => (
              <div key={i} className="text-gray-200 whitespace-pre">
                {line}
              </div>
            ))
          ) : (
            <div className="text-gray-600 italic">No output.</div>
          )}
        </div>
      )}
    </div>
  );
}
