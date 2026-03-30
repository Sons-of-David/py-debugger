import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { MousePointerClick, Play, Pause } from 'lucide-react';
import { useAnimationDuration } from '../animation/animationContext';

interface TimelineControlsProps {
  currentStep: number;
  stepCount: number;
  onGoToStep: (step: number) => void;
  appMode?: string;
  onEnterInteractive?: () => void;
  /** False = show the Go-Interactive button disabled (no interactive elements exist) */
  hasInteractiveElements?: boolean;
  /** When true, briefly flash the enter-interactive button to draw attention. */
  flashInteractive?: boolean;
}

export function TimelineControls({
  currentStep,
  stepCount,
  onGoToStep,
  appMode,
  onEnterInteractive,
  hasInteractiveElements,
  flashInteractive,
}: TimelineControlsProps) {
  const hasSteps = stepCount > 0;
  const maxStep = hasSteps ? stepCount - 1 : 0;
  const isInactive = appMode === 'idle' || appMode === 'interactive';
  const isPhoto = stepCount === 1 && hasInteractiveElements === false && appMode !== 'idle';
  const canEnterInteractive = hasInteractiveElements !== false;
  const canGoPrev = hasSteps && currentStep > 0 && !isInactive && !isPhoto;
  const canGoNext = hasSteps && currentStep < maxStep && !isInactive && !isPhoto;
  const scrubDisabled = !hasSteps || isInactive || isPhoto;

  const [isPlaying, setIsPlaying] = useState(false);
  const animDuration = useAnimationDuration();

  // Refs so the interval callback always sees the latest values without
  // restarting the timer (and resetting its countdown) on every step advance.
  const currentStepRef = useRef(currentStep);
  const maxStepRef = useRef(maxStep);
  useLayoutEffect(() => { currentStepRef.current = currentStep; });
  useLayoutEffect(() => { maxStepRef.current = maxStep; });

  // Auto-advance when playing — self-correcting timer.
  // Each tick records targetTime = now + animDuration. The next timeout is
  // scheduled as max(0, targetTime - now) so a late tick is compensated by a
  // shorter wait on the following one, keeping the long-term cadence on target.
  useEffect(() => {
    if (!isPlaying || isInactive || isPhoto || !hasSteps) return;
    if (currentStepRef.current >= maxStepRef.current) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let targetTime = performance.now() + animDuration;

    const tick = () => {
      if (cancelled) return;
      if (currentStepRef.current >= maxStepRef.current) { setIsPlaying(false); return; }
      onGoToStep(currentStepRef.current + 1);
      targetTime += animDuration;
      timeoutId = setTimeout(tick, Math.max(0, targetTime - performance.now()));
    };

    timeoutId = setTimeout(tick, animDuration);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [isPlaying, isInactive, isPhoto, hasSteps, animDuration, onGoToStep]);

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

        <>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-0.5" />
          <button
            onClick={appMode === 'trace' && canEnterInteractive && onEnterInteractive ? onEnterInteractive : undefined}
            disabled={appMode !== 'trace' || !canEnterInteractive || !onEnterInteractive}
            className={appMode === 'trace' && canEnterInteractive && onEnterInteractive ? btnActive : btnDisabled}
            title={appMode === 'trace' && canEnterInteractive ? "Finish trace and enter interactive mode" : "No interactive elements"}
            style={flashInteractive ? { animation: 'interactivePulse 0.65s ease-in-out' } : undefined}
          >
            <MousePointerClick size={14} />
          </button>
          <style>{`
            @keyframes interactivePulse {
              0%   { transform: scale(1); }
              30%  { transform: scale(1.4); background-color: #f59e0b; color: #000; border-color: #f59e0b; }
              70%  { transform: scale(1.4); background-color: #f59e0b; color: #000; border-color: #f59e0b; }
              100% { transform: scale(1); }
            }
          `}</style>
        </>

      </div>
    </div>
  );
}
