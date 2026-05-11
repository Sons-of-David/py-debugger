// =============================================================================
// App.tsx — top-level orchestrator for the full editor experience
//
// Responsibilities:
//   - Pyodide lifecycle: loading, ready state, reset between runs
//   - Run analysis: execute user code, receive TraceStageInfo, transition to trace mode
//   - App mode state machine: idle → trace → interactive (and back to idle via Edit)
//   - Timeline navigation: currentStep, stepCount, goToStep, changedIds
//   - File I/O: save/load project JSON, auto-load sample on mount
//   - Keyboard shortcuts: Ctrl+Enter (analyze), Ctrl+S (save)
//   - Animation settings: enabled toggle, duration
//   - Layout: resizable split between Editor panel (left) and Visual Panel (right)
//
//
// TODO:
//   - Serialization should be per component:
//     - Editor handles userCode and exposes serialize/deserialize methods for its state
//     - GridArea handles textBoxes and any future visual state
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGifExport } from '../capture/useGifExport';

import { Group, Panel, Separator } from 'react-resizable-panels';
import { Editor, DEFAULT_SAMPLE, type EditorHandle } from '../components/editor/Editor';
import { useTheme } from '../contexts/ThemeContext';
import { AnimationContext } from '../animation/animationContext';
import { resetPythonState } from '../python-engine/pyodide-runtime';
import { usePyodideLoader } from '../python-engine/usePyodideLoader';
import { clearAll as clearTerminal, commitSegment, appendError, setOutputTimeline } from '../output-terminal/terminalState';
import { ApiReferencePanel } from '../api/ApiReferencePanel';
import { TimelineControls } from '../timeline/TimelineControls';
import { ExtrasMenu } from './ExtrasMenu';
import { SamplesMenu } from './SamplesMenu';
import { FeedbackModal } from '../components/FeedbackModal';
import { GridArea, type GridAreaHandle } from './GridArea';
import { getMaxTime } from '../timeline/timelineState';
import { useTimelineNavigation, type AppMode } from '../timeline/useTimelineNavigation';
import { executeCode, type TraceStageInfo } from '../python-engine/executor';
import { setHandlers, hasAnyClickHandler } from '../visual-panel/handlersState';

export interface SaveFile {
  editorState?: unknown;
  userCode?: string;      // legacy field — migrated by Editor.load()
  visualPanel?: unknown;
}

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const AUTO_ANALYZE_ON_LOAD = true; // set to false to disable auto-analyze when loading a file
const DEFAULT_SAMPLE_RAWNAME = 'algorithms/1-bfs-maze'; // loaded on init when no ?sample= param is given

import { SAMPLES } from './sampleRegistry';

/* ---------- Shared Tailwind class groups ---------- */

const buttonBase =
  'px-3 py-1 rounded text-sm font-medium transition-colors';

const buttonNeutral =
  `${buttonBase} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;



function App() {
  const { darkMode, toggleDarkMode } = useTheme();

  const gridAreaRef = useRef<GridAreaHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const pendingPostLoadRef = useRef(false);
  const [projectName, setProjectName] = useState('untitled');

  // Dirty-state tracking: null = nothing loaded yet (suppress dialog on first auto-load)
  const lastLoadedCodeRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const autoLoadedRef = useRef(false);
  const { pyodideReady, pyodideLoading } = usePyodideLoader();
  const [apiReferenceOpen, setApiReferenceOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationDuration, setAnimationDuration] = useState(200); // ms

  // editor state
  const [userCode, setUserCode] = useState(DEFAULT_SAMPLE);
  const handleCodeChange = useCallback((code: string) => {
    setUserCode(code);
    if (lastLoadedCodeRef.current !== null) {
      setIsDirty(code !== lastLoadedCodeRef.current);
    }
  }, []);
  const [isEditable, setIsEditable] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [appMode, setAppMode] = useState<AppMode>('idle');
  const mouseEnabled = appMode === 'interactive';

  const {
    currentStep, stepCount, timeline, hasInteractiveElements, setHasInteractiveElements,
    currentElements, changedIds, goToStep, setTimelineData, resetTimeline,
  } = useTimelineNavigation(appMode);

  const navigateToStep = useCallback((targetStep: number) => {
    const maxStep = Math.max(0, timeline.length - 1);
    const direction = targetStep >= currentStep ? 1 : -1;
    let step = Math.max(0, Math.min(maxStep, targetStep));
    while (step >= 0 && step <= maxStep) {
      const line = timeline[step]?.line;
      if (line == null || !editorRef.current?.isLineHidden(line)) break;
      const next = step + direction;
      if (next < 0 || next > maxStep) return; // no visible step in this direction, stay put
      step = next;
    }
    goToStep(step);
  }, [goToStep, timeline, currentStep]);

  const { handleCreateGif, isCreatingGif } = useGifExport({ darkMode });
  const [flashInteractive, setFlashInteractive] = useState(false);

  const handleTraceClickAttempt = useCallback(() => {
    if (!hasInteractiveElements) return;
    setFlashInteractive(true);
    setTimeout(() => setFlashInteractive(false), 700);
  }, [hasInteractiveElements]);


  // ---------------------------------------------------------------------------
  // Main Flow
  // ---------------------------------------------------------------------------

  const handleEdit = useCallback(() => {
    setIsEditable(true);
    setHandlers({});
    setHasInteractiveElements(false);
    setAppMode('idle');
  }, [setHasInteractiveElements]);

  // Internal reset (no dirty check) — used by doLoad and when user confirms discard
  const doReset = useCallback(() => {
    resetPythonState();
    resetTimeline();
    setProjectName('untitled');
    lastLoadedCodeRef.current = '';
    editorRef.current?.load(null);  // fires onChange('') → setUserCode('')
    setIsDirty(false);
    gridAreaRef.current?.load({});
    handleEdit();
  }, [resetTimeline, handleEdit]);

  // Public reset — shows unsaved-changes dialog if dirty
  const handleReset = useCallback(() => {
    if (isDirty) {
      pendingActionRef.current = doReset;
      setShowUnsavedDialog(true);
    } else {
      doReset();
    }
  }, [isDirty, doReset]);

  const startTrace = useCallback((result: TraceStageInfo) => {
    setHandlers(result.handlers ?? {});
    const interactive = hasAnyClickHandler();
    setTimelineData(result.timeline, interactive);
    setOutputTimeline(result.timeline.map(s => ({ text: s.output ?? '', isViz: s.isViz ?? false })));

    const hasVisibleSteps = result.timeline.some(step =>
      step.line != null && !editorRef.current?.isLineHidden(step.line)
    );

    if (!hasVisibleSteps && interactive) {
      commitSegment('----- end trace -----');
      setAppMode('interactive');
    } else {
      setAppMode('trace');
    }
  }, [setTimelineData]);

  const handleAnalyze = useCallback(async () => {
    if (!userCode.trim()) return;
    setIsAnalyzing(true);
    clearTerminal();
    try {
      const result = await executeCode(userCode, (n) => editorRef.current?.resolveLineTab(n) ?? null);
      if (!result.error) {
        setIsEditable(false);
        startTrace(result);
      } else {
        appendError(result.error ?? 'Unknown error');
      }
    } catch (err) {
      appendError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [userCode, startTrace]);

  // Whenever appMode becomes 'interactive' (from any path), jump to the last step.
  useEffect(() => {
    if (appMode === 'interactive') goToStep(getMaxTime());
  }, [appMode, goToStep]);

  const handleEnterInteractive = useCallback(() => {
    commitSegment('----- end trace -----');
    setAppMode('interactive');
  }, []);

  // ---------------------------------------------------------------------------
  // Load \ Save
  // ---------------------------------------------------------------------------

  const serializeProject = useCallback(() => {
    const name = projectName.trim() || 'untitled';
    const content = JSON.stringify({ editorState: editorRef.current?.serialize(), visualPanel: gridAreaRef.current?.serialize() ?? {} } satisfies SaveFile, null, 2);
    return { name, content };
  }, [projectName]);

  // Auto-save to autosave/ when the HMR WebSocket drops (dev only — Codespace sleep, etc.)
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  const serializeProjectRef = useRef(serializeProject);
  useEffect(() => { serializeProjectRef.current = serializeProject; }, [serializeProject]);
  useEffect(() => {
    if (!import.meta.env.DEV || !import.meta.hot) return;
    const handler = () => {
      if (!isDirtyRef.current) return;
      const { name, content } = serializeProjectRef.current();
      const baseName = name.split('/').pop() ?? name;
      void fetch('/api/save-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `autosave/${baseName}`, content }),
      }).catch(() => {});
    };
    import.meta.hot.on('vite:ws:disconnect', handler);
    return () => { import.meta.hot?.off('vite:ws:disconnect', handler); };
  }, []);

  const handleSave = useCallback(() => {
    lastLoadedCodeRef.current = userCode;  // userCode is already the combined string from onChange
    setIsDirty(false);
    const { name, content } = serializeProject();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [serializeProject, userCode]);

  // Internal load (no dirty check) — performs the full reset+load in one shot
  const doLoad = useCallback((data: SaveFile, name: string) => {
    const editorState = data.editorState ?? data.userCode;
    if (!editorState) {
      appendError('Invalid file: missing editor content');
      return;
    }
    resetPythonState();
    resetTimeline();
    handleEdit();
    setProjectName(name);
    // Suppress dirty check while the editor fires onChange during load
    lastLoadedCodeRef.current = null;
    editorRef.current?.load(editorState);
    setIsDirty(false);
    gridAreaRef.current?.load(data.visualPanel ?? {});
    pendingPostLoadRef.current = true;
  }, [resetTimeline, handleEdit]);

  // Public load — shows unsaved-changes dialog if dirty
  const handleLoad = useCallback((data: SaveFile, name: string) => {
    if (isDirty) {
      pendingActionRef.current = () => doLoad(data, name);
      setShowUnsavedDialog(true);
    } else {
      doLoad(data, name);
    }
  }, [isDirty, doLoad]);

  // After a load, capture the loaded code as the baseline, fold viz blocks, optionally auto-analyze
  useEffect(() => {
    if (!pendingPostLoadRef.current || !userCode.trim()) return;
    pendingPostLoadRef.current = false;
    lastLoadedCodeRef.current = userCode;
    requestAnimationFrame(() => editorRef.current?.foldVizBlocks());
    if (AUTO_ANALYZE_ON_LOAD) handleAnalyze();
  }, [userCode, handleAnalyze]);

  const [searchParams] = useSearchParams();

  // Auto-load sample on mount — prefer ?sample= URL param, then DEFAULT_SAMPLE_RAWNAME, then first sample
  useEffect(() => {
    if (!pyodideReady || autoLoadedRef.current || SAMPLES.length === 0) return;
    autoLoadedRef.current = true;
    const sampleParam = searchParams.get('sample');
    const target = sampleParam
      ? (SAMPLES.find((s) => s.rawName === sampleParam) ?? SAMPLES[0])
      : (SAMPLES.find((s) => s.rawName === DEFAULT_SAMPLE_RAWNAME) ?? SAMPLES[0]);
    handleLoad(target.data, target.rawName);
  }, [pyodideReady, handleLoad, searchParams]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.json$/, '');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        handleLoad(data, name);
      } catch {
        console.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [handleLoad]);



  // ---------------------------------------------------------------------------
  // Unsaved-changes dialog handlers
  // ---------------------------------------------------------------------------

  const handleDialogSaveAndContinue = useCallback(() => {
    handleSave();
    setShowUnsavedDialog(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, [handleSave]);

  const handleDialogDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleDialogCancel = useCallback(() => {
    setShowUnsavedDialog(false);
    pendingActionRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  // Capture phase so shortcuts fire even when Monaco editor has focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Enter') {
        if (appMode === 'idle' && !isAnalyzing) {
          e.preventDefault();
          handleAnalyze();
        } else if (appMode === 'trace' && hasInteractiveElements) {
          e.preventDefault();
          handleEnterInteractive();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [appMode, isAnalyzing, hasInteractiveElements, handleAnalyze, handleEnterInteractive, handleSave]);

  return (
    <AnimationContext.Provider value={{ enabled: animationsEnabled, duration: animationDuration }}>
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 grid grid-cols-3 items-center shadow-sm">
        {/* Left: brand + project name + samples */}
        <div className="flex items-center gap-3">
          <a href="https://prove-me-wrong.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-tight select-none hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline transition-colors cursor-pointer">AlgoPlay</a>
          <span className="text-gray-300 dark:text-gray-600 select-none">·</span>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            className="text-sm border-b border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-indigo-500 text-gray-700 dark:text-gray-200 w-36"
          />
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <SamplesMenu onLoad={handleLoad} serializeProject={serializeProject} onSaved={() => { lastLoadedCodeRef.current = userCode; setIsDirty(false); }} />
        </div>

        {/* Center: pyodide status + timeline controls */}
        <div className="flex items-center justify-center gap-3">
          {pyodideLoading && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              Loading Python...
            </span>
          )}
          {pyodideReady && !pyodideLoading && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Python Ready
            </span>
          )}
          {appMode === 'idle' ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !userCode.trim()}
              className={`w-40 py-1 rounded text-sm font-medium border transition-colors flex items-center justify-center whitespace-nowrap ${
                isAnalyzing || !userCode.trim()
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 hover:border-indigo-500'
              }`}
              title="Analyze code (Ctrl+Enter)"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analyzing
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Analyze
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="w-40 py-1 rounded text-sm font-medium border transition-colors flex items-center justify-center whitespace-nowrap bg-blue-600 text-white border-blue-600 hover:bg-blue-500 hover:border-blue-500"
            >
              Edit Code
            </button>
          )}
          <TimelineControls
            currentStep={currentStep}
            stepCount={stepCount}
            flashInteractive={flashInteractive}
            onGoToStep={navigateToStep}
            appMode={appMode}
            onEnterInteractive={handleEnterInteractive}
            hasInteractiveElements={hasInteractiveElements}
          />
        </div>

        {/* Right: API reference + extras */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { setApiReferenceOpen((o) => !o); setExtrasOpen(false); }}
            className={`${buttonNeutral} min-w-[90px]`}
          >
            {apiReferenceOpen ? 'Hide' : 'Show'} API
          </button>
          <ExtrasMenu
            open={extrasOpen}
            onOpenChange={(v) => { setExtrasOpen(v); if (v) setApiReferenceOpen(false); }}
            darkMode={darkMode}
            onToggleDark={toggleDarkMode}
            animationsEnabled={animationsEnabled}
            onToggleAnimations={() => setAnimationsEnabled((v) => !v)}
            animationDuration={animationDuration}
            onAnimationDurationChange={setAnimationDuration}
            appMode={appMode}
            onNew={handleReset}
            onSave={handleSave}
            onLoad={() => fileInputRef.current?.click()}
            onFeedback={() => setFeedbackOpen(true)}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* Left panel - Code Editor */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full border-r border-gray-300 dark:border-gray-600">
              <Editor
                  ref={editorRef}
                  code={userCode}
                  onChange={handleCodeChange}
                  isEditable={isEditable}
                  currentStep={timeline.length > 0 ? currentStep : undefined}
                  currentLine={
                    appMode === 'trace' && timeline.length > 0
                      ? timeline[currentStep]?.line
                      : undefined
                  }
                  sampleNames={SAMPLES.filter(s => {
                    const es = s.data.editorState;
                    return es != null && typeof es === 'object' && Array.isArray((es as { tabs?: unknown }).tabs);
                  }).map(s => s.rawName)}
                  loadSample={(name) => SAMPLES.find(s => s.rawName === name)?.data ?? null}
              />
            </div>
          </Panel>

          <Separator className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 cursor-col-resize" />

          {/* Right panel - Grid Area */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full relative">
              <GridArea
                ref={gridAreaRef}
                darkMode={darkMode}
                mouseEnabled={mouseEnabled}
                elements={currentElements}
                changedIds={changedIds}
                interactiveEnabled={hasInteractiveElements}
                onTrace={startTrace}
                appMode={appMode}
                projectName={projectName}
                onCreateGif={handleCreateGif}
                isCreatingGif={isCreatingGif}
                allowGif={IS_LOCAL}
                onTraceClickAttempt={handleTraceClickAttempt}
              />

              {apiReferenceOpen && (
                <ApiReferencePanel
                  onClose={() => setApiReferenceOpen(false)}
                />
              )}
            </div>
          </Panel>
        </Group>
      </main>
      
      {/* Footer */}
      <footer className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
      </footer>
      {feedbackOpen && (
        <FeedbackModal
          getProjectJson={() => serializeProject().content}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
      {showUnsavedDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={handleDialogCancel} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unsaved changes</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You have changes that haven't been saved. What would you like to do?</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDialogSaveAndContinue}
                className="w-full px-3 py-1.5 rounded text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                Save & continue
              </button>
              <button
                type="button"
                onClick={handleDialogDiscard}
                className="w-full px-3 py-1.5 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={handleDialogCancel}
                className="w-full px-3 py-1.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </AnimationContext.Provider>
  );
}

export default App;
