import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';

import panelViz   from '../media/panel_visualization.png';
import rectViz    from '../media/rect_visualization.png';
import circleViz  from '../media/circle_visualization.png';
import arrowViz   from '../media/arrow_visualization.png';
import lineViz    from '../media/line_visualization.png';
import arrayViz   from '../media/array_visualization.png';

// ── Panel ─────────────────────────────────────────────────────────────────────
const panelCode = `# Panel groups child shapes at relative positions.
panel = Panel(x=2, y=1)      # x = col, y = row

rect = Rect(x=0, y=0, width=3, height=2, color=(80, 180, 120))
label = Label(label='hello', x=1, y=0)
panel.add(rect, label)

# Moving the panel shifts everything inside.
panel.x = 5`;

// ── Rect ─────────────────────────────────────────────────────────────────────
const rectCode = `# Static rectangle
rect = Rect(x=4, y=2, width=2, height=3, color=(220, 80, 80))
panel.add(rect)

# Rectangle whose height tracks a variable (updates at each step)
bar = Rect(
    x=V('i'),
    y=0,
    width=1,
    height=V('arr[i]'),
    color=(100, 160, 240),
    alpha=0.8
)
panel.add(bar)`;

// ── Circle ────────────────────────────────────────────────────────────────────
const circleCode = `# Fixed circle — bounding box 2×2
dot = Circle(x=2, y=1, width=2, height=2, color=(60, 130, 240))
panel.add(dot)

# Ellipse when width ≠ height
ellipse = Circle(x=0, y=4, width=3, height=1, color=(236, 72, 153))
panel.add(ellipse)

# Cursor that follows the current index
cursor = Circle(x=V('i'), y=0, color=(255, 180, 0), alpha=0.6)
panel.add(cursor)`;

// ── Arrow ─────────────────────────────────────────────────────────────────────
const arrowCode = `# Arrow pointing down at column i
ptr = Arrow(
    x=V('i'),
    y=0,
    angle=Arrow.DOWN,
    color=(0, 100, 220)
)
panel.add(ptr)

# Constants: Arrow.UP=0  Arrow.RIGHT=90  Arrow.DOWN=180  Arrow.LEFT=270`;

// ── Label & Line ──────────────────────────────────────────────────────────────
const labelLineCode = `# Text label — not clickable
lbl = Label(label='sorted', x=6, y=0, color=(80, 80, 80))
panel.add(lbl)

# Line between two absolute grid positions (not added to a panel)
divider = Line(
    start=(2, 5), end=(8, 5),
    color=(160, 160, 160),
    stroke_weight=2,
    end_cap='arrow'          # 'none' or 'arrow'
)`;

// ── Array ─────────────────────────────────────────────────────────────────────
const arrayCode = `# 1-D array — cells update automatically at each step
arr_view = Array(cells=V('arr'), x=0, y=1)
panel.add(arr_view)

# Vertical layout
stack = Array(cells=V('stack'), direction='down', x=8, y=0)
panel.add(stack)

# 2-D array (grid / matrix)
matrix = Array2D(cells=V('grid'), x=0, y=3)
panel.add(matrix)`;

export function VisualElements() {
  return (
    <div className="space-y-12">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Features</p>
        <h1 className={`${t.heading1} mb-3`}>Visual Elements</h1>
        <p className={`${t.body} leading-relaxed`}>
          Viz blocks in your code declare and update visual elements that live on the 50×50 grid. Each
          element is a Python object whose properties can be set directly or bound to algorithm variables via{' '}
          <code className={t.inlineCode}>V("expr")</code>, so the visualization stays in sync
          with the trace automatically.
        </p>
        <p className={`${t.muted} mt-3 leading-relaxed`}>
          For the full constructor signatures, defaults, and options see the{' '}
          <strong className={t.strong}>API Reference</strong> panel inside the editor — click the
          blue <em>API</em> button in the top-right of the visual panel.
          Every shape, property, and handler is listed there.
        </p>
      </div>

      {/* ── PANELS ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Panels</h2>
        <p className={`${t.muted} mb-4 leading-relaxed`}>
          A <code className={t.inlineCode}>Panel</code> is a container. Give it an{' '}
          <code className={t.inlineCode}>x</code> / <code className={t.inlineCode}>y</code>{' '}
          position on the grid, then call <code className={t.inlineCode}>panel.add(elem)</code>{' '}
          to attach children. Children specify positions <em>relative</em> to the panel's
          top-left corner — move the panel and everything inside moves with it.
          Set <code className={t.inlineCode}>show_border=True</code> to draw a dashed outline
          and name label, useful while building layouts.
        </p>
        <CodeBlock code={panelCode} />
        <figure className="mt-4">
          <img
            src={panelViz}
            alt="Panel visualization example"
            className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-64"
          />
          <figcaption className={`${t.muted} text-xs mt-2 text-center`}>
            Panels with and without borders, and direct placement for comparison.
          </figcaption>
        </figure>
        <div className={`mt-4 ${t.ctaBanner}`}>
          <div className="flex-1">
            <p className={t.ctaTitle}>Panels sample</p>
            <p className={`${t.ctaSubtitle} mt-0.5`}>
              Side-by-side: direct placement vs. panel-relative positioning, border and min-size options.
            </p>
          </div>
          <a href="/?sample=feature-2-panels" className={`shrink-0 ${t.btnPrimary}`}>
            Open in Editor →
          </a>
        </div>
      </section>

      {/* ── BASIC SHAPES ──────────────────────────────────────────────────── */}
      <section>
        <h2 className={`${t.heading2} mb-4`}>Basic Shapes</h2>

        {/* Rect */}
        <div className="space-y-4 mb-8">
          <div>
            <h3 className={`${t.heading3} mb-1`}>Rect</h3>
            <p className={`${t.muted} mb-3 leading-relaxed`}>
              A filled rectangle spanning <code className={t.inlineCode}>width × height</code> grid
              cells. Use it for bar charts, highlighted regions, or sorted-boundary markers.{' '}
              <strong className={t.strong}>Clickable and draggable</strong> in interactive mode
              (subclass and add <code className={t.inlineCode}>on_click</code> /{' '}
              <code className={t.inlineCode}>on_drag</code>).
            </p>
            <CodeBlock code={rectCode} />
            <figure className="mt-3">
              <img
                src={rectViz}
                alt="Rect visualization example"
                className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-48"
              />
            </figure>
          </div>

          {/* Circle */}
          <div>
            <h3 className={`${t.heading3} mb-1`}>Circle</h3>
            <p className={`${t.muted} mb-3 leading-relaxed`}>
              A filled circle inscribed in its bounding box. When{' '}
              <code className={t.inlineCode}>width ≠ height</code> it becomes an ellipse.
              Good for nodes in graph and tree visualizations.{' '}
              <strong className={t.strong}>Clickable and draggable.</strong>
            </p>
            <CodeBlock code={circleCode} />
            <figure className="mt-3">
              <img
                src={circleViz}
                alt="Circle visualization example"
                className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-48"
              />
            </figure>
          </div>

          {/* Arrow */}
          <div>
            <h3 className={`${t.heading3} mb-1`}>Arrow</h3>
            <p className={`${t.muted} mb-3 leading-relaxed`}>
              A directional arrow shape. Set <code className={t.inlineCode}>angle</code> in degrees
              clockwise from up, or use the{' '}
              <code className={t.inlineCode}>Arrow.UP / DOWN / LEFT / RIGHT</code> constants.
              Commonly used to track pointer variables.{' '}
              <strong className={t.strong}>Clickable and draggable.</strong>
            </p>
            <CodeBlock code={arrowCode} />
            <figure className="mt-3">
              <img
                src={arrowViz}
                alt="Arrow visualization example"
                className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-48"
              />
            </figure>
          </div>

          {/* Label & Line */}
          <div>
            <h3 className={`${t.heading3} mb-1`}>Label and Line</h3>
            <p className={`${t.muted} mb-3 leading-relaxed`}>
              <code className={t.inlineCode}>Label</code> renders a text string on the grid.{' '}
              <code className={t.inlineCode}>Line</code> draws a straight line between two absolute
              grid positions given as <code className={t.inlineCode}>(row, col)</code> tuples.
              Neither is clickable or draggable.
            </p>
            <CodeBlock code={labelLineCode} />
            <figure className="mt-3">
              <img
                src={lineViz}
                alt="Line and Label visualization example"
                className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-48"
              />
            </figure>
            <div className={`mt-3 ${t.card} p-4`}>
              <h4 className={`${t.heading3} mb-1`}>Line caps and offsets</h4>
              <p className={t.bodySmall}>
                <code className={t.inlineCode}>start_cap</code> and{' '}
                <code className={t.inlineCode}>end_cap</code> accept{' '}
                <code className={t.inlineCode}>"none"</code> or{' '}
                <code className={t.inlineCode}>"arrow"</code>.{' '}
                <code className={t.inlineCode}>start_offset</code> /{' '}
                <code className={t.inlineCode}>end_offset</code> are{' '}
                <code className={t.inlineCode}>(x, y)</code> fractions (0–1) that shift
                the endpoint within its cell.
              </p>
            </div>
          </div>
        </div>

        {/* Sample CTA for basic shapes */}
        <div className={t.ctaBanner}>
          <div className="flex-1">
            <p className={t.ctaTitle}>Basic shapes sample</p>
            <p className={`${t.ctaSubtitle} mt-0.5`}>
              All shapes with labelled examples: sizes, colors, alpha, and V() bindings.
            </p>
          </div>
          <a href="/?sample=feature-1-shapes" className={`shrink-0 ${t.btnPrimary}`}>
            Open in Editor →
          </a>
        </div>
      </section>

      {/* ── ARRAYS ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Arrays</h2>
        <p className={`${t.muted} mb-4 leading-relaxed`}>
          <code className={t.inlineCode}>Array</code> renders a 1-D list as a row of labeled
          cells. <code className={t.inlineCode}>Array2D</code> renders a 2-D list as a grid.
          Pass <code className={t.inlineCode}>cells=V("arr")</code> so the display automatically
          reflects the current state of the variable at every step.{' '}
          <strong className={t.strong}>Arrays are display-only</strong> — they are not clickable
          or draggable.
        </p>
        <CodeBlock code={arrayCode} />
        <figure className="mt-4">
          <img
            src={arrayViz}
            alt="Array and Array2D visualization example"
            className="rounded-lg border border-gray-200 dark:border-gray-700 w-full object-contain max-h-100"
          />
          <figcaption className={`${t.muted} text-xs mt-2 text-center`}>
            1-D arrays in all four directions, a uniform 2-D grid, and a jagged Array2D.
          </figcaption>
        </figure>
        <div className="mt-4 space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Array options</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>direction</code> — <code className={t.inlineCode}>"right"</code> (default),{' '}
              <code className={t.inlineCode}>"left"</code>,{' '}
              <code className={t.inlineCode}>"down"</code>, or{' '}
              <code className={t.inlineCode}>"up"</code>.{' '}
              <code className={t.inlineCode}>show_index=False</code> hides the index labels.{' '}
              <code className={t.inlineCode}>name="label"</code> adds a title above the array.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Array2D options</h3>
            <p className={t.bodySmall}>
              Pass a list-of-lists to <code className={t.inlineCode}>cells</code>. Set{' '}
              <code className={t.inlineCode}>rectangular=False</code> to skip empty padding
              on jagged rows (rows of different lengths).{' '}
              <code className={t.inlineCode}>name</code> adds a title above the grid.
            </p>
          </div>
        </div>
        <div className={`mt-4 ${t.ctaBanner}`}>
          <div className="flex-1">
            <p className={t.ctaTitle}>Arrays sample</p>
            <p className={`${t.ctaSubtitle} mt-0.5`}>
              1-D arrays in all four directions, uniform and jagged 2-D grids.
            </p>
          </div>
          <a href="/?sample=feature-3-arrays" className={`shrink-0 ${t.btnPrimary}`}>
            Open in Editor →
          </a>
        </div>
      </section>

      {/* ── SHARED PROPERTIES ─────────────────────────────────────────────── */}
      <section>
        <h2 className={`${t.heading2} mb-2`}>Shared properties</h2>
        <div className={`border ${t.divider} rounded-lg overflow-hidden`}>
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
            <p className={`text-xs font-semibold ${t.muted} uppercase tracking-wider`}>
              Available on all shape elements
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[
              { prop: 'x, y',    desc: 'Column and row position on the grid (or relative to the parent panel).' },
              { prop: 'width, height', desc: 'Size in grid cells. Default 1×1.' },
              { prop: 'color',   desc: 'RGB fill as a (r, g, b) tuple, 0–255 per channel.' },
              { prop: 'visible', desc: 'Show or hide the element without removing it.' },
              { prop: 'alpha',   desc: 'Opacity from 0.0 (transparent) to 1.0 (opaque).' },
              { prop: 'z',       desc: 'Depth layer — lower z renders on top of higher z. Default 0.' },
              { prop: 'animate', desc: 'Set to False to skip the transition animation for instant updates.' },
            ].map(({ prop, desc }) => (
              <div key={prop} className="grid grid-cols-[1fr_220px] gap-4 items-start px-4 py-2">
                <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{prop}</code>
                <span className={`${t.muted} italic`}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>See elements in context</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            The Selection Sort walkthrough uses Array, Rect, Arrow, and Panel together.
          </p>
        </div>
        <Link
          to="/tutorials/algorithms/selection-sort"
          className={`shrink-0 ${t.btnPrimary}`}
        >
          Selection Sort Walkthrough →
        </Link>
      </div>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials/algorithms/bfs-maze" className={t.linkMuted}>← BFS Maze</Link>
        <Link to="/tutorials/tracing" className={t.linkMuted}>
          Tracing &amp; Variables →
        </Link>
      </div>
    </div>
  );
}
