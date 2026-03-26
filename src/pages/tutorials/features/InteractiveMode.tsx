import { Link } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';

const onClickSubclassCode = `class MyRect(Rect):
    def on_click(self, x: int, y: int):
        # x, y — col and row of the click
        # Inside a Panel: relative to the panel's top-left
        self.color = (
            (255, 100, 100) if self.color != (255, 100, 100)
            else (80, 160, 240)
        )

panel = Panel(x=1, y=1)
cell = MyRect(width=2, height=2, color=(80, 160, 240))
panel.add(cell)`;

const onClickInstanceCode = `rect = Rect(x=2, y=2, width=3, height=3, color=(80, 160, 240))

# No 'self' when assigning directly to an instance
def handle_click(x, y):
    rect.color = (255, 100, 100)

rect.on_click = handle_click`;

const onDragCode = `class DragSquare(Rect):
    def on_drag(self, x: int, y: int, drag_type: str):
        # x, y — always absolute grid coordinates
        # drag_type: 'start', 'mid', or 'end'
        self.x = x
        self.y = y

square = DragSquare(
    x=2, y=2,
    color=(99, 102, 241),
    animate=False,  # snap to cursor; no slide animation
)`;

const inputCode = `inp = Input(x=2, y=1, width=4, placeholder="enter a number")

class SubmitButton(Rect):
    def on_click(self, x, y):
        value = inp.get_input()
        print(f"You entered: {value}")

btn = SubmitButton(
    x=2, y=3, width=4, height=1,
    color=(59, 130, 246),
)`;


export function InteractiveMode() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Features</p>
        <h1 className={`${t.heading1} mb-3`}>Interactive Mode</h1>
        <p className={`${t.body} leading-relaxed`}>
          After stepping through the trace, click the{' '}
          <span className="inline-flex items-center gap-1 align-middle">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-700">
              <MousePointerClick size={12} className="text-gray-700 dark:text-gray-300" />
            </span>
            <strong>Finish &amp; Interact</strong>
          </span>{' '}
          button to enter interactive mode. Elements with interaction handlers become
          clickable, draggable, or accept text input — each event runs your Python and
          refreshes the grid.
        </p>
      </div>

      {/* Entering interactive mode */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>Entering Interactive Mode</h2>
        <div className="space-y-3">
          {[
            { heading: 'Click the interact button', body: 'Available at any step in trace mode. The timeline hides and interactive elements become active.' },
            { heading: 'Handlers are on', body: 'Only in interactive mode. Elements without handlers are not clickable or draggable.' },
            { heading: 'State persists', body: 'The Python execution namespace is preserved. Variables mutated by one event are visible to the next.' },
          ].map(({ heading, body }) => (
            <div key={heading} className={`${t.card} p-4`}>
              <h3 className={`${t.heading3} mb-1`}>{heading}</h3>
              <p className={t.bodySmall}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* on_click */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>on_click</h2>
        <p className={`${t.muted} mb-4`}>
          Subclass a shape and define <code className={t.inlineCode}>on_click(self, x, y)</code>.
          Mutate properties directly and the grid re-renders automatically.
        </p>
        <CodeBlock code={onClickSubclassCode} />

        <p className={`${t.muted} mt-4 mb-3`}>
          To add a handler to a single object without subclassing, assign a function directly.
          The function receives <code className={t.inlineCode}>x, y</code> without{' '}
          <code className={t.inlineCode}>self</code>:
        </p>
        <CodeBlock code={onClickInstanceCode} />

        <p className={`${t.muted} mt-3`}>
          See the{' '}
          <Link to="/?sample=feature-6-interactive" className={t.linkAccent}>
            click interaction sample
          </Link>{' '}
          for a full example with buttons and{' '}
          <code className={t.inlineCode}>no_debug</code> calls.
        </p>
      </section>

      {/* on_drag */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>on_drag</h2>
        <p className={`${t.muted} mb-4`}>
          Define <code className={t.inlineCode}>on_drag(self, x, y, drag_type)</code> to make a
          shape draggable. Coordinates follow the same rule as{' '}
          <code className={t.inlineCode}>on_click</code>: panel-relative if the element is inside
          a Panel, absolute otherwise. <code className={t.inlineCode}>drag_type</code> is{' '}
          <code className={t.inlineCode}>'start'</code>,{' '}
          <code className={t.inlineCode}>'mid'</code>, or{' '}
          <code className={t.inlineCode}>'end'</code>. 
        </p>
        <p className={`${t.muted} mb-4`}>  
          Note that draggable objects only trigger the dragging event, they aren't automatically dragged.
          You can implement it inside the <code className={t.inlineCode}>on_drag</code> function
          by updating the <code className={t.inlineCode}>x, y</code> coordinates. Set{' '}
          <code className={t.inlineCode}>animate=False</code> to snap the shape to the cursor
          without a slide animation. Assigning directly to an instance works the same
          as <code className={t.inlineCode}>on_click</code>.
        </p>
        <CodeBlock code={onDragCode} />
        <p className={`${t.muted} mt-3`}>
          See the{' '}
          <Link to="/?sample=feature-7-dragging" className={t.linkAccent}>
            dragging sample
          </Link>{' '}
          for a drop-target example that changes color as the square crosses into it.
        </p>
      </section>

      {/* Input */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>Input</h2>
        <p className={`${t.muted} mb-4`}>
          Place an <code className={t.inlineCode}>Input</code> element on the canvas to accept
          typed values. Call <code className={t.inlineCode}>get_input()</code> from any handler
          to read the current text. Optionally define{' '}
          <code className={t.inlineCode}>input_changed(text)</code> on the object to respond to
          each keystroke.
        </p>
        <CodeBlock code={inputCode} />
        <p className={`${t.muted} mt-3`}>
          See the{' '}
          <Link to="/?sample=feature-8-input" className={t.linkAccent}>
            input sample
          </Link>{' '}
          for a two-field numeric sum example.
        </p>
      </section>

      {/* API reference note */}
      <p className={`${t.muted} leading-relaxed`}>
        Full constructor signatures, all parameters, and more examples are in the{' '}
        <strong className={t.strong}>API Reference</strong> panel inside the editor — click the
        blue <em>API</em> button in the top-right of the visual panel.
      </p>

      {/* CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Try Interactive Mode</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>
            Open the click interaction sample, press Analyze, step to the end, and
            click the <MousePointerClick size={12} className="inline align-middle" /> button.
          </p>
        </div>
        <Link to="/?sample=feature-6-interactive" className={`shrink-0 ${t.btnPrimary}`}>
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
