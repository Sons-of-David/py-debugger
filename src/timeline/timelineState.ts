import type { VisualBuilderElementBase } from '../api/visualBuilder';
import type { RawVisual } from '../python-engine/executor';
import { hydrateElement } from '../visual-panel/types/elementRegistry';

let timeline: VisualBuilderElementBase[][] = [];
let maxTime = 0;

export function clearTimeline() {
  timeline = [];
  maxTime = 0;
}

export function hydrateTimelineFromJson(timelineJson: string): VisualBuilderElementBase[] {
  const raw = JSON.parse(timelineJson) as VisualBuilderElementBase[][];

  timeline = raw.map((snapshot) =>
    snapshot.map((el) => hydrateElement(el)),
  );

  maxTime = timeline.length > 0 ? timeline.length - 1 : 0;
  return timeline[0] ?? [];
}

/**
 * Build the hydrated timeline from raw visual snapshots.
 *
 * Each entry in rawTimeline is either a full element array (first step) or a
 * delta {is_delta, changed, deleted}. We maintain a running Map so only changed
 * elements are hydrated — unchanged elements are shared references across steps.
 */
export function setVisualTimeline(
  rawTimeline: RawVisual[],
): VisualBuilderElementBase[] {
  const steps: VisualBuilderElementBase[][] = [];
  // elem_id → hydrated element; entries are reused across steps when not in a delta
  const current = new Map<number, VisualBuilderElementBase>();

  for (const raw of rawTimeline) {
    if (Array.isArray(raw)) {
      // Full snapshot — rebuild map entirely
      current.clear();
      for (const el of raw) {
        const hydrated = hydrateElement(el);
        current.set(hydrated._elemId ?? -1, hydrated);
      }
    } else {
      // Delta — apply deletions then update changed elements
      for (const id of raw.deleted) current.delete(id);
      for (const el of raw.changed) {
        const hydrated = hydrateElement(el);
        current.set(hydrated._elemId ?? -1, hydrated);
      }
    }
    steps.push(Array.from(current.values()));
  }

  timeline = steps;
  maxTime = timeline.length > 0 ? timeline.length - 1 : 0;
  return timeline[0] ?? [];
}

export function getTimeline(): VisualBuilderElementBase[][] {
  return timeline;
}

export function getMaxTime(): number {
  return maxTime;
}

export function getStateAt(time: number): VisualBuilderElementBase[] | undefined {
  if (!Number.isFinite(time)) return undefined;
  const t = Math.max(0, Math.min(maxTime, Math.floor(time)));
  return timeline[t];
}

