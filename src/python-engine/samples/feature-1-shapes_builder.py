# ── Basic Shapes Demo ─────────────────────────────────────────────────────────
# Rect, Circle, Arrow, and Line — with their main properties.
#
# All shapes share:
#   position = (row, col)   — top-left of the bounding box
#   width, height           — size in grid cells (default 1×1)
#   color = (r, g, b)       — RGB fill, 0–255 per channel
#   visible                 — True/False; False fades the shape out
#   alpha                   — opacity 0.0–1.0
#   z                       — depth: lower z draws on top of higher z
# ─────────────────────────────────────────────────────────────────────────────

# ── Rect ──────────────────────────────────────────────────────────────────────
Label(label='Rect', position=(1, 1))

# Default: 1×1 green
Rect(position=(2, 1))

# Dimension: 2 cells wide, 3 cells tall, red
Rect(position=(2, 3), width=2, height=3, color=(239, 68, 68))

# Translucent: alpha must be set after construction
r_alpha = Rect(position=(4, 1), color=(90, 150, 220), width = 4)
r_alpha.alpha = 0.4

# ── Circle ────────────────────────────────────────────────────────────────────
Label(label='Circle', position=(1, 9))

# Default: 1×1 blue
Circle(position=(2, 9))

# Larger bounding box → bigger circle; orange
Circle(position=(2, 11), width=2, height=2, color=(251, 146, 60))

# Non-square bounding box → ellipse; pink
Circle(position=(4, 9), width=3, height=1, color=(236, 72, 153))

# ── Arrow ─────────────────────────────────────────────────────────────────────
Label(label='Arrow  (angle)', position=(7, 1))
Arrow(position=(8, 1), angle=Arrow.UP)
Arrow(position=(8, 2), angle=Arrow.RIGHT)
Arrow(position=(9, 1), angle=Arrow.DOWN)
Arrow(position=(9, 2), angle=Arrow.LEFT)

Label(label='Arrow  (custom angle)', position=(7, 5))
Arrow(position=(8, 5), angle=-45)
Arrow(position=(8, 6), angle=45)
Arrow(position=(9, 5), angle=225)
Arrow(position=(9, 6), angle=135)

# ── Line ──────────────────────────────────────────────────────────────────────
Label(label='Line', position=(7, 10))

# Lines use start/end cell coordinates, not position+width+height.
# end_cap: 'arrow' (default) or 'none'
# start_cap: 'none' (default) or 'arrow'
Line(start=(8, 9), end=(8, 14))                                        # one arrow head
Line(start=(9, 9), end=(9, 14), end_cap='none')                        # no heads
Line(start=(10, 9), end=(10, 14), start_cap='arrow', end_cap='arrow')    # both heads

# Diagonal line with custom thickness
Line(start=(12, 9), end=(15, 11), stroke_weight=13, color=(99, 102, 241))

# end_offset controls where the endpoint anchors inside the target cell:
#   (0, 0) = top-left corner   (0.5, 0.5) = center (default)   (0, 1) = bottom-left
Line(start=(13, 12), end=(13, 14), end_cap='arrow', end_offset=(0,   0  ))  # top-left
Line(start=(13, 12), end=(13, 14), end_cap='arrow', end_offset=(0.5, 0.5))  # center
Line(start=(13, 12), end=(13, 14), end_cap='arrow', end_offset=(0,   1  ))  # bottom-left

# ── z-depth: overlapping shapes ───────────────────────────────────────────────
# Lower z value → rendered on top of shapes with higher z.
Label(label='z-depth  (lower z = on top)', position=(11, 1), width = 6)

# A 2×2 blue rect in the middle
bg = Rect(position=(12, 3), width=2, height=2, color=(100, 130, 220), z=0)

# Circle near the top-left edge with z=-1  →  drawn IN FRONT of the rect
front = Circle(position=(12, 2), width=2, height=2, color=(251, 191, 36), z=-1)

# Circle near the bottom-right edge with z=1  →  drawn BEHIND the rect
back = Circle(position=(13, 3), width=2, height=2, color=(239, 68, 68), z=1)

Label(label='z=-1  front', position=(13, 1), color=(251, 191, 36))
Label(label='z=0   mid',   position=(13, 5), color=(100, 130, 220))
Label(label='z=+1  back',  position=(15, 3), color=(239, 68, 68))
