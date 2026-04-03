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
        info: {
          id: 'elem-1',
          position: { row: 2, col: 3 },
          zOrder: 0,
          parentAlpha: 1,
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
    expect(panel?.info).toMatchObject({ id: 'panel-ea1-5', position: { row: 1, col: 0 }, panelId: undefined });

    const cell0 = result.get('array-cell-e5-0');
    expect(cell0?.info).toMatchObject({ id: 'array-cell-e5-0', position: { row: 1, col: 0 }, panelId: 'panel-ea1-5' });

    const cell1 = result.get('array-cell-e5-1');
    expect(cell1?.info).toMatchObject({ id: 'array-cell-e5-1', position: { row: 1, col: 1 }, panelId: 'panel-ea1-5' });
  });
});

// ── Array2D ───────────────────────────────────────────────────────────────────

describe('Array2D', () => {
  it('expands a 2x2 array into a panel and four cells at correct positions', () => {
    const arr = new Array2D({ values: [[1, 2], [3, 4]], x: 2, y: 3, _elem_id: 7 });

    const result = buildGridObjects([arr]);

    expect(result.size).toBe(5);

    const panel = result.get('panel-ea2-7');
    expect(panel?.info).toMatchObject({ id: 'panel-ea2-7', position: { row: 3, col: 2 }, panelId: undefined });

    expect(result.get('array2d-cell-e7-0-0')?.info).toMatchObject({ position: { row: 3, col: 2 }, panelId: 'panel-ea2-7' });
    expect(result.get('array2d-cell-e7-0-1')?.info).toMatchObject({ position: { row: 3, col: 3 }, panelId: 'panel-ea2-7' });
    expect(result.get('array2d-cell-e7-1-0')?.info).toMatchObject({ position: { row: 4, col: 2 }, panelId: 'panel-ea2-7' });
    expect(result.get('array2d-cell-e7-1-1')?.info).toMatchObject({ position: { row: 4, col: 3 }, panelId: 'panel-ea2-7' });
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
        info: { id: 'panel-e10', position: { row: 1, col: 2 }, zOrder: 0, parentAlpha: 1, panelId: undefined },
      }],
      ['elem-11', {
        element: rect,
        info: { id: 'elem-11', position: { row: 1, col: 3 }, zOrder: 1, parentAlpha: 1, panelId: 'panel-e10', clickData: undefined, dragData: undefined, inputData: undefined },
      }],
      ['elem-12', {
        element: circle,
        info: { id: 'elem-12', position: { row: 2, col: 2 }, zOrder: 2, parentAlpha: 1, panelId: 'panel-e10', clickData: undefined, dragData: undefined, inputData: undefined },
      }],
    ]));
  });
});
