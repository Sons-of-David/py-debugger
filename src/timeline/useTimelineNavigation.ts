import { useState, useCallback, useEffect, useMemo } from 'react';
import type { VisualBuilderElementBase } from '../api/visualBuilder';
import type { TraceStep } from '../python-engine/executor';
import {
  getStateAt,
  getChangedIdsAt,
  getMaxTime,
  clearTimeline,
  setVisualTimeline,
} from './timelineState';

export type AppMode = 'idle' | 'trace' | 'interactive';

export interface UseTimelineNavigationResult {
  currentStep: number;
  stepCount: number;
  timeline: TraceStep[];
  hasInteractiveElements: boolean;
  currentElements: VisualBuilderElementBase[];
  changedIds: Set<number> | null;
  goToStep: (step: number) => void;
  /** Set a new timeline after a successful analysis run. Does NOT touch output terminal. */
  setTimelineData: (newTimeline: TraceStep[], hasInteractive: boolean) => void;
  /** Clear all timeline state. Call during reset / before a new analysis. */
  resetTimeline: () => void;
  setHasInteractiveElements: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTimelineNavigation(appMode: AppMode): UseTimelineNavigationResult {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [timeline, setTimeline] = useState<TraceStep[]>([]);
  const [hasInteractiveElements, setHasInteractiveElements] = useState(false);

  // timeline is a required dep: forces recompute when a new trace loads,
  // even if currentStep stays at 0 between analyses.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentElements = useMemo(() => getStateAt(currentStep) ?? [], [currentStep, timeline]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const changedIds = useMemo(() => getChangedIdsAt(currentStep), [currentStep, timeline]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(getMaxTime(), step)));
  }, []);

  // Whenever appMode becomes 'interactive', jump to the last step.
  useEffect(() => {
    if (appMode === 'interactive') goToStep(getMaxTime());
  }, [appMode, goToStep]);

  const setTimelineData = useCallback((newTimeline: TraceStep[], hasInteractive: boolean) => {
    setTimeline(newTimeline);
    setVisualTimeline(newTimeline.map(s => s.visual));
    setStepCount(getMaxTime() + 1);
    goToStep(0);
    setHasInteractiveElements(hasInteractive);
  }, [goToStep]);

  const resetTimeline = useCallback(() => {
    clearTimeline();
    setTimeline([]);
    setCurrentStep(0);
    setStepCount(0);
    setHasInteractiveElements(false);
  }, []);

  return {
    currentStep,
    stepCount,
    timeline,
    hasInteractiveElements,
    currentElements,
    changedIds,
    goToStep,
    setTimelineData,
    resetTimeline,
    setHasInteractiveElements,
  };
}
