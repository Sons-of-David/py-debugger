// Shared Tailwind token strings for tutorial pages.
// All strings are complete class names — safe for Tailwind's static scanner.

export const t = {
  // Text
  heading1:    'text-3xl font-bold text-gray-900 dark:text-gray-100',
  heading2:    'text-xl font-semibold text-gray-900 dark:text-gray-100',
  heading3:    'font-semibold text-gray-800 dark:text-gray-200 text-sm',
  body:        'text-gray-600 dark:text-gray-400',
  bodySmall:   'text-sm text-gray-600 dark:text-gray-400',
  muted:       'text-sm text-gray-500 dark:text-gray-400',
  strong:      'text-gray-700 dark:text-gray-300',

  // Inline code
  inlineCode:  'bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200',

  // Cards / surfaces
  card:        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
  surface:     'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  divider:     'border-gray-200 dark:border-gray-700',

  // Buttons / links
  btnPrimary:  'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium',
  linkMuted:   'text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
  linkAccent:  'text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium',

  // CTA banner (e.g. "Open in Editor" strip)
  ctaBanner:   'flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl',
  ctaTitle:    'text-sm font-medium text-indigo-900 dark:text-indigo-200',
  ctaSubtitle: 'text-xs text-indigo-600 dark:text-indigo-400',

  // Step indicator bullet
  stepBullet:  'shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center',
};
