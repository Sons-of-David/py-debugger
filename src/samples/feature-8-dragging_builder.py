# ── Drag Demo ─────────────────────────────────────────────────────────────────
# Implementing on_drag on a shape makes it draggable in interactive mode.
#
#   on_drag(self, position, drag_type)
#       position   — (row, col) absolute grid cell of the current mouse position
#                    (unlike on_click, this is NOT relative to the containing panel)
#       drag_type  — 'start' (mouse-down), 'mid' (mouse moving), or 'end' (mouse-up)
#
# animate = False: shape snaps to the cursor cell immediately (no slide animation).
# ─────────────────────────────────────────────────────────────────────────────

TARGET_ROW, TARGET_COL, TARGET_SIZE = 2, 6, 3

target = Rect(
    position = (TARGET_ROW, TARGET_COL),
    width = TARGET_SIZE,
    height = TARGET_SIZE,
    color = (180, 180, 180)
)

class DragSquare(Rect):

    def on_drag(self, position: tuple[int, int], drag_type: str):
        self.position = position
        if drag_type == 'start':
            target.color = (255, 220, 0)       # yellow — drag started
        elif drag_type == 'end':
            target.color = (180, 180, 180)     # grey   — drag ended
        else:
            row, col = position
            inside = (
                TARGET_ROW <= row < TARGET_ROW + TARGET_SIZE and
                TARGET_COL <= col < TARGET_COL + TARGET_SIZE
            )
            target.color = (34, 197, 94) if inside else (251, 146, 60)  # green / orange

small = DragSquare()
small.position = (2, 2)
small.color = (99, 102, 241)
small.animate = False  # snap to cursor cell; no slide animation
