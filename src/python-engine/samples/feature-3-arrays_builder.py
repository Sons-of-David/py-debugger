# ── Arrays Demo ───────────────────────────────────────────────────────────────
# Array   — 1-D sequence of cells laid out in one direction.
# Array2D — 2-D grid of cells.
#
# Array properties:
#   cells      — Python list to display
#   direction  — 'right' (default), 'left', 'up', or 'down'
#   name       — optional label shown above the array
#   color      — RGB fill colour
#
# Array2D properties:
#   cells        — list-of-lists
#   rectangular  — True (default): pad short rows with empty cells
#                  False: only draw cells that exist in the data
#   name         — optional label shown above the grid
# ─────────────────────────────────────────────────────────────────────────────

# ── 1-D arrays — all four directions ──────────────────────────────────────────
Label(label='right', position=(1,1))
right = Array(cells=[10, 20, 30, 40, 50], position=(2, 1), direction='right', name='title')
Label(label='left',  position=(3, 5))
left  = Array(cells=[10, 20, 30, 40, 50], position=(4, 5), direction='left')
Label(label='down',  position=(6, 1))
down  = Array(cells=[10, 20, 30],         position=(6, 2), direction='down')
Label(label='up',    position=(8, 4))
up    = Array(cells=[10, 20, 30],         position=(8, 5), direction='up')

# ── 2-D arrays ────────────────────────────────────────────────────────────────
# Uniform grid — all rows have the same length.
grid = Array2D(
    cells=[[1, 2, 3],
         [4, 5, 6],
         [7, 8, 9]],
    position=(1, 7),
    name='grid'
)

# Jagged — rectangular=True (default): short rows are padded with empty cells.
jagged_rect = Array2D(
    cells=[[1, 2, 3],
         [4, 5],
         [6]],
    position=(6, 7),
    name='jagged (rect)',
    color=(100, 180, 100)
)

# Jagged — rectangular=False: only cells that exist in the data are drawn.
jagged_clip = Array2D(
    cells=[[1, 2, 3],
         [4, 5],
         [6]],
    position=(6, 11),
    name='jagged (clip)',
    rectangular=False,
    color=(100, 150, 220)
)
