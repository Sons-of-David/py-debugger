# Grid Rendering

[← dev-notes](./dev-notes.md)

How the visual panel goes from Python element objects to an interactive, animated canvas.

---

## Big Picture: End-to-End Flow

```
Python user_api.py
  └─ Element instances (Rect, Label, Array1D, Panel, …)
       │  hydrated in TS (elementRegistry), panel-relative positions
       ▼
buildGridObjects(elements[])          ← pure function, exported for testing
  └─ Builds a panel tree, then DFS-traverses it:
       │  • accumulates absolute position, alpha, z per node
       │  • auto-expands panels to fit children
       │  • attaches clickData / dragData / inputData
       ▼
  Map<gridId, GridObject>
       │  stored in useGridState.objects
       │  position-clamped to 0–49 in positionedObjects memo
       ▼
Grid.tsx (pure renderer)
  ├─ objectsToRender  — GridObject[] sorted by absElement.z (higher z = rendered first = below)
  └─ GridSingleObject — one motion.div per element (position, animation, events)
       └─ renders absElement via shape renderer (RectView, LabelView, …)
```

**Separation of concerns:**
- `buildGridObjects` / `useGridState` own all data transformation. They know about element types, panels, arrays, handlers, and coordinate resolution. Grid.tsx knows none of this.
- `Grid.tsx` owns all rendering and interaction dispatch. It receives a flat `Map<gridId, GridObject>` and fires callbacks. It does not know what a Panel or Array is.

---

## File Map

| File | Role |
|------|------|
| `src/visual-panel/hooks/useGridState.ts` | `buildGridObjects()` (pure); `loadGridObjects()` hook entry point; zoom state |
| `src/visual-panel/components/Grid.tsx` | Pure renderer + interaction dispatch |
| `src/visual-panel/components/GridSingleObject.tsx` | One animated div per element; positioning, click/drag/input events |
| `src/visual-panel/handlersState.ts` | Module-level registry: Python `_elem_id` → list of handler names |
| `src/visual-panel/render-objects/` | Element classes and their rendering data |
| `src/visual-panel/types/grid.ts` | `GridObject`, `ExtraGridInfo`, `InteractionData`, `PanelStyle` |
| `src/animation/animationContext.tsx` | `useAnimationEnabled()`, `useAnimationDuration()` |

---

## `buildGridObjects`

### What it produces

```typescript
export function buildGridObjects(
  elements: VisualBuilderElementBase[]
): Map<string, GridObject>
```

Returns one `GridObject` per visible element, keyed by a stable grid ID:
- Panels: `panel-e{_elemId}`
- Leaf elements: `elem-{_elemId}` (or a sequential fallback for ID-less sub-elements)

```typescript
interface GridObject {
  element:    VisualBuilderElementBase;  // original (panel-relative) element
  absElement: VisualBuilderElementBase;  // clone with absolute x/y/z/alpha
  info:       ExtraGridInfo;
}

interface ExtraGridInfo {
  id:          string;           // grid ID
  panelId?:    string;           // parent panel's grid ID, if any
  zOrder:      number;           // DFS pre-order traversal counter (tiebreak for same z)
  clickData?:  InteractionData;
  dragData?:   InteractionData;
  inputData?:  InteractionData;
  invalidReason?: string;
}

interface InteractionData {
  elemId: number;
  x: number;   // panel-relative x of the element (used to compute panel origin for drag)
  y: number;   // panel-relative y of the element
}
```

### Phase 1: Build the panel tree

All elements are partitioned into a tree by their `panelId` field (the string `_elem_id` of their Python parent panel):

```
rootChildren: TreeNodeEntry[]
  PanelTreeNode { el, gridId, children: TreeNodeEntry[] }
  LeafTreeNode  { el, gridId }
```

Elements with an `expand()` method (array sub-cells) are expanded inline during this phase.

### Phase 2: DFS traversal

The tree is traversed depth-first. Each node accumulates:
- **Absolute position**: `absX = parentAbsX + el.x`, `absY = parentAbsY + el.y`
- **Inherited alpha**: `parentAlpha * (el.alpha ?? 1)`
- **Inherited z**: `parentZ + (el.z ?? 0)`

**Post-order for panels:** a panel's `emitPanel` call happens *after* all children are emitted, so it can compute its auto-size by inspecting children already in the map.

**Pre-order `zOrder`:** the traversal counter is incremented at node entry (pre-order), so the panel's `zOrder` is lower than its children's — meaning panels sort below their children in the render list when z is equal.

#### Panel auto-sizing

Inside `emitPanel`, the panel's `width` and `height` are expanded to fit all children:

```typescript
for (const child of node.children) {
  const childObj = next.get(child.gridId);
  maxCol = Math.max(maxCol, childObj.absElement.x - absCol + childWidth);
  maxRow = Math.max(maxRow, childObj.absElement.y - absRow + childHeight);
}
```

The expanded dimensions are stored in `absElement.width` / `absElement.height`.

#### Interaction data (leaves only)

After computing absolute position, `emitLeaf` attaches interaction data by querying `handlersState`:

```typescript
const clickData = elemId != null && hasHandler(elemId, 'on_click')
    ? { elemId, x: el.x, y: el.y } : undefined;
const dragData = elemId != null && hasHandler(elemId, 'on_drag')
    ? { elemId, x: el.x, y: el.y } : undefined;
const inputData = elemId != null && hasHandler(elemId, 'input_changed')
    ? { elemId, x: el.x, y: el.y } : undefined;
```

`x` / `y` in `InteractionData` are the **panel-relative** element coordinates. The drag handler in `GridSingleObject` uses these to derive the panel's absolute grid origin, then converts subsequent mouse events to panel-relative coordinates before calling the Python handler.

### `positionedObjects` memo

`useGridState` wraps `buildGridObjects` output in one additional memo that clamps all `absElement.x`/`absElement.y` to `[0, 49]` (the 50×50 grid). The unclamped `absElement` is kept in `GridObject.element` for possible future use.

---

## `handlersState.ts`

A module-level singleton (not React state) that maps `_elem_id → string[]` of handler names:

```typescript
// Set once per Python execution, before loadGridObjects runs
setHandlers({ "3": ["on_click"], "7": ["on_drag", "on_click"] });

// Queried per element inside buildGridObjects
hasHandler(3, 'on_click') // → true
```

`setHandlers` converts JSON string keys to numbers. It is called before `loadGridObjects` so interaction data is correct by the time elements are built.

---

## Grid.tsx

Grid is a `forwardRef` component. It receives `objects: Map<string, GridObject>` from `useGridState` and renders them. It has no knowledge of element types or Python.

### `objectsToRender`

Sorts the map values into a `GridObject[]`:

```typescript
// Higher z → renders first → appears below (painter's algorithm)
// zOrder (DFS pre-order) breaks ties: lower zOrder → renders first → below
(b.absElement.z ?? 0) - (a.absElement.z ?? 0) || b.info.zOrder - a.info.zOrder
```

### `changedIds` animation optimization

`Grid` accepts `changedIds?: Set<number> | null`:
- `null` (full snapshot) → all elements animate
- `Set<number>` (delta step) → only elements whose `_elemId` is in the set animate; others get `animate: false` on their `GridSingleObject`, bypassing Framer Motion

`changedIds` flows: `timelineState.getChangedIdsAt(step)` → `useTimelineNavigation.changedIds` → `GridArea` → `Grid`.

### `GridSingleObject`

One `memo`-wrapped `motion.div` per element (`src/visual-panel/components/GridSingleObject.tsx`). Handles:

**Positioning and animation:**
- Absolutely positioned at `(absElement.x * CELL_SIZE, absElement.y * CELL_SIZE)`.
- Width/height from `absElement.width`/`absElement.height` (defaulting to 1 cell).
- Framer Motion animates `left`, `top`, `width`, `height`, `opacity`.
- Animation fires only when the global toggle (`useAnimationEnabled()`) is on **and** the element's `changedIds` check passes.
- Fade-in on mount: `opacity: 0` → `1`. Invisible elements (`visible === false`): opacity 0, `pointerEvents: none` — DOM node stays alive to preserve key for transition continuity.

**Click handling:**
- If `mouseEnabled && clickData && onElementClick`: applies `cursor-pointer`, attaches click handler.
- Click coords: `x = clickData.x + floor(offsetX / CELL_SIZE)`, `y = clickData.y + floor(offsetY / CELL_SIZE)` — panel-relative cell that was clicked.
- White flash overlay for 300ms on click.

**Drag handling:**
- `mouseDown`: calls `onElementDragStart(elemId, x, y, col - dragData.x, row - dragData.y)` — the last two args are the panel's absolute grid origin (`panelOriginCol`, `panelOriginRow`).
- `Grid.handleMouseMove` (on the container): fires `onElementDrag` for each new cell. Converts absolute mouse cell to panel-relative: `col = absCol - panelOriginCol`. In-flight guard prevents concurrent Pyodide calls.
- Window-level `mouseup`: fires `onElementDrag(…, 'end')`, clears drag state.

All drag coordinates passed to Python are **panel-relative** — the same coordinate space as `on_click`.

**Input widget:**
- If `inputData` and no `clickData`: click activates an inline `<input>` overlay.

### Rendering layers (DOM order)

```
gridContent div (scaled with zoom)
├── Background grid   — CSS gradient lines
├── Objects           — motion.divs per GridObject (panels + leaves interleaved by z-order)
├── Text boxes        — floating annotations
└── Capture region    — screenshot region draw layer
```

Panels are now regular `GridObject` entries rendered by `GridSingleObject` — there are no separate panel-background or panel-handle layers.

### Zoom

The `gridContent` div is CSS-scaled via `transform: scale(zoom)` from the top-left origin. `CELL_SIZE` (40px) is always the logical unit. Mouse coordinates in `getCellFromMouseEvent` are divided by `zoom` to convert back to logical cells.

`alignGrid()` (exposed via `ref`) snaps the scroll position to the nearest `CELL_SIZE * zoom` boundary, preventing blurry sub-pixel grid lines.

---

## Key Files

| File | Role |
|------|------|
| `src/visual-panel/hooks/useGridState.ts` | `buildGridObjects` (pure, exported); `loadGridObjects` hook; `positionedObjects` clamp memo |
| `src/visual-panel/components/Grid.tsx` | Rendering + interaction dispatch; `objectsToRender` sort; `changedIds` animation gate |
| `src/visual-panel/components/GridSingleObject.tsx` | Animated div; click/drag/input events; panel-relative coordinate conversion |
| `src/visual-panel/handlersState.ts` | Module-level `_elem_id → handlers[]` registry |
| `src/visual-panel/render-objects/` | Element classes with rendering data |
| `src/visual-panel/types/grid.ts` | `GridObject`, `ExtraGridInfo`, `InteractionData`, `PanelStyle` |
| `src/animation/animationContext.tsx` | `useAnimationEnabled()`, `useAnimationDuration()` |
