import { Link } from 'react-router-dom';
import { t } from './theme';
import { CodeBlock } from './CodeBlock';
import { EmbedPreview } from './EmbedPreview';
import { MousePointerClick } from 'lucide-react';

const userCode = `arr = [1,5,4,7,9,3,5,2]
index_max = 0

# @viz
panel = Panel(x=1, y=1)
label = Label(label=V('current max'), x=2, y=2, width=4)

panel.add(
    Array(cells=V('arr'), x=0, y=1),
    Arrow(angle=Arrow.DOWN, x=V('i', default=0), color=(230,70,80)),
    Rect(x=V('index_max'), y=1, alpha=0.3),
    label
)
# @end

for i in range(len(arr)):
    if arr[index_max] < arr[i]:
        index_max = i
        # @viz
        label.label = f'current max: {arr[i]}'
        # @end
        
print(f'max value is {arr[index_max]=}')`;


export function GettingStarted() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Getting Started</p>
        <h1 className={`${t.heading1} mb-3`}>Getting Started</h1>
        <p className={`${t.body} leading-relaxed`}>
          AlgoPlay is a browser-based visual algorithm debugger. You write Python, click
          Analyze, then step through a recorded timeline watching your data structures animate
          in sync with the code. You can also interact with the visualization and trigger new events — no installs, no server.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="flex gap-1.5">
        {/* Write code */}
        <div className={`${t.card} p-3 text-center flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Write code</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Algorithm + @viz blocks</p>
        </div>
        {/* → */}
        <svg className="shrink-0 self-center text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
        {/* Analyze */}
        <div className={`${t.card} p-3 text-center flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analyze</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Timeline recorded</p>
        </div>
        {/* → */}
        <svg className="shrink-0 self-center text-gray-300 dark:text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
        {/* Trace */}
        <div className={`${t.card} p-3 text-center flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Trace</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Step through</p>
        </div>
        {/* ⇄ loop arrow */}
        <svg className="shrink-0 self-center text-indigo-400 dark:text-indigo-500" width="24" height="32" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9h18M15 5l4 4-4 4" />
          <path d="M21 23H3M9 27l-4-4 4-4" />
        </svg>
        {/* Interact */}
        <div className={`${t.card} p-3 text-center flex-1`}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Interact</p>
          <p className={`${t.muted} text-xs mt-0.5`}>Click elements</p>
        </div>
      </div>

      <div>
        <p className={`${t.heading3} mb-2 text-center`}>Finding max in an array</p>
        <EmbedPreview sample="feature-4-tracing" vx={0} vy={1} vw={10} vh={3}/>
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
        <CodeBlock code={userCode} />

        <div className="mt-4 space-y-3 mb-2">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Algorithm code</h3>
            <p className={t.bodySmall}>
              Any valid Python. Lines outside <code className={t.inlineCode}># @viz</code> blocks
              run as normal algorithm logic.
            </p>
          </div>
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>@viz blocks — setup and snapshots</h3>
            <p className={t.bodySmall}>
              A <code className={t.inlineCode}># @viz … # @end</code> block declares or updates
              {' '}<Link to="/tutorials/visual-elements" className={t.linkAccent}>
            visual elements
          </Link>. When execution reaches <code className={t.inlineCode}># @end</code>,
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
              needed. More details in {' '}
          <Link to="/tutorials/tracing" className={t.linkAccent}>
            the tracing tutorial
          </Link>.{' '}
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
          <em>timeline</em>. The editor locks while the trace runs. Once it is done, you can 
          see your algorithm in motion. You can always  
          click <strong className={t.strong}>Edit Code</strong> to go back and change your code.
        </p>
      </section>

      {/* Step 3 */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Step 3 — Step through the timeline</h2>
        <p className={`${t.muted} mb-4`}>
          After Analyze, the app enters <strong className={t.strong}>trace mode</strong>. Use
          the timeline controls in the header to step forward, step back, or just let it play automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              heading: 'Code Highlight',
              body: 'The editor highlights the current executed line.',
            },
            {
              heading: 'Visual Panel',
              body: 'Animates the grid snapshot at the current step. Elements move, resize, and recolor as variables change.',
            },
            {
              heading: 'Output Panel',
              body: 'Shows all captured output up to the current step. ',
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
          Click the <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 align-middle mx-0.5">
                <MousePointerClick size={12} className="text-gray-700 dark:text-gray-300" />
              </span> button to finish the trace and enter interactive mode. Visual elements 
          can become clickable, draggable and more. These events can trigger python functions
          looping us back to tracing your code and see it in action. See{' '}
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
