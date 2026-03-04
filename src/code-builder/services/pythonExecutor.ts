// Pyodide instance - will be loaded lazily
let pyodide: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

// Load Pyodide directly from CDN
export async function loadPyodide(): Promise<any> {
  if (pyodide) return pyodide;

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;

  loadPromise = (async () => {
    // Load Pyodide script from CDN
    const PYODIDE_VERSION = '0.26.4';
    const cdnUrl = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

    // Check if script already loaded
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${cdnUrl}pyodide.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(script);
      });
    }

    // Now load Pyodide
    pyodide = await (window as any).loadPyodide({
      indexURL: cdnUrl,
    });

    isLoading = false;
    return pyodide;
  })();

  return loadPromise;
}

// Check if Pyodide is loaded
export function isPyodideLoaded(): boolean {
  return pyodide !== null;
}
