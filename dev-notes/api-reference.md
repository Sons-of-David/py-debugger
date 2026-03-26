# Combined Editor — Python API Reference

[← dev-notes](./dev-notes.md)

Quick reference for writing `code` in sample JSON files (in `src/samples`). Check this before writing any sample. Update it when you discover new patterns or verify uncertain behavior.

**Source of truth:** `src/python-engine/user_api.py` and `src/api/functionsSchema.ts`

---

## Shapes

All shapes share: `x` (col), `y` (row), `width`, `height`, `visible`, `alpha`, `z`, `animate`.

| Shape | Constructor defaults | Notes |
|-------|---------------------|-------|
| `Rect(x, y, width=1, height=1, color=(34,197,94), visible=True, alpha=1.0, z=0, animate=True)` | green 1×1 | Clickable/draggable |
| `Circle(x, y, width=1, height=1, color=(59,130,246), ...)` | blue 1×1 | Clickable/draggable |
| `Arrow(x, y, width=1, height=1, color=(16,185,129), angle=0, ...)` | green, pointing up | Clickable/draggable. `Arrow.UP=0`, `RIGHT=90`, `DOWN=180`, `LEFT=270` |
| `Label(label='', x, y, width=1, height=1, font_size=14, color=None, ...)` | empty text | **Not clickable/draggable** |
| `Panel(name='', x, y, width=1, height=1, show_border=False, ...)` | transparent container | Children use relative coords. See below. |
| `Input(x, y, width=3, height=1, color=(99,102,241), value='', placeholder='', ...)` | text input | Has `input_changed(text)` and `get_input()` |
| `Line(start=(0,0), end=(1,1), color=(239,68,68), stroke_weight=2, start_cap='none', end_cap='arrow', start_offset=(0.5,0.5), end_offset=(0.5,0.5), z=0)` | directed line | `start`/`end` are `(row, col)` tuples. `start_cap`/`end_cap`: `'none'` or `'arrow'`. `*_offset`: `(x,y)` 0–1 anchor within the target cell. **Not clickable/draggable** |

### `delete()`
All shapes: `elem.delete()` removes from canvas and parent panel.

### Panel
```python
panel = Panel(x=2, y=1)
panel.add(rect, label)   # children use positions relative to panel top-left
panel.remove(rect)       # removes from panel (does not delete)
panel.delete()           # deletes panel and all children
```

Panel subclasses **can** have `on_click` — set it as an instance attribute or define it as a method on the subclass.

---

## Event Handlers

### `on_click(self, x, y)`
- Called when user clicks the element in interactive mode
- `x` = col, `y` = row — relative to the containing Panel; absolute if top-level
- Return `None`

### `on_drag(self, x, y, drag_type)`
- Called when user drags the element
- `x` = col, `y` = row — same rule as `on_click`: relative to the containing Panel; absolute if top-level
- `drag_type`: `'start'` (mouse-down), `'mid'` (each new cell entered), `'end'` (mouse-up)
- Return `None`
- Set `animate=False` for snap-to-cursor behavior (no slide)

```python
class DragRect(Rect):
    def on_drag(self, x, y, drag_type):
        self.x = x
        self.y = y
```

### `no_debug(fn)`
- Wraps a function so it runs without tracing (no timeline steps produced)
- Use for event handlers that should modify state silently

```python
class Btn(Rect):
    def on_click(self, x, y):
        no_debug(sort)(arr)   # sort runs silently, no new timeline
```

### Interaction limits
- Only `Rect`, `Circle`, `Arrow` subclasses **and Panel subclasses** support `on_click` / `on_drag`
- `Label`, `Array`, `Array2D` are **never** clickable or draggable (no `_elemId` in TypeScript)

---

## Interaction Priority (objects-map rule)

`loadVisualBuilderObjects` stores **one entry per absolute cell position**. The element created **last** (highest `_elem_id`) wins that cell's click/drag registration.

**Rule:** create backgrounds and labels **before** interactive elements at the same position.

```python
# ✓ Correct: label first, button second — button wins the cell, is clickable
Label(label='go', x=3, y=1, z=1)
class Btn(Rect):
    def on_click(self, x, y): ...
Btn(x=3, y=1, z=0)     # created last → wins → clickable

# ✗ Wrong: button first, label second — label overwrites button's entry → not clickable
```

When a `WallBlock` is placed on a board cell, it overwrites the cell's Panel entry → the cell becomes draggable instead of clickable. When the block is deleted, the cell Panel entry is restored.

---

## Z-ordering

Lower `z` = rendered on **top** (drawn last). Negative values are valid — `z=-1` draws in front of `z=0`.

```python
Rect(z=-1)  # furthest in front
Rect(z=0)   # on top (default)
Rect(z=5)   # behind
Rect(z=10)  # furthest back
```

---

## V() Expressions

```python
V("expr", default=None)
```

- Wrap a string expression to evaluate lazily at each timeline step
- `expr` is evaluated against current debugger variable values
- Falls back to `default` if `expr` references an undefined variable
- Use for reactive element properties; pre-initialize referenced variables above the `# @viz` block

```python
i = 0
# @viz
rect = Rect(width=V('i'), x=2, y=1)
# @end
for i in range(5):  # rect.width updates automatically
    pass
```

---

## Viz Block Rules

```python
# @viz
# ... element setup code ...
# V() change detection is paused inside here
# @end   ← takes a snapshot only if elements exist
```

- Every `# @viz` needs a matching `# @end` at the same indentation
- No nesting allowed
- Snapshot triggers: `# @end` (when visual elements exist) and any V() value change outside a viz block
- If no visual elements are registered when `# @end` is reached, the snapshot is silently skipped — use this to define classes or helpers in a viz block without polluting the timeline
- Preprocessed before exec: `# @viz` → `__viz_begin__()`, `# @end` → `__viz_end__(dict(locals()))`

---

## Coordinate System Summary

`x` and `y` coordinate are always relative to the containing panel, and if there
isn't such, then to the top left corner of the grid.

---

## Sample Architecture: Algorithm / Visual Separation

For interactive samples, keep algorithm state separate from visual elements.

### Where things live

| What | Where |
|------|-------|
| Algorithm data structures (`grid`, `graph`, arrays) | **Outside** `# @viz` — plain Python |
| Algorithm functions (`set_block`, `do_bfs`, `clear`) | **Outside** `# @viz` |
| Visual layout constants (`BOARD_X`, `BOARD_Y`, colors) | **Inside** `# @viz` |
| Element creation and class definitions | **Inside** `# @viz` |

### Updating visuals from event handlers

After an event handler returns, the system **automatically re-serializes all element properties**. There is no explicit "refresh" call. Just mutate element properties directly:

```python
# Algorithm function — mutates state AND updates element properties
def set_block(r, c):
    grid[r][c] = -2                  # update algorithm state
    cells[r][c].sync(-2)             # update visual properties

def do_bfs(start_r, start_c):
    # ... BFS logic on grid ...
    for r in range(ROWS):            # sync all visuals after BFS
        for c in range(COLS):
            cells[r][c].sync(grid[r][c])
```

**No refresh calls, no viz blocks in handlers.** The system picks up all property changes automatically.

### V() vs direct mutation

- **`V('expr')`** — for trace-mode samples where element properties should track algorithm variables step by step during the initial trace
- **Direct mutation** (`elem.color = X`) — for interactive-mode samples where event handlers drive visual changes

### Elements as views over algorithm state

```python
class Cell(Panel):
    def sync(self, val):
        """Map algorithm value to visual state. -2=wall, -1=empty, 0+=BFS dist."""
        if val == -2:   self._bg.color = WALL_COLOR;  self._lbl.label = ''
        elif val == -1: self._bg.color = EMPTY_COLOR; self._lbl.label = ''
        elif val == 0:  self._bg.color = START_COLOR; self._lbl.label = '0'
        else:           self._bg.color = FILL_COLOR;  self._lbl.label = str(val)
```

### Converting drag coordinates to another panel's space

If a dragged element is **top-level** (not inside the target panel), `x, y` are absolute. Subtract the target panel's position to get panel-relative coords:
```python
# board Panel is at absolute (BOARD_X, BOARD_Y); dragged block is top-level
def on_drag(self, x, y, drag_type):
    r = y - board.y   # board-relative row
    c = x - board.x   # board-relative col
```
If the dragged element **is** a child of the panel, `x, y` are already panel-relative — no conversion needed.

---

## Common Patterns

### Clickable button
```python
class Btn(Rect):
    def on_click(self, x, y):
        do_something()

Label(label='go', x=3, y=1, z=1)   # label first
btn = Btn(x=3, y=1, z=0)           # button last → wins map entry
```

### Cell with embedded label (Panel subclass)
```python
class Cell(Panel):
    def __init__(self, row, col):
        super().__init__(x=col, y=row, width=1, height=1)
        self._bg  = Rect(width=1, height=1, color=BG_COLOR, z=5)
        self._lbl = Label(label='', width=1, height=1, font_size=11, z=4)
        self.add(self._bg, self._lbl)

    def on_click(self, x, y):
        handle_click(self)
```

### Snap-to-grid drag
```python
class Block(Rect):
    def on_drag(self, x, y, drag_type):
        self.x = x
        self.y = y  # snaps immediately (animate=False)

Block(x=2, y=3, animate=False)
```

### Standard text box style

Algorithm-explanation text boxes use this canonical style (reference: `2-binary-search.json`):

```
bgColor:          #444444
Title:            color #ffb43f (gold),   24px, bold
Section labels:   color #ff8c82 (salmon)  — "Problem"
                  color #96d35f (green)   — "Algorithm"
                  18px, bold
Body text:        color #d6d6d6 (light gray), 16px
Inline highlights: color #74a7fe (blue),  16px
```

Section label lines use a colored bold span followed by a plain `":"` in a separate text run (no color on the colon).

---

### Spawning element on drag (source block pattern)
```python
class Source(Rect):
    def on_drag(self, x, y, drag_type):
        if drag_type == 'start':
            self._child = Block(x=x, y=y)
        elif drag_type == 'mid' and self._child:
            self._child.x = x; self._child.y = y
        elif drag_type == 'end' and self._child:
            place_or_delete(self._child, x, y)
            self._child = None
```
