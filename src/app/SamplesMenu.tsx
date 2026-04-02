import { useState, useCallback } from 'react';
import type { TextBox } from '../text-boxes/types';
import { SAMPLES } from './sampleRegistry';

const buttonBase = 'px-3 py-1 rounded text-sm font-medium transition-colors';
const buttonNeutral = `${buttonBase} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;

interface SamplesMenuProps {
  onLoad: (data: { userCode?: string; textBoxes?: TextBox[] }, name: string) => void;
}

export function SamplesMenu({ onLoad }: SamplesMenuProps) {
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  return (
    <div className="relative">
      <button type="button" onClick={() => setSamplesOpen((o) => !o)} className={buttonNeutral}>
        Samples
      </button>
      {samplesOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSamplesOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Algorithms</div>
            {SAMPLES.filter(s => s.category === 'algorithm').map(({ displayName, rawName, data }) => (
              <div key={rawName} className="flex items-center px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 gap-1">
                <button
                  type="button"
                  className="flex-1 text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                  onClick={() => { onLoad(data, rawName); setSamplesOpen(false); }}
                >
                  {displayName}
                </button>
                <button
                  type="button"
                  title="Copy link"
                  className="px-2 py-0.5 rounded text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  onClick={() => copyToClipboard(`${window.location.origin}/?sample=${encodeURIComponent(rawName)}`, `${rawName}-link`)}
                >
                  {copiedKey === `${rawName}-link` ? 'Copied!' : '🔗'}
                </button>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    title="Copy iframe HTML"
                    className="px-2 py-0.5 rounded text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-amber-100 dark:hover:bg-amber-900 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                    onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/embed?sample=${encodeURIComponent(rawName)}&dark=1" width="800" height="500" style="border:none" frameborder="0"></iframe>`, `${rawName}-iframe`)}
                  >
                    {copiedKey === `${rawName}-iframe` ? 'Copied!' : '</>'}
                  </button>
                )}
              </div>
            ))}
            <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Features</div>
            {SAMPLES.filter(s => s.category === 'feature').map(({ displayName, rawName, data }) => (
              <div key={rawName} className="flex items-center px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 gap-1">
                <button
                  type="button"
                  className="flex-1 text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                  onClick={() => { onLoad(data, rawName); setSamplesOpen(false); }}
                >
                  {displayName}
                </button>
                <button
                  type="button"
                  title="Copy link"
                  className="px-2 py-0.5 rounded text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                  onClick={() => copyToClipboard(`${window.location.origin}/?sample=${encodeURIComponent(rawName)}`, `${rawName}-link`)}
                >
                  {copiedKey === `${rawName}-link` ? 'Copied!' : '🔗'}
                </button>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    title="Copy iframe HTML"
                    className="px-2 py-0.5 rounded text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-amber-100 dark:hover:bg-amber-900 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                    onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/embed?sample=${encodeURIComponent(rawName)}&dark=1" width="800" height="500" style="border:none" frameborder="0"></iframe>`, `${rawName}-iframe`)}
                  >
                    {copiedKey === `${rawName}-iframe` ? 'Copied!' : '</>'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
