import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { CaptureRegion } from '../visual-panel/components/CaptureRegionLayer';

import { Group, Panel, Separator } from 'react-resizable-panels';
import { CombinedEditor, COMBINED_SAMPLE, type CombinedEditorHandle } from '../components/combined-editor/CombinedEditor';
import { useTheme } from '../contexts/ThemeContext';
import { AnimationContext } from '../animation/animationContext';
import { loadPyodide, isPyodideLoaded, resetPythonState } from '../components/combined-editor/pyodideRuntime';
import { clearAll as clearTerminal, appendError, setOutputTimeline } from '../output-terminal/terminalState';
import { ApiReferencePanel } from '../api/ApiReferencePanel';
import { TimelineControls } from '../timeline/TimelineControls';
import { ExtrasMenu } from './ExtrasMenu';
import { GridArea, type GridAreaHandle } from './GridArea';
import { getStateAt, getMaxTime, clearTimeline, hydrateVisualTimelineFromArray } from '../timeline/timelineState';
import { executeCombinedCode, type TraceStep, type TraceStageInfo } from '../components/combined-editor/combinedExecutor';
import { setHandlers, hasAnyClickHandler } from '../visual-panel/handlersState';
import { getVizRanges } from '../components/combined-editor/vizBlockParser';
import type { TextBox } from '../text-boxes/types';
import { migrateTextBox } from '../text-boxes/types';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const AUTO_ANALYZE_ON_LOAD = true; // set to false to disable auto-analyze when loading a file

// TODO: split samples into "public" (shipped in prod) and "dev" (local-only, e.g. rich-text-demo).
// Dev samples should only appear when import.meta.env.DEV is true.
const SAMPLE_MODULES = import.meta.glob('../components/combined-editor/samples/*.json', { eager: true }) as Record<
  string,
  { combinedCode?: string; textBoxes?: TextBox[] }
>;
const SAMPLES = Object.entries(SAMPLE_MODULES).map(([path, data]) => {
  const filename = path.split('/').pop() ?? path;
  const rawName = filename.replace(/\.json$/, '');
  const isFeature = rawName.startsWith('feature-');
  return {
    displayName: isFeature ? rawName.slice('feature-'.length) : rawName,
    rawName,
    data,
    category: isFeature ? ('feature' as const) : ('algorithm' as const),
  };
});

/* ---------- Shared Tailwind class groups ---------- */

const buttonBase =
  'px-3 py-1 rounded text-sm font-medium transition-colors';

const buttonNeutral =
  `${buttonBase} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`;



function App() {
  const { darkMode, toggleDarkMode } = useTheme();

  const gridAreaRef = useRef<GridAreaHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const combinedEditorRef = useRef<CombinedEditorHandle>(null);
  const pendingPostLoadRef = useRef(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [projectName, setProjectName] = useState('untitled');

  const autoLoadedRef = useRef(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [apiReferenceOpen, setApiReferenceOpen] = useState(false);
  const [saveSampleStatus, setSaveSampleStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationDuration, setAnimationDuration] = useState(500); // ms

  // Combined editor state
  const [combinedCode, setCombinedCode] = useState(COMBINED_SAMPLE);
  const [timeline, setTimeline] = useState<TraceStep[]>([]);
  const [isCombinedEditable, setIsCombinedEditable] = useState(true);
  const [isAnalyzingCombined, setIsAnalyzingCombined] = useState(false);

  type AppMode = 'idle' | 'trace' | 'interactive';
  const [appMode, setAppMode] = useState<AppMode>('idle');
  const mouseEnabled = appMode === 'interactive';

  // Timeline state
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreatingGif, setIsCreatingGif] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [hasInteractiveElements, setHasInteractiveElements] = useState(false);
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

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(getMaxTime(), step)));
  }, []);

  const handleCreateGif = useCallback(async (region: CaptureRegion | null) => {
    if (isCreatingGif) return;
    const maxStep = getMaxTime();
    if (maxStep < 1) return;

    setIsCreatingGif(true);
    setAnimationsEnabled(false);

    const savedStep = currentStep;
    try {
      type GifFrame = { indexed: Uint8Array; width: number; height: number };
      const frames: GifFrame[] = [];
      let sharedPalette: number[][] | null = null;

      for (let i = 0; i <= maxStep; i++) {
        const state = getStateAt(i);
        if (state) gridAreaRef.current?.loadVisualBuilderObjects(state);
        // Two rAF cycles so React flushes + browser paints before we capture
        await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

        // captureFrameCanvas avoids the PNG encode/decode round-trip of captureFrameData
        const canvas = await gridAreaRef.current?.captureFrameCanvas(region);
        if (!canvas) continue;

        const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        // Compute palette once from the first frame and reuse — much faster than per-frame quantization
        if (!sharedPalette) sharedPalette = quantize(data, 256);
        frames.push({ indexed: applyPalette(data, sharedPalette), width: canvas.width, height: canvas.height });
      }

      if (frames.length === 0 || !sharedPalette) return;

      // GIFEncoder auto mode writes the GIF header on the first writeFrame — do NOT call writeHeader() manually
      const encoder = GIFEncoder();
      for (const frame of frames) {
        encoder.writeFrame(frame.indexed, frame.width, frame.height, {
          palette: sharedPalette,
          delay: 100, // ms — gifenc divides by 10 → 10 centiseconds = 100ms/frame
          repeat: 0,  // loop forever (only written on the first frame by gifenc auto mode)
        });
      }
      encoder.finish();

      const bytes = encoder.bytes(); // correctly-sized Uint8Array copy — pass directly to Blob
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `trace-${timestamp}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GIF export failed:', err);
    } finally {
      setAnimationsEnabled(true);
      setIsCreatingGif(false);
      // Restore the step the user was on
      goToStep(savedStep);
    }
  }, [isCreatingGif, currentStep, goToStep]);

  // ---------------------------------------------------------------------------
  // Main Flow
  // ---------------------------------------------------------------------------

  const handleReset = useCallback(() => {
    // TODO: DAMMIT. Stop duplicate code! combine with handleEditCombined
    resetPythonState();
    clearTimeline();
    setCurrentStep(0);
    setStepCount(0);
    setProjectName('untitled');
    setTextBoxes([]);
    setCombinedCode('');
    setTimeline([]);
    setIsCombinedEditable(true);
    setHandlers({});
    setHasInteractiveElements(false);
    setAppMode('idle');
  }, []);

  // Whenever appMode becomes 'interactive' (from any path), jump to the last step.
  useEffect(() => {
    if (appMode === 'interactive') goToStep(getMaxTime());
  }, [appMode, goToStep]);

  const handleEnterInteractive = useCallback(() => {
    setAppMode('interactive');
  }, []);


  // ---------------------------------------------------------------------------
  // Combined editor handlers
  // ---------------------------------------------------------------------------

  const startTrace = useCallback((result: TraceStageInfo) => {
    console.log('timeline result:', result.timeline);
    setTimeline(result.timeline);
    hydrateVisualTimelineFromArray(result.timeline.map(s => s.visual));
    setOutputTimeline(result.timeline.map(s => ({ text: s.output ?? '', isViz: s.isViz ?? false })));

    setStepCount(getMaxTime() + 1);
    goToStep(0);

    setHandlers(result.handlers ?? {});
    const interactive = hasAnyClickHandler();
    setHasInteractiveElements(interactive);
    const isOneFrame = (getMaxTime() === 0);

    if (isOneFrame && interactive) {
      setAppMode('interactive');
    } else {
      setAppMode('trace');
    }
  }, [goToStep]);

  const handleAnalyzeCombined = useCallback(async () => {
    if (!combinedCode.trim()) return;
    setIsAnalyzingCombined(true);
    clearTerminal();
    try {
      const result = await executeCombinedCode(combinedCode);
      if (!result.error) {
        setIsCombinedEditable(false);
        startTrace(result);
      } else {
        appendError(result.error ?? 'Unknown error');
      }
    } catch (err) {
      appendError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAnalyzingCombined(false);
    }
  }, [combinedCode, startTrace]);

  const handleEditCombined = useCallback(() => {
    setIsCombinedEditable(true);
    setTimeline([]);
    clearTerminal();
    clearTimeline();
    setHandlers({});
    setHasInteractiveElements(false);
    setCurrentStep(0);
    setStepCount(0);
    setAppMode('idle');
  }, []);

  const handleCombinedTrace = useCallback((result: TraceStageInfo) => {
    startTrace(result);
  }, [startTrace]);

  // viz block ranges for the current combined code; stable until code changes
  const combinedVizRanges = useMemo(() => getVizRanges(combinedCode), [combinedCode]);

  // ---------------------------------------------------------------------------
  // Load \ Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(() => {
    const name = projectName.trim() || 'untitled';
    const data = { combinedCode, textBoxes };
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
  }, [combinedCode, textBoxes, projectName]);

  const handleSaveToSamples = useCallback(async () => {
    const name = projectName.trim() || 'untitled';
    const data = { combinedCode, textBoxes };
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
  }, [combinedCode, textBoxes, projectName]);

  const handleLoad = useCallback((data: { combinedCode?: string; textBoxes?: TextBox[] }, name: string) => {
    if (!data.combinedCode) {
      appendError('Invalid file: missing combinedCode field');
      return;
    }
    handleReset();
    setProjectName(name);
    setCombinedCode(data.combinedCode);
    setTextBoxes((data.textBoxes ?? [] as unknown[]).map((raw) => migrateTextBox(raw as Record<string, unknown>)));
    pendingPostLoadRef.current = true;
  }, [handleReset]);

  // After a load, fold viz blocks and optionally auto-analyze
  useEffect(() => {
    if (!pendingPostLoadRef.current || !combinedCode.trim()) return;
    pendingPostLoadRef.current = false;
    requestAnimationFrame(() => combinedEditorRef.current?.foldVizBlocks());
    if (AUTO_ANALYZE_ON_LOAD) handleAnalyzeCombined();
  }, [combinedCode, handleAnalyzeCombined]);

  // Auto-load first sample and return to edit mode
  useEffect(() => {
    if (!pyodideReady || autoLoadedRef.current || SAMPLES.length === 0) return;
    autoLoadedRef.current = true;
    handleLoad(SAMPLES[0].data, SAMPLES[0].rawName);
  }, [pyodideReady, handleLoad]);

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
        if (appMode === 'idle' && !isAnalyzingCombined) {
          e.preventDefault();
          handleAnalyzeCombined();
        } else if (appMode === 'trace' && hasInteractiveElements) {
          e.preventDefault();
          handleEnterInteractive();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [appMode, isAnalyzingCombined, handleAnalyzeCombined, handleEnterInteractive, handleSave]);

  return (
    <AnimationContext.Provider value={{ enabled: animationsEnabled, duration: animationDuration }}>
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 grid grid-cols-3 items-center shadow-sm">
        {/* Left: brand + project name + samples */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-tight select-none">AlgoPlay</span>
          <span className="text-gray-300 dark:text-gray-600 select-none">·</span>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            className="text-sm border-b border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:border-indigo-500 text-gray-700 dark:text-gray-200 w-36"
          />
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          <div className="relative">
            <button type="button" onClick={() => setSamplesOpen((o) => !o)} className={buttonNeutral}>
              Samples
            </button>
            {samplesOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSamplesOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Algorithms</div>
                  {SAMPLES.filter(s => s.category === 'algorithm').map(({ displayName, rawName, data }) => (
                    <button
                      key={rawName}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => { handleLoad(data, rawName); setSamplesOpen(false); }}
                    >
                      {displayName}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Features</div>
                  {SAMPLES.filter(s => s.category === 'feature').map(({ displayName, rawName, data }) => (
                    <button
                      key={rawName}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => { handleLoad(data, rawName); setSamplesOpen(false); }}
                    >
                      {displayName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
          <TimelineControls
            currentStep={currentStep}
            stepCount={stepCount}
            onGoToStep={goToStep}
            appMode={appMode}
            onEnterInteractive={handleEnterInteractive}
            onAnalyze={handleAnalyzeCombined}
            isAnalyzing={isAnalyzingCombined}
            canAnalyze={!!combinedCode.trim()}
            hasInteractiveElements={hasInteractiveElements}
            isStaticSnapshot={stepCount === 1 && !hasInteractiveElements && appMode !== 'idle'}
          />
        </div>

        {/* Right: API reference + extras */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setApiReferenceOpen((o) => !o)}
            className={`${buttonNeutral} min-w-[90px]`}
          >
            {apiReferenceOpen ? 'Hide' : 'Show'} API
          </button>
          <ExtrasMenu
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
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* Left panel - Code Editor */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full border-r border-gray-300 dark:border-gray-600">
              <CombinedEditor
                  ref={combinedEditorRef}
                  code={combinedCode}
                  onChange={setCombinedCode}
                  isEditable={isCombinedEditable}
                  currentStep={timeline.length > 0 ? currentStep : undefined}
                  currentLine={
                    appMode === 'trace' && timeline.length > 0
                      ? timeline[currentStep]?.line
                      : undefined
                  }
                  onEdit={handleEditCombined}
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
                combinedVizRanges={combinedVizRanges}
                onCombinedTrace={handleCombinedTrace}
                appMode={appMode}
                onCreateGif={handleCreateGif}
                isCreatingGif={isCreatingGif}
                allowGif={IS_LOCAL}
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
    </div>
    </AnimationContext.Provider>
  );
}

export default App;
