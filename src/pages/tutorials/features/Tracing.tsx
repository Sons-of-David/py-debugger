import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';

const vBasicCode = `# The expression is a string — evaluated lazily at each step
arr_view = Array(cells=V('arr'), position=(1, 0))

# Any valid Python expression referencing algorithm variables
rect = Rect(
    position=V('(0, i)'),     # tuple expression
    width=V('n - i'),         # arithmetic
    height=V('arr[i]'),       # indexing
    color=(80, 160, 240)
)

# V() is safe — if a variable doesn't exist yet, returns None (uses schema default)
early = Rect(position=V('(0, j)', default=(0, 0)), width=1, height=1)`;

const vSafeCode = `# V() supports: len, sum, min, max, abs, round, sorted
highlight = Rect(
    width=V('max(1, i)'),
    height=V('len(arr) - i'),
    color=(220, 80, 80)
)`;

export function Tracing() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Features</p>
        <h1 className={`${t.heading1} mb-3`}>Tracing &amp; Variables</h1>
        <p className={`${t.body} leading-relaxed max-w-xl`}>
          The tracer runs your algorithm and records variable values at every step.
          Visual elements that use <code className={t.inlineCode}>V("expr")</code> evaluate
          their bindings at each step, keeping the visualization in sync automatically.
        </p>
      </div>

      {/* V() */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>
          <code className="font-mono">V("expr")</code> — Reactive Bindings
        </h2>
        <p className={`${t.muted} mb-4`}>
          Wrap any element property in <code className={t.inlineCode}>V("expr")</code> to bind
          it to a Python expression. The expression is stored as a string and evaluated at each
          timeline step against the current variable values — you never update element
          properties manually.
        </p>
        <CodeBlock code={vBasicCode} />
        <div className="mt-4 space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Supported builtins</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>V()</code> exposes a safe subset of Python
              builtins: <code className={t.inlineCode}>len</code>,{' '}
              <code className={t.inlineCode}>sum</code>,{' '}
              <code className={t.inlineCode}>min</code>,{' '}
              <code className={t.inlineCode}>max</code>,{' '}
              <code className={t.inlineCode}>abs</code>,{' '}
              <code className={t.inlineCode}>round</code>,{' '}
              <code className={t.inlineCode}>sorted</code>. No imports needed.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <CodeBlock code={vSafeCode} />
        </div>
      </section>

      {/* Timeline frames */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>When frames are created</h2>
        <p className={`${t.muted} mb-4`}>
          A timeline frame is recorded whenever a <code className={t.inlineCode}># @end</code> block
          closes, or whenever any <code className={t.inlineCode}>V()</code>-bound value changes
          after an algorithm line executes. This means you get exactly as many frames as
          there are meaningful state changes.
        </p>
        <div className={`${t.surface} rounded-lg p-4 space-y-2`}>
          <p className={`${t.bodySmall} font-medium`}>Frame triggers:</p>
          <ul className="space-y-1.5 ml-2 list-disc list-inside">
            {[
              '# @end closes a viz block — always records a frame.',
              'A V() expression changes value after any algorithm line outside a viz block.',
              'If nothing changes, no extra frame is added — so the timeline stays concise.',
            ].map((item) => (
              <li key={item} className={t.bodySmall}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>V() in action</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            The Selection Sort walkthrough shows how V() replaces manual position updates.
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
        <Link to="/tutorials/visual-elements" className={t.linkMuted}>← Visual Elements</Link>
        <Link to="/tutorials/interactive-mode" className={t.linkMuted}>
          Interactive Mode →
        </Link>
      </div>
    </div>
  );
}
