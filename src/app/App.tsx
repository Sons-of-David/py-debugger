// =============================================================================
// App.tsx — top-level orchestrator for the full editor experience
//
// Responsibilities:
//   - Pyodide lifecycle: loading, ready state, reset between runs
//   - App mode state machine: idle → trace → interactive (and back to idle via Edit)
//   - Run analysis: execute user code, receive TraceStageInfo, transition to trace mode
//   - Timeline navigation: currentStep, stepCount, goToStep, changedIds
//   - File I/O: save/load project JSON, auto-load sample on mount
//   - Save to samples: POST to /api/save-sample (dev only)
//   - Keyboard shortcuts: Ctrl+Enter (analyze), Ctrl+S (save)
//   - Animation settings: enabled toggle, duration
//   - Layout: resizable split between Editor panel (left) and Visual Panel (right)
//
//
// TODO:
//   - Move textBoxes state into GridArea (they are a visual-panel concern)
//   - Move "Save to Samples" button + handleSaveToSamples into SamplesMenu
//   - Investigate why vizRanges (viz block presence) is used to gate interactive
//     handlers — should the Python engine expose an explicit boolean instead?
// =============================================================================

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGifExport } from '../capture/useGifExport';

import { Group, Panel, Separator } from 'react-resizable-panels';
import { Editor, DEFAULT_SAMPLE, type EditorHandle } from '../components/editor/Editor';
import { useTheme } from '../contexts/ThemeContext';
import { AnimationContext } from '../animation/animationContext';
import { loadPyodide, isPyodideLoaded, resetPythonState } from '../python-engine/pyodide-runtime';
import { clearAll as clearTerminal, commitSegment as commitSegment, appendError, setOutputTimeline } from '../output-terminal/terminalState';
import { ApiReferencePanel } from '../api/ApiReferencePanel';
import { TimelineControls } from '../timeline/TimelineControls';
import { ExtrasMenu } from './ExtrasMenu';
import { SamplesMenu } from './SamplesMenu';
import { FeedbackModal } from '../components/FeedbackModal';
import { GridArea, type GridAreaHandle } from './GridArea';
import { getStateAt, getMaxTime, getChangedIdsAt, clearTimeline, setVisualTimeline } from '../timeline/timelineState';
import { executeCode, type TraceStep, type TraceStageInfo } from '../python-engine/executor';
import { setHandlers, hasAnyClickHandler } from '../visual-panel/handlersState';
import { getVizRanges } from '../python-engine/viz-block-parser';
import type { TextBox } from '../text-boxes/types';
import { migrateTextBox } from '../text-boxes/types';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const AUTO_ANALYZE_ON_LOAD = true; // set to false to disable auto-analyze when loading a file

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

  const autoLoadedRef = useRef(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [apiReferenceOpen, setApiReferenceOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [saveSampleStatus, setSaveSampleStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationDuration, setAnimationDuration] = useState(200); // ms

  // editor state
  const [userCode, setUserCode] = useState(DEFAULT_SAMPLE);
  const [isEditable, setIsEditable] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  type AppMode = 'idle' | 'trace' | 'interactive';
  const [appMode, setAppMode] = useState<AppMode>('idle');
  const mouseEnabled = appMode === 'interactive';

  // Timeline state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [timeline, setTimeline] = useState<TraceStep[]>([]);

  const { handleCreateGif, isCreatingGif } = useGifExport({ darkMode });
  const [hasInteractiveElements, setHasInteractiveElements] = useState(false);
  const [flashInteractive, setFlashInteractive] = useState(false);

  const handleTraceClickAttempt = useCallback(() => {
    if (!hasInteractiveElements) return;
    setFlashInteractive(true);
    setTimeout(() => setFlashInteractive(false), 700);
  }, [hasInteractiveElements]);
  // Preload Pyodide on mount
  useEffect(() => {
    if (!isPyodideLoaded()) {
      setPyodideLoading(true);
      loadPyodide()
        .then(() => {
          setPyodideReady(true);
          setPyodideLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load Pyodide:', err);
          setPyodideLoading(false);
        });
    } else {
      setPyodideReady(true);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------


  // timeline is a required dep: forces recompute when a new trace loads,
  // even if currentStep stays at 0 between analyses.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentElements = useMemo(() => getStateAt(currentStep) ?? [], [currentStep, timeline]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const changedIds = useMemo(() => getChangedIdsAt(currentStep), [currentStep, timeline]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(getMaxTime(), step)));
  }, []);

  const setFullTimeline = useCallback((newTimeline: TraceStep[]) => {
    setTimeline(newTimeline);
    setVisualTimeline(newTimeline.map(s => s.visual));
    setOutputTimeline(newTimeline.map(s => ({ text: s.output ?? '', isViz: s.isViz ?? false })));
    setStepCount(getMaxTime() + 1);
    goToStep(0);
  }, [goToStep]);

  // ---------------------------------------------------------------------------
  // Main Flow
  // ---------------------------------------------------------------------------

  const handleEdit = useCallback(() => {
    setIsEditable(true);
    setHandlers({});
    setHasInteractiveElements(false);
    setAppMode('idle');
  }, []);

  const handleReset = useCallback(() => {
    resetPythonState();

    clearTimeline();
    setTimeline([]);
    goToStep(0);
    setStepCount(0);
    
    setProjectName('untitled');
    setUserCode('');

    setTextBoxes([]);

    handleEdit();
  }, [goToStep, handleEdit]);

  const startTrace = useCallback((result: TraceStageInfo) => {
    setFullTimeline(result.timeline);

    setHandlers(result.handlers ?? {});
    const interactive = hasAnyClickHandler();
    setHasInteractiveElements(interactive);
    const isOneFrame = (getMaxTime() === 0);

    if (isOneFrame && interactive) {
      commitSegment('----- end trace -----');
      setAppMode('interactive');
    } else {
      setAppMode('trace');
    }
  }, [setFullTimeline]);

  const handleAnalyze = useCallback(async () => {
    if (!userCode.trim()) return;
    setIsAnalyzing(true);
    clearTerminal();
    try {
      const result = await executeCode(userCode);
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

  // viz block ranges for the current code; stable until code changes
  const vizRanges = useMemo(() => getVizRanges(userCode), [userCode]);

  // ---------------------------------------------------------------------------
  // Load \ Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(() => {
    const name = projectName.trim() || 'untitled';
    const data = { userCode: userCode, textBoxes };
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [userCode, textBoxes, projectName]);

  // TODO: Move "saves to samples button" into the SamplesMenu
  //       and move this function there.
  const handleSaveToSamples = useCallback(async () => {
    const name = projectName.trim() || 'untitled';
    const data = { userCode: userCode, textBoxes };
    const content = JSON.stringify(data, null, 2);
    setSaveSampleStatus('saving');
    try {
      const res = await fetch('/api/save-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      });
      setSaveSampleStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveSampleStatus('error');
    }
    setTimeout(() => setSaveSampleStatus('idle'), 2000);
  }, [userCode, textBoxes, projectName]);

  const handleLoad = useCallback((data: { userCode?: string; textBoxes?: TextBox[] }, name: string) => {
    if (!data.userCode) {
      appendError('Invalid file: missing userCode field');
      return;
    }
    handleReset();
    setProjectName(name);
    setUserCode(data.userCode);
    setTextBoxes((data.textBoxes ?? [] as unknown[]).map((raw) => migrateTextBox(raw as Record<string, unknown>)));
    pendingPostLoadRef.current = true;
  }, [handleReset]);

  // After a load, fold viz blocks and optionally auto-analyze
  useEffect(() => {
    if (!pendingPostLoadRef.current || !userCode.trim()) return;
    pendingPostLoadRef.current = false;
    requestAnimationFrame(() => editorRef.current?.foldVizBlocks());
    if (AUTO_ANALYZE_ON_LOAD) handleAnalyze();
  }, [userCode, handleAnalyze]);

  const [searchParams] = useSearchParams();

  // Auto-load sample on mount — prefer ?sample= URL param, fall back to first sample
  useEffect(() => {
    if (!pyodideReady || autoLoadedRef.current || SAMPLES.length === 0) return;
    autoLoadedRef.current = true;
    const sampleParam = searchParams.get('sample');
    const target = sampleParam
      ? (SAMPLES.find((s) => s.rawName === sampleParam) ?? SAMPLES[0])
      : SAMPLES[0];
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
  }, [appMode, isAnalyzing, handleAnalyze, handleEnterInteractive, handleSave]);

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
          <SamplesMenu onLoad={handleLoad} />
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
            onGoToStep={goToStep}
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
            isLocal={IS_LOCAL}
            onSaveToSamples={handleSaveToSamples}
            saveSampleStatus={saveSampleStatus}
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
                  onChange={setUserCode}
                  isEditable={isEditable}
                  currentStep={timeline.length > 0 ? currentStep : undefined}
                  currentLine={
                    appMode === 'trace' && timeline.length > 0
                      ? timeline[currentStep]?.line
                      : undefined
                  }
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
                textBoxes={textBoxes}
                onTextBoxesChange={setTextBoxes}
                elements={currentElements}
                changedIds={changedIds}
                interactiveEnabled={vizRanges.length > 0}
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
          userCode={userCode}
          textBoxes={textBoxes}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
    </AnimationContext.Provider>
  );
}

export default App;
