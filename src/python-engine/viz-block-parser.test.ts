import { describe, it, expect } from 'vitest';
import { computeFoldingRanges, getVizRanges } from './viz-block-parser';
import type { VizRange } from './viz-block-parser';

// Helper: build a VizRange array from raw start/end pairs
function vizRanges(...pairs: [number, number][]): VizRange[] {
  return pairs.map(([startLine, endLine]) => ({ startLine, endLine }));
}

describe('computeFoldingRanges', () => {
  describe('viz block ranges', () => {
    it('marks a viz block with isVizBlock: true', () => {
      const code = `# @viz\nx = 1\n# @end\n`;
      const result = computeFoldingRanges(code, vizRanges([1, 3]));
      expect(result).toContainEqual({ start: 1, end: 3, isVizBlock: true });
    });

    it('includes multiple viz blocks', () => {
      const code = `# @viz\nx = 1\n# @end\n# @viz\ny = 2\n# @end\n`;
      const result = computeFoldingRanges(code, vizRanges([1, 3], [4, 6]));
      expect(result).toContainEqual({ start: 1, end: 3, isVizBlock: true });
      expect(result).toContainEqual({ start: 4, end: 6, isVizBlock: true });
    });

    it('returns no viz ranges when vizRanges is empty', () => {
      const code = `x = 1\n`;
      const result = computeFoldingRanges(code, []);
      expect(result.filter((r) => r.isVizBlock)).toHaveLength(0);
    });
  });

  describe('indentation-based ranges', () => {
    it('folds a simple def block', () => {
      const code = `def foo():\n    x = 1\n    y = 2\n`;
      const result = computeFoldingRanges(code, []);
      expect(result).toContainEqual({ start: 1, end: 3 });
    });

    it('folds a class with a method', () => {
      const code = [
        'class Foo:',     // line 1
        '    def bar():', // line 2
        '        x = 1', // line 3
        '        y = 2', // line 4
      ].join('\n');
      const result = computeFoldingRanges(code, []);
      expect(result).toContainEqual({ start: 2, end: 4 }); // bar body
      expect(result).toContainEqual({ start: 1, end: 4 }); // class body
    });

    it('stops the fold before trailing blank lines', () => {
      const code = `def foo():\n    x = 1\n\ndef bar():\n    y = 2\n`;
      const result = computeFoldingRanges(code, []);
      // foo should end at line 2, not line 3 (blank)
      expect(result).toContainEqual({ start: 1, end: 2 });
      expect(result).toContainEqual({ start: 4, end: 5 });
    });

    it('ignores comment-only lines for indentation', () => {
      const code = `def foo():\n    # just a comment\n    x = 1\n`;
      const result = computeFoldingRanges(code, []);
      expect(result).toContainEqual({ start: 1, end: 3 });
    });

    it('does not fold a single-line block', () => {
      const code = `x = 1\ny = 2\n`;
      const result = computeFoldingRanges(code, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('mixed viz blocks + indentation', () => {
    it('returns both viz and indentation ranges together', () => {
      const code = [
        '# @viz',        // line 1
        'x = 1',         // line 2
        '# @end',        // line 3
        'def foo():',    // line 4
        '    y = 2',     // line 5
      ].join('\n');
      const result = computeFoldingRanges(code, vizRanges([1, 3]));
      expect(result).toContainEqual({ start: 1, end: 3, isVizBlock: true });
      expect(result).toContainEqual({ start: 4, end: 5 });
    });
  });

  describe('comment after python block', () => {
    it('comment after python block', () => {
      const code = `
if n <= 0:
    pass

# comment
if n <= 0:
    pass`;
      const result = computeFoldingRanges(code, vizRanges());
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ start: 2, end: 3 });
      expect(result).toContainEqual({ start: 6, end: 7 });
    });
  });
});
