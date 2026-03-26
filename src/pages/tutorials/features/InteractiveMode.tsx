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
        <Link to="/tutorials" className={t.linkMuted}>Back to tutorials →</Link>
      </div>
    </div>
  );
}
