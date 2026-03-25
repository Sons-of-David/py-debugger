import { Link } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';
import { EMBED_CHROME_HEIGHT } from '../../../app/EmbedPage';
import { CELL_SIZE } from '../../../visual-panel/components/Grid';

// ---------------------------------------------------------------------------
// Embedded preview
// ---------------------------------------------------------------------------

interface EmbedPreviewProps {
  sample: string;
  vx?: number;
  vy?: number;
  vw?: number;
  vh?: number;
}

function EmbedPreview({ sample, vx, vy, vw, vh }: EmbedPreviewProps) {
  const { darkMode } = useTheme();
  let src = `/embed?sample=${encodeURIComponent(sample)}&dark=${darkMode ? '1' : '0'}`;
  if (vx !== undefined) src += `&vx=${vx}`;
  if (vy !== undefined) src += `&vy=${vy}`;
  if (vw !== undefined) src += `&vw=${vw}`;
  if (vh !== undefined) src += `&vh=${vh}`;

  const hasViewport = vw !== undefined && vh !== undefined;
  const iframeWidth = hasViewport ? vw! * CELL_SIZE : undefined;
  const iframeHeight = hasViewport ? vh! * CELL_SIZE + EMBED_CHROME_HEIGHT : 440;

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm mx-auto"
      style={{ width: iframeWidth, height: iframeHeight }}
    >
      <iframe
        src={src}
        title="Trapping Rain Water visualization"
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code samples
// ---------------------------------------------------------------------------

const codeAlgorithm = `heights = [1,2,0,3,1,0,1,5,2,5,3,1,0,2]

def trap_rain() -> int:
    # Find the index of the tallest bar
    max_idx = 0
    for i, h in enumerate(heights):
        if heights[max_idx] < h:
            max_idx = i

    value = 0
    # Scan left→max and right→max
    for indices in (range(0, max_idx), range(len(heights)-1, max_idx, -1)):
        last_max = -1
        for i in indices:
            if last_max < heights[i]:
                last_max = heights[i]
            elif heights[0] < last_max:
                value += last_max - heights[i]
                # @viz
                # add water rectangle
                # @end

    return value

# @viz
main_panel = Panel(x=1, y=8)
# ... (visualization setup)
# @end

trap_rain()`;

const codeVisuals = `# @viz
main_panel = Panel(x=1, y=8)
main_panel.add(
    Rect(x=V('max_idx', default=0), y=V(f'-heights[max_idx]'),
         height=V(f'heights[max_idx]', default=0),
         color=(140,50,70), z=-2),
    Arrow(x=V('i', default=0), y=1, angle=Arrow.UP)
)

water = []

def clear_water():
    while len(water)>0:
        water.pop().delete()

class Bar(Rect):
    def __init__(self, idx:int):
        super().__init__(
            x=idx, y=V(f'-heights[{idx}]'),
            height=V(f'1+heights[{idx}]'),
            color=(40,130,20),
            animate=False, z=-1)
        self.idx = idx
        main_panel.add(self)

for i, h in enumerate(heights):
    Bar(idx=i)
# @end`;

const codeOnDrag = `    def on_drag(self, x: int, y: int, drag_type: str):
        clear_water()
        if drag_type == 'start':
            self.color = (40,80,160)   # blue while dragging starts
        if drag_type == 'mid':
            self.color = (180,130,60)  # amber mid-drag
        if drag_type == 'end':
            self.color = (40,130,20)   # back to green when released
        heights[self.idx] = max(-y, 0)  # y is negative above the baseline`;

const codeButton = `btn = Rect(x=5, y=2, width=4, color=(40,100,200))

def retrap_rain(x: int, y: int):
    clear_water()
    trap_rain()

btn.on_click = retrap_rain

main_panel.add(
    btn, Label(label='trap rain', x=6, y=2, width=2))`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TrappingRain() {
  return (
    <div className="space-y-12">

      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
          Algorithm Walkthroughs
        </p>
        <h1 className={`${t.heading1} mb-3`}>Interactivity: Trapping Rain Water</h1>
        <p className={`${t.body} leading-relaxed`}>
          Given an array of bar heights, how much water can be trapped between them after it
          rains? This is a classic problem: water pools wherever a bar is shorter than the
          tallest bar it can "see" on both sides.
        </p>
        <p className={`${t.body} leading-relaxed mt-3`}>
          You could change the <code className={t.inlineCode}>heights</code> array in the code
          and re-run to try different inputs — but it's far more intuitive to drag the bars
          directly on the canvas. This page shows how to wire up drag and click handlers to
          make that possible.
        </p>
      </div>

      {/* Embedded preview */}
      <EmbedPreview sample="trapping-rain" />

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Try this example</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            Open it in the editor, drag bars, and click the button to re-run.
          </p>
        </div>
        <Link to="/?sample=trapping-rain" className={`shrink-0 ${t.btnPrimary}`}>
          Open in Editor →
        </Link>
      </div>

      {/* How it works overview */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>How to use this example</h2>
        <div className="space-y-3">
          {[
            {
              heading: 'Algorithm',
              body: 'The algorithm finds the tallest bar first, which splits the array into two halves. Each half is scanned independently: maintain a running max, and wherever the current bar is shorter than that max, water accumulates in the gap.',
            },
            {
              heading: 'Initial trace',
              body: 'Click Analyze, then use the timeline controls to step through the algorithm frame by frame and watch water rectangles appear one by one.',
            },
            {
              heading: 'Interactive mode',
              body: 'Once the trace is done, press the Interactive Mode button to make the visualization live. Drag the bars up and down to change their heights, then click the "trap rain" button to see how the water changes.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} className={`${t.card} p-4`}>
              <h3 className={`${t.heading3} mb-1`}>{heading}</h3>
              <p className={t.bodySmall}>{body}</p>
            </div>
          ))}
        </div>
        <p className={`${t.muted} mt-3`}>
          The Interactive Mode button looks like this:{' '}
          <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
            <MousePointerClick size={12} />
          </span>
          {' '}— it appears in the header after the trace finishes.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1 — The algorithm */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 1
          </p>
          <h2 className={`${t.heading2} mb-2`}>The algorithm</h2>
          <p className={t.muted}>
            The algorithm is a two-pass scan. The viz block inside the loop is where water
            rectangles will eventually be added — for now it just contains a placeholder
            comment so we can focus on the algorithm logic first.
          </p>
        </div>

        <CodeBlock code={codeAlgorithm} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Finding the peak</h3>
            <p className={t.bodySmall}>
              The tallest bar's index (<code className={t.inlineCode}>max_idx</code>) splits
              the array into two independent halves. Water can only pool up to the height of
              the tallest bar, so everything to the left of the peak and everything to the
              right can be handled separately.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Filling with water</h3>
            <p className={t.bodySmall}>
              Each half is scanned toward the peak while tracking a running maximum
              (<code className={t.inlineCode}>last_max</code>). Wherever the current bar is
              shorter than <code className={t.inlineCode}>last_max</code>, the gap{' '}
              (<code className={t.inlineCode}>last_max - heights[i]</code>) fills with water.
              Scanning toward the tallest bar guarantees the running max is always a valid
              left or right boundary.
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
            The setup <code className={t.inlineCode}># @viz</code> block creates a{' '}
            <code className={t.inlineCode}>Panel</code>, a highlight for the tallest bar, a
            scan-position arrow, and one <code className={t.inlineCode}>Bar</code> per entry
            in <code className={t.inlineCode}>heights</code>. The bars use{' '}
            <code className={t.inlineCode}>V()</code> bindings so their position and size
            stay in sync with the array automatically.
          </p>
        </div>

        <CodeBlock code={codeVisuals} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Bars above the baseline</h3>
            <p className={t.bodySmall}>
              The panel sits at <code className={t.inlineCode}>y=8</code> on the grid.
              Because the grid's y-axis points downward, a bar of height{' '}
              <code className={t.inlineCode}>h</code> must start at{' '}
              <code className={t.inlineCode}>y=-h</code> to reach <em>above</em> the
              baseline. That's why both the bar's y-position and the water rectangles use
              negative y values — they're all relative to the panel's top-left corner.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Relative coordinates</h3>
            <p className={t.bodySmall}>
              All children of <code className={t.inlineCode}>main_panel</code> use
              coordinates relative to the panel's top-left. Moving the panel in one place
              moves the entire visualization — bars, arrows, water rectangles, and the
              button all follow.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>
              <code className="font-mono text-sm">V()</code> bindings
            </h3>
            <p className={t.bodySmall}>
              Each bar binds its <code className={t.inlineCode}>y</code> and{' '}
              <code className={t.inlineCode}>height</code> to the corresponding entry in{' '}
              <code className={t.inlineCode}>heights</code> via{' '}
              <code className={t.inlineCode}>V()</code>. When a drag event updates the array,
              the bar visually snaps to the new height immediately — no manual update code
              needed.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 3 — Drag events */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 3
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Drag events with <code className="font-mono">on_drag</code>
          </h2>
          <p className={t.muted}>
            Adding an <code className={t.inlineCode}>on_drag</code> method to a class makes
            every instance of that class draggable in interactive mode. The method signature
            is:
          </p>
          <ul className={`${t.muted} mt-2 ml-4 space-y-1 list-disc`}>
            <li>
              <code className={t.inlineCode}>x</code>,{' '}
              <code className={t.inlineCode}>y</code> — always{' '}
              <strong className={t.strong}>absolute</strong> grid coordinates, regardless of
              whether the element is inside a Panel
            </li>
            <li>
              <code className={t.inlineCode}>drag_type</code> —{' '}
              <code className={t.inlineCode}>'start'</code> on mouse-down,{' '}
              <code className={t.inlineCode}>'mid'</code> on each new cell entered,{' '}
              <code className={t.inlineCode}>'end'</code> on mouse-up
            </li>
          </ul>
          <p className={`${t.muted} mt-2`}>
            Setting <code className={t.inlineCode}>animate=False</code> on the element
            makes it snap to the cursor position instead of sliding.
          </p>
        </div>

        <CodeBlock code={codeOnDrag} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Color feedback</h3>
            <p className={t.bodySmall}>
              The bar cycles through three colors as the drag progresses: blue on start,
              amber while moving, and back to green on release. This gives the user clear
              visual feedback about which bar they're dragging and when it "locks in."
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Updating the data</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>heights[self.idx] = max(-y, 0)</code> — because{' '}
              <code className={t.inlineCode}>y</code> is an absolute grid row and the panel
              is at <code className={t.inlineCode}>y=8</code>, dragging to row 5 gives{' '}
              <code className={t.inlineCode}>y=5</code> and a height of{' '}
              <code className={t.inlineCode}>-5</code>… but we want the bar to be 3 units
              tall (8 − 5). The simpler way to think about it: bars hang{' '}
              <em>above</em> the baseline, so height is <code className={t.inlineCode}>-y</code>{' '}
              relative to the panel row. We clamp to 0 to prevent negative heights.
              The <code className={t.inlineCode}>V()</code> binding picks up the change and
              redraws the bar instantly.
            </p>
          </div>
        </div>

        <p className={t.muted}>
          The full <code className={t.inlineCode}>on_drag</code> signature and all its
          edge cases are listed in the API panel (top-right of the editor). The{' '}
          <code className={t.inlineCode}>feature-7-dragging</code> sample also demonstrates
          more advanced dragging patterns.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 4 — Click events */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Step 4
          </p>
          <h2 className={`${t.heading2} mb-2`}>
            Click events with <code className="font-mono">on_click</code>
          </h2>
          <p className={t.muted}>
            <code className={t.inlineCode}>on_click</code> has a similar signature —{' '}
            <code className={t.inlineCode}>(x, y)</code> where the coordinates are relative
            to the element's panel if it's inside one, or absolute if it's top-level. Unlike{' '}
            <code className={t.inlineCode}>on_drag</code>, you don't need to define it on the
            class — you can assign a plain function directly to any individual object:
          </p>
          <pre className={`${t.inlineCode} block mt-2 px-3 py-2 text-xs`}>
            {'btn.on_click = some_function'}
          </pre>
        </div>

        <CodeBlock code={codeButton} />

        <div className="space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Instance-level handler</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>btn.on_click = retrap_rain</code> sets the
              handler on one specific <code className={t.inlineCode}>Rect</code>, not on
              every <code className={t.inlineCode}>Rect</code> instance. This is the natural
              way to wire up one-off interactive elements like buttons, without needing to
              subclass.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Re-running the algorithm</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>retrap_rain</code> first clears all existing
              water rectangles, then calls <code className={t.inlineCode}>trap_rain()</code>{' '}
              again with whatever values are currently in{' '}
              <code className={t.inlineCode}>heights</code>. Because dragging already updated
              the array, this immediately shows the correct water level for the new bar
              layout.
            </p>
          </div>
        </div>

        <p className={t.muted}>
          The <code className={t.inlineCode}>feature-6-interactive</code> sample covers
          more click patterns including combining class-level and instance-level handlers.
        </p>
      </section>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials/algorithms/bubble-sort" className={t.linkMuted}>← Bubble Sort</Link>
      </div>

    </div>
  );
}
