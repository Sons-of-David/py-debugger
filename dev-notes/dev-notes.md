# Developer Notes

**AlgoPlay** — a browser-based interactive algorithm visualizer. Users write Python code in a single editor, click Analyze, step through execution watching data structures animate on a grid, then enter interactive mode to click on elements that trigger Python handlers.

---

## Part 1: App Overview

### What This Project Is

Users write a single Python file that contains two kinds of code, interleaved:

- **Algorithm code** — the algorithm being studied (e.g. bubble sort). Traced with V() change detection: a snapshot is recorded whenever any bound V() expression changes value.
- **Viz blocks** (`# @viz … # @end`) — visual builder code that declares panels, shapes, and V()-bound properties. A snapshot is recorded at the end of each viz block. Viz blocks can appear anywhere in the file — at the top to declare the initial layout, or inline between algorithm steps to update visuals.

The result is a **timeline** of snapshots that can be navigated forward and backward.

Python runs entirely in-browser via **Pyodide** (WebAssembly). There is no server.

→ See [Python Engine](./python-engine.md) for how execution, tracing, and V() work.
→ See [Visual Elements](./visual-elements.md) for how Python objects become clickable grid cells.

### Product Vision

**AlgoPlay** — interactive exploration of algorithms, not passive watching.

The core differentiator is **interactive mode**: users click visual elements, trigger traced sub-runs, and accumulate state across interactions. No other algorithm visualizer has this. Every architectural decision should favor making interactive mode powerful and discoverable.

### Component Layout

```
┌──────────────────────────────┬──────────────────────────────────────┐
│          Code Panel          │           Visual Panel               │
│                              │                                      │
│  ┌────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │  Combined Code editor  │  │  │                                │  │
│  │  (Monaco, viz block    │  │  │   Grid (50×50 cells)           │  │
│  │   decorations, line    │  │  │   + TextBoxesLayer             │  │
│  │   highlight, autocpl.) │  │  │                                │  │
│  └────────────────────────┘  │  └────────────────────────────────┘  │
│  Output Terminal (bottom)    │  Zoom controls · Screenshot          │
│                              │  API Reference (toggle button)       │
└──────────────────────────────┴──────────────────────────────────────┘
       App header: TimelineControls · Analyze/Edit · mode badge · Animated/Jump toggle · dark mode
```

**Named components:**
| Name | What it is |
|------|-----------|
| **Code Panel** | Left side — the code editor |
| **Code editor** | Single Monaco editor (`src/components/editor/Editor.tsx`); viz blocks highlighted in blue; active line highlighted in yellow during trace; autocomplete for visual API |
| **Output Terminal** | Print output at the bottom of the Code Panel |
| **Visual Panel** | Right side — the grid canvas with text box overlay and controls |
| **API Reference** | Floating overlay showing builder function signatures; toggled from the Visual Panel |
| **TimelineControls** | Step prev/next navigation in the app header |

### Embed Mode

Navigate to `/embed?sample=<name>&dark=0|1` for an embeddable view: no code editor, auto-analyzes on Pyodide ready, minimal header with sample selector, same Grid and TimelineControls. Used for embedding demos in external pages.

### Main Flow

The app has four modes. The normal progression is:

1. **Write** Python code in the Combined Code editor (algorithm + viz blocks)
2. **Analyze** — Python executes the code with V() change detection and viz-block snapshot hooks; builds a timeline
3. **Trace mode** — step forward/backward through the timeline; watch data structures animate and variables update
4. **Interactive mode** — click on visual elements to trigger Python handlers; handlers run with viz-aware tracing and produce a mini-timeline

```
                ┌────────────────┐
                │      idle      │
                └───────┬────────┘
                        │ Analyze succeeds
                        ▼
                ┌────────────────┐
                │     trace      │
                └───────┬────────┘
                        │ Analyze
                        ▼
                ┌────────────────┐
                │     trace      │◄──────────────────┐
                └───────┬────────┘   click produces  │
                        │            mini-timeline   │
                        │ Finish & Interact          │
                        ▼                            │
                ┌────────────────┐                   │
                │  interactive   │───────────────────┘
                └────────────────┘

(Edit returns to idle from trace or interactive)
```

| Mode | Timeline | Mouse | Editor |
|------|----------|-------|--------|
| `idle` | hidden | off | unlocked |
| `trace` | visible | off | locked |
| `interactive` | hidden | on | locked |

### Trace Mode

After Analyze, the app enters trace mode. The timeline is pre-built and stored in memory. Navigation never re-executes Python.

- **TimelineControls** lets the user step prev/next
- The **Visual Panel** shows the animated snapshot at the current step
- The **Combined Code editor** highlights the current line in yellow; the **variable panel** shows captured variables at that step

### Interactive Mode

In interactive mode, visual elements that have Python `on_click` handlers are clickable (pointer cursor, timeline hidden).

When an element is clicked:
1. `executeClickHandler(elemId, row, col)` is called (in `src/python-engine/executor.ts`)
2. Python runs the handler with viz-aware tracing (algorithm code inside the handler is traced; viz-block helper functions are skipped)
3. Returns `TraceStageInfo: { timeline, handlers }`
4. The mini-timeline loads and the app re-enters `trace` mode for stepping
5. **Finish & Interact** returns to interactive mode with the accumulated state

The Python namespace (`_combined_ns`) persists across all clicks and sub-runs — handlers can read and mutate the algorithm's state over multiple interactions.

---

### Detailed Documentation

- [**Python Engine**](./python-engine.md) — Pyodide runtime, combined execution model, viz block preprocessing, V() change detection tracer, snapshot recording, interactive click tracing, the TypeScript↔Python bridge
- [**Visual Elements**](./visual-elements.md) — full pipeline from Python object to clickable grid cell: serialization, TypeScript hydration, element registry, two-pass grid layout, click dispatch chain
- [**Other Components**](./other-components.md) — text boxes (drawing, drag/resize, formatting), save/load JSON format, output terminal, API reference panel
- [**Sharp Edges**](./sharp-edges.md) — known issues and architectural quirks to read before touching the Python/TypeScript boundary, serialization, or mode transitions
- [**Python Tracing Primer**](./python-tracing-primer.md) — how `sys.settrace` works: events, frame attributes, worked example with output

---
---

## Part 2: Technical Reference

### Directory Structure

```
src/
├── app/                            # React shell and layout
│   ├── App.tsx                     # All top-level state, mode transitions, event wiring
│   ├── EmbedPage.tsx               # Embed-only entry point (/embed route)
│   ├── GridArea.tsx                # Visual Panel: grid container, click dispatch, screenshot
│   └── ExtrasMenu.tsx              # Header extras dropdown (dark mode, etc.)
│
├── components/
│   ├── editor/                     # Code editor UI
│   │   ├── Editor.tsx              # Monaco editor: viz block decorations, line highlight, autocomplete
│   │   └── sample.py               # Default sample shown on first load
│   └── FeedbackModal.tsx           # In-app feedback form (posts to /api/feedback)
│
├── python-engine/                  # Active execution services + Python files
│   ├── executor.ts                 # TypeScript ↔ Pyodide bridge; exports RawVisual, VisualDelta
│   ├── pyodide-runtime.ts          # Pyodide singleton: loadPyodide(), isPyodideLoaded(), resetPythonState()
│   ├── viz-block-parser.ts         # Parse & validate # @viz / # @end blocks
│   ├── _vb_engine.py               # VFS module: VisualElem (_dirty, __setattr__), V (_count), R, TrackedDict
│   ├── user_api.py                 # VFS module: user-facing API (Panel, shapes, Input, no_debug)
│   ├── vb_serializer.py            # Engine: _namespace, _exec_code, delta snapshots, interactive dispatch
│   ├── profiler.py                 # Dev-only performance profiler
│   └── imports/                    # Python modules auto-loaded into Pyodide VFS (all .py files)
│       ├── array_utils.py / .schema.ts
│       ├── graphs.py / .schema.ts
│       └── list_helpers.py / .schema.ts
│
├── samples/                        # Bundled sample JSON files (*.json)
│                                   # Prefixes: feature-* → Features category, local-* → local-dev only
│
├── old-code/                       # Archived legacy code — excluded from TypeScript; pending deletion
│
├── timeline/
│   ├── TimelineControls.tsx        # Prev/next navigation (rendered in header)
│   ├── timelineState.ts            # Store; setVisualTimeline() (delta-aware); hydrateTimelineFromArray()
│   └── discreteTimelineSchema.ts   # Timeline data types
│
├── visual-panel/
│   ├── handlersState.ts            # Registry: elem_id → ["on_click"]
│   ├── hooks/useGridState.ts       # loadVisualBuilderObjects(); single-pass (absolute positions)
│   ├── components/
│   │   ├── Grid.tsx                # 50×50 cell renderer; zoom, screenshots
│   │   └── GridCell.tsx            # Individual cell with shape renderer
│   ├── render-objects/             # TypeScript element classes (Rect, Circle, Arrow, Panel, etc.)
│   ├── shapes/                     # React SVG/HTML renderers per shape type
│   ├── views/rendererRegistry.ts   # Maps type string → React renderer
│   └── types/elementRegistry.ts   # Maps type string → constructor for hydration
│
├── api/
│   ├── ApiReferencePanel.tsx       # API reference overlay
│   ├── visualBuilder.ts            # VisualBuilderElementBase interface + VISUAL_ELEM_SCHEMA
│   └── functionsSchema.ts          # Available builder function schemas
│
├── text-boxes/                     # UI-only grid annotations (not Python objects)
│   ├── types.ts                    # TextBox interface
│   ├── TextBoxesLayer.tsx          # Drawing mode overlay + renders all TextBoxItem children
│   ├── TextBoxItem.tsx             # Single draggable/resizable/editable text box
│   └── TextBoxFormatToolbar.tsx    # Font size, text color, bg color, delete
│
├── output-terminal/
│   ├── OutputTerminal.tsx          # Print output display
│   └── terminalState.ts            # Output capture state
│
├── animation/
│   └── animationContext.tsx         # AnimationContext (boolean); Animated/Jump toggle state
├── contexts/ThemeContext.tsx        # Dark/light mode context
├── pages/
│   └── tutorials/                  # Tutorial pages (route: /tutorials/*)
│       ├── TutorialsHub.tsx        # Tutorial index page
│       ├── TutorialLayout.tsx      # Shared sidebar + nav layout
│       ├── GettingStarted.tsx      # /tutorials (index)
│       ├── EmbedPreview.tsx        # Shared embed iframe component
│       ├── CodeBlock.tsx           # Shared syntax-highlighted code block
│       ├── theme.ts                # Shared token constants (colors, spacing)
│       ├── features/               # /tutorials/visual-elements, /tracing, /interactive-mode
│       └── algorithms/             # /tutorials/algorithms/* (selection-sort, bubble-sort, trapping-rain, bfs-maze)
├── api/
│   └── feedback.ts                 # Vercel Lambda: receives feedback form POST, creates GitHub issue
└── main.tsx                        # Routes: / → App, /embed → EmbedPage, /tutorials/* → TutorialLayout
```

---

### Mode State Machine

See diagram in Part 1. Derived values:
- `mouseEnabled = appMode === 'interactive'`
- `readOnly = appMode !== 'idle'`
- `showTimeline = appMode === 'trace'`

---

### Key State in App.tsx

| Variable | Type | Purpose |
|----------|------|---------|
| `appMode` | `'idle'\|'trace'\|'interactive'` | Drives all UI mode logic |
| `code` | `string` | Code editor content (formerly `combinedCode`) |
| `timeline` | `TraceStep[]` | Timeline from last Analyze |
| `isEditable` | `boolean` | Whether editor is unlocked |
| `isAnalyzing` | `boolean` | Disables Analyze button while Python runs |
| `analyzeStatus` | `'idle'\|'success'\|'error'` | Controls Analyze/Edit button appearance |
| `projectName` | `string` | Current project name; used as filename for Save |
| `currentStep` | `number` | Current timeline index |
| `stepCount` | `number` | Total steps in active timeline |
| `hasInteractiveElements` | `boolean` | Whether any element has a click handler |
| `textBoxes` | `TextBox[]` | Grid annotation boxes (owned here for save/load) |
| `pyodideReady` | `boolean` | Whether Pyodide has finished loading |
| `feedbackOpen` | `boolean` | Whether the FeedbackModal is open |

---

### Full Data Flow

#### Initial Trace (Analyze)

1. `handleAnalyze()` calls `executeCode(code)`
2. `python-engine/executor.ts`:
   - Preprocesses code: `# @viz` → `__viz_begin__()`, `# @end` → `__viz_end__(dict(locals()))`
   - Loads Pyodide (once per session via `pyodide-runtime.ts`)
   - Calls `_init_namespace(vizRangesJson)` then `_exec_code(preprocessedCode)`
   - Returns `TraceStageInfo: { steps: TraceStep[], handlers, error? }`
3. `setHandlers()`, `setVisualTimeline(steps.map(s => s.visual))` populate stores
4. `loadVisualBuilderObjects(timeline[0])` renders first snapshot
5. `appMode = 'trace'`

#### Timeline Navigation

1. `goToStep(n)` → `getStateAt(n)` → returns already-hydrated snapshot (no Python re-exec)
2. `loadVisualBuilderObjects(snapshot)` → grid re-renders
3. Variable panel updates from `CombinedStep.variables`

#### Click Handler

1. Grid fires click → `executeClickHandler(elemId, row, col)` in `python-engine/executor.ts`
2. Calls `_exec_click_traced(elemId, row, col)` in Python
3. Returns `TraceStageInfo: { steps, handlers }`
4. Mini-timeline loaded; `appMode = 'trace'`
5. User steps through mini-timeline; "Finish & Interact" returns to `interactive`

#### Input Changed

1. User types in an `Input` element → `executeInputChanged(elemId, text)`
2. Returns same `TraceStageInfo` shape; same mini-timeline flow as click

#### Edit

1. `handleEdit()`:
   - `setIsCombinedEditable(true)`
   - `setAppMode('idle')`

---

### Python Files Loaded Into Pyodide

`_vb_engine.py` and `user_api.py` are written to the Pyodide VFS and imported as modules. `vb_serializer.py` is exec'd into Pyodide globals.

| File | How loaded | Purpose |
|------|------------|---------|
| `src/python-engine/_vb_engine.py` | VFS import | Hidden engine types: `VisualElem`, `V`, `R`, `TrackedDict`, `PopupException` |
| `src/python-engine/user_api.py` | VFS import | User-facing API: `Panel`, all shapes, `Input`, `no_debug` |
| `src/python-engine/vb_serializer.py` | exec'd | Execution, snapshot recording, interactive dispatch |

See [Python Engine](./python-engine.md) for the full architecture.

---

### Component Prop Tree

```
App.tsx
  │  appMode, currentStep, stepCount, hasInteractiveElements, isAnalyzingCombined,
  │  combinedCode, isCombinedEditable, textBoxes, pyodideReady
  │
  ├─ TimelineControls.tsx   (in header)
  │   props: currentStep, stepCount, appMode, onStep, onEnterInteractive
  │
  ├─ ApiReferencePanel.tsx  (floating overlay)
  │   props: open, onClose
  │
  ├─ Editor.tsx             (Code Panel)
  │   props: code, onChange, isEditable, currentStep, currentLine, onEdit
  │   handle: foldVizBlocks()
  │   └─ OutputTerminal   (bottom of editor)
  │
  └─ GridArea.tsx           (Visual Panel)
      props: darkMode, mouseEnabled, textBoxes, onTextBoxesChange,
             combinedVizRanges, onCombinedTrace, onCombinedInputChanged
      ├─ Grid.tsx
      │   props: cells, panels, zoom, mouseEnabled, onElementClick
      └─ TextBoxesLayer.tsx

EmbedPage.tsx  (separate root at /embed)
  │  appMode, currentStep, stepCount, pyodideReady
  ├─ TimelineControls.tsx
  └─ GridArea.tsx   (same props as App, minus text boxes and edit callbacks)
```
