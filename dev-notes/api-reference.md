# Combined Editor — Python API Reference

[← dev-notes](./dev-notes.md)

Quick reference for writing `combinedCode` in sample JSON files. Check this before writing any sample. Update it when you discover new patterns or verify uncertain behavior.

**Source of truth:** `src/components/combined-editor/user_api.py` and `src/api/functionsSchema.ts`

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
- `x` = col, `y` = row
- If element is **inside a Panel**: `(x, y)` is **relative to the panel's top-left**
- If element is **top-level**: `(x, y)` is **absolute grid coordinates**
- Return `None` (stay in interactive mode)

### `on_drag(self, x, y, drag_type)`
- Called when user drags the element
- `x` = col, `y` = row — **always absolute**, regardless of Panel containment
- `drag_type`: `'start'` (mouse-down), `'mid'` (each new cell entered), `'end'` (mouse-up)
- Return `None`
- Set `animate=False` for snap-to-cursor behavior (no slide)

```python
class DragRect(Rect):
    def on_drag(self, x, y, drag_type):
        self.x = x
        self.y = y
```

> **Note:** `RunCall` and `DebugCall` exist in `user_api.py` but are considered legacy. Do not use them in new samples.

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

Lower `z` = rendered on **top** (drawn last).

```python
Rect(z=0)   # on top
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
# @end   ← always takes a snapshot
```

- Every `# @viz` needs a matching `# @end` at the same indentation
- No nesting allowed
- Snapshot triggers: `# @end` (always) and any V() value change outside a viz block
- Preprocessed before exec: `# @viz` → `__viz_begin__()`, `# @end` → `__viz_end__(dict(locals()))`

---

## Coordinate System Summary

| Context | `x` | `y` |
|---------|-----|-----|
| Shape constructor | col | row |
| `on_click` (top-level) | col (absolute) | row (absolute) |
| `on_click` (inside Panel) | col (panel-relative) | row (panel-relative) |
| `on_drag` (any) | col (absolute) | row (absolute) |

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
