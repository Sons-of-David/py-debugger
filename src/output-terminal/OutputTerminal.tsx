import { useEffect, useRef, useState } from 'react';
import { getBuilderOutput, getClickOutput, getTerminalOutput } from './terminalState';

type TerminalTab = 'builder' | 'debugger' | 'combined';

interface OutputTerminalProps {
  currentStep: number;
  appMode: 'idle' | 'trace' | 'interactive' | 'debug_in_event';
}

function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function OutputTerminal({ currentStep, appMode }: OutputTerminalProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TerminalTab>('combined');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const builderOutput = getBuilderOutput();
  const debuggerOutput = getTerminalOutput(currentStep);
  const clickOutput = getClickOutput();

  const builderLines = splitLines(builderOutput);
  const debuggerLines = splitLines(debuggerOutput);
  const clickLines = splitLines(clickOutput);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
  };

  const contentKey = builderOutput + debuggerOutput + clickOutput;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [contentKey]);

  const tabBtn = (tab: TerminalTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-2 py-0.5 text-xs rounded transition-colors ${
        activeTab === tab
          ? 'bg-gray-600 text-gray-100'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  const hasAnyOutput = builderLines.length > 0 || debuggerLines.length > 0 || clickLines.length > 0;

  const renderContent = () => {
    if (!hasAnyOutput) {
      return <div className="text-gray-600 italic">No output.</div>;
    }

    if (activeTab === 'builder') {
      return builderLines.length > 0
        ? builderLines.map((line, i) => (
            <div key={i} className="text-emerald-400 whitespace-pre">{line}</div>
          ))
        : <div className="text-gray-600 italic">No builder output.</div>;
    }

    if (activeTab === 'debugger') {
      return debuggerLines.length > 0
        ? debuggerLines.map((line, i) => (
            <div key={i} className="text-gray-200 whitespace-pre">{line}</div>
          ))
        : <div className="text-gray-600 italic">No debugger output.</div>;
    }

    // Combined: builder (green) → debugger stream (white) → click events (yellow)
    const sections: JSX.Element[] = [];

    if (builderLines.length > 0) {
      builderLines.forEach((line, i) => {
        sections.push(
          <div key={`b-${i}`} className="text-emerald-400 whitespace-pre">{line}</div>
        );
      });
    }

    if (debuggerLines.length > 0) {
      if (builderLines.length > 0) {
        sections.push(<div key="sep-d" className="border-t border-gray-700 my-1" />);
      }
      debuggerLines.forEach((line, i) => {
        sections.push(
          <div key={`d-${i}`} className="text-gray-200 whitespace-pre">{line}</div>
        );
      });
    }

    if (clickLines.length > 0) {
      if (builderLines.length > 0 || debuggerLines.length > 0) {
        sections.push(<div key="sep-c" className="border-t border-gray-700 my-1" />);
      }
      clickLines.forEach((line, i) => {
        sections.push(
          <div key={`c-${i}`} className="text-yellow-300 whitespace-pre">{line}</div>
        );
      });
    }

    return sections;
  };

  return (
    <div className="flex-shrink-0 border-t border-gray-300 dark:border-gray-700 bg-gray-950 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 dark:bg-gray-800 select-none">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">
            Output
          </span>
          {tabBtn('builder', 'Builder')}
          {tabBtn('debugger', 'Debugger')}
          {tabBtn('combined', 'Combined')}
        </div>
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
          {renderContent()}
        </div>
      )}
    </div>
  );
}
