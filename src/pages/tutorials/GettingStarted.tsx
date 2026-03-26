import { Link } from 'react-router-dom';
import { t } from './theme';
import { CodeBlock } from './CodeBlock';

const combinedCode = `arr = [4, 2, 7, 1, 5]
min_val = arr[0]
min_idx = 0

# @viz
vis = Array(cells=arr, x=1, y=1)
cursor = Arrow(position=V('(0, min_idx)'), angle=Arrow.DOWN, color=(80, 120, 220))
# @end

for i in range(1, len(arr)):
    if arr[i] < min_val:
        min_val = arr[i]
        min_idx = i`;


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

      {/* Flow diagram */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Write code */}
        <div className={`${t.card} p-3 text-center min-w-[7rem] flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Write code</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Algorithm + @viz blocks</p>
        </div>
        {/* → */}
        <svg className="shrink-0 text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
        {/* Analyze */}
        <div className={`${t.card} p-3 text-center min-w-[7rem] flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analyze</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Timeline recorded</p>
        </div>
        {/* → */}
        <svg className="shrink-0 text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
        {/* Trace ⇄ Interact */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className={`${t.card} p-3 text-center min-w-[5rem] flex-1`}>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Trace</p>
            <p className={`${t.muted} text-xs mt-0.5`}>Step through</p>
          </div>
          {/* ⇄ loop arrow */}
          <svg className="shrink-0 text-indigo-400 dark:text-indigo-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 9h14M15 5l4 4-4 4" />
            <path d="M19 15H5M9 19l-4-4 4-4" />
          </svg>
          <div className={`${t.card} p-3 text-center min-w-[5rem] flex-1`}>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Interact</p>
            <p className={`${t.muted} text-xs mt-0.5`}>Click elements</p>
          </div>
        </div>
      </div>

      {/* Step 1 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 1 — Write your code</h2>
        <p className={`${t.muted} mb-4`}>
          Everything goes in one editor. Write your algorithm as normal Python, then add{' '}
          <code className={t.inlineCode}># @viz</code> /{' '}
          <code className={t.inlineCode}># @end</code> blocks to declare visual elements and
          mark snapshot points. You can place as many blocks as you like anywhere in the file.
        </p>

        <CodeBlock code={combinedCode} />

        <div className="mt-4 space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Algorithm code</h3>
            <p className={t.bodySmall}>
              Any valid Python. Lines outside <code className={t.inlineCode}># @viz</code> blocks
              run as normal algorithm logic — the tracer records variable values at every line.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>@viz blocks — setup and snapshots</h3>
            <p className={t.bodySmall}>
              A <code className={t.inlineCode}># @viz … # @end</code> block declares or updates
              visual elements. When execution reaches <code className={t.inlineCode}># @end</code>,
              the current state of all elements is recorded as a timeline frame.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>
              <code className="font-mono">V("expr")</code> — reactive bindings
            </h3>
            <p className={t.bodySmall}>
              Wrap any element property in <code className={t.inlineCode}>V("expr")</code> to
              bind it to a Python expression. It is evaluated at every algorithm step — when the
              value changes, a new frame is recorded automatically, with no extra @viz block
              needed.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 2 — Analyze</h2>
        <p className={`${t.muted} mb-3`}>
          Click <strong className={t.strong}>Analyze</strong> in the header. Python runs
          entirely in your browser (via WebAssembly) and records every traced line as a{' '}
          <em>timeline</em>. The editor locks while the trace runs.
        </p>
        <div className={`${t.surface} rounded-lg p-4`}>
          <p className={`${t.bodySmall} font-medium mb-2`}>What happens during Analyze:</p>
          <ol className="space-y-2">
            {[
              'The @viz setup block runs first — elements are created and the initial snapshot is recorded.',
              'The algorithm runs under sys.settrace, recording variable values at every line.',
              'After each line, V() expressions are re-evaluated; changed values trigger a new frame.',
              'The full timeline is stored in memory — stepping never re-runs Python.',
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
              body: 'The editor highlights the current line. Click the gutter to set breakpoints and jump between them.',
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
          re-renders the grid instantly. See{' '}
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
        <Link to="/tutorials/algorithms/selection-sort" className={t.linkMuted}>
          Selection Sort →
        </Link>
      </div>
    </div>
  );
}
