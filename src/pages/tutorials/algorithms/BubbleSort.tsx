import { Link } from 'react-router-dom';
import { t } from '../theme';
import { CodeBlock } from '../CodeBlock';
import bubbleSortImg from '../media/bubble-sort.png';

function AnnotatedLine({ code, note }: { code: string; note: string }) {
  return (
    <div className={`grid grid-cols-[1fr_220px] gap-4 items-start py-2 border-b ${t.divider} last:border-0`}>
      <code className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre">{code}</code>
      <span className={`${t.muted} italic`}>{note}</span>
    </div>
  );
}

const debuggerCode = `arr = [5, 3, 8, 1, 9, 2, 7, 4]
n = len(arr)
i = 0
j = 0
set_debug(True)

for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]`;

const builderCode = `panel = Panel()
panel.position = (1, 1)

arr = Array(cells=V('arr'), position=(1, 0))
panel.add(arr)

rect = Rect(
    position=V('(0, n-i)'),
    width=V('i'),
    height=2,
    color=(255, 100, 100),
    alpha=0.6
)
panel.add(rect)

ar1 = Arrow(
    position=V('(0, j)'),
    angle=Arrow.DOWN,
    color=(0, 0, 255)
)
panel.add(ar1)

ar2 = Arrow(
    position=V('(0, j+1)'),
    angle=Arrow.DOWN,
    color=(0, 150, 255)
)
panel.add(ar2)`;

export function BubbleSort() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Algorithm Walkthrough</p>
        <h1 className={`${t.heading1} mb-3`}>Bubble Sort</h1>
        <p className={`${t.body} leading-relaxed max-w-xl`}>
          Bubble sort repeatedly steps through the list, comparing adjacent elements and swapping
          them if they're out of order. After each full pass, the largest unsorted element
          "bubbles up" to its correct position at the end.
        </p>
        <figure className="mt-4">
          <img
            src={bubbleSortImg}
            alt="Bubble sort mid-run: two arrows track the comparison pointers, shaded region marks sorted elements"
            className="rounded-xl border border-gray-200 dark:border-gray-700 w-full"
          />
          <figcaption className={`${t.muted} text-xs mt-2 text-center`}>
            Mid-sort snapshot — arrows at j and j+1, shaded region = already sorted
          </figcaption>
        </figure>
      </div>

      {/* Open in editor CTA */}
      <div className={t.ctaBanner}>
        <div className="flex-1">
          <p className={t.ctaTitle}>Try it yourself</p>
          <p className={`${t.ctaSubtitle} mt-0.5`}>Open this example in the editor and step through it live.</p>
        </div>
        <Link to="/?sample=bubble-sort" className={`shrink-0 ${t.btnPrimary}`}>
          Open in Editor →
        </Link>
      </div>

      {/* Algorithm code */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>The Algorithm</h2>
        <p className={`${t.muted} mb-4`}>
          This goes in the <strong className={t.strong}>Debugger Code</strong> editor (left panel, top tab).
          The tracer steps through every line and records all variable values.
        </p>
        <CodeBlock code={debuggerCode} />

        <div className={`mt-4 border ${t.divider} rounded-lg divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden`}>
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
            <p className={`text-xs font-semibold ${t.muted} uppercase tracking-wider`}>Line by line</p>
          </div>
          <div className="px-4 bg-white dark:bg-gray-800">
            <AnnotatedLine code="set_debug(True)" note="Start recording the timeline from this point. Lines above are setup only." />
            <AnnotatedLine code="for i in range(n):" note="Outer pass counter. After pass i, the last i elements are sorted." />
            <AnnotatedLine code="for j in range(n - i - 1):" note="Inner pointer. We only compare unsorted pairs, shrinking the window each pass." />
            <AnnotatedLine code="if arr[j] > arr[j + 1]:" note="Compare adjacent elements." />
            <AnnotatedLine code="    arr[j], arr[j+1] = ..." note="Swap them if out of order. Python tuple swap — no temp variable needed." />
          </div>
        </div>
      </section>

      {/* Builder code */}
      <section>
        <h2 className={`${t.heading2} mb-1`}>The Visualization</h2>
        <p className={`${t.muted} mb-4`}>
          This goes in the <strong className={t.strong}>Builder Code</strong> editor (left panel, bottom tab).
          It describes what to draw and how element properties bind to algorithm variables via{' '}
          <code className={t.inlineCode}>V('expr')</code>.
        </p>
        <CodeBlock code={builderCode} />

        <div className="mt-6 space-y-4">
          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-2`}>
              Array — shows the current state of <code className={t.inlineCode}>arr</code>
            </h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>V('arr')</code> makes each cell update automatically
              as the array is sorted. Every swap is immediately visible.
            </p>
          </div>

          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-2`}>Red rectangle — highlights the already-sorted region</h3>
            <p className={t.bodySmall}>
              After pass <code className={t.inlineCode}>i</code>, the last{' '}
              <code className={t.inlineCode}>i</code> elements are sorted. The rectangle starts at
              column <code className={t.inlineCode}>n - i</code> and grows left as each pass
              completes — giving a clear visual boundary between sorted and unsorted.
            </p>
          </div>

          <div className={`${t.card} p-4`}>
            <h3 className={`${t.heading3} mb-2`}>Two arrows — track the comparison pointers</h3>
            <p className={t.bodySmall}>
              <code className={t.inlineCode}>ar1</code> points to <code className={t.inlineCode}>j</code> (dark
              blue) and <code className={t.inlineCode}>ar2</code> points to{' '}
              <code className={t.inlineCode}>j+1</code> (light blue). Both use{' '}
              <code className={t.inlineCode}>angle=Arrow.DOWN</code>. They animate together as{' '}
              <code className={t.inlineCode}>j</code> advances, making it easy to see which pair is
              being compared at each step.
            </p>
          </div>
        </div>
      </section>

      {/* What you'll see */}
      <section>
        <h2 className={`${t.heading2} mb-3`}>What you'll see</h2>
        <ol className="space-y-3">
          {[
            'The array displays with values [5, 3, 8, 1, 9, 2, 7, 4]. Both arrows start at position 0 and 1.',
            'As j advances, the arrows slide right. When arr[j] > arr[j+1], you see the swap happen in the array cells.',
            'After each full pass (i increments), the red region grows from the right — claiming sorted elements.',
            'After 7 passes the full array is sorted and both arrows reset.',
          ].map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className={t.stepBullet}>{idx + 1}</span>
              <span className={`${t.bodySmall} leading-relaxed`}>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom nav */}
      <div className={`pt-4 border-t ${t.divider} flex justify-between items-center`}>
        <Link to="/tutorials/algorithms/selection-sort" className={t.linkMuted}>← Selection Sort</Link>
        <Link to="/tutorials/algorithms/trapping-rain" className={t.linkMuted}>Trapping Rain →</Link>
      </div>
    </div>
  );
}
