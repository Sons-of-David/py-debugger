import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type * as MonacoTypes from 'monaco-editor';
import { VISUAL_ELEM_SCHEMA } from '../../api/visualBuilder';
import { OutputTerminal } from '../../output-terminal/OutputTerminal';
import { useTheme } from '../../contexts/ThemeContext';
import { getVizRanges, getVizBadRanges } from '../../python-engine/viz-block-parser';
import sampleCode from './sample.py?raw';

export const DEFAULT_SAMPLE = sampleCode;

export interface EditorHandle {
  foldVizBlocks: () => void;
}

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  isEditable: boolean;
  currentStep?: number;
  currentLine?: number;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({
  code,
  onChange,
  isEditable,
  currentStep,
  currentLine,
}: EditorProps, ref) {
  const { darkMode } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const vizDecorationsRef = useRef<string[]>([]);
  const activeDecorationsRef = useRef<string[]>([]);
  const disposablesRef = useRef<{ dispose(): void }[]>([]);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const monacoTheme = darkMode ? 'vs-dark' : 'vs';

  // Update viz block decorations whenever code changes
  const updateVizDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations: editor.IModelDeltaDecoration[] = [];

    for (const r of getVizRanges(code)) {
      for (let line = r.startLine; line <= r.endLine; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'viz-block-line' },
        });
      }
    }

    for (const r of getVizBadRanges(code)) {
      for (let line = r.startLine; line <= r.endLine; line++) {
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: { isWholeLine: true, className: 'viz-block-error-line' },
        });
      }
    }

    vizDecorationsRef.current = editor.deltaDecorations(vizDecorationsRef.current, decorations);
  }, [code]);

  // Update active step decoration (highlight the current executed line)
  const updateActiveDecoration = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations: editor.IModelDeltaDecoration[] = [];

    if (currentLine != null) {
      decorations.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'active-executed-line',
          marginClassName: 'active-executed-line-margin',
        },
      });
    }

    activeDecorationsRef.current = editor.deltaDecorations(activeDecorationsRef.current, decorations);
  }, [currentLine]);

  // Scroll to the current executed line when it changes
  useEffect(() => {
    if (currentLine != null && editorRef.current) {
      editorRef.current.revealLineInCenterIfOutsideViewport(currentLine);
    }
  }, [currentLine]);

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
        const ranges: MonacoTypes.languages.FoldingRange[] = [];

        // Viz block ranges
        for (const r of getVizRanges(code)) {
          ranges.push({ start: r.startLine, end: r.endLine, kind: monaco.languages.FoldingRangeKind.Region });
        }

        // Indentation-based ranges for standard Python blocks
        const lines = model.getLinesContent();
        // Precompute indent levels (-1 for blank/comment lines)
        const indents = lines.map((line) => {
          const trimmed = line.trimStart();
          return trimmed === '' || trimmed.startsWith('#') ? -1 : line.length - trimmed.length;
        });
        const lastContentLine = indents.reduce((last, d, i) => (d !== -1 ? i + 1 : last), 0);
        const stack: { indent: number; startLine: number }[] = [];
        for (let i = 0; i < lines.length; i++) {
          const indent = indents[i];
          if (indent === -1) continue;
          // Close ranges whose indent is >= current
          while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
            const closed = stack.pop()!;
            let endIdx = i - 1;
            while (endIdx >= 0 && lines[endIdx].trim() === '') endIdx--;
            const endLine = endIdx + 1; // convert to 1-indexed
            if (endLine > closed.startLine) ranges.push({ start: closed.startLine, end: endLine });
          }
          // Only start a fold here if the next non-blank line has greater indentation
          let nextIndent = -1;
          for (let j = i + 1; j < lines.length; j++) {
            if (indents[j] !== -1) { nextIndent = indents[j]; break; }
          }
          if (nextIndent > indent) stack.push({ indent, startLine: i + 1 }); // 1-indexed
        }
        while (stack.length > 0) {
          const closed = stack.pop()!;
          if (lastContentLine > closed.startLine) ranges.push({ start: closed.startLine, end: lastContentLine });
        }

        return ranges;
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
            text: '\n\n' + indent + '# @end',
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

  useImperativeHandle(ref, () => ({
    foldVizBlocks: () => {
      const editor = editorRef.current;
      if (!editor) return;
      const vizRanges = getVizRanges(code);
      if (vizRanges.length === 0) return;
      // Access the folding model directly instead of using editor.trigger('fold'),
      // which is async and loses the correct selection by the time it runs.
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
    },
  }), [code]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex-shrink-0 h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Python Code</span>
          {!isEditable && (
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          defaultLanguage="python"
          theme={monacoTheme}
          value={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !isEditable,
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
    </div>
  );
});
