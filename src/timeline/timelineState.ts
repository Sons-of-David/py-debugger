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

      // TODO: add a unit test for this block — verify that children of a moved
      // panel are included in changedIds, and that deeply nested panels propagate.
      // Children of a moved panel inherit a new absolute position, so they must
      // animate too even though they didn't change relative to their parent.
      const movedPanelIds = new Set<string>();
      for (const id of changed) {
        const el = current.get(id);
        if (el?.type === 'panel') movedPanelIds.add(String(id));
      }
      if (movedPanelIds.size > 0) {
        let foundNew = true;
        while (foundNew) {
          foundNew = false;
          for (const el of current.values()) {
            const elId = el._elemId ?? -1;
            if (!changed.has(elId) && el.panelId != null && movedPanelIds.has(el.panelId)) {
              changed.add(elId);
              if (el.type === 'panel') movedPanelIds.add(String(elId));
              foundNew = true;
            }
          }
        }
      }

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

