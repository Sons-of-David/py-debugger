// ---------------------------------------------------------------------------
// Pyodide runtime singleton — shared across the entire app.
// ---------------------------------------------------------------------------

export interface PyodideRuntime {
  runPythonAsync: (code: string) => Promise<string>;
  FS: { writeFile: (path: string, content: string) => void };
}

interface WindowWithPyodide extends Window {
  loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
}

let pyodide: PyodideRuntime | null = null;
let isLoading = false;
let loadPromise: Promise<PyodideRuntime> | null = null;

export async function loadPyodide(): Promise<PyodideRuntime> {
  if (pyodide) return pyodide;
  if (isLoading && loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    const PYODIDE_VERSION = '0.26.4';
    const cdnUrl = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

    if (!(window as WindowWithPyodide).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${cdnUrl}pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(script);
      });
    }

    pyodide = await (window as WindowWithPyodide).loadPyodide!({ indexURL: cdnUrl });
    isLoading = false;
    return pyodide;
  })();

  return loadPromise;
}

export function isPyodideLoaded(): boolean {
  return pyodide !== null;
}

/** Returns the current Pyodide instance, or null if not yet loaded. */
export function getPyodide(): PyodideRuntime | null {
  return pyodide;
}

/** Reset all mutable Python state (exec context + visual registry). Called when entering edit mode. */
export async function resetPythonState(): Promise<void> {
  if (!pyodide) return;
  await pyodide.runPythonAsync('_reset_exec_state()');
}
