import { loadPyodide } from '../../python-engine/code-builder/services/pythonExecutor';

import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import VB_ENGINE_PYTHON from './_vb_engine.py?raw';
import USER_API_PYTHON from './user_api.py?raw';
import VISUAL_BUILDER_PYTHON from './vb_serializer.py?raw';
import { validateVizBlocks, getVizRanges } from './vizBlockParser';
import { setHandlers } from '../../visual-panel/handlersState';

export interface CombinedVariable {
  type: string;
  value: unknown;
}

export interface CombinedStep {
  visual: VisualBuilderElementBase[];
  variables: Record<string, CombinedVariable>;
  line?: number;
  output?: string;   // stdout delta since previous snapshot
  isViz?: boolean;   // true if triggered by __viz_end__ (viz block)
}

export interface CombinedResult {
  success: boolean;
  timeline: CombinedStep[];
  handlers: Record<string, string[]>;  // elem_id (string key) → handler names
  error?: string;
}

export interface CombinedClickResult {
  timeline: CombinedStep[];
}

/**
 * Validate and preprocess viz blocks.
 *
 * Replaces # @viz with __viz_begin__() and # @end with __viz_end__(dict(locals())).
 * Validates that blocks are matched and not nested.
 *
 * TODO: Eventually move viz block bodies into their own functions so the scope
 * boundary is explicit and pathological cases (e.g. # @end inside a conditional
 * in a different scope) become impossible at the language level.
 */
function preprocess(code: string): string {
  const validationError = validateVizBlocks(code);
  if (validationError) throw new Error(validationError);

  return code.split('\n')
    .map(line => {
      const indent = line.match(/^(\s*)/)?.[1] ?? '';
      if (line.trim() === '# @viz') return `${indent}__viz_begin__()`;
      if (line.trim() === '# @end') return `${indent}__viz_end__(dict(locals()))`;
      return line;
    })
    .join('\n');
}

function escapeTripleQuote(s: string): string {
  // Escape ''' so the string can be safely embedded in Python '''...'''
  return s.replace(/'''/g, "\\'\\'\\'");
}

async function initializePythonEngine(code: string): ReturnType<typeof loadPyodide> {
    const py = await loadPyodide();

    // Write engine modules to Pyodide VFS so visualBuilder.py can import them
    py.FS.writeFile('/home/pyodide/_vb_engine.py', VB_ENGINE_PYTHON);
    py.FS.writeFile('/home/pyodide/user_api.py', USER_API_PYTHON);

    // Clear any cached imports so the freshly written files are picked up
    await py.runPythonAsync(`
import sys as _sys
for _m in ('user_api', '_vb_engine'):
    _sys.modules.pop(_m, None)
`);

    // Load visual builder classes and serialization helpers
    await py.runPythonAsync(VISUAL_BUILDER_PYTHON);

    // Reset element registry, then init namespace + timeline state with viz ranges
    const vizRangesJson = JSON.stringify(getVizRanges(code));
    await py.runPythonAsync('_engine.VisualElem._clear_registry()');
    await py.runPythonAsync(`_init_combined_namespace('${escapeTripleQuote(vizRangesJson)}')`);

    return py;
}


/**
 * Execute combined Python code (with # @viz / # @end blocks) and return
 * a timeline of snapshots, one per # @end marker.
 */
export async function executeCombinedCode(code: string): Promise<CombinedResult> {
  try {
    const py = await initializePythonEngine(code);

    // Preprocess user code (replaces # @viz / # @end with tracer hook calls)
    const preprocessed = preprocess(code);
    const escaped = escapeTripleQuote(preprocessed);

    const resultJson: string = await py.runPythonAsync(`_exec_combined_code('''${escaped}''')`);
    const result = JSON.parse(resultJson) as {
      timeline: Array<{
        visual: VisualBuilderElementBase[];
        variables: Record<string, CombinedVariable>;
        line?: number;
        output?: string;
        is_viz?: boolean;
      }>;
      handlers: Record<string, string[]>;
    };
    const timeline: CombinedStep[] = result.timeline.map(s => ({
      visual: s.visual,
      variables: s.variables,
      line: s.line,
      output: s.output,
      isViz: s.is_viz,
    }));

    return { success: true, timeline, handlers: result.handlers };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let cleanError = errorMessage;
    if (errorMessage.includes('PythonError:')) {
      cleanError = errorMessage.split('PythonError:')[1]?.trim() || errorMessage;
    }
    // If the traceback contains a user code frame, strip internal engine frames
    // so the error appears to originate from user code.
    if (cleanError.includes('File "<combined_code>"')) {
      const lines = cleanError.split('\n');
      const firstLine = lines[0]; // "Traceback (most recent call last):"
      const userFrameIndex = lines.findIndex(l => l.includes('File "<combined_code>"'));
      cleanError = [firstLine, ...lines.slice(userFrameIndex)].join('\n');
    }
    return { success: false, timeline: [], handlers: {}, error: cleanError };
  }
}

/**
 * Dispatch an input_changed event to a combined-editor Input element with viz-aware tracing.
 */
export async function executeCombinedInputChanged(
  elemId: number,
  text: string,
): Promise<CombinedClickResult | null> {
  try {
    const py = await loadPyodide();
    await py.runPythonAsync(`_input_text = ${JSON.stringify(text)}`);
    const resultJson: string = await py.runPythonAsync(
      `_exec_combined_input_changed(${elemId}, _input_text)`
    );
    const result = JSON.parse(resultJson) as {
      timeline: Array<Omit<CombinedStep, 'isViz'> & { is_viz?: boolean }>;
      handlers: Record<string, string[]>;
      error?: string;
    };
    if (result.error) {
      console.error('Combined input_changed error:', result.error);
      return null;
    }
    setHandlers(result.handlers ?? {});
    return {
      timeline: result.timeline.map(s => ({ ...s, isViz: s.is_viz })),
    };
  } catch (error) {
    console.error('executeCombinedInputChanged error:', error);
    return null;
  }
}

/**
 * Dispatch an on_click event to a combined-editor element with viz-aware tracing.
 *
 * Algorithm functions called from the handler (defined outside viz blocks) are
 * automatically traced and returned as timeline steps.
 * Use no_debug(fn)(...) in the handler to suppress tracing for specific calls.
 */
export async function executeCombinedClickHandler(
  elemId: number,
  row: number,
  col: number,
): Promise<CombinedClickResult | null> {
  try {
    const py = await loadPyodide();
    const resultJson: string = await py.runPythonAsync(
      `_exec_combined_click_traced(${elemId}, ${row}, ${col})`
    );
    const result = JSON.parse(resultJson) as {
      timeline: Array<Omit<CombinedStep, 'isViz'> & { is_viz?: boolean }>;
      handlers: Record<string, string[]>;
      error?: string;
    };
    if (result.error) {
      console.error('Combined click handler error:', result.error);
      return null;
    }
    setHandlers(result.handlers ?? {});
    return {
      timeline: result.timeline.map(s => ({ ...s, isViz: s.is_viz })),
    };
  } catch (error) {
    console.error('executeCombinedClickHandler error:', error);
    return null;
  }
}
