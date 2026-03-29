import type { VisualBuilderElementBase } from '../api/visualBuilder';
import type { RawVisual, VisualDelta } from '../python-engine/executor';
import { hydrateElement } from '../visual-panel/types/elementRegistry';

let timeline: VisualBuilderElementBase[][] = [];
// Parallel to timeline: which elem IDs changed at each step.
// null = full snapshot, meaning all elements should be treated as changed.
let changedElemIds: (Set<number> | null)[] = [];
let maxTime = 0;

export function clearTimeline() {
  timeline = [];
  changedElemIds = [];
  maxTime = 0;
}

/** Returns the set of elem IDs that changed at this step, or null if all changed (full snapshot). */
export function getChangedIdsAt(step: number): Set<number> | null {
  const t = Math.max(0, Math.min(maxTime, Math.floor(step)));
  return changedElemIds[t] ?? null;
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
  const ids: (Set<number> | null)[] = [];
  // elem_id → hydrated element; entries are reused across steps when not in a delta
  const current = new Map<number, VisualBuilderElementBase>();

  for (const raw of rawTimeline) {
    if (Array.isArray(raw)) {
      // Full snapshot — rebuild map entirely; treat all elements as changed
      current.clear();
      for (const el of raw) {
        const hydrated = hydrateElement(el);
        current.set(hydrated._elemId ?? -1, hydrated);
      }
      ids.push(null);
    } else {
      // Delta — apply deletions then update changed elements
      const delta = raw as VisualDelta;
      const changed = new Set<number>(delta.deleted);
      for (const el of delta.changed) {
        const hydrated = hydrateElement(el);
        current.set(hydrated._elemId ?? -1, hydrated);
        changed.add(hydrated._elemId ?? -1);
      }
      for (const id of delta.deleted) current.delete(id);
      ids.push(changed);
    }
    steps.push(Array.from(current.values()));
  }

  timeline = steps;
  changedElemIds = ids;
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

