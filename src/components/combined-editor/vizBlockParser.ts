export interface VizRange {
  startLine: number; // line number of # @viz  (1-based)
  endLine: number;   // line number of # @end  (1-based)
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * Returns viz block ranges for live editor use (decorations, folding).
 * Permissive: silently skips incomplete or malformed blocks so typing mid-block
 * never crashes the editor. Only fully-formed, correctly-indented blocks are returned.
 *
 * openStart stores the 1-based line number of # @viz, which also equals the
 * 0-based index of the first body line — both uses are correct.
 */
export function getVizRanges(code: string): VizRange[] {
  const lines = code.split('\n');
  const ranges: VizRange[] = [];
  let openStart: number | null = null;
  let openIndent: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const indent = leadingSpaces(lines[i]);

    if (t === '# @viz') {
      openStart = i + 1;   // 1-based; also == 0-based index of first body line
      openIndent = indent;
    } else if (t === '# @end' && openStart !== null) {
      if (indent === openIndent) {
        // Verify no body line dedents below the marker level
        let valid = true;
        for (let j = openStart; j < i; j++) {
          if (lines[j].trim() !== '' && leadingSpaces(lines[j]) < openIndent!) {
            valid = false;
            break;
          }
        }
        if (valid) ranges.push({ startLine: openStart, endLine: i + 1 });
      }
      openStart = null;
      openIndent = null;
    }
  }
  return ranges;
}

/**
 * Strict validation for use at analyze/execute time.
 * Returns a descriptive error string on the first problem, or null if valid.
 */
export function validateVizBlocks(code: string): string | null {
  const lines = code.split('\n');
  let openStart: number | null = null;
  let openIndent: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const indent = leadingSpaces(lines[i]);
    const lineNum = i + 1;

    if (t === '# @viz') {
      if (openStart !== null)
        return `Line ${lineNum}: nested # @viz blocks are not allowed (block opened on line ${openStart})`;
      openStart = lineNum;
      openIndent = indent;
    } else if (t === '# @end') {
      if (openStart === null)
        return `Line ${lineNum}: # @end without a matching # @viz`;
      if (indent !== openIndent)
        return (
          `Lines ${openStart}–${lineNum}: # @end indentation (${indent} spaces) ` +
          `does not match # @viz indentation (${openIndent} spaces)`
        );
      for (let j = openStart; j < i; j++) {
        if (lines[j].trim() === '') continue;
        const bodyIndent = leadingSpaces(lines[j]);
        if (bodyIndent < openIndent!) {
          return (
            `Line ${j + 1}: line inside viz block (lines ${openStart}–${lineNum}) ` +
            `is dedented below the block markers (${bodyIndent} spaces < ${openIndent} spaces)`
          );
        }
      }
      openStart = null;
      openIndent = null;
    }
  }

  if (openStart !== null)
    return `Line ${openStart}: unclosed # @viz block (missing # @end)`;

  return null;
}
