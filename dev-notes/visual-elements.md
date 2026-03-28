# Visual Elements

[← dev-notes](./dev-notes.md)

The pipeline that takes a Python element object to a rendered, clickable cell on the grid.

```
Python VisualElem
  → _serialize_visual_builder() → full array OR delta {is_delta, changed, deleted}
    → setVisualTimeline() → hydrated timeline (Map-based, delta-aware)
      → loadVisualBuilderObjects() → grid cell map
        → user click → executeClickHandler() → Python _exec_click_traced()
```

---

## Part 1: General Description

### Data Side

Every visual element has one stable ID:
- **`_elem_id`** — stable integer assigned at construction. The only identity that holds across serialization calls, Python/TS boundary, and timeline steps.

At each traced line, `_serialize_visual_builder()` produces either a **full snapshot** (first call, or when V() bindings are present) or a **delta** (subsequent calls when `V._count == 0`). See [python-engine.md](./python-engine.md) for details on the delta system.

### Renderers

TypeScript has a class hierarchy mirroring the Python shapes:
- **`BasicShape`** (`src/visual-panel/render-objects/BasicShape.ts`) — base for all clickable shapes. Its constructor copies `el._elem_id` → `this._elemId` (the only snake→camelCase bridge).
- `Rect`, `Circle`, `Arrow` extend `BasicShape` → they get `_elemId` → they can be clickable.
- `Line`, `Label`, `Array1D`, `Array2D` implement `VisualBuilderElementBase` directly → they do **not** get `_elemId` → they are never clickable, even if `on_click` is defined in Python.

### Registration

Each TypeScript shape class registers itself by type string: `registerVisualElement('rect', Rect, RECT_SCHEMA)`. This happens as a side effect when shape modules are imported (triggered by `src/api/visualBuilder.ts`). The registry maps `type` string → constructor, used during hydration.

### Mouse Events

**Click:** For each element with a valid `_elemId` that has a registered `on_click` handler, a `clickData` object is attached to the grid cell. The Grid renders those cells with pointer cursor and a click listener.

**Drag:** For each element that has any of `on_drag_start`, `on_drag`, or `on_drag_end` registered, a `dragData` object is attached. The Grid shows `cursor-grab` on those cells and tracks drag state (see Drag Dispatch Chain below).

---

## Part 2: Files and Functions

### Python Side

**File:** `src/python-engine/vb_serializer.py`

#### `_serialize_visual_builder()`

Serializes the element registry as a full snapshot or delta. Positions are resolved to **absolute grid coordinates** by the Python DFS traversal before serialization. TypeScript never needs to add panel offsets.

#### `_exec_click_traced(elem_id, row, col)` / `_exec_drag_traced(...)` / `_exec_input_changed(...)`

Unified interactive dispatch functions in `vb_serializer.py`. Each looks up the element by `_elem_id` in `_namespace`, calls the appropriate handler under a tracer, and returns `json.dumps({steps, handlers, console?})`.

#### `_serialize_handlers() → str`

Returns `json.dumps({elem_id: ["on_click", "on_drag_start", ...]})` for all elements with handlers. Called after every interactive event (handlers can be created dynamically inside handlers).

---

### TypeScript Hydration

**File:** `src/timeline/timelineState.ts`

#### `setVisualTimeline(rawTimeline: RawVisual[])`

Builds the hydrated timeline from raw visual snapshots. Each entry is either a full element array or a delta `{is_delta, changed, deleted}`. Maintains a running `Map<elemId, hydratedElement>` so only changed elements are re-hydrated — unchanged elements are shared references across steps:

```typescript
// Full snapshot: rebuild map entirely
current.clear(); raw.forEach(el => current.set(id, hydrateElement(el)));
// Delta: apply deletions, update changed
raw.deleted.forEach(id => current.delete(id));
raw.changed.forEach(el => current.set(id, hydrateElement(el)));
```

Also `hydrateTimelineFromJson(jsonStr)` / `hydrateTimelineFromArray(raw)` — older full-snapshot-only paths, still present for the interactive mini-timeline (which always gets a full snapshot).

#### Element Registry

**File:** `src/visual-panel/types/elementRegistry.ts`

```typescript
registerVisualElement('rect', Rect, RECT_SCHEMA)
registerVisualElement('circle', Circle, CIRCLE_SCHEMA)
// ... etc.
```

`getConstructor(type)` looks up the registered class. All registrations are triggered as side effects when `src/api/visualBuilder.ts` is imported.

#### `BasicShape.ts` — The Identity Bridge

**File:** `src/visual-panel/render-objects/BasicShape.ts`

```typescript
constructor(type: string, el: any) {
    this._elemId = el._elem_id;  // snake_case (Python JSON) → camelCase (TypeScript)
    // ...
}
```

This is the **only place** the Python `_elem_id` is transferred to TypeScript. Subclasses (`Rect`, `Circle`, `Arrow`) inherit this. `Label`, `Array1D`, `Array2D` do not extend `BasicShape` — their `_elemId` is `undefined`.

---

### Grid Hydration: `loadVisualBuilderObjects()`

**File:** `src/visual-panel/hooks/useGridState.ts`

Takes an array of hydrated TypeScript element instances and populates the grid cell map.

**All positions are now absolute.** The Python side (DFS traversal in `vb_serializer.py`) resolves panel-relative coordinates to absolute grid coordinates before serialization. TypeScript no longer needs to add panel offsets — `element.position` in every hydrated instance is already an absolute grid coordinate.

#### Algorithm (single pass)

```
For each element (sorted by z-order):
  → element.position is already absolute
  → Call element.draw() → RenderableObjectData
  → Assemble clickData / dragData (see below)
  → Store in objects map
```

Panels still appear as elements in the list (for occupancy/auto-sizing), but children do not need a parent lookup for position resolution.

#### Interaction Data Assembly

Both `clickData` and `dragData` use the shared `InteractionData` type (`src/visual-panel/types/grid.ts`):

```typescript
export interface InteractionData {
  elemId: number;
  position: [number, number];  // top-left cell of the element (absolute)
}
```

```typescript
const elemId = (el as any)._elemId as number | undefined;

const clickData: InteractionData | undefined = elemId != null && hasHandler(elemId, 'on_click')
    ? { elemId, position: el.position as [number, number] }
    : undefined;

const hasDrag = elemId != null && (
    hasHandler(elemId, 'on_drag_start') || hasHandler(elemId, 'on_drag') || hasHandler(elemId, 'on_drag_end')
);
const dragData: InteractionData | undefined = hasDrag
    ? { elemId: elemId!, position: el.position as [number, number] }
    : undefined;
```

Cells with `clickData` get `cursor-pointer`; cells with `dragData` get `cursor-grab`. A cell can have both.

---

### Click Dispatch Chain

**Files:** `Grid.tsx` → `GridArea.tsx` → `executor.ts` → `vb_serializer.py`

```
Grid.tsx (GridSingleObject):
  onClick → onElementClick(clickData.elemId, [row, col])

GridArea.tsx (handleElementClick → applyEventResult):
  result = await executeClickHandler(elemId, row, col)
  hydrate steps → setVisualTimeline(result.steps.map(s => s.visual))
  enter trace mode with mini-timeline

executor.ts (executeClickHandler):
  1. _exec_click_traced(elemId, row, col)  ← single Python call returns full result
  return { steps, handlers }
```

**Why handlers are re-fetched on every event:** Elements created inside handlers accumulate in `_registry` and may have their own handlers. `_serialize_handlers()` is called inside `_exec_click_traced` — re-fetching ensures dynamically created elements are immediately interactive. See [sharp-edges.md](./sharp-edges.md).

---

### Drag Dispatch Chain

**Files:** `Grid.tsx` → `GridArea.tsx` → `pythonExecutor.ts` → `event_handling.py`

```
Grid.tsx (GridSingleObject):
  onMouseDown → onElementDragStart(dragData.elemId, [row, col])

Grid.tsx (container onMouseMove):
  if dragStateRef set and cell changed and no call in flight:
    onElementDrag(elemId, [row, col])   ← fires on each new cell
    dragCallInFlightRef = true until Promise resolves

window mouseup listener (Grid useEffect):
  onElementDragEnd(elemId, [lastRow, lastCol])
  clear dragStateRef

GridArea.tsx (handleElementDrag{Start,/,End} → applyEventResult):
  result = await executeEventHandler('on_drag_{start|/|end}', elemId, row, col)
  hydrate snapshot → loadVisualBuilderObjects(hydrated)

pythonExecutor.ts (executeEventHandler):
  1. _handle_event_with_output(eventName, elemId, row, col)
  2. _serialize_visual_builder()
  3. _serialize_handlers_json()
```

**`position` semantics:** All three drag handlers receive the **absolute grid cell `(row, col)`** under the mouse — the same type as `on_click`. It is not relative to the element's origin.

**In-flight guard:** `dragCallInFlightRef` prevents queuing multiple simultaneous Pyodide calls during fast drags. If the mouse moves through several cells before the previous `on_drag` call returns, intermediate cells are skipped. The final position is always captured by `on_drag_end`.

**Window-level mouseup:** The `mouseup` listener is attached to `window` (not the grid container) so drag-end fires even if the mouse is released outside the grid.

---

### Handler Registry

**File:** `src/visual-panel/handlersState.ts`

```typescript
let handlers: Record<number, string[]> = {};
export function setHandlers(raw: Record<string, string[]>): void
export function hasHandler(elemId: number, handlerName: string): boolean
```

JSON object keys are always strings; `setHandlers` converts them to numbers to match `_elemId`. Updated after: initial trace, every click, every debug-call sub-run.

---

### z-Depth Ordering

Every element serializes a `z` integer (default `0`). Lower z = closer = rendered on top.

- Set via constructor: `Rect(..., z=5)` or post-construction: `r.z = 5` (before Analyze).
- `loadVisualBuilderObjects()` passes `z` through to `RenderableObjectData`.
- `Grid.tsx` sorts rendered objects by `z` descending before rendering, so lower-z objects are drawn last (on top).

---

### Animation

Smooth animations are enabled by an **`AnimationContext`** (`src/animation/animationContext.tsx`) boolean. A toggle button in the app header switches between **Animated** and **Jump** modes.

**React key stability:** Elements with a `_elemId` use `vb-elem-{id}` as their React key (instead of a sequential counter). This means React keeps the same DOM node across timeline steps and click-handler updates — a prerequisite for CSS transitions.

**What animates:**
- Position and size: `transition-all duration-300 ease-out` on `GridSingleObject` (the positioned wrapper div)
- Color and alpha: CSS transitions on SVG `fill`, `fill-opacity`, `stroke`, and `opacity` inside each shape renderer (`RectView`, `CircleView`, `ArrowView`, `LineView`, `LabelView`)
- Fade in/out: elements fade in on first mount (opacity 0 → 1) and fade out when `visible=false` (opacity transitions to 0 while staying in the DOM). Invisible elements get `pointerEvents: none`.

In Jump mode (animation off), all transitions are disabled for instant updates.

---

### Key Invariants

1. `_elem_id` (Python `int`) === `_elemId` (TypeScript `number`) — the only stable identity
2. `BasicShape` subclasses (`Rect`, `Circle`, `Arrow`) are clickable/draggable; `Line`, `Label`, `Array` are not
3. All positions in the serialized JSON are **absolute grid coordinates** — Python resolves panel-relative offsets before serialization
4. `_serialize_handlers()` returns a JSON string — called inside `_exec_click_traced` and returned as part of the result
5. Handlers are re-fetched after every event to support dynamically created elements
6. Lower `z` = closer to viewer = rendered on top
7. All event handlers (`on_click`, `on_drag_*`) receive absolute grid `(row, col)` — same type, same coordinate space

---

### Key Files Summary

| File | Purpose |
|------|---------|
| `src/python-engine/_vb_engine.py` | `VisualElem` (`_dirty`, `__setattr__` patch), `V` (`_count`), `R`, shapes |
| `src/python-engine/user_api.py` | User-facing shapes: `Rect`, `Circle`, `Arrow`, `Line`, `Label`, `Array`, `Array2D`, `Input` |
| `src/python-engine/vb_serializer.py` | `_serialize_visual_builder` (delta/full), `_serialize_handlers`, `_exec_click_traced`, etc. |
| `src/python-engine/executor.ts` | `executeClickHandler`/`executeDragHandler`/`executeInputChanged`; exports `RawVisual`, `VisualDelta` |
| `src/visual-panel/render-objects/BasicShape.ts` | `_elemId` bridge; clickable base class |
| `src/visual-panel/render-objects/line/Line.ts` | `Line` TypeScript class (implements `VisualBuilderElementBase`, not `BasicShape`) |
| `src/visual-panel/types/elementRegistry.ts` | Constructor registry by type string |
| `src/timeline/timelineState.ts` | `setVisualTimeline` (delta-aware Map-based hydration); `hydrateTimelineFromArray` / `hydrateTimelineFromJson` |
| `src/visual-panel/hooks/useGridState.ts` | `loadVisualBuilderObjects`; single-pass (positions are absolute); `clickData`/`dragData` assembly; z-sort |
| `src/visual-panel/handlersState.ts` | `setHandlers`; `hasHandler` |
| `src/app/GridArea.tsx` | Click + drag dispatch; `applyEventResult` snapshot re-hydration helper |
| `src/animation/animationContext.tsx` | `AnimationContext` boolean; Animated/Jump toggle |
