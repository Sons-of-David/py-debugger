import { useState } from 'react';

interface ExtrasMenuProps {
  darkMode: boolean;
  onToggleDark: () => void;
  animationsEnabled: boolean;
  onToggleAnimations: () => void;
  animationDuration: number;
  onAnimationDurationChange: (v: number) => void;
  appMode: string;
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  isLocal: boolean;
  onSaveToSamples: () => void;
  saveSampleStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const btnBase = 'px-3 py-1 rounded text-sm font-medium transition-colors';
const buttonNeutral = `${btnBase} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;

export function ExtrasMenu({
  darkMode,
  onToggleDark,
  animationsEnabled,
  onToggleAnimations,
  animationDuration,
  onAnimationDurationChange,
  appMode,
  onNew,
  onSave,
  onLoad,
  isLocal,
  onSaveToSamples,
  saveSampleStatus,
}: ExtrasMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonNeutral}
        title="Settings and file options"
      >
        {/* Gear icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1">

            {/* File section */}
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">File</div>
            <button
              type="button"
              onClick={() => { onNew(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              New
            </button>
            <button
              type="button"
              onClick={() => { onSave(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { onLoad(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Load
            </button>

            <div className="my-1 border-t border-gray-200 dark:border-gray-600" />

            {/* Display section */}
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Display</div>
            <button
              type="button"
              onClick={() => { onToggleDark(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? '☀ Light mode' : '🌙 Dark mode'}
            </button>

            <div className="my-1 border-t border-gray-200 dark:border-gray-600" />

            {/* Animation section */}
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Animation</div>
            <button
              type="button"
              onClick={onToggleAnimations}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {animationsEnabled ? '⚡ Switch to instant jump' : '▶ Switch to animated'}
            </button>
            {animationsEnabled && appMode !== 'idle' && (
              <div className="px-4 py-2 flex items-center gap-2">
                <input
                  type="range"
                  min={100} max={2000} step={100}
                  value={animationDuration}
                  onChange={(e) => onAnimationDurationChange(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                  title="Animation duration"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                  {(animationDuration / 1000).toFixed(1)}s
                </span>
              </div>
            )}

            {/* Dev-only section */}
            {isLocal && (
              <>
                <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
                <div className="px-3 py-1 text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wide">Dev</div>
                <button
                  type="button"
                  onClick={() => { onSaveToSamples(); setOpen(false); }}
                  disabled={saveSampleStatus === 'saving'}
                  className="w-full text-left px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                >
                  {saveSampleStatus === 'saving' ? 'Saving…' : saveSampleStatus === 'saved' ? '✓ Saved!' : saveSampleStatus === 'error' ? '✗ Error' : 'Save to Samples'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
