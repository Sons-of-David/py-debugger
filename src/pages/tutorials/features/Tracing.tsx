import { Link } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';
import timelineControlsImg from '../media/timeline_controls.png';

const vizBlockCode = `# @viz
rect = Rect(x=2, y=1, width=4, height=1, color=(80, 160, 240))
arrow = Arrow(x=0, y=0)
label = Label(label='start', x=2, y=2)
# @end

for i in range(n):
    # @viz
    rect.x = i
    # @end
    print(i)`;

const vBasicCode = `# x / y accept V() just like any other property
rect = Rect(
    x=V('i'),           # column tracks loop variable
    y=1,
    width=V('n - i'),   # arithmetic expression
    height=V('arr[i]'), # index expression
    color=(80, 160, 240)
)

# V() is safe — if the variable doesn't exist yet, falls back to default
early = Rect(x=V('j', default=0), y=0, width=1, height=1)`;

const vSafeCode = `# Supported builtins inside V() expressions
highlight = Rect(
    x=0,
    y=0,
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
        <h1 className={`${t.heading1} mb-3`}>Tracing &amp; Properties</h1>
        <p className={`${t.body} leading-relaxed`}>
          When you click <strong>Analyze</strong>, the tracer runs your algorithm and records a
          timeline of snapshots. Each snapshot captures the full state of every visual element.
          Use the timeline controls to step through those snapshots and watch your visualization evolve.
        </p>
      </div>

      {/* Viz blocks */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Viz blocks</h2>
        <p className={`${t.muted} mb-4`}>
          A <em>viz block</em> is a pair of <code className={t.inlineCode}># @viz</code> and{' '}
          <code className={t.inlineCode}># @end</code> comments at the same indentation level.
          Everything between them is your element setup code — create shapes, bind properties,
          define classes. When execution reaches <code className={t.inlineCode}># @end</code>,
          a snapshot is <strong>always</strong> taken, no matter what changed.
        </p>
        <CodeBlock code={vizBlockCode} />
        <div className={`mt-4 ${t.surface} rounded-lg p-4 space-y-2`}>
          <p className={`${t.bodySmall} font-medium`}>Snapshot triggers</p>
          <ul className="space-y-1.5 ml-2 list-disc list-inside">
            {[
              '# @end always records a snapshot.',
              'Outside a viz block: a snapshot is recorded whenever any V() value changes as we discuss in the section below.',
              'If nothing changes, no extra snapshot is added — the timeline stays concise.',
            ].map((item) => (
              <li key={item} className={t.bodySmall}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* V() */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>
          <code className="font-mono">V("expr")</code> — reactive properties
        </h2>
        <p className={`${t.muted} mb-4`}>
          Wrap any element property in <code className={t.inlineCode}>V("expr")</code> to bind it
          to a Python expression. The expression is stored as a string and re-evaluated at each
          timeline step against the current variable values — you never update properties manually.
          Works on <code className={t.inlineCode}>x</code>, <code className={t.inlineCode}>y</code>,{' '}
          <code className={t.inlineCode}>width</code>, <code className={t.inlineCode}>height</code>,
          colors, and more.
        </p>
        <CodeBlock code={vBasicCode} />

        <div className="mt-4 space-y-3">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-1`}>Supported builtins</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>V()</code> exposes a safe subset of Python builtins:{' '}
              <code className={t.inlineCode}>len</code>,{' '}
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

      {/* Timeline controls */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Stepping through the trace</h2>
        <p className={`${t.muted} mb-4`}>
          After analysis, the timeline controls in the header let you navigate snapshots.
          Use the <strong>←</strong> / <strong>→</strong> buttons to move one step at a time,
          the <strong>▶</strong> button to play through automatically, or drag the scrubber bar
          to jump to any point.
        </p>
        <figure className="mb-4">
          <img
            src={timelineControlsImg}
            alt="Timeline controls bar showing play, previous, scrubber, next, and go-to-interactive buttons"
            className="rounded-xl border border-gray-200 dark:border-gray-700 w-full"
          />
        </figure>
        <div className={`${t.surface} rounded-lg p-4`}>
          <p className={`${t.bodySmall} font-medium mb-2`}>Finishing the trace</p>
          <p className={t.bodySmall}>
            Once you've stepped through the timeline, click the{' '}
            <span className="inline-flex items-center gap-1 align-middle">
              <MousePointerClick size={14} className="inline" />
            </span>{' '}
            button (at the right end of the controls) to leave the trace and enter interactive
            mode — where you can click and drag elements directly.
            The button is only active when your builder code defines interactive elements.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>V() in action</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            The Selection Sort walkthrough shows how V() replaces manual property updates.
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
