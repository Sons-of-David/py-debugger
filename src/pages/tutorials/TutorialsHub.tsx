import { Link } from 'react-router-dom';
import { t } from './theme';

const cards = [
  {
    title: 'Getting Started',
    description: 'Learn the core workflow: write algorithm code, build a visualization, step through the timeline.',
    to: '/tutorials/getting-started',
    accent: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
    titleColor: 'text-blue-800 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    badgeLabel: 'Start here',
  },
  {
    title: 'Explore Features',
    description: 'Shapes, arrays, panels, variable binding, interactive click handlers, and dragging.',
    to: '/tutorials/visual-elements',
    accent: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
    titleColor: 'text-emerald-800 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    badgeLabel: 'Features',
  },
  {
    title: 'Algorithm Walkthroughs',
    description: 'Full worked examples — Selection Sort walks through viz blocks, panels, and V() step by step.',
    to: '/tutorials/algorithms/selection-sort',
    accent: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20',
    titleColor: 'text-violet-800 dark:text-violet-300',
    badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    badgeLabel: 'Examples',
  },
];

export function TutorialsHub() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">AlgoPlay Tutorials</h1>
        <p className={`text-lg ${t.body} leading-relaxed`}>
          AlgoPlay is a browser-based visual algorithm debugger. You write Python, click
          Analyze, then step through a recorded timeline watching your data structures animate
          in sync with the code. You can also interact with the visualization and trigger new events — no installs, no server.
        </p>
        <p className={`mt-2 text-sm ${t.bodySmall}`}>
          By{' '}
          <a href="https://prove-me-wrong.com" target="_blank" rel="noopener noreferrer" className={t.linkAccent}>
            Ofir David
          </a>
        </p>
        <div className="mt-5">
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
            Open the Editor
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h10M8 3l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`block rounded-xl border p-5 hover:shadow-md transition-shadow ${card.accent}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${card.badge}`}>
                  {card.badgeLabel}
                </span>
                <h2 className={`text-lg font-semibold mb-1 ${card.titleColor}`}>{card.title}</h2>
                <p className={`${t.bodySmall} leading-relaxed`}>{card.description}</p>
              </div>
              <svg className="shrink-0 mt-1 text-gray-400 dark:text-gray-500" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Explore samples */}
      <div className={`mt-10 p-5 ${t.surface} rounded-xl`}>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Just want to explore?</h3>
        <p className={`${t.bodySmall} mb-3`}>
          Load any of the bundled samples directly in the editor — no setup needed.
        </p>
        <Link to="/" className={t.linkAccent}>Open editor and browse samples →</Link>
      </div>
    </div>
  );
}
