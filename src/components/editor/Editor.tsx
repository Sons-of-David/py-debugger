import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type * as MonacoTypes from 'monaco-editor';
import { VISUAL_ELEM_SCHEMA } from '../../api/visualBuilder';
import { OutputTerminal } from '../../output-terminal/OutputTerminal';
import { useTheme } from '../../contexts/ThemeContext';
import { getVizRanges, getVizBadRanges, computeFoldingRanges } from '../../python-engine/viz-block-parser';
import sampleCode from './sample.py?raw';

export const DEFAULT_SAMPLE = sampleCode;

// ── Tabs ──────────────────────────────────────────────────────────────────────

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
function combineTabs(tabs: Tab[]): string {
  return [...tabs].reverse().map(t => t.code).join('\n');
}

/**
 * Map a 1-indexed line number in the combined code back to a specific tab
 * and the corresponding 1-indexed line within that tab.
 *
 * Returns null only if combinedLine is out of range (shouldn't happen in practice).
 */
export function getTabForLine(combinedLine: number, tabs: Tab[]): TabLineInfo | null {
  let offset = 0;
  for (const tab of [...tabs].reverse()) {
    const tabLineCount = tab.code.split('\n').length;
    if (combinedLine <= offset + tabLineCount) {
      return { tab, localLine: combinedLine - offset };
    }
    offset += tabLineCount;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface EditorHandle {
  foldVizBlocks: () => void;
  serialize: () => unknown;
  load: (state: unknown) => void;
  resolveLineTab: (combinedLine: number) => { tabName: string; localLine: number } | null;
  isLineHidden: (combinedLine: number) => boolean;
}

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  isEditable: boolean;
  currentStep?: number;
  currentLine?: number;
  sampleNames?: string[];
  loadSample?: (name: string) => unknown;
  onImportChange?: (sampleName: string | null) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({
  code,
  onChange,
  isEditable,
  currentStep,
  currentLine,
  sampleNames,
  loadSample,
  onImportChange,
}: EditorProps, ref) {
  const { darkMode } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const vizDecorationsRef = useRef<string[]>([]);
  const activeDecorationsRef = useRef<string[]>([]);
  const disposablesRef = useRef<{ dispose(): void }[]>([]);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const monacoTheme = darkMode ? 'vs-dark' : 'vs';

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>(() => [{ id: 'tab-1', name: 'main', code }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dragSrcIdRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [importMenuPos, setImportMenuPos] = useState<{ x: number; y: number } | null>(null);
  // Keep loadSample in a ref so useImperativeHandle.load() always has the latest version
  const loadSampleRef = useRef(loadSample);
  useEffect(() => { loadSampleRef.current = loadSample; }, [loadSample]);

  // Tabs that have a pending viz-block fold (populated by foldVizBlocks, drained as tabs become active)
  const pendingFoldTabsRef = useRef<Set<string>>(new Set());

  const currentLineInfo = currentLine != null ? getTabForLine(currentLine, tabs) : null;
  const isCurrentLineHidden = currentLineInfo?.tab.hidden ?? false;
  const effectiveActiveTabId = (currentLineInfo && !isCurrentLineHidden) ? currentLineInfo.tab.id : activeTabId;
  const localCurrentLine = (currentLineInfo && !isCurrentLineHidden) ? currentLineInfo.localLine : null;
  const activeTab = tabs.find(t => t.id === effectiveActiveTabId) ?? tabs[0];
  const activeCode = activeTab.code;
  const isActiveTabImport = activeTab?.fromImport ?? false;

  // Store effectiveActiveTabId in a ref so handleTabCodeChange always reads the
  // latest value, even if @monaco-editor/react holds a stale closure of the handler.
  const effectiveActiveTabIdRef = useRef(effectiveActiveTabId);
  effectiveActiveTabIdRef.current = effectiveActiveTabId;

  const handleTabCodeChange = useCallback((newCode: string) => {
    const targetId = effectiveActiveTabIdRef.current;
    setTabs(prev => {
      const current = prev.find(t => t.id === targetId);
      if (current?.code === newCode) return prev; // Monaco reflecting current state — skip
      const updated = prev.map(t => t.id === targetId ? { ...t, code: newCode } : t);
      onChange(combineTabs(updated));
      return updated;
    });
  }, [onChange]); // stable: reads targetId from ref, onChange never changes

  const handleTabSelect = useCallback((id: string) => {
    setActiveTabId(id);
    setRenamingTabId(null);
  }, []);

  const handleTabAdd = useCallback(() => {
    const newId = `tab-${Date.now()}`;
    setTabs(prev => {
      const importTabs = prev.filter(t => t.fromImport);
      const userTabs = prev.filter(t => !t.fromImport);
      const newTabs = [...userTabs, { id: newId, name: `tab${userTabs.length + 1}`, code: '' }, ...importTabs];
      onChange(combineTabs(newTabs));
      return newTabs;
    });
    setActiveTabId(newId);
  }, [onChange]);

  const handleTabDelete = useCallback((id: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === id);
      if (tab?.fromImport) return prev;
      if (prev.length <= 1) return prev;
      const newTabs = prev.filter(t => t.id !== id);
      onChange(combineTabs(newTabs));
      if (activeTabId === id) {
        const nextTab = newTabs.filter(t => !t.fromImport).at(-1) ?? newTabs[0];
        setActiveTabId(nextTab.id);
      }
      return newTabs;
    });
  }, [activeTabId, onChange]);

  const handleRenameStart = useCallback((tab: Tab) => {
    setRenamingTabId(tab.id);
    setRenameValue(tab.name);
  }, []);

  const handleRenameCommit = useCallback(() => {
    if (renameValue.trim()) {
      setTabs(prev => prev.map(t => t.id === renamingTabId ? { ...t, name: renameValue.trim() } : t));
    }
    setRenamingTabId(null);
  }, [renamingTabId, renameValue]);

  const handleImportSample = useCallback((name: string) => {
    setImportMenuPos(null);
    const data = loadSample?.(name);
    const editorState = (data && typeof data === 'object' && 'editorState' in data)
      ? (data as { editorState: unknown }).editorState
      : data;
    const rawTabs = (editorState && typeof editorState === 'object' && 'tabs' in editorState
      && Array.isArray((editorState as { tabs: unknown }).tabs))
      ? (editorState as { tabs: Tab[] }).tabs
      : [];
    if (rawTabs.length === 0) return;
    const importedTabs = rawTabs.map(t => ({
      ...t,
      id: `import-${t.id}`,
      fromImport: true as const,
      importSource: name,
    }));
    setTabs(prev => {
      const userTabs = prev.filter(t => !t.fromImport);
      const combined = [...userTabs, ...importedTabs];
      onChange(combineTabs(combined));
      return combined;
    });
    onImportChange?.(name);
  }, [loadSample, onChange, onImportChange]);

  const handleToggleHidden = useCallback((id: string) => {
    setTabs(prev => {
      const newTabs = prev.map(t => t.id === id ? { ...t, hidden: !t.hidden } : t);
      onChange(combineTabs(newTabs));
      return newTabs;
    });
    setTabContextMenu(null);
  }, [onChange]);

  const handleRemoveImport = useCallback(() => {
    setTabs(prev => {
      const newTabs = prev.filter(t => !t.fromImport);
      onChange(combineTabs(newTabs));
      return newTabs;
    });
    setTabContextMenu(null);
    onImportChange?.(null);
  }, [onChange, onImportChange]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setTabContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    dragSrcIdRef.current = id;
  }, []);

  const handleDragOverTab = useCallback((e: React.DragEvent, tabIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const idx = e.clientX < rect.left + rect.width / 2 ? tabIndex : tabIndex + 1;
    dropIndexRef.current = idx;
    setDropIndex(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const srcId = dragSrcIdRef.current;
    const idx = dropIndexRef.current;
    dragSrcIdRef.current = null;
    dropIndexRef.current = null;
    setDropIndex(null);
    if (srcId === null || idx === null) return;
    setTabs(prev => {
      const from = prev.findIndex(t => t.id === srcId);
      if (from === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      const insertAt = idx > from ? idx - 1 : idx;
      next.splice(insertAt, 0, moved);
      onChange(combineTabs(next));
      return next;
    });
  }, [onChange]);

  const handleDragEnd = useCallback(() => {
    dragSrcIdRef.current = null;
    dropIndexRef.current = null;
    setDropIndex(null);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────

  // Update viz block decorations whenever active tab code changes
  const updateVizDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations: editor.IModelDeltaDecoration[] = [];

    for (const r of getVizRanges(activeCode)) {
      for (let line = r.startLine; line <= r.endLine; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'viz-block-line' },
        });
      }
    }

    for (const r of getVizBadRanges(activeCode)) {
      for (let line = r.startLine; line <= r.endLine; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'viz-block-error-line' },
        });
      }
    }

    vizDecorationsRef.current = editor.deltaDecorations(vizDecorationsRef.current, decorations);
  }, [activeCode]);

  // Update active step decoration (highlight the current executed line).
  // If the target line is inside a collapsed region, highlights the fold header instead.
  const updateActiveDecoration = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (localCurrentLine == null) {
      activeDecorationsRef.current = editor.deltaDecorations(activeDecorationsRef.current, []);
      return;
    }

    // HiddenRangeModel tracks the merged set of lines hidden by collapsed folds.
    // A hidden range [start, end] means the fold header is at start-1.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foldingController = editor.getContribution<any>('editor.contrib.folding');
    const hiddenRanges: Array<{ startLineNumber: number; endLineNumber: number }> =
      foldingController?.hiddenRangeModel?.hiddenRanges ?? [];

    let line = localCurrentLine;
    for (const range of hiddenRanges) {
      if (range.startLineNumber <= line && line <= range.endLineNumber) {
        line = range.startLineNumber - 1;
        break;
      }
    }

    activeDecorationsRef.current = editor.deltaDecorations(activeDecorationsRef.current, [{
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'active-executed-line',
        marginClassName: 'active-executed-line-margin',
      },
    }]);
  }, [localCurrentLine]);

  // Keep a ref so the fold-change listener always calls the latest closure.
  const updateActiveDecorationRef = useRef(updateActiveDecoration);
  useEffect(() => { updateActiveDecorationRef.current = updateActiveDecoration; }, [updateActiveDecoration]);

  // Scroll to the current executed line when it changes
  useEffect(() => {
    if (localCurrentLine != null && editorRef.current) {
      editorRef.current.revealLineInCenterIfOutsideViewport(localCurrentLine);
    }
  }, [localCurrentLine]);

  useEffect(() => {
    updateVizDecorations();
  }, [updateVizDecorations, editorMountKey]);

  useEffect(() => {
    updateActiveDecoration();
  }, [updateActiveDecoration, editorMountKey]);

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    vizDecorationsRef.current = [];
    activeDecorationsRef.current = [];
    setEditorMountKey((k) => k + 1);

    // Re-run the active step decoration when the user folds/unfolds a region.
    // onDidChangeHiddenAreas covers view-layer fold changes; foldingModel.onDidChange
    // catches fold state changes before the view layer (belt-and-suspenders).
    disposablesRef.current.push(editorInstance.onDidChangeHiddenAreas(() => {
      updateActiveDecorationRef.current();
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foldingController = editorInstance.getContribution<any>('editor.contrib.folding');
    const modelPromise = foldingController?.getFoldingModel?.();
    if (modelPromise) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modelPromise.then((foldingModel: any) => {
        if (foldingModel) {
          disposablesRef.current.push(foldingModel.onDidChange(() => {
            // Defer until after HiddenRangeModel has processed the change and the
            // synchronous change-decoration chain has fully completed.
            Promise.resolve().then(() => updateActiveDecorationRef.current());
          }));
        }
      });
    }

    monaco.languages.setLanguageConfiguration('python', {
      comments: { lineComment: '#' },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });

    // Register folding range provider for viz blocks + indentation-based Python blocks
    const foldingDisposable = monaco.languages.registerFoldingRangeProvider('python', {
      provideFoldingRanges: (model: MonacoTypes.editor.ITextModel) => {
        const code = model.getValue();
        return computeFoldingRanges(code, getVizRanges(code)).map((r) => ({
          start: r.start,
          end: r.end,
          kind: r.isVizBlock ? monaco.languages.FoldingRangeKind.Region : undefined,
        }));
      },
    });
    disposablesRef.current.push(foldingDisposable);

    // Completion provider
    const completionDisposable = monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.'],
      provideCompletionItems: (
        model: MonacoTypes.editor.ITextModel,
        position: MonacoTypes.Position
      ) => {
        const line = model.getLineContent(position.lineNumber);
        const before = line.slice(0, position.column - 1);
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        );

        const items: MonacoTypes.languages.CompletionItem[] = [];

        const afterDot = before.match(/\.\s*(\w*)$/);
        if (afterDot) {
          const prefix = afterDot[1].toLowerCase();
          for (const cls of VISUAL_ELEM_SCHEMA) {
            for (const p of cls.properties) {
              if (!prefix || p.name.toLowerCase().startsWith(prefix)) {
                items.push({
                  label: p.name,
                  kind: monaco.languages.CompletionItemKind.Property,
                  detail: p.type,
                  documentation: p.description,
                  insertText: p.name,
                  range,
                });
              }
            }
            for (const m of cls.methods ?? []) {
              if (!prefix || m.name.toLowerCase().startsWith(prefix)) {
                items.push({
                  label: m.name,
                  kind: monaco.languages.CompletionItemKind.Method,
                  detail: m.signature,
                  documentation: m.docstring,
                  insertText: m.name,
                  range,
                });
              }
            }
          }
          if (items.length > 0) return { suggestions: items };
        }

        const linePrefix = before.replace(/\s*$/, '');
        const isNewWord = /(?:^|[^\w])$/.test(linePrefix) || linePrefix === '';
        const partial = word.word;
        if (isNewWord || partial.length > 0) {
          for (const cls of VISUAL_ELEM_SCHEMA) {
            if (partial && !cls.objName.toLowerCase().startsWith(partial.toLowerCase())) continue;
            items.push({
              label: cls.objName,
              kind: monaco.languages.CompletionItemKind.Class,
              documentation: cls.docstring,
              insertText: cls.objName,
              range,
            });
          }
        }
        return items.length > 0 ? { suggestions: items } : { suggestions: [] };
      },
    });
    disposablesRef.current.push(completionDisposable);

    // Auto-close # @viz blocks: pressing Enter on an unclosed # @viz line
    // expands it to "# @viz\n\n# @end" with the cursor on the blank middle line.
    editorInstance.addCommand(monaco.KeyCode.Enter, () => {
      const model = editorInstance.getModel();
      const position = editorInstance.getPosition();
      const selections = editorInstance.getSelections();
      if (!model || !position || !selections || selections.length !== 1 || !selections[0].isEmpty()) {
        editorInstance.trigger('keyboard', 'type', { text: '\n' });
        return;
      }

      const lineContent = model.getLineContent(position.lineNumber);
      if (lineContent.trim() === '# @viz') {
        // Check whether a # @end already closes this block
        const lineCount = model.getLineCount();
        let isClosed = false;
        for (let i = position.lineNumber + 1; i <= lineCount; i++) {
          const l = model.getLineContent(i).trim();
          if (l === '# @end') { isClosed = true; break; }
          if (l === '# @viz') break; // another unclosed block starts
        }

        if (!isClosed) {
          const indent = lineContent.match(/^(\s*)/)?.[1] ?? '';
          const endCol = model.getLineMaxColumn(position.lineNumber);
          editorInstance.executeEdits('viz-block-close', [{
            range: new monaco.Range(position.lineNumber, endCol, position.lineNumber, endCol),
            text: '\n' + indent + '\n' + indent + '# @end',
          }]);
          editorInstance.setPosition({ lineNumber: position.lineNumber + 1, column: indent.length + 1 });
          return;
        }
      }

      editorInstance.trigger('keyboard', 'type', { text: '\n' });
    });

    // Hover provider
    const hoverDisposable = monaco.languages.registerHoverProvider('python', {
      provideHover: (
        model: MonacoTypes.editor.ITextModel,
        position: MonacoTypes.Position
      ) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const name = word.word;

        for (const cls of VISUAL_ELEM_SCHEMA) {
          if (cls.objName === name) {
            const content = [
              `**${cls.objName}**`,
              cls.docstring,
              ...cls.properties.map((p) => `- \`${p.name}\`: ${p.type} — ${p.description}`),
              ...(cls.methods ?? []).map((m) => `- \`${m.signature}\` — ${m.docstring}`),
            ].join('\n\n');
            return { contents: [{ value: content }], range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn) };
          }
          for (const p of cls.properties) {
            if (p.name === name) {
              const content = `\`${p.name}\`: ${p.type}\n\n${p.description}`;
              return { contents: [{ value: content }], range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn) };
            }
          }
          for (const m of cls.methods ?? []) {
            if (m.name === name) {
              const content = `\`${m.signature}\`\n\n${m.docstring}`;
              return { contents: [{ value: content }], range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn) };
            }
          }
        }
        return null;
      },
    });
    disposablesRef.current.push(hoverDisposable);
  };

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
    };
  }, []);

  // Fold viz blocks for the code currently shown in Monaco
  const foldActiveVizBlocks = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const vizRanges = getVizRanges(activeCode);
    if (vizRanges.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foldingController = editor.getContribution<any>('editor.contrib.folding');
    foldingController?.getFoldingModel?.()?.then((foldingModel: any) => {
      if (!foldingModel) return;
      const toCollapse: unknown[] = [];
      for (const r of vizRanges) {
        const region = foldingModel.getRegionAtLine(r.startLine);
        if (region && !region.isCollapsed) toCollapse.push(region);
      }
      if (toCollapse.length > 0) foldingModel.toggleCollapseState(toCollapse);
    });
  }, [activeCode]);

  // Keep a ref so the pending-fold effect always calls the latest version without
  // taking foldActiveVizBlocks as a dependency (which would cause the effect to
  // re-run on every code edit and re-collapse a manually opened viz block).
  const foldActiveVizBlocksRef = useRef(foldActiveVizBlocks);
  useEffect(() => { foldActiveVizBlocksRef.current = foldActiveVizBlocks; }, [foldActiveVizBlocks]);

  // When the active tab changes, fold its viz blocks if it has a pending fold
  useEffect(() => {
    if (!pendingFoldTabsRef.current.has(effectiveActiveTabId)) return;
    pendingFoldTabsRef.current.delete(effectiveActiveTabId);
    requestAnimationFrame(() => foldActiveVizBlocksRef.current());
  }, [effectiveActiveTabId, editorMountKey]);

  useImperativeHandle(ref, () => ({
    foldVizBlocks: () => {
      // Mark every tab as pending so they each fold when first viewed
      for (const t of tabs) pendingFoldTabsRef.current.add(t.id);
      // Fold the currently visible tab immediately
      foldActiveVizBlocks();
    },
    serialize: () => ({
      tabs: tabs.map(t =>
        t.fromImport
          ? { id: t.id, name: t.name, fromImport: true, importSource: t.importSource, hidden: t.hidden }
          : t
      ),
    }),
    resolveLineTab: (combinedLine) => {
      const info = getTabForLine(combinedLine, tabs);
      return info ? { tabName: info.tab.name, localLine: info.localLine } : null;
    },
    isLineHidden: (combinedLine) => {
      const info = getTabForLine(combinedLine, tabs);
      return info?.tab.hidden ?? false;
    },
    load: (state: unknown) => {
      let parsedTabs: Tab[];
      if (state && typeof state === 'object' && 'tabs' in state && Array.isArray((state as { tabs: unknown }).tabs)) {
        parsedTabs = (state as { tabs: Tab[] }).tabs;
      } else if (typeof state === 'string') {
        parsedTabs = [{ id: 'tab-1', name: 'main', code: state }];
      } else {
        parsedTabs = [{ id: 'tab-1', name: 'main', code: '' }];
      }

      // Resolve any fromImport tabs that have no code (saved as references)
      const importSources = [...new Set(
        parsedTabs.filter(t => t.fromImport && t.importSource && !t.code).map(t => t.importSource!)
      )];
      const injectedTabs: Tab[] = importSources.flatMap(source => {
        const data = loadSampleRef.current?.(source);
        const editorState = (data && typeof data === 'object' && 'editorState' in data)
          ? (data as { editorState: unknown }).editorState
          : data;
        const srcTabs = (editorState && typeof editorState === 'object' && 'tabs' in editorState
          && Array.isArray((editorState as { tabs: unknown }).tabs))
          ? (editorState as { tabs: Tab[] }).tabs
          : [];
        return srcTabs.map(t => ({
          ...t,
          id: `import-${t.id}`,
          fromImport: true as const,
          importSource: source,
          hidden: parsedTabs.find(s => s.importSource === source && s.name === t.name)?.hidden ?? t.hidden ?? false,
        }));
      });

      const newTabs = importSources.length > 0
        ? [...parsedTabs.filter(t => !t.fromImport), ...injectedTabs]
        : parsedTabs;

      setTabs(newTabs);
      setActiveTabId((newTabs.find(t => !t.fromImport) ?? newTabs[0]).id);
      onChange(combineTabs(newTabs));

      // Clear Monaco's undo stack. @monaco-editor/react uses executeEdits() when
      // the value prop changes, which preserves undo history. Calling model.setValue()
      // directly resets the undo/redo stack, so Ctrl+Z won't return to the previous sample.
      const activeCodeAfterLoad = (newTabs.find(t => !t.fromImport) ?? newTabs[0]).code ?? '';
      editorRef.current?.getModel()?.setValue(activeCodeAfterLoad);
    },
  }), [tabs, onChange, foldActiveVizBlocks]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      
      {/* Tab bar */}
      <div
        className="flex-shrink-0 h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex items-stretch overflow-x-auto"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null); }}
      >
        {tabs.flatMap((tab, i) => [
          <div
            key={`di-${i}`}
            className={`w-0.5 self-stretch shrink-0 transition-colors ${dropIndex === i ? 'bg-indigo-500' : ''}`}
          />,
          tab.hidden ? (
            // Hidden tab — narrow patterned strip, no label
            <div
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              onContextMenu={e => handleTabContextMenu(e, tab.id)}
              className={[
                'w-4 cursor-pointer select-none border-r border-gray-300 dark:border-gray-700 shrink-0',
                tab.id === effectiveActiveTabId ? 'border-b-2 border-b-indigo-500' : '',
              ].join(' ')}
              style={{
                background: tab.fromImport
                  ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(99,102,241,0.15) 3px, rgba(99,102,241,0.15) 6px)'
                  : (tab.id === effectiveActiveTabId
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(99,102,241,0.15) 3px, rgba(99,102,241,0.15) 6px)'
                    : 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(150,150,150,0.15) 3px, rgba(150,150,150,0.15) 6px)'),
              }}
            />
          ) : (
            // Normal or import tab — same container, conditional label/icon/close
            <div
              key={tab.id}
              draggable={isEditable}
              onDragStart={() => isEditable && handleDragStart(tab.id)}
              onDragOver={e => isEditable && handleDragOverTab(e, i)}
              onDragEnd={isEditable ? handleDragEnd : undefined}
              onClick={() => handleTabSelect(tab.id)}
              onDoubleClick={() => isEditable && !tab.fromImport && handleRenameStart(tab)}
              onContextMenu={e => handleTabContextMenu(e, tab.id)}
              className={[
                'flex items-center gap-1 px-3 cursor-pointer select-none border-r border-gray-300 dark:border-gray-700 shrink-0',
                tab.id === effectiveActiveTabId
                  ? 'border-b-2 border-b-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              {tab.fromImport ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-50 flex-shrink-0">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              ) : renamingTabId === tab.id ? (
                <input
                  autoFocus
                  className="w-20 text-sm bg-transparent outline outline-1 outline-indigo-400 rounded px-1"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={handleRenameCommit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameCommit();
                    if (e.key === 'Escape') setRenamingTabId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : null}
              <span className="text-sm">{tab.name}</span>
              {isEditable && !tab.fromImport && tabs.filter(t => !t.fromImport).length > 1 && (
                <button
                  className="ml-1 text-xs leading-none text-gray-400 hover:text-red-400 dark:hover:text-red-400"
                  onClick={e => { e.stopPropagation(); handleTabDelete(tab.id); }}
                  title="Close tab"
                >×</button>
              )}
            </div>
          ),
        ])}
        <div
          key="di-last"
          className={`w-0.5 self-stretch shrink-0 transition-colors ${dropIndex === tabs.length ? 'bg-indigo-500' : ''}`}
        />
        {isEditable && (
          <button
            onClick={handleTabAdd}
            onContextMenu={e => {
              e.preventDefault();
              if (sampleNames?.length) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setImportMenuPos({ x: rect.left, y: rect.bottom });
              }
            }}
            className="px-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-lg leading-none shrink-0"
            title={sampleNames?.length ? 'Add tab (right-click to import)' : 'Add tab'}
          >+</button>
        )}
        {!isEditable && (
          <div className="ml-auto flex items-center pr-3">
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Read-only</span>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          defaultLanguage="python"
          theme={monacoTheme}
          value={activeCode}
          onChange={(value) => handleTabCodeChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !isEditable || isActiveTabImport,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
          }}
        />
      </div>

      <OutputTerminal currentStep={currentStep ?? 0} />

      <style>{`
        .viz-block-line {
          background-color: rgba(99, 102, 241, 0.07) !important;
          border-left: 2px solid rgba(99, 102, 241, 0.3) !important;
        }
        .viz-block-error-line {
          background-color: rgba(239, 68, 68, 0.08) !important;
          border-left: 2px solid rgba(239, 68, 68, 0.5) !important;
        }
        .active-executed-line {
          background-color: rgba(250, 204, 21, 0.18) !important;
        }
        .active-executed-line-margin {
          background-color: rgba(250, 204, 21, 0.5) !important;
          border-left: 3px solid #facc15 !important;
        }
      `}</style>

      {/* Import sample menu */}
      {importMenuPos && sampleNames && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setImportMenuPos(null)} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1 text-sm max-h-64 overflow-y-auto"
            style={{ left: importMenuPos.x, top: importMenuPos.y }}
          >
            <div className="px-4 py-1 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 mb-1">Import tabs from sample</div>
            {sampleNames.map(name => (
              <button
                key={name}
                className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                onMouseDown={e => { e.preventDefault(); handleImportSample(name); }}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Tab context menu */}
      {tabContextMenu && (() => {
        const ctxTab = tabs.find(t => t.id === tabContextMenu.tabId);
        if (!ctxTab) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onMouseDown={() => setTabContextMenu(null)}
            />
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1 text-sm"
              style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
            >
              <button
                className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                onMouseDown={e => { e.preventDefault(); handleToggleHidden(tabContextMenu.tabId); }}
              >
                {ctxTab.hidden ? 'Show tab' : 'Hide tab'}
              </button>
              {ctxTab.fromImport && (
                <button
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 dark:text-red-400"
                  onMouseDown={e => { e.preventDefault(); handleRemoveImport(); }}
                >
                  Remove import
                </button>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
});
