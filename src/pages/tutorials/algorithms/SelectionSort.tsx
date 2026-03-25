import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';
import { EmbedPreview } from '../EmbedPreview';

// ---------------------------------------------------------------------------
// Code samples
// ---------------------------------------------------------------------------

const codeVizBlocks = `arr = [5, 7, 2, 6, 3, 1]

# @viz
vis_arr = Array(cells=arr, x=2, y=2)
rect = Rect(width=0, alpha=0.7, y=2, x=2)

min_idx_arrow = Arrow(angle=Arrow.DOWN, x=2, y=1, color=(220, 70, 120))
min_idx_label = Label(label='min index', x=2, y=0, color=(220, 70, 120))

j_arrow = Arrow(angle=Arrow.DOWN, x=2, y=1, color=(120, 70, 220))
j_label = Label(label='j', x=2, y=0, color=(120, 70, 220))
# @end

n = len(arr)

for i in range(n):
    min_index = i

    # @viz
    rect.width = i
    min_idx_arrow.x = 2 + min_index
    min_idx_label.x = 2 + min_index
    # @end

    for j in range(i + 1, n):
        # @viz
        j_arrow.x = 2 + j
        j_label.x = 2 + j
        # @end
        if arr[j] < arr[min_index]:
            min_index = j
            # @viz
            min_idx_arrow.x = 2 + min_index
            min_idx_label.x = 2 + min_index
            # @end

    arr[i], arr[min_index] = arr[min_index], arr[i]`;

const codePanels = `arr = [5, 7, 2, 6, 3, 1]

# @viz
panel = Panel(x=2, y=0)
vis_arr = Array(cells=arr, y=2)
rect = Rect(width=0, alpha=0.7, y=2)

min_idx_arrow = Arrow(angle=Arrow.DOWN, y=1, color=(220, 70, 120))
min_idx_label = Label(label='min index', y=0, color=(220, 70, 120))

j_arrow = Arrow(angle=Arrow.DOWN, y=1, color=(120, 70, 220))
j_label = Label(label='j', y=0, color=(120, 70, 220))

panel.add(vis_arr, rect, min_idx_arrow, min_idx_label, j_arrow, j_label)
# @end

n = len(arr)

for i in range(n):
    min_index = i

    # @viz
    rect.width = i
    min_idx_arrow.x = min_index   # no +2 offset needed!
    min_idx_label.x = min_index
    # @end

    for j in range(i + 1, n):
        # @viz
        j_arrow.x = j             # no +2 offset needed!
        j_label.x = j
        # @end
        if arr[j] < arr[min_index]:
            min_index = j
            # @viz
            min_idx_arrow.x = min_index
            min_idx_label.x = min_index
            # @end

    arr[i], arr[min_index] = arr[min_index], arr[i]`;

const codeV = `arr = [5, 7, 2, 6, 3, 1]
min_index = 0
j = 0

# @viz
class LabeledArrow(Panel):
    def __init__(self, label: str, color: tuple, **kwargs):
        super().__init__(**kwargs)
        self.add(
            Arrow(angle=Arrow.DOWN, color=color, x=0, y=1),
            Label(label=label, color=color)
        )

panel = Panel(x=2, y=2)
panel.add(
    Array(cells=arr),
    Rect(width=V('i', default=0), alpha=0.7),
    LabeledArrow(label='min index', color=(220, 70, 120), x=V('min_index'), y=-2),
    LabeledArrow(label='j', color=(120, 70, 220), x=V('j'), y=-2)
)
# @end

n = len(arr)

for i in range(n):
    min_index = i

    for j in range(i + 1, n):
        if arr[j] < arr[min_index]:
            min_index = j

    arr[i], arr[min_index] = arr[min_index], arr[i]`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SelectionSort() {
  return (
    <div className="space-y-12">

      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
          Getting Started
        </p>
        <h1 className={`${t.heading1} mb-3`}>Learn AlgoPlay with Selection Sort</h1>
        <p className={`${t.body} leading-relaxed`}>
          Selection sort finds the minimum element in the unsorted region and swaps it into
          place — one element per pass. As a first example, we will use it to learn the
          interesting features that AlgoPlay has — the algorithm itself is just a vehicle.
        </p>
        <p className={`${t.body} leading-relaxed mt-3`}>
          This page builds the visualization in three steps: first with raw{' '}
          <code className={t.inlineCode}># @viz</code> blocks, then with a{' '}
          <code className={t.inlineCode}>Panel</code> to group elements, and finally with{' '}
          <code className={t.inlineCode}>V()</code> expressions that make most of the manual
          updates disappear.
        </p>
      </div>

      {/* Embedded preview */}
      <EmbedPreview sample="1-selection-sort" vx={0} vy={0} vw={10} vh={4} />

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Edit this example</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            Open the final version in the editor and step through it live.
          </p>
        </div>
        <Link to="/?sample=1-selection-sort" className={`shrink-0 ${t.btnPrimary}`}>
          Open in Editor →
        </Link>
      </div>

      {/* What we're building */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>What we want to show</h2>
        <p className={`${t.muted} mb-4`}>
          Three things are worth visualizing in selection sort:
        </p>
        <div className="space-y-3">
          {[
            {
              heading: 'The array',
              body: 'A row of cells showing the current values — we want to see swaps happen in real time.',
            },
            {
              heading: 'Two pointers',
              body: 'One arrow for min_index (the best candidate so far) and one for j (the current element being compared).',
            },
            {
              heading: 'The sorted boundary',
              body: 'A rectangle that grows from the left after each pass, marking the region that is already in place.',
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
      {/* Step 1 — viz blocks */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 1
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            The straightforward approach: <code className="font-mono">@viz</code> blocks
          </h2>
          <p className={`${t.muted}`}>
            Each <code className={t.inlineCode}># @viz … # @end</code> block marks a{' '}
            <strong className={t.strong}>snapshot point</strong> — when execution hits{' '}
            <code className={t.inlineCode}># @end</code>, the current state of all visual
            elements is recorded as a timeline frame. You can use as many blocks as you like
            and place them anywhere in the code.
          </p>
        </div>

        <CodeBlock code={codeVizBlocks} />

        {/* Emphasis callout */}
        <div className="border-l-4 border-amber-400 dark:border-amber-500 pl-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-r-lg">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            This gets much simpler really soon!
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            All those manual <code className="font-mono text-xs">x = 2 + min_index</code> updates
            will be gone by the end of this page.
          </p>
        </div>

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Setup block (top)</h3>
            <p className={t.bodySmall}>
              The first <code className={t.inlineCode}># @viz</code> block creates all
              elements and places them on the grid. This runs once and records the initial
              frame — the visualization as it looks before the algorithm starts.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Update blocks (inside the loop)</h3>
            <p className={t.bodySmall}>
              Each block inside the loop mutates element properties and then records a new
              frame when <code className={t.inlineCode}># @end</code> is reached. Stepping
              through the timeline takes you frame by frame through every update.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Absolute coordinates</h3>
            <p className={t.bodySmall}>
              Every element is placed at an absolute grid position:{' '}
              <code className={t.inlineCode}>x=2, y=2</code> for the array,{' '}
              <code className={t.inlineCode}>x=2+min_index</code> for the arrows. This works,
              but the <code className={t.inlineCode}>+2</code> offset appears everywhere — and
              if we ever move the array, we'd need to update every single line.
            </p>
          </div>
        </div>
        <p className={`${t.muted} mt-2`}>
          Notice that the viz blocks define an{' '}
          <code className={t.inlineCode}>Array</code>,{' '}
          a <code className={t.inlineCode}>Rect</code>, a couple of{' '}
          <code className={t.inlineCode}>Arrow</code>s and{' '}
          <code className={t.inlineCode}>Label</code>s — which we can see in the
          visualization itself. More details about these shapes and more can be found in the{' '}
          <Link to="/tutorials/visual-elements" className={t.linkAccent}>
            Visual Elements
          </Link>{' '}
          reference.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 — panels */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 2
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Group elements with a <code className="font-mono">Panel</code>
          </h2>
          <p className={`${t.muted}`}>
            A <code className={t.inlineCode}>Panel</code> is a container that holds other
            elements. Place the panel somewhere on the grid, then add children to it — their
            coordinates are relative to the panel's top-left corner. Move the panel and
            everything inside moves with it.
          </p>
        </div>

        <CodeBlock code={codePanels} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>No more offset arithmetic</h3>
            <p className={t.bodySmall}>
              With <code className={t.inlineCode}>panel = Panel(x=2, y=0)</code>, all
              children use coordinates relative to the panel. The arrows now move to{' '}
              <code className={t.inlineCode}>x=min_index</code> instead of{' '}
              <code className={t.inlineCode}>x=2+min_index</code> — and if we change the
              panel's position, everything follows automatically.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Still manual updates</h3>
            <p className={t.bodySmall}>
              The viz blocks inside the loops still manually assign coordinates after each
              step. We need one block every time an arrow moves. The next step removes those
              entirely.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 3 — V() */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 3
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Reactive properties with <code className="font-mono">V()</code>
          </h2>
          <p className={`${t.muted}`}>
            <code className={t.inlineCode}>V("expr")</code> binds an element property to a
            Python expression. Every time that expression's value changes during the
            algorithm, a new frame is automatically recorded — without any{' '}
            <code className={t.inlineCode}># @viz</code> block needed. For example, the{' '}
            <code className={t.inlineCode}>min_index</code> arrow should be bound to the{' '}
            <code className={t.inlineCode}>min_index</code> value.
          </p>
        </div>

        <CodeBlock code={codeV} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>One setup block, no update blocks</h3>
            <p className={t.bodySmall}>
              There is only one <code className={t.inlineCode}># @viz … # @end</code> block —
              the setup at the top. All arrow positions, the rectangle width, and the array
              cells are bound with <code className={t.inlineCode}>V()</code>, so they update
              automatically as <code className={t.inlineCode}>i</code>,{' '}
              <code className={t.inlineCode}>j</code>, and{' '}
              <code className={t.inlineCode}>min_index</code> change.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Pre-initialize variables</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>min_index = 0</code> and{' '}
              <code className={t.inlineCode}>j = 0</code> are set before the{' '}
              <code className={t.inlineCode}># @viz</code> block so the initial snapshot has
              valid starting values for the arrows. Alternatively,{' '}
              <code className={t.inlineCode}>V()</code> accepts a{' '}
              <code className={t.inlineCode}>default=</code> argument — see{' '}
              <Link to="/tutorials/tracing" className={t.linkAccent}>
                Tracing &amp; Variables
              </Link>{' '}
              for details.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Automatic frames</h3>
            <p className={t.bodySmall}>
              After each algorithm line, V() expressions are re-evaluated. If any value
              changed, a frame is recorded. This means every time{' '}
              <code className={t.inlineCode}>j</code> increments or{' '}
              <code className={t.inlineCode}>min_index</code> updates, you get a new frame
              — without writing a single viz block for it.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Custom Panel subclass</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>LabeledArrow</code> is a{' '}
              <code className={t.inlineCode}>Panel</code> subclass that bundles an{' '}
              <code className={t.inlineCode}>Arrow</code> and a{' '}
              <code className={t.inlineCode}>Label</code> together. It can accept{' '}
              <code className={t.inlineCode}>x=V('min_index')</code> directly on the outer
              panel, so both children move together as a unit.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials" className={t.linkMuted}>← Back to tutorials</Link>
        <Link to="/tutorials/algorithms/bubble-sort" className={t.linkMuted}>
          Bubble Sort →
        </Link>
      </div>

    </div>
  );
}
