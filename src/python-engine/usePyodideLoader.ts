import { useState, useEffect } from 'react';
import { loadPyodide, isPyodideLoaded } from './pyodide-runtime';

interface UsePyodideLoaderOptions {
  /** Called with an error message if Pyodide fails to load. */
  onError?: (message: string) => void;
}

interface UsePyodideLoaderResult {
  pyodideReady: boolean;
  pyodideLoading: boolean;
}

export function usePyodideLoader(options?: UsePyodideLoaderOptions): UsePyodideLoaderResult {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);

  useEffect(() => {
    if (!isPyodideLoaded()) {
      setPyodideLoading(true);
      loadPyodide()
        .then(() => {
          setPyodideReady(true);
          setPyodideLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load Pyodide:', err);
          setPyodideLoading(false);
          options?.onError?.('Failed to load Python runtime.');
        });
    } else {
      setPyodideReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pyodideReady, pyodideLoading };
}
