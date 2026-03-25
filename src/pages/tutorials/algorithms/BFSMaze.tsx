import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';
import { EmbedPreview } from '../EmbedPreview';

// ---------------------------------------------------------------------------
// Code samples
// ---------------------------------------------------------------------------

const codeBoard = `from collections import deque

BOARD_W, BOARD_H = 10, 8
BLOCK = -2
EMPTY = -1
board = [[-1] * BOARD_W for _ in range(BOARD_H)]
clear_board = True

def in_board(row, col):
    return (0 <= row < BOARD_H and 0 <= col < BOARD_W)

# Initial walls
for j in range(7):
    board[2][j+1] = BLOCK
    board[5][j+2] = BLOCK
    board[j][3] = BLOCK`;

const codeBFS = `def bfs(row, col):
    global clear_board
    if not (in_board(row, col) and board[row][col] == EMPTY and clear_board):
        return
    clear_board = False

    board[row][col] = 0
    # viz: update the visual board
    queue = deque([(row, col, 0)])
    while queue:
        r, c, dist = queue.popleft()
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if in_board(nr, nc) and board[nr][nc] == EMPTY:
                board[nr][nc] = dist + 1
                # viz: update the visual board
                queue.append((nr, nc, dist + 1))`;

const codePanelArray = `# @viz
panel = Panel(x=1, y=1)
arr = Array2D(cells=board, show_index=False, z=-1, color=(180, 220, 255))
panel.add(arr)
# @end`;

const codeVizCell = `class VizCell(Rect):
    def __init__(self, row: int, col: int, **kwargs):
        super().__init__(x=col, y=row, **kwargs)
        self.row = row
        self.col = col
        panel.add(self)

    def update(self):
        cell = board[self.row][self.col]
        self.alpha = 1 * (cell < 0)
        self.color = (0, 15, 30) if (cell == BLOCK) else (220, 225, 235)
        arr.cells = board

viz_board = [
    [VizCell(col=j, row=i) for j in range(BOARD_W)]
    for i in range(BOARD_H)
]

def update_viz_board():
    for row in range(BOARD_H):
        for col in range(BOARD_W):
            viz_board[row][col].update()

update_viz_board()`;

const codeOnClick = `class VizCell(Rect):
    # ...
    def on_click(self, x: int, y: int):
        bfs(y, x)`;

const codeClearBtn = `def empty_cells():
    global board, clear_board
    board = [
        [BLOCK if board[i][j] == BLOCK else EMPTY
         for j in range(BOARD_W)]
        for i in range(BOARD_H)
    ]
    clear_board = True
    # @viz
    update_viz_board()
    # @end

clear_btn = Rect(width=2, color=(100, 180, 130), y=BOARD_H+1, x=6)
clear_btn.on_click = lambda x, y: empty_cells()

panel.add(
    Label(label='clear', width=2, y=BOARD_H+1, x=6),
    clear_btn
)`;

const codeWallDrag = `def on_wall_drag(x: int, y: int, drag_type: str):
    if drag_type == 'start':
        drag_wall.x = x
        drag_wall.y = y
        drag_wall.alpha = 1
        return -1
    if drag_type == 'mid':
        drag_wall.x = x
        drag_wall.y = y
        return -1
    if drag_type == 'end':
        drag_wall.alpha = 0
        if in_board(y, x) and board[y][x] == EMPTY:
            board[y][x] = BLOCK
            viz_board[y][x].update()
            return x, y
        return -1

drag_wall = Rect(color=(120, 50, 65), alpha=0, z=-5, animate=False)
wall_source = Rect(color=(120, 50, 65), width=2, x=2, y=BOARD_H+1)
wall_source.on_drag = on_wall_drag
panel.add(drag_wall, wall_source,
          Label(label='drag wall', x=2, y=BOARD_H+1, width=2))`;

const codeVizCellDrag = `class VizCell(Rect):
    def __init__(self, row: int, col: int, **kwargs):
        super().__init__(x=col, y=row, **kwargs)
        self.row = row
        self.col = col
        self._is_dragging = False
        panel.add(self)

    # ...

    def on_drag(self, x: int, y: int, drag_type: str):
        if not clear_board:
            return
        if drag_type == 'start' and board[self.row][self.col] == BLOCK:
            self._is_dragging = True
            board[self.row][self.col] = EMPTY
            self.update()
            on_wall_drag(x, y, drag_type)
            return
        if not self._is_dragging:
            return
        val = on_wall_drag(x, y, drag_type)
        if drag_type == 'end' and val == -1:
            board[self.row][self.col] = BLOCK
            self.update()`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BFSMaze() {
  return (
    <div className="space-y-12">

      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
          Algorithm Walkthroughs
        </p>
        <h1 className={`${t.heading1} mb-3`}>BFS and Interactivity: Maze Explorer</h1>
        <p className={`${t.body} leading-relaxed`}>
          Breadth-first search is one of the most widely used graph algorithms — it
          underpins shortest-path routing, flood fill, reachability checks, and more. This
          example uses it as a vehicle to show the full interactivity toolkit: triggering
          an algorithm by clicking the canvas, dragging existing objects to new positions,
          and spawning entirely new objects through drag.
        </p>
      </div>

      {/* Embedded preview */}
      <EmbedPreview sample="interactive-bfs-maze" />

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Try this example</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            Open it in the editor, click a cell to run BFS, and drag walls to reshape the maze.
          </p>
        </div>
        <Link to="/?sample=interactive-bfs-maze" className={`shrink-0 ${t.btnPrimary}`}>
          Open in Editor →
        </Link>
      </div>

      {/* How to use */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>How to use this example</h2>
        <div className="space-y-3">
          {[
            {
              heading: 'Click an empty cell',
              body: 'Clicking a white cell starts BFS from that position. Use the timeline controls to step through how the algorithm spreads across the board.',
            },
            {
              heading: 'Back to interactive',
              body: 'After the trace finishes, press the "Back to interactive" button to return to interactive mode and try another starting cell or reshape the maze.',
            },
            {
              heading: 'Clear button',
              body: 'Clicking the green "clear" block below the board resets all filled distances back to empty. Walls are preserved. You can then click any cell to start a new BFS run.',
            },
            {
              heading: 'Drag walls',
              body: 'Drag any existing dark wall cell to move it — drop it on another empty cell to relocate it, or drag it outside the board to delete it. To create a new wall, drag the dark-red "drag wall" block at the bottom of the board.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} className={`${t.card} p-4`}>
              <h3 className={`${t.heading3} mb-1`}>{heading}</h3>
              <p className={t.bodySmall}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1 — Algorithm */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 1
          </p>
          <h2 className={`${t.heading2} mb-2`}>The algorithm</h2>
          <p className={t.muted}>
            We start with the pure algorithm — no visualization yet. The board is a 2D array
            where each cell holds one of three values: a wall marker, an empty marker, or a
            BFS distance once filled.
          </p>
        </div>

        <CodeBlock code={codeBoard} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Board values</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>BLOCK = -2</code> marks a wall,{' '}
              <code className={t.inlineCode}>EMPTY = -1</code> marks an open cell, and any
              non-negative integer is the BFS distance from the starting cell. Using sentinel
              values in the same array keeps the data model simple — no separate visited set
              needed.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>
              <code className="font-mono text-sm">clear_board</code> flag
            </h3>
            <p className={t.bodySmall}>
              BFS should only run on a fresh board. The{' '}
              <code className={t.inlineCode}>clear_board</code> flag is set to{' '}
              <code className={t.inlineCode}>False</code> once BFS starts and flipped back to{' '}
              <code className={t.inlineCode}>True</code> only when the board is explicitly
              cleared. This prevents accidental re-runs from additional clicks while the
              board already has distance values in it.
            </p>
          </div>
        </div>

        <p className={t.muted}>Next, the BFS itself:</p>

        <CodeBlock code={codeBFS} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Standard BFS</h3>
            <p className={t.bodySmall}>
              Each dequeued cell expands to its four neighbours. If a neighbour is inside
              the board and still empty, it gets assigned{' '}
              <code className={t.inlineCode}>dist + 1</code> and is added to the queue.
              Because BFS processes cells in order of increasing distance, the first time a
              cell is reached is always via the shortest path.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>
              <code className="font-mono text-sm"># viz:</code> placeholders
            </h3>
            <p className={t.bodySmall}>
              The two <code className={t.inlineCode}># viz:</code> comments mark exactly
              where visual updates will be added in Step 2 — once per cell assignment. For
              now, focus on the algorithm logic itself.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 — Visuals */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 2
          </p>
          <h2 className={`${t.heading2} mb-2`}>Building the visuals</h2>
          <p className={t.muted}>
            We start with a <code className={t.inlineCode}>Panel</code> to anchor everything,
            and an <code className={t.inlineCode}>Array2D</code> to display the board values.
          </p>
        </div>

        <CodeBlock code={codePanelArray} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Why no <code className="font-mono text-sm">V()</code> bindings</h3>
            <p className={t.bodySmall}>
              In previous examples, we used <code className={t.inlineCode}>V('expr')</code>{' '}
              to bind element properties to Python variables so they update automatically.
              Here the board has 80 cells — if we bound every cell with{' '}
              <code className={t.inlineCode}>V()</code>, the engine would re-evaluate all 80
              expressions after every single BFS step. Instead, we call{' '}
              <code className={t.inlineCode}>.update()</code> manually, only on the cells
              that actually changed. For large grids this makes a significant difference.
            </p>
          </div>
        </div>

        <p className={`${t.muted} mt-2`}>
          Next we create a <code className={t.inlineCode}>VizCell</code> — a{' '}
          <code className={t.inlineCode}>Rect</code> subclass that knows its position in the
          board and can sync its appearance from the board array on demand:
        </p>

        <CodeBlock code={codeVizCell} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>The alpha trick</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>self.alpha = 1 * (cell &lt; 0)</code> — cells
              with a non-negative value (reachable cells filled by BFS) become fully
              transparent, revealing the <code className={t.inlineCode}>Array2D</code>{' '}
              underneath which shows the actual distance number. Cells that are still empty
              or are walls stay opaque and show their own color.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Viz blocks inside BFS</h3>
            <p className={t.bodySmall}>
              Wherever <code className={t.inlineCode}>bfs()</code> writes a distance into the
              board array, we immediately follow it with a viz block that calls{' '}
              <code className={t.inlineCode}>viz_board[row][col].update()</code>. One viz
              block per cell assignment — each one produces a single timeline frame showing
              that cell being discovered.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 3 — Click events */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 3
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Click events with <code className="font-mono">on_click</code>
          </h2>
          <p className={t.muted}>
            Adding an <code className={t.inlineCode}>on_click</code> method to{' '}
            <code className={t.inlineCode}>VizCell</code> makes every cell on the board
            clickable. The signature is{' '}
            <code className={t.inlineCode}>(x, y)</code> — coordinates relative to the
            containing panel.
          </p>
        </div>

        <CodeBlock code={codeOnClick} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Coordinate convention</h3>
            <p className={t.bodySmall}>
              Inside the panel, <code className={t.inlineCode}>x</code> is the column and{' '}
              <code className={t.inlineCode}>y</code> is the row. Our BFS function takes{' '}
              <code className={t.inlineCode}>(row, col)</code>, so we pass{' '}
              <code className={t.inlineCode}>bfs(y, x)</code> — swapping the arguments to
              match the board's row-major layout.
            </p>
          </div>
        </div>

        <p className={`${t.muted} mt-2`}>
          The clear button uses a different way to attach a handler — assigning directly to
          a single instance instead of defining a class method:
        </p>

        <CodeBlock code={codeClearBtn} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Instance-level handler</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>clear_btn.on_click = lambda x, y: empty_cells()</code>{' '}
              sets the handler on one specific <code className={t.inlineCode}>Rect</code>,
              not on every <code className={t.inlineCode}>Rect</code>. This is the natural
              way to wire up one-off interactive elements without subclassing.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Label-then-button ordering</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>Label</code> is added to the panel before{' '}
              <code className={t.inlineCode}>clear_btn</code>. Since elements registered
              later take priority for clicks at the same position, the button receives the
              click and the label is just decorative text on top.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 4 — Drag events */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 4
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Drag events with <code className="font-mono">on_drag</code>
          </h2>
          <p className={t.muted}>
            The <code className={t.inlineCode}>on_drag</code> method signature is:
          </p>
          <ul className={`${t.muted} mt-2 ml-4 space-y-1 list-disc`}>
            <li>
              <code className={t.inlineCode}>x</code>,{' '}
              <code className={t.inlineCode}>y</code> — current cursor position, relative
              to the containing panel (or absolute if top-level)
            </li>
            <li>
              <code className={t.inlineCode}>drag_type</code> —{' '}
              <code className={t.inlineCode}>'start'</code> on mouse-down,{' '}
              <code className={t.inlineCode}>'mid'</code> while moving,{' '}
              <code className={t.inlineCode}>'end'</code> on mouse-up
            </li>
          </ul>
          <p className={`${t.muted} mt-3`}>
            We use it in two places. First, on the orange{' '}
            <code className={t.inlineCode}>wall_source</code> block below the board — dragging
            it creates a brand-new wall:
          </p>
        </div>

        <CodeBlock code={codeWallDrag} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>The ghost wall</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>drag_wall</code> is a hidden{' '}
              <code className={t.inlineCode}>Rect</code> ({' '}
              <code className={t.inlineCode}>alpha=0</code>) that becomes visible when the
              drag starts and follows the cursor during the drag. On mouse-up, it hides
              again. If the cursor lands on an empty board cell, a real wall is written into
              the board array and that cell's <code className={t.inlineCode}>VizCell</code>{' '}
              is updated. If the target cell is occupied or outside the board, nothing
              changes.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Instance-level handler again</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>wall_source.on_drag = on_wall_drag</code>{' '}
              assigns the handler to one specific object, exactly like the clear button's{' '}
              <code className={t.inlineCode}>on_click</code>. The source block itself never
              moves — it's just the drag target.
            </p>
          </div>
        </div>

        <p className={`${t.muted} mt-2`}>
          The second use of <code className={t.inlineCode}>on_drag</code> is on{' '}
          <code className={t.inlineCode}>VizCell</code> itself, which lets you drag existing
          wall cells around the board:
        </p>

        <CodeBlock code={codeVizCellDrag} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Only walls are draggable</h3>
            <p className={t.bodySmall}>
              On <code className={t.inlineCode}>'start'</code>, the handler checks whether
              the clicked cell is actually a wall. Empty cells return immediately — only
              wall cells set <code className={t.inlineCode}>_is_dragging = True</code> and
              begin the drag. This ensures clicking an empty cell triggers{' '}
              <code className={t.inlineCode}>on_click</code> (BFS), not a drag.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Delegating to <code className="font-mono text-sm">on_wall_drag</code></h3>
            <p className={t.bodySmall}>
              Once a wall drag is confirmed, <code className={t.inlineCode}>VizCell.on_drag</code>{' '}
              delegates all cursor tracking and placement logic to{' '}
              <code className={t.inlineCode}>on_wall_drag</code> — the same function used by
              the source block. On drop, if{' '}
              <code className={t.inlineCode}>on_wall_drag</code> returns{' '}
              <code className={t.inlineCode}>-1</code> (placement failed or landed
              outside the board), the wall is restored to its original cell.
            </p>
          </div>
        </div>

        <div className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-r-lg mt-2">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
            Drag ownership
          </p>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
            In both cases, the drag begins on the object with{' '}
            <code className="font-mono text-xs">on_drag</code>, but mouse events continue
            firing to that same handler even as the cursor moves over other cells or leaves
            the board entirely. The drag is "owned" by the original object for its entire
            lifetime. This is why <code className="font-mono text-xs">drag_wall</code> can
            follow the cursor across the whole canvas — it's being moved by the handler of
            whichever object initiated the drag, not by the cell currently under the cursor.
          </p>
        </div>
      </section>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials/algorithms/trapping-rain" className={t.linkMuted}>← Trapping Rain</Link>
      </div>

    </div>
  );
}
