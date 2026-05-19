// Shared editor types and code-extraction utilities used by both Editor.tsx and EmbedPage.tsx.

export interface Tab {
  id: string;
  name: string;
  code: string;
  hidden?: boolean; // if true: executes but shows as a narrow strip in the tab bar; trace skips it
  fromImport?: boolean; // read-only, not persisted, removed as a group
  importSource?: string; // rawName of the source sample (set when fromImport)
}

export interface TabLineInfo {
  tab: Tab;
  localLine: number; // 1-indexed line within that tab's code
}

/** Combine tabs rightmost-first (rightmost tab's code appears at the top). */
export function combineTabs(tabs: Tab[]): string {
  return [...tabs].reverse().map(t => t.code).join('\n');
}

/**
 * Parse an editor state value and resolve any fromImport tabs into a flat Tab[].
 *
 * Handles:
 *  - Modern `{ tabs: Tab[] }` object — possibly with fromImport placeholder tabs
 *  - Legacy plain `string` — treated as a single "main" tab
 *  - undefined / null / other — returns []
 *
 * @param state      The raw editorState or userCode value from a SaveFile.
 * @param getSample  Optional resolver for fromImport tabs. Given a rawName, should
 *                   return whatever the sample registry returns for that name
 *                   (a SaveFile-shaped object, or unknown). The function extracts
 *                   `editorState` from it automatically.
 */
export function resolveEditorTabs(
  state: unknown,
  getSample?: (rawName: string) => unknown,
): Tab[] {
  let parsedTabs: Tab[];

  if (state && typeof state === 'object' && 'tabs' in state && Array.isArray((state as { tabs: unknown }).tabs)) {
    parsedTabs = (state as { tabs: Tab[] }).tabs;
  } else if (typeof state === 'string') {
    parsedTabs = [{ id: 'tab-1', name: 'main', code: state }];
  } else {
    return [];
  }

  if (!getSample) return parsedTabs;

  const importSources = [...new Set(
    parsedTabs.filter(t => t.fromImport && t.importSource && !t.code).map(t => t.importSource!),
  )];

  if (importSources.length === 0) return parsedTabs;

  const injectedTabs: Tab[] = importSources.flatMap(source => {
    const raw = getSample(source);
    // raw may be a full SaveFile object ({ editorState, ... }) or just the editorState itself
    const srcEditorState = (raw && typeof raw === 'object' && 'editorState' in raw)
      ? (raw as { editorState: unknown }).editorState
      : raw;
    const srcTabs = (
      srcEditorState && typeof srcEditorState === 'object' &&
      'tabs' in srcEditorState && Array.isArray((srcEditorState as { tabs: unknown }).tabs)
    )
      ? (srcEditorState as { tabs: Tab[] }).tabs
      : [];
    return srcTabs.map(t => ({
      ...t,
      id: `import-${t.id}`,
      fromImport: true as const,
      importSource: source,
      hidden: parsedTabs.find(s => s.importSource === source && s.name === t.name)?.hidden ?? t.hidden ?? false,
    }));
  });

  return [...parsedTabs.filter(t => !t.fromImport), ...injectedTabs];
}

/**
 * Extract the combined runnable code string from an editor state value.
 * Equivalent to `combineTabs(resolveEditorTabs(state, getSample))`.
 */
export function extractCodeFromEditorState(
  state: unknown,
  getSample?: (rawName: string) => unknown,
): string {
  return combineTabs(resolveEditorTabs(state, getSample));
}
