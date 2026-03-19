import { loadPyodide } from '../../python-engine/code-builder/services/pythonExecutor';

import type { VisualBuilderElementBase } from '../../api/visualBuilder';
import VB_ENGINE_PYTHON from './_vb_engine.py?raw';
import USER_API_PYTHON from './user_api.py?raw';
import VISUAL_BUILDER_PYTHON from './vb_serializer.py?raw';

export interface CombinedVariable {
  type: string;
  value: unknown;
}

export interface CombinedStep {
  visual: VisualBuilderElementBase[];
  variables: Record<string, CombinedVariable>;
}

export interface CombinedResult {
  success: boolean;
  timeline: CombinedStep[];
  error?: string;
  output?: string;
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
  const lines = code.split('\n');
  let open = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '# @viz') {
      if (open) throw new Error(`Line ${i + 1}: nested # @viz blocks are not supported`);
      open = true;
    } else if (trimmed === '# @end') {
      if (!open) throw new Error(`Line ${i + 1}: # @end without matching # @viz`);
      open = false;
    }
  }
  if (open) throw new Error('Unclosed # @viz block (missing # @end)');

  return lines
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


/**
 * Execute combined Python code (with # @viz / # @end blocks) and return
 * a timeline of snapshots, one per # @end marker.
 */
export async function executeCombinedCode(code: string): Promise<CombinedResult> {
  try {
    const py = await loadPyodide();

    // Write engine modules to Pyodide VFS so visualBuilder.py can import them
    py.FS.writeFile('/home/pyodide/_vb_engine.py', VB_ENGINE_PYTHON);
    py.FS.writeFile('/home/pyodide/user_api.py', USER_API_PYTHON);

    // Load visual builder classes and serialization helpers
    await py.runPythonAsync(VISUAL_BUILDER_PYTHON);

    // Reset element registry
    await py.runPythonAsync('_engine.VisualElem._clear_registry()');

    // Reset combined timeline and V() tracer state
    await py.runPythonAsync('_reset_combined_timeline()');

    // Preprocess user code (replaces # @viz / # @end with tracer hook calls)
    const preprocessed = preprocess(code);
    const escaped = escapeTripleQuote(preprocessed);

    // Capture stdout
    await py.runPythonAsync(`
import sys as _sys
import io as _io
_stdout_capture = _io.StringIO()
_sys.stdout = _stdout_capture
`);

    // _exec_combined_code builds its own namespace from user_api (Panel, Rect, V, …)
    // and installs the V()-change-detection tracer around exec.
    try {
      await py.runPythonAsync(`_exec_combined_code('''${escaped}''')`);
    } finally {
      await py.runPythonAsync(`_sys.stdout = _sys.__stdout__`);
    }

    const output: string = await py.runPythonAsync(`_stdout_capture.getvalue()`);
    const timelineJson: string = await py.runPythonAsync(`_json.dumps(_combined_timeline)`);
    const timeline = JSON.parse(timelineJson) as CombinedStep[];

    return { success: true, timeline, output };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let cleanError = errorMessage;
    if (errorMessage.includes('PythonError:')) {
      cleanError = errorMessage.split('PythonError:')[1]?.trim() || errorMessage;
    }
    return { success: false, timeline: [], error: cleanError };
  }
}
