# Grid Rendering

[← dev-notes](./dev-notes.md)

How the visual panel goes from Python element objects to an interactive, animated canvas.

---

## Big Picture: End-to-End Flow

```
Python user_api.py
  └─ Element instances (Rect, Label, Array1D, Panel, …)
       │  serialized by visualBuilder.py + hydrated in TS
       ▼
useGridState.loadVisualBuilderObjects(elements[])
  └─ Converts every element into a GridObject (id + data + position)
       │  stored in objects: Map<string, GridObject>
       ▼
useGridState (derived memos)
  ├─ panelAutoSizes   — panel sizes auto-expanded to fit children
  ├─ cells            — flat Map<"row,col", RenderableObjectData>
  ├─ overlayCells     — overflow Map for same-cell collisions
  ├─ occupancyMap     — which cells are occupied (hover/tooltip use)
  └─ panels           — array of panel metadata (position + size + style)
       ▼
Grid.tsx (pure renderer)
  ├─ objectsToRender  — sorted RenderableObject[] from cells + overlayCells
  ├─ GridSingleObject — one motion.div per element (position, animation, events)
  │    └─ GridCell    — delegates to shape renderer (RectView, LabelView, …)
  ├─ renderedPanelBackgrounds  — colored bordered rects, below objects
  └─ renderedPanelHandles      — title labels above panel top edge
```

**Separation of concerns:**
- `useGridState` owns all data transformation. It knows about element types, panels, arrays, handlers, and coordinate resolution. Grid.tsx knows none of this.
- `Grid.tsx` owns all rendering and interaction dispatch. It receives flat maps and fires callbacks. It does not know what a Panel or Array is.

---

## File Map

| File | Role |
|------|------|
| `src/visual-panel/hooks/useGridState.ts` | State hook: ingests hydrated elements, produces `cells`/`overlayCells`/`panels` |
| `src/visual-panel/components/Grid.tsx` | Pure renderer + interaction dispatch |
| `src/visual-panel/components/GridCell.tsx` | Delegates to shape renderer based on `elementInfo.type` |
| `src/visual-panel/handlersState.ts` | Module-level registry: Python `_elem_id` → list of handler names |
| `src/visual-panel/render-objects/` | Element classes (`Rect`, `Label`, `Array1D`, `PanelCell`, …) and their `draw()` methods |
| `src/visual-panel/types/grid.ts` | `RenderableObjectData`, `InteractionData`, `CellStyle`, `cellKey()` |
| `src/animation/animationContext.tsx` | `useAnimationEnabled()`, `useAnimationDuration()` |

---

## useGridState

### What it holds

```typescript
const [objects, setObjects] = useState<Map<string, GridObject>>();
```

`objects` is the single source of truth — one entry per element (panels, array panels, array cells, shapes, labels, inputs). Everything else is derived from it.

A `GridObject` is:
```typescript
{ id: string; data: RenderableObjectData; position: CellPosition; zOrder: number }
```

IDs are stable strings: `vb-panel-0`, `vb-elem-3`, or arbitrary `vb-42` for anonymous elements. The `vb-` prefix lets `loadVisualBuilderObjects` wipe only its own entries on reload without touching anything else.

---

### `loadVisualBuilderObjects` — the big function

This runs every time the Python builder re-executes (e.g. on Analyze or timeline step). It replaces all `vb-` entries in the objects map.

The function does **two passes** over the elements array:

#### Pre-pass: panel bookkeeping

Before either main pass, three things are pre-computed:

1. **`serializedPanelIdToGridId`** — maps Python `_elem_id` strings to stable grid IDs like `vb-panel-0`, `vb-panel-1`. The index is based on position in the elements array, not elem_id, so the mapping stays stable across re-runs.

2. **`hiddenPanelElemIds`** — starts with panels that have `visible=False`, then propagates to all descendants (children of hidden panels are also hidden). Uses a fixpoint loop.

3. **Topological sort of panels** — panels are sorted so parents always appear before children. This ensures that when the first pass processes a child panel, its parent is already in `panelIdMap`.

#### First pass: panels

Iterates `sortedPanels` (topological order). For each visible panel:
- Looks up its parent in `panelIdMap` (already resolved due to topo order).
- Computes the panel's absolute grid origin (own position + parent origin).
- Creates a `PanelCell` object and adds a `GridObject` to the map.
- Records the panel's absolute origin in `panelIdMap` so children can resolve against it.

#### Second pass: non-panel elements

Iterates `elements`, skipping panels and elements whose panel is hidden. For each element:
- Resolves the parent panel's absolute origin, adds it to the element's `(x, y)` to get an absolute grid position.
- Calls `el.draw(idx, VB_PREFIX, elemId)` to get the draw result.
- Routes the draw result to one of three cases:

```
draw() result shape       → What it is           → Interactivity
─────────────────────────────────────────────────────────────────
'panel' + 'cells'         → Array with panel bg  → none (array cells have no handlers)
'cells' (no 'panel')      → Multi-cell element   → none
else (single object)      → Shape / Label / etc. → checked via hasHandler()
```

Only the `else` branch attaches `clickData`, `dragData`, or `inputData`. Arrays and multi-cell elements never get interaction data — this is the mechanism that makes them non-clickable (see [Click Handling](#click-handling) below).

---

### Derived memos

#### `panelAutoSizes`

Computes the effective size of each panel. A panel declared as `width=5, height=5` but containing a child at position (4, 4) with `width=2` expands to `width=6`. Supports nested panels by recursing. The result is a `Map<panelId, { width, height }>`.

#### `cells`, `overlayCells`, `occupancyMap`

The main layout memo. Runs after `panelAutoSizes` is stable.

1. **Resolve panel positions** — walks all panel objects and builds `panelPositions`, adding parent origin offsets for nested panels.
2. **Populate panel occupancy** — for each panel, marks every cell it covers in `occMap`.
3. **Place non-panel objects** — for each non-panel object, resolves its absolute position (clamped to 0–49), calls `setOrOverlay()`:
   - First object at a cell → `cellMap`
   - Second+ object → `overlayMap` with key `"row,col,n"`

   Also records occupancy for multi-cell objects.

#### `panels`

Extracts panel metadata (id, row, col, width, height, title, style) for Grid.tsx to render panel backgrounds and handles. Runs after `panelAutoSizes`.

---

### `handlersState.ts`

A module-level singleton (not React state) that maps Python `_elem_id → string[]` of handler names:

```typescript
// Set once per Python execution, before loadVisualBuilderObjects runs
setHandlers({ "3": ["on_click"], "7": ["on_drag", "on_click"] });

// Queried per element inside loadVisualBuilderObjects
hasHandler(3, 'on_click') // → true
```

The Python executor calls `setHandlers` before calling `loadVisualBuilderObjects`, so by the time interaction data is being assigned, the registry is current.

---

## Grid.tsx

Grid is a `forwardRef` component. It receives `cells`, `overlayCells`, and `panels` from `useGridState` and renders them. It has no knowledge of element types or Python.

### `objectsToRender`

Merges `cells` and `overlayCells` into a single sorted array. Panel entries (which exist in `cells` but are rendered via the `panels` prop separately) are skipped with `if (cellData.panel) continue`.

Sorting: higher `userZ` renders first (closer to viewer), then `zOrder` (insertion order) as a tiebreak.

**Key stability matters for animation.** Every entry gets `key: cellData.objectId ?? posKey`. `objectId` is the stable `vb-elem-N` string that follows the element regardless of whether it's in `cells` or `overlayCells`. If the key changed when an element moved between the two maps, React would remount the node and break CSS transitions.

### `GridSingleObject`

One `memo`-wrapped `motion.div` per element. Handles:

**Positioning and animation:**
- Absolutely positioned at `(col * CELL_SIZE, row * CELL_SIZE)`.
- Framer Motion animates `left`, `top`, `width`, `height`, `opacity`.
- Animation fires only when both the global toggle (`useAnimationEnabled()`) and the per-element `cellData.animate !== false` flag are true.
- Fade-in on mount: starts at `opacity: 0`, steps to `1` via `initial` / `animate`.
- Invisible elements (`elementInfo.visible === false`): opacity 0, `pointerEvents: none`. DOM node stays alive (preserves key for transition continuity).

**Click handling:** <a name="click-handling"></a>
- If `mouseEnabled && clickData && onElementClick`: applies `cursor-pointer`, adds click handler.
- Click handler computes which sub-cell was clicked (`offsetX / CELL_SIZE`), adds to base position, calls `onElementClick(elemId, x, y)`.
- Shows a white flash overlay for 300ms.
- If no `clickData` but `inputData`: click activates an inline `<input>` instead.

**Drag handling:**
- `mouseDown` on a draggable element (has `dragData`): calls `onElementDragStart`, which sets `dragStateRef` in the parent `Grid`.
- `mouseMove` on the `Grid` container (not the element): `Grid.handleMouseMove` fires `onElementDrag(elemId, col, row, 'mid')` for each new cell entered. `dragCallInFlightRef` prevents queuing concurrent calls.
- `mouseUp` on `window` (not grid): fires `onElementDrag(…, 'end')` and clears state. Window-level ensures drag end fires even if the mouse leaves the grid.

### Rendering layers (DOM order)

```
gridContent div (scaled with zoom)
├── Background grid   — CSS gradient lines
├── Panel backgrounds — colored/bordered rects, pointer-events: none
├── Objects           — motion.divs, pointer-events per element
├── Panel handles     — title labels above top edge, pointer-events: none
├── Text boxes        — floating annotations, pointer-events conditional
└── Capture region    — screenshot region draw layer
```

### Zoom

The `gridContent` div is CSS-scaled via `transform: scale(zoom)` from the top-left origin. `CELL_SIZE` (40px) is always the logical unit — zoom only scales visually. Mouse coordinates in `getCellFromMouseEvent` are divided by `zoom` to convert back to logical cells.

`alignGrid()` (exposed via `ref`) snaps the scroll position to the nearest `CELL_SIZE * zoom` boundary, preventing blurry sub-pixel grid lines.

---

## Key Files

| File | Role |
|------|------|
| `src/visual-panel/components/Grid.tsx` | Rendering + interaction dispatch |
| `src/visual-panel/components/GridCell.tsx` | Delegates to shape renderer based on `elementInfo.type` |
| `src/visual-panel/hooks/useGridState.ts` | Builds `cells`, `overlayCells`, `panels` from hydrated element instances |
| `src/visual-panel/handlersState.ts` | Module-level `_elem_id → handlers[]` registry |
| `src/visual-panel/render-objects/` | Element classes and their `draw()` methods |
| `src/visual-panel/types/grid.ts` | `RenderableObjectData`, `InteractionData`, `CellStyle`, `cellKey()` |
| `src/animation/animationContext.tsx` | `useAnimationEnabled()`, `useAnimationDuration()` |
