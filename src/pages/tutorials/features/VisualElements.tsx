import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';

const panelCode = `panel = Panel()
panel.position = (1, 1)   # top-left corner on the grid (row, col)

# Add children relative to the panel's top-left
rect = Rect(position=(0, 0), width=3, height=2, color=(80, 180, 120))
panel.add(rect)`;

const rectCode = `# Static rectangle
rect = Rect(position=(2, 4), width=2, height=3, color=(220, 80, 80))
panel.add(rect)

# Rectangle whose width tracks a variable
bar = Rect(
    position=V('(0, i)'),
    width=1,
    height=V('arr[i]'),   # height = current value
    color=(100, 160, 240),
    alpha=0.8
)
panel.add(bar)`;

const circleCode = `# Fixed circle
dot = Circle(position=(1, 2), width=2, height=2, color=(60, 130, 240))
panel.add(dot)

# Circle that highlights the current element
cursor = Circle(
    position=V('(0, i)'),
    color=(255, 180, 0),
    alpha=0.6
)
panel.add(cursor)`;

const arrowCode = `# Arrow pointing down at column i
ptr = Arrow(
    position=V('(0, i)'),
    angle=Arrow.DOWN,
    color=(0, 100, 220)
)
panel.add(ptr)

# Arrow.UP=0  Arrow.RIGHT=90  Arrow.DOWN=180  Arrow.LEFT=270`;

const arrayCode = `# 1-D array — cells track the variable automatically
arr_view = Array(cells=V('arr'), position=(1, 0))
panel.add(arr_view)

# Vertical layout
stack = Array(cells=V('stack'), direction='down', position=(0, 8))
panel.add(stack)

# 2-D array (e.g. a grid/matrix)
matrix = Array2D(cells=V('grid'), position=(3, 0))
panel.add(matrix)`;

const labelLineCode = `# Text label — not clickable, not animated
lbl = Label(text='sorted', position=(0, 6), color=(80, 80, 80))
panel.add(lbl)

# Line between two absolute grid positions (no panel arg)
divider = Line(
    start=(2, 5), end=(8, 5),
    color=(160, 160, 160),
    stroke_weight=2
)`;

export function VisualElements() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Features</p>
        <h1 className={`${t.heading1} mb-3`}>Visual Elements</h1>
        <p className={`${t.body} leading-relaxed max-w-xl`}>
          Builder Code declares visual elements that live on the 50×50 grid. Each element is
          a Python object whose properties can be bound to algorithm variables via{' '}
          <code className={t.inlineCode}>V("expr")</code>, so the visualization stays in sync
          with the trace automatically.
        </p>
      </div>

      {/* Panel */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Panel</h2>
        <p className={`${t.muted} mb-4`}>
          A <code className={t.inlineCode}>Panel</code> is a container. Create one, set its
          position on the grid, then call <code className={t.inlineCode}>panel.add(elem)</code>{' '}
          to attach children. Children specify their positions <em>relative</em> to the panel's
          top-left corner — move the panel and everything inside moves with it.
        </p>
        <CodeBlock code={panelCode} />
      </section>

      {/* Rect */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Rect</h2>
        <p className={`${t.muted} mb-4`}>
          A filled rectangle. Spans <code className={t.inlineCode}>width × height</code> grid
          cells. Useful for highlighting regions, drawing bar charts, or marking sorted/unsorted
          boundaries. <strong className={t.strong}>Clickable</strong> in interactive mode.
        </p>
        <CodeBlock code={rectCode} />
      </section>

      {/* Circle */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Circle</h2>
        <p className={`${t.muted} mb-4`}>
          A filled circle (or ellipse when <code className={t.inlineCode}>width ≠ height</code>).
          Good for node-based visualizations like graphs and trees.{' '}
          <strong className={t.strong}>Clickable</strong> in interactive mode.
        </p>
        <CodeBlock code={circleCode} />
      </section>

      {/* Arrow */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Arrow</h2>
        <p className={`${t.muted} mb-4`}>
          A directional arrow shape. Set <code className={t.inlineCode}>angle</code> in degrees
          clockwise from up, or use the{' '}
          <code className={t.inlineCode}>Arrow.UP / DOWN / LEFT / RIGHT</code> constants.
          Commonly used to track pointer variables (e.g.{' '}
          <code className={t.inlineCode}>i</code>, <code className={t.inlineCode}>j</code>).{' '}
          <strong className={t.strong}>Clickable</strong> in interactive mode.
        </p>
        <CodeBlock code={arrowCode} />
      </section>

      {/* Array */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Array and Array2D</h2>
        <p className={`${t.muted} mb-4`}>
          <code className={t.inlineCode}>Array</code> renders a 1-D list as a row of labeled
          cells. <code className={t.inlineCode}>Array2D</code> renders a 2-D list as a grid.
          Pass <code className={t.inlineCode}>cells=V("arr")</code> so the cells automatically
          reflect the current state of the variable at every step.{' '}
          <strong className={t.strong}>Not clickable</strong> — arrays are display-only.
        </p>
        <CodeBlock code={arrayCode} />
        <div className="mt-4 space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Array options</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>direction</code> — <code className={t.inlineCode}>"right"</code> (default),{' '}
              <code className={t.inlineCode}>"left"</code>,{' '}
              <code className={t.inlineCode}>"down"</code>, or{' '}
              <code className={t.inlineCode}>"up"</code>.{' '}
              <code className={t.inlineCode}>show_index=False</code> hides the{' '}
              <code className={t.inlineCode}>[i]</code> labels.{' '}
              <code className={t.inlineCode}>name="label"</code> adds a title above the array.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Array2D options</h3>
            <p className={t.bodySmall}>
              Pass a 2-D list to <code className={t.inlineCode}>cells</code>. Set{' '}
              <code className={t.inlineCode}>rectangular=False</code> to only draw cells that
              exist in jagged rows (rows of different lengths), leaving the rest bare.
            </p>
          </div>
        </div>
      </section>

      {/* Label & Line */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Label and Line</h2>
        <p className={`${t.muted} mb-4`}>
          <code className={t.inlineCode}>Label</code> renders a text string on the grid.{' '}
          <code className={t.inlineCode}>Line</code> draws a straight line between two absolute
          grid positions (it does not take a panel argument). Neither is clickable.
        </p>
        <CodeBlock code={labelLineCode} />
        <div className={`mt-4 ${t.card} p-4`}>
          <h3 className={`${t.heading3} mb-1`}>Line options</h3>
          <p className={t.bodySmall}>
            <code className={t.inlineCode}>start_cap</code> and{' '}
            <code className={t.inlineCode}>end_cap</code> can be{' '}
            <code className={t.inlineCode}>"none"</code> or{' '}
            <code className={t.inlineCode}>"arrow"</code> to add arrowheads.{' '}
            <code className={t.inlineCode}>start_offset</code> /{' '}
            <code className={t.inlineCode}>end_offset</code> are{' '}
            <code className={t.inlineCode}>(row_frac, col_frac)</code> fractions (0–1) that
            shift the endpoint within its cell.
          </p>
        </div>
      </section>

      {/* Shared properties */}
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
              { prop: 'visible', desc: 'Show or hide the element without removing it.' },
              { prop: 'alpha', desc: 'Opacity from 0.0 (transparent) to 1.0 (opaque).' },
              { prop: 'z', desc: 'Depth layer — lower z renders on top of higher z. Default 0.' },
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
        <Link to="/tutorials/getting-started" className={t.linkMuted}>← Getting Started</Link>
        <Link to="/tutorials/tracing" className={t.linkMuted}>
          Tracing &amp; Variables →
        </Link>
      </div>
    </div>
  );
}
