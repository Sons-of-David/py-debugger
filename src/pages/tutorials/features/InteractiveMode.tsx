import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';

const onClickBasicCode = `# @viz
class MyRect(Rect):
    def on_click(self, position):
        row, col = position
        # Mutate element state directly — grid re-renders automatically
        self.color = (255, 100, 100) if self.color != (255, 100, 100) else (80, 160, 240)

panel = Panel(x=1, y=1)
cell = MyRect(width=2, height=2, color=(80, 160, 240))
panel.add(cell)
# @end`;

const debugCallCode = `arr = [5, 3, 8, 1]

def sort_from(start):
    for i in range(start, len(arr) - 1):
        if arr[i] > arr[i + 1]:
            arr[i], arr[i + 1] = arr[i + 1], arr[i]

# @viz
class ClickableRect(Rect):
    def __init__(self, idx, **kwargs):
        super().__init__(**kwargs)
        self.idx = idx

    def on_click(self, position):
        # Return DebugCall to open a traced sub-run of any expression
        return DebugCall(f'sort_from({self.idx})')

panel = Panel(x=1, y=1)
arr_view = Array(cells=arr)
panel.add(arr_view)
for i in range(4):
    r = ClickableRect(idx=i, x=i, y=2, width=1, height=1, color=(120, 180, 120))
    panel.add(r)
# @end`;

export function InteractiveMode() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Features</p>
        <h1 className={`${t.heading1} mb-3`}>Interactive Mode</h1>
        <p className={`${t.body} leading-relaxed max-w-xl`}>
          After stepping through the trace, click{' '}
          <strong>Finish &amp; Interact</strong> to enter interactive mode. Elements with{' '}
          <code className={t.inlineCode}>on_click</code> handlers become clickable — clicking
          one runs its Python handler and refreshes the grid.
        </p>
      </div>

      {/* Entering interactive mode */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>Entering Interactive Mode</h2>
        <div className="space-y-3">
          {[
            { heading: 'Click "Finish & Interact"', body: 'Available at any step in trace mode. The timeline hides and clickable elements show a pointer cursor.' },
            { heading: 'Mouse is on', body: 'Only in interactive mode. Elements with on_click handlers are active. Elements without handlers are not clickable.' },
            { heading: 'State persists', body: 'The Python execution namespace is preserved. Variables mutated by one click are visible to the next.' },
          ].map(({ heading, body }) => (
            <div key={heading} className={`${t.card} p-4`}>
              <h3 className={`${t.heading3} mb-1`}>{heading}</h3>
              <p className={t.bodySmall}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* on_click basic */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Simple click handler</h2>
        <p className={`${t.muted} mb-4`}>
          Subclass a shape and define <code className={t.inlineCode}>on_click(self, position)</code>.
          The method receives the clicked grid cell as{' '}
          <code className={t.inlineCode}>(row, col)</code>. Mutate element properties directly
          — returning <code className={t.inlineCode}>None</code> tells the app to
          re-serialize the visual state and refresh the grid.
        </p>
        <CodeBlock code={onClickBasicCode} />
      </section>

      {/* DebugCall */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>
          <code className="font-mono">DebugCall("expression")</code>
        </h2>
        <p className={`${t.muted} mb-4`}>
          Return a <code className={t.inlineCode}>DebugCall</code> from{' '}
          <code className={t.inlineCode}>on_click</code> to open a{' '}
          <strong className={t.strong}>traced sub-run</strong>. The expression is wrapped into
          a function and traced as a mini timeline — the app enters{' '}
          <code className={t.inlineCode}>debug_in_event</code> mode with full prev/next
          navigation. Click <strong className={t.strong}>Back to Interactive</strong> when
          done.
        </p>
        <CodeBlock code={debugCallCode} />

        <div className={`mt-4 ${t.surface} rounded-lg p-4`}>
          <p className={`${t.bodySmall} font-medium mb-2`}>What happens when you click:</p>
          <ol className="space-y-2">
            {[
              'on_click returns DebugCall("sort_from(2)") — the expression string.',
              'The app wraps it into a function and traces it against the current execution namespace.',
              'A new timeline appears. Step through it to watch sort_from(2) execute.',
              'Click "Back to Interactive" — mutations from the sub-run are now live.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className={t.stepBullet}>{i + 1}</span>
                <span className={`${t.bodySmall} leading-relaxed`}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Try Interactive Mode</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            Open the editor, run the 4-input-sum sample, and click "Finish &amp; Interact".
          </p>
        </div>
        <Link to="/?sample=4-input-sum" className={`shrink-0 ${t.btnPrimary}`}>
          Open Example →
        </Link>
      </div>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials/tracing" className={t.linkMuted}>← Tracing &amp; Variables</Link>
        <Link to="/tutorials/algorithms/selection-sort" className={t.linkMuted}>
          Selection Sort →
        </Link>
      </div>
    </div>
  );
}
