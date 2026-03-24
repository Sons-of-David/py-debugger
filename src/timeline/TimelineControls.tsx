import { useState, useEffect, useCallback, useRef } from 'react';
import { MousePointerClick, Play, Pause } from 'lucide-react';
import { useAnimationDuration } from '../animation/animationContext';

interface TimelineControlsProps {
  currentStep: number;
  stepCount: number;
  onGoToStep: (step: number) => void;
  appMode?: string;
  onEnterInteractive?: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  canAnalyze?: boolean;
  /** False = show the Go-Interactive button disabled (no interactive elements exist) */
  hasInteractiveElements?: boolean;
  /** True = gray out entire timeline nav (single-frame, no interaction — "photo" mode) */
  isStaticSnapshot?: boolean;
}

export function TimelineControls({
  currentStep,
  stepCount,
  onGoToStep,
  appMode,
  onEnterInteractive,
  onAnalyze,
  isAnalyzing,
  canAnalyze,
  hasInteractiveElements,
  isStaticSnapshot,
}: TimelineControlsProps) {
  const hasSteps = stepCount > 0;
  const maxStep = hasSteps ? stepCount - 1 : 0;
  const isInactive = appMode === 'idle' || appMode === 'interactive';
  const isPhoto = isStaticSnapshot ?? false;
  const canEnterInteractive = hasInteractiveElements !== false;
  const canGoPrev = hasSteps && currentStep > 0 && !isInactive && !isPhoto;
  const canGoNext = hasSteps && currentStep < maxStep && !isInactive && !isPhoto;
  const scrubDisabled = !hasSteps || isInactive || isPhoto;

  const [isPlaying, setIsPlaying] = useState(false);
  const animDuration = useAnimationDuration();

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return;
    if (isInactive || isPhoto || !hasSteps) { setIsPlaying(false); return; }
    if (currentStep >= maxStep) { setIsPlaying(false); return; }
    const id = setInterval(() => {
      onGoToStep(currentStep + 1);
    }, animDuration);
    return () => clearInterval(id);
  }, [isPlaying, isInactive, isPhoto, hasSteps, currentStep, maxStep, animDuration, onGoToStep]);

  const scrubBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const scrubTo = useCallback((clientX: number) => {
    if (!scrubBarRef.current || scrubDisabled) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    onGoToStep(Math.max(0, Math.min(maxStep, Math.round(ratio * maxStep))));
  }, [scrubDisabled, maxStep, onGoToStep]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (isDragging.current) scrubTo(e.clientX); };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [scrubTo]);

  const onPrevStep = useCallback(() => { setIsPlaying(false); onGoToStep(currentStep - 1); }, [currentStep, onGoToStep]);
  const onNextStep = useCallback(() => { setIsPlaying(false); onGoToStep(currentStep + 1); }, [currentStep, onGoToStep]);

  const btnBase =
    'px-2 py-1 rounded text-sm font-medium transition-colors border';
  const btnActive =
    `${btnBase} bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500`;
  const btnDisabled =
    `${btnBase} bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed`;

  const fillPct = hasSteps ? (currentStep / maxStep) * 100 : 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Analyze button — only in idle mode */}
      {appMode === 'idle' && onAnalyze && (
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing || !canAnalyze}
          className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
            isAnalyzing || !canAnalyze
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
              Analyzing...
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
      )}

      {/* Step navigation — always visible, grayed out when idle/interactive or photo */}
      <div className={`flex items-center gap-1 px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 ${(isInactive || isPhoto) ? 'opacity-40' : ''}`}>
        <button
          onClick={() => setIsPlaying(p => !p)}
          disabled={!hasSteps || isInactive || isPhoto}
          className={hasSteps && !isInactive && !isPhoto ? btnActive : btnDisabled}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={onPrevStep}
          disabled={!canGoPrev}
          className={canGoPrev ? btnActive : btnDisabled}
          title="Previous step"
        >
          ←
        </button>

        {/* Scrubber bar */}
        <div
          ref={scrubBarRef}
          onMouseDown={(e) => {
            if (scrubDisabled) return;
            setIsPlaying(false);
            isDragging.current = true;
            scrubTo(e.clientX);
          }}
          className={`relative w-40 h-6 rounded bg-gray-200 dark:bg-gray-600 overflow-hidden ${scrubDisabled ? 'cursor-default' : 'cursor-pointer'}`}
          title={hasSteps ? `Step ${currentStep} of ${maxStep}` : 'No steps yet'}
        >
          <div
            className="absolute left-0 top-0 h-full bg-indigo-500 dark:bg-indigo-400 rounded transition-none"
            style={{ width: `${fillPct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference select-none z-10">
            {hasSteps ? `${currentStep} / ${maxStep}` : '-- / --'}
          </span>
        </div>

        <button
          onClick={onNextStep}
          disabled={!canGoNext}
          className={canGoNext ? btnActive : btnDisabled}
          title="Next step"
        >
          →
        </button>

        {appMode === 'trace' && onEnterInteractive && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-0.5" />
            <button
              onClick={canEnterInteractive ? onEnterInteractive : undefined}
              disabled={!canEnterInteractive}
              className={canEnterInteractive ? btnActive : btnDisabled}
              title={canEnterInteractive ? "Finish trace and enter interactive mode" : "No interactive elements"}
            >
              <MousePointerClick size={14} />
            </button>
          </>
        )}

      </div>
    </div>
  );
}
