import { Link } from 'react-router-dom';
import { t } from './theme';
import { CodeBlock } from './CodeBlock';

const debuggerCode = `arr = [4, 2, 7, 1, 5]
min_val = arr[0]
min_idx = 0
set_debug(True)

for i in range(1, len(arr)):
    if arr[i] < min_val:
        min_val = arr[i]
        min_idx = i`;

const builderCode = `panel = Panel()
panel.position = (1, 1)

arr = Array(cells=V('arr'), position=(0, 0))
panel.add(arr)

cursor = Arrow(
    position=V('(0, i)'),
    angle=Arrow.DOWN,
    color=(80, 120, 220)
)
panel.add(cursor)`;

export function GettingStarted() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Getting Started</p>
        <h1 className={`${t.heading1} mb-3`}>Getting Started</h1>
        <p className={`${t.body} leading-relaxed max-w-xl`}>
          AlgoPlay is a browser-based visual algorithm debugger. You write Python, click
          Analyze, then step through a recorded timeline watching your data structures animate
          in sync with the code — no installs, no server.
        </p>
      </div>

      {/* Step 1 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 1 — Write your code</h2>
        <p className={`${t.muted} mb-4`}>
          The left panel has two editors. Your algorithm goes in the{' '}
          <strong className={t.strong}>Debugger Code</strong> editor. The layout of what to
          draw on the grid goes in the <strong className={t.strong}>Builder Code</strong> editor.
        </p>

        <div className="space-y-4">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-2`}>Debugger Code — the algorithm</h3>
            <p className={`${t.bodySmall} mb-3`}>
              Write any Python algorithm here. Call{' '}
              <code className={t.inlineCode}>set_debug(True)</code> to mark where the timeline
              recording begins — any lines before that call run silently as setup.
            </p>
            <CodeBlock code={debuggerCode} />
          </div>

          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-2`}>Builder Code — the visualization</h3>
            <p className={`${t.bodySmall} mb-3`}>
              Declare visual elements and position them on the grid. Wrap any property in{' '}
              <code className={t.inlineCode}>V("expr")</code> to bind it to a debugger
              variable — it updates automatically at every step.
            </p>
            <CodeBlock code={builderCode} />
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 2 — Analyze</h2>
        <p className={`${t.muted} mb-3`}>
          Click <strong className={t.strong}>Analyze</strong> in the header. Python runs
          entirely in your browser (via WebAssembly) and records every traced line as a{' '}
          <em>timeline</em>. Both editors lock while the trace runs.
        </p>
        <div className={`${t.surface} rounded-lg p-4`}>
          <p className={`${t.bodySmall} font-medium mb-2`}>What happens during Analyze:</p>
          <ol className="space-y-2">
            {[
              'Builder Code runs first — sets up visual elements and their V() bindings.',
              'Debugger Code runs under sys.settrace, recording variable values at every line.',
              'At each line, V() expressions evaluate against current variables to capture a visual snapshot.',
              'Two parallel timelines are stored in memory: code state and visual state.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className={t.stepBullet}>{i + 1}</span>
                <span className={`${t.bodySmall} leading-relaxed`}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Step 3 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 3 — Step through the timeline</h2>
        <p className={`${t.muted} mb-4`}>
          After Analyze, the app enters <strong className={t.strong}>trace mode</strong>. Use
          the controls in the header to step forward, step back, or jump to the nearest
          breakpoint.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              heading: 'Visual Panel',
              body: 'Animates the grid snapshot at the current step. Elements move, resize, and recolor as variables change.',
            },
            {
              heading: 'Variable Panel',
              body: 'Shows all captured variables at the current step. Variables are back-filled — one defined later is still visible at earlier steps.',
            },
            {
              heading: 'Code Highlight',
              body: 'The Debugger Code editor highlights the current line. Click the gutter to set breakpoints and jump between them.',
            },
            {
              heading: 'No Re-execution',
              body: 'Navigation never re-runs Python. The full timeline is already in memory — stepping is instant.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} className={`${t.card} p-4`}>
              <h3 className={`${t.heading3} mb-1`}>{heading}</h3>
              <p className={t.bodySmall}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step 4 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 4 — Enter Interactive Mode</h2>
        <p className={`${t.muted} mb-3`}>
          Click <strong className={t.strong}>Finish &amp; Interact</strong> to leave the
          timeline and enter interactive mode. Visual elements with{' '}
          <code className={t.inlineCode}>on_click</code> handlers become clickable — the
          cursor changes to a pointer. Clicking an element runs its Python handler and
          re-renders the grid instantly.
        </p>
        <p className={`${t.muted}`}>
          Handlers can also return a{' '}
          <code className={t.inlineCode}>DebugCall("expr")</code> to open a traced sub-run,
          letting you step through handler logic as a mini timeline. See{' '}
          <Link to="/tutorials/interactive-mode" className={t.linkAccent}>
            Interactive Mode
          </Link>{' '}
          for details.
        </p>
      </section>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>See it in action</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            The Selection Sort walkthrough covers the full workflow with a real example.
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
        <Link to="/tutorials" className={t.linkMuted}>← Back to tutorials</Link>
        <Link to="/tutorials/visual-elements" className={t.linkMuted}>
          Visual Elements →
        </Link>
      </div>
    </div>
  );
}
