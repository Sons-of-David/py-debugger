// npx vitest run src/visual-panel/hooks/tests/buildGridObjects.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { buildGridObjects } from '../useGridState';
import { setHandlers } from '../../handlersState';
import { Array1D, Array2D } from '../../render-objects/array/arrayShapes';
import type { VisualBuilderElementBase } from '../../../api/visualBuilder';
import type { GridObject } from '../../types/grid';

beforeEach(() => {
  setHandlers({});
});

function expectGridObjects(
  elements: VisualBuilderElementBase[],
  expected: Map<string, GridObject>,
) {
  const result = buildGridObjects(elements);
  expect(result).toEqual(expected);
}

// ── Rect ─────────────────────────────────────────────────────────────────────

describe('Rect', () => {
  it('places a rect at the correct grid position', () => {
    const rect: VisualBuilderElementBase = { type: 'rect', x: 3, y: 2, _elemId: 1 };

    expectGridObjects([rect], new Map([
      ['elem-1', {
        element: rect,
        absElement: { ...rect, x: 3, y: 2, alpha: 1, z: 0 },
        info: {
          id: 'elem-1',
          zOrder: 0,
          panelId: undefined,
          clickData: undefined,
          dragData: undefined,
          inputData: undefined,
        },
      }],
    ]));
  });
});

// ── Array1D ───────────────────────────────────────────────────────────────────

describe('Array1D', () => {
  it('expands a size-2 array into a panel and two cells at correct positions', () => {
    const arr = new Array1D({ values: [10, 20], x: 0, y: 1, _elem_id: 5 });

    const result = buildGridObjects([arr]);

    expect(result.size).toBe(3);

    const panel = result.get('panel-ea1-5');
    expect(panel?.info).toMatchObject({ id: 'panel-ea1-5', panelId: undefined });
    expect(panel?.absElement).toMatchObject({ x: 0, y: 1, alpha: 1 });

    const cell0 = result.get('array-cell-e5-0');
    expect(cell0?.info).toMatchObject({ id: 'array-cell-e5-0', panelId: 'panel-ea1-5' });
    expect(cell0?.absElement).toMatchObject({ x: 0, y: 1, alpha: 1 });

    const cell1 = result.get('array-cell-e5-1');
    expect(cell1?.info).toMatchObject({ id: 'array-cell-e5-1', panelId: 'panel-ea1-5' });
    expect(cell1?.absElement).toMatchObject({ x: 1, y: 1, alpha: 1 });
  });
});

// ── Array2D ───────────────────────────────────────────────────────────────────

describe('Array2D', () => {
  it('expands a 2x2 array into a panel and four cells at correct positions', () => {
    const arr = new Array2D({ values: [[1, 2], [3, 4]], x: 2, y: 3, _elem_id: 7 });

    const result = buildGridObjects([arr]);

    expect(result.size).toBe(5);

    const panel = result.get('panel-ea2-7');
    expect(panel?.info).toMatchObject({ id: 'panel-ea2-7', panelId: undefined });
    expect(panel?.absElement).toMatchObject({ x: 2, y: 3, alpha: 1 });

    expect(result.get('array2d-cell-e7-0-0')?.absElement).toMatchObject({ x: 2, y: 3 });
    expect(result.get('array2d-cell-e7-0-1')?.absElement).toMatchObject({ x: 3, y: 3 });
    expect(result.get('array2d-cell-e7-1-0')?.absElement).toMatchObject({ x: 2, y: 4 });
    expect(result.get('array2d-cell-e7-1-1')?.absElement).toMatchObject({ x: 3, y: 4 });
  });
});

// ── Key stability (React animation) ──────────────────────────────────────────
// For React to animate an element rather than remount it, the grid key must be
// identical across consecutive buildGridObjects calls for the same logical object.

describe('Key stability', () => {
  it('Rect with same _elemId keeps the same key when its position changes', () => {
    const step1: VisualBuilderElementBase = { type: 'rect', x: 0, y: 0, _elemId: 7 };
    const step2: VisualBuilderElementBase = { type: 'rect', x: 3, y: 4, _elemId: 7 };

    const keys1 = new Set(buildGridObjects([step1]).keys());
    const keys2 = new Set(buildGridObjects([step2]).keys());

    expect(keys1).toEqual(keys2);
  });

  it('Array1D with same _elemId keeps the same keys when its values change', () => {
    const step1 = new Array1D({ values: [10, 20], x: 0, y: 0, _elem_id: 3 });
    const step2 = new Array1D({ values: [99, 88], x: 0, y: 0, _elem_id: 3 });

    const keys1 = new Set(buildGridObjects([step1]).keys());
    const keys2 = new Set(buildGridObjects([step2]).keys());

    expect(keys1).toEqual(keys2);
  });

  it('Array2D with same _elemId keeps the same keys when its values change', () => {
    const step1 = new Array2D({ values: [[1, 2], [3, 4]], x: 0, y: 0, _elem_id: 4 });
    const step2 = new Array2D({ values: [[9, 8], [7, 6]], x: 0, y: 0, _elem_id: 4 });

    const keys1 = new Set(buildGridObjects([step1]).keys());
    const keys2 = new Set(buildGridObjects([step2]).keys());

    expect(keys1).toEqual(keys2);
  });

  it('panel children keep their individual keys when positions change between steps', () => {
    // Find where a specific _elemId ended up in the result map.
    const keyOf = (result: Map<string, GridObject>, elemId: number) =>
      [...result.entries()].find(([, v]) => v.element._elemId === elemId)?.[0];

    const step1 = [
      { type: 'panel',  x: 0, y: 0, _elemId: 10 } as VisualBuilderElementBase,
      { type: 'rect',   x: 1, y: 0, _elemId: 11, panelId: '10' } as VisualBuilderElementBase,
      { type: 'circle', x: 0, y: 1, _elemId: 12, panelId: '10' } as VisualBuilderElementBase,
    ];
    const step2 = [
      { type: 'panel',  x: 2, y: 4, _elemId: 10 } as VisualBuilderElementBase,
      { type: 'rect',   x: 2, y: 3, _elemId: 11, panelId: '10' } as VisualBuilderElementBase, // moved
      { type: 'circle', x: 1, y: 2, _elemId: 12, panelId: '10' } as VisualBuilderElementBase, // moved
    ];

    const r1 = buildGridObjects(step1);
    const r2 = buildGridObjects(step2);
    console.log(r1);
    console.log(r2);

    expect(keyOf(r1, 10)).toBe(keyOf(r2, 10));
    expect(keyOf(r1, 11)).toBe(keyOf(r2, 11));
    expect(keyOf(r1, 12)).toBe(keyOf(r2, 12));
  });

  it('two Array1Ds with different _elemIds produce non-overlapping keys', () => {
    const arr1 = new Array1D({ values: [1, 2], x: 0, y: 0, _elem_id: 10 });
    const arr2 = new Array1D({ values: [3, 4], x: 0, y: 5, _elem_id: 20 });

    const result = buildGridObjects([arr1, arr2]);

    // All 6 keys must be distinct — overlap would cause one array to clobber the other
    expect(result.size).toBe(6);
  });
});

// ── Panel with Rect and Circle ────────────────────────────────────────────────

describe('Panel with children', () => {
  it('places children at absolute positions relative to the panel origin', () => {
    const panel:  VisualBuilderElementBase = { type: 'panel',  x: 2, y: 1, _elemId: 10 };
    const rect:   VisualBuilderElementBase = { type: 'rect',   x: 1, y: 0, _elemId: 11, panelId: '10' };
    const circle: VisualBuilderElementBase = { type: 'circle', x: 0, y: 1, _elemId: 12, panelId: '10' };

    expectGridObjects([panel, rect, circle], new Map([
      ['panel-e10', {
        element: panel,
        absElement: { ...panel, x: 2, y: 1, alpha: 1, z: 0 },
        info: { id: 'panel-e10', zOrder: 0, panelId: undefined },
      }],
      ['elem-11', {
        element: rect,
        absElement: { ...rect, x: 3, y: 1, alpha: 1, z: 0 },
        info: { id: 'elem-11', zOrder: 1, panelId: 'panel-e10', clickData: undefined, dragData: undefined, inputData: undefined },
      }],
      ['elem-12', {
        element: circle,
        absElement: { ...circle, x: 2, y: 2, alpha: 1, z: 0 },
        info: { id: 'elem-12', zOrder: 2, panelId: 'panel-e10', clickData: undefined, dragData: undefined, inputData: undefined },
      }],
    ]));
  });
});
