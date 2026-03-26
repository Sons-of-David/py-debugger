import { NavLink, Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { t } from './theme';

const NAV = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Overview', to: '/tutorials' },
      { label: 'Getting Started', to: '/tutorials/getting-started' },
    ],
  },
  {
    section: 'Features',
    items: [
      { label: 'Visual Elements', to: '/tutorials/visual-elements' },
      { label: 'Tracing & Variables', to: '/tutorials/tracing' },
      { label: 'Interactive Mode', to: '/tutorials/interactive-mode' },
    ],
  },
  {
    section: 'Algorithm Walkthroughs',
    items: [
      { label: 'Selection Sort', to: '/tutorials/algorithms/selection-sort' },
      { label: 'Bubble Sort', to: '/tutorials/algorithms/bubble-sort' },
      { label: 'Trapping Rain', to: '/tutorials/algorithms/trapping-rain' },
      { label: 'BFS Maze', to: '/tutorials/algorithms/bfs-maze' },
    ],
  },
];

export function TutorialLayout() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="2" y1="4" x2="16" y2="4" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="14" x2="16" y2="14" />
            </svg>
          </button>
          <Link to="/tutorials" className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            AlgoPlay
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Tutorials</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <Link to="/" className={t.btnPrimary}>Open Editor</Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <nav className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto py-6 px-3">
            {NAV.map((group) => (
              <div key={group.section} className="mb-6">
                <p className="px-3 mb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {group.section}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/tutorials'}
                        className={({ isActive }) =>
                          isActive
                            ? 'block px-3 py-1.5 rounded text-sm transition-colors bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'block px-3 py-1.5 rounded text-sm transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
