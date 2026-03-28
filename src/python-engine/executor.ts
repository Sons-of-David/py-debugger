import { loadPyodide } from './pyodide-runtime';

import type { VisualBuilderElementBase } from '../api/visualBuilder';
import VB_ENGINE_PYTHON from './_vb_engine.py?raw';
import USER_API_PYTHON from './user_api.py?raw';
import VISUAL_BUILDER_PYTHON from './vb_serializer.py?raw';
const IMPORT_MODULES = import.meta.glob('./imports/*.py', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
import { validateVizBlocks, getVizRanges } from './viz-block-parser';

export interface TraceVariable {
  type: string;
  value: unknown;
}

/** Delta snapshot emitted by _serialize_visual_builder after the first call. */
export interface VisualDelta {
  is_delta: true;
  changed: VisualBuilderElementBase[];
  deleted: number[];
}

/** A visual field is either a full element array or a delta. */
export type RawVisual = VisualBuilderElementBase[] | VisualDelta;

export interface TraceStep {
  visual: RawVisual;
  variables: Record<string, TraceVariable>;
  line?: number;
  output?: string;   // stdout delta since previous snapshot
  isViz?: boolean;   // true if triggered by __viz_end__ (viz block)
}

export interface TraceStageInfo {
  timeline: TraceStep[];
  handlers: Record<string, string[]>;  // elem_id (string key) → handler names
  error?: string;
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
  // Escape backslashes first, then ''' so the string can be safely embedded in Python '''...'''
  return s.replace(/\\/g, '\\\\').replace(/'''/g, "\\'\\'\\'");
}

function cleanPythonError(rawError: string): string {
  let clean = rawError;
  if (clean.includes('PythonError:')) {
    clean = clean.split('PythonError:')[1]?.trim() || clean;
  }
  // SerializationException already has a clean "line N: message" string — show it directly.
  const serMatch = clean.match(/SerializationException:\s*([\s\S]*?)(?:\n\s*\n|$)/);
  if (serMatch) return serMatch[1].trim();

  // If the traceback contains a user code frame, strip internal engine frames
  // so the error appears to originate from user code.
  if (clean.includes('File "<user_code>"')) {
    const lines = clean.split('\n');
    const firstLine = lines[0]; // "Traceback (most recent call last):"
    const userFrameIndex = lines.findIndex(l => l.includes('File "<user_code>"'));
    clean = [firstLine, ...lines.slice(userFrameIndex)].join('\n');
  }
  return clean;
}

function parseRawTimeline(raw: Array<{
  visual: RawVisual;
  variables: Record<string, TraceVariable>;
  line?: number;
  output?: string;
  is_viz?: boolean;
}>): TraceStep[] {
  return raw.map(s => ({
    visual: s.visual,
    variables: s.variables,
    line: s.line,
    output: s.output,
    isViz: s.is_viz,
  }));
}

async function initializePythonEngine(code: string): ReturnType<typeof loadPyodide> {
    const py = await loadPyodide();

    // Write engine modules to Pyodide VFS so visualBuilder.py can import them
    py.FS.writeFile('/home/pyodide/_vb_engine.py', VB_ENGINE_PYTHON);
    py.FS.writeFile('/home/pyodide/user_api.py', USER_API_PYTHON);
    for (const [path, src] of Object.entries(IMPORT_MODULES)) {
      const filename = path.split('/').pop()!;
      py.FS.writeFile(`/home/pyodide/${filename}`, src);
    }

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
    await py.runPythonAsync(`_init_namespace('${escapeTripleQuote(vizRangesJson)}')`);

    return py;
}

type RawResult = {
  timeline: Array<{
    visual: RawVisual;
    variables: Record<string, TraceVariable>;
    line?: number;
    output?: string;
    is_viz?: boolean;
  }>;
  handlers: Record<string, string[]>;
  console?: string;
};

/**
 * Execute Python code (with # @viz / # @end blocks) and return
 * a timeline of snapshots, one per # @end marker.
 */
export async function executeCode(code: string): Promise<TraceStageInfo> {
  try {
    const py = await initializePythonEngine(code);
    const preprocessed = preprocess(code);
    const resultJson: string = await py.runPythonAsync(
      `_exec_code('''${escapeTripleQuote(preprocessed)}''')`
    );
    const result = JSON.parse(resultJson) as RawResult;
    if (result.console) console.log(result.console);
    return { timeline: parseRawTimeline(result.timeline), handlers: result.handlers };
  } catch (error) {
    return { timeline: [], handlers: {}, error: cleanPythonError(error instanceof Error ? error.message : String(error)) };
  }
}

/**
 * Dispatch an input_changed event to an Input element with viz-aware tracing.
 */
export async function executeInputChanged(
  elemId: number,
  text: string,
): Promise<TraceStageInfo> {
  try {
    const py = await loadPyodide();
    await py.runPythonAsync(`_input_text = ${JSON.stringify(text)}`);
    const resultJson: string = await py.runPythonAsync(
      `_exec_input_changed(${elemId}, _input_text)`
    );
    const result = JSON.parse(resultJson) as RawResult;
    return { timeline: parseRawTimeline(result.timeline), handlers: result.handlers };
  } catch (error) {
    return { timeline: [], handlers: {}, error: cleanPythonError(error instanceof Error ? error.message : String(error)) };
  }
}

export type DragType = 'start' | 'mid' | 'end';

/**
 * Dispatch an on_drag event to an element with viz-aware tracing.
 */
export async function executeDragHandler(
  elemId: number,
  row: number,
  col: number,
  dragType: DragType,
): Promise<TraceStageInfo> {
  try {
    const py = await loadPyodide();
    const resultJson: string = await py.runPythonAsync(
      `_exec_drag_traced(${elemId}, ${row}, ${col}, '${dragType}')`
    );
    const result = JSON.parse(resultJson) as RawResult;
    return { timeline: parseRawTimeline(result.timeline), handlers: result.handlers };
  } catch (error) {
    return { timeline: [], handlers: {}, error: cleanPythonError(error instanceof Error ? error.message : String(error)) };
  }
}

/**
 * Dispatch an on_click event to an element with viz-aware tracing.
 *
 * Algorithm functions called from the handler (defined outside viz blocks) are
 * automatically traced and returned as timeline steps.
 * Use no_debug(fn)(...) in the handler to suppress tracing for specific calls.
 */
export async function executeClickHandler(
  elemId: number,
  row: number,
  col: number,
): Promise<TraceStageInfo> {
  try {
    const py = await loadPyodide();
    const resultJson: string = await py.runPythonAsync(
      `_exec_click_traced(${elemId}, ${row}, ${col})`
    );
    const result = JSON.parse(resultJson) as RawResult;
    return { timeline: parseRawTimeline(result.timeline), handlers: result.handlers };
  } catch (error) {
    return { timeline: [], handlers: {}, error: cleanPythonError(error instanceof Error ? error.message : String(error)) };
  }
}
