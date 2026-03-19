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
 * Inject __record_snapshot__(dict(locals())) after each # @end line.
 * The original comment is preserved; the call is added on the next line
 * with the same indentation as the # @end line.
 */
function preprocess(code: string): string {
  return code
    .split('\n')
    .flatMap(line => {
      if (line.trim() === '# @end') {
        const indent = line.match(/^(\s*)/)?.[1] ?? '';
        return [line, `${indent}__record_snapshot__(dict(locals()))`];
      }
      return [line];
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

    // Bring user-facing names (Rect, Panel, Array, …) and VisualElem into globals
    // so they are available both in the exec namespace and in the snapshot helper.
    await py.runPythonAsync('from user_api import *');

    // Reset element registry
    await py.runPythonAsync('_engine.VisualElem._clear_registry()');

    // Reset combined timeline (defined in visualBuilder.py)
    await py.runPythonAsync('_reset_combined_timeline()');

    // Preprocess user code
    const preprocessed = preprocess(code);
    const escaped = escapeTripleQuote(preprocessed);

    // Capture stdout
    await py.runPythonAsync(`
import sys as _sys
import io as _io
_stdout_capture = _io.StringIO()
_sys.stdout = _stdout_capture
`);

    try {
      await py.runPythonAsync(`exec('''${escaped}''', {
    **{k: v for k, v in globals().items() if not k.startswith('__')},
    '__builtins__': __builtins__,
    '__record_snapshot__': __record_snapshot__,
})`);
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
