import type { ObjDoc } from './visualBuilder';
// Library schemas (not yet surfaced in the UI — see roadmap: "Import library discoverability")
export { ARRAY_UTILS_SCHEMA } from '../python-engine/imports/array_utils.schema';
export { GRAPHS_SCHEMA } from '../python-engine/imports/graphs.schema';
export { LIST_HELPERS_SCHEMA } from '../python-engine/imports/list_helpers.schema';

export const FUNCTIONS_SCHEMA: ObjDoc[] = [
  {
    objName: 'V(expr, default=None)',
    docstring: 'Wrap a string expression to be evaluated lazily at each timeline step using the current variable values. Use inside shape constructors so properties update automatically as you step through the trace.',
    properties: [
      { name: 'expr', type: 'str', description: 'Python expression referencing algorithm variables (e.g. "arr[i]", "i + 1").' },
      { name: 'default', type: 'Any', description: 'Value returned when expr references an undefined variable. Defaults to None.' },
    ],
  },
  {
    objName: 'on_click(self, x, y)',
    docstring: 'Define on a shape subclass to handle click events in interactive mode. x=col, y=row. Inside a Panel: coords are panel-relative. Top-level: absolute grid coords. Return None to stay in interactive mode.',
    properties: [
      { name: 'x', type: 'int', description: 'Column of the clicked cell.' },
      { name: 'y', type: 'int', description: 'Row of the clicked cell.' },
    ],
  },
  {
    objName: 'on_drag(self, x, y, drag_type)',
    docstring: 'Define on a shape subclass to handle drag events in interactive mode. x=col, y=row — always absolute grid coords. Called on each new cell entered during drag.',
    properties: [
      { name: 'x', type: 'int', description: 'Column currently under the pointer (absolute).' },
      { name: 'y', type: 'int', description: 'Row currently under the pointer (absolute).' },
      { name: 'drag_type', type: "'start' | 'mid' | 'end'", description: '"start" on mouse-down, "mid" on each new cell, "end" on mouse-up.' },
    ],
  },
  {
    objName: 'no_debug(fn)',
    docstring: 'Wrap a function so it executes without tracing. Useful for event handlers that should run silently without producing timeline steps.',
    properties: [
      { name: 'fn', type: 'callable', description: 'The function to wrap. Returns a wrapper that skips tracing when called.' },
    ],
  },
];
