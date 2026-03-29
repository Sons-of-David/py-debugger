export interface VizRange {
  startLine: number; // line number of # @viz  (1-based)
  endLine: number;   // line number of # @end  (1-based)
}

export interface FoldingRange {
  start: number;    // 1-based
  end: number;      // 1-based
  isVizBlock?: boolean;
}

/**
 * Computes folding ranges for a Python code string.
 * Returns viz block ranges first, then indentation-based ranges for standard Python blocks.
 * Pure function — no Monaco dependency.
 */
export function computeFoldingRanges(code: string, vizRanges: VizRange[]): FoldingRange[] {
  const ranges: FoldingRange[] = [];

  for (const r of vizRanges) {
    ranges.push({ start: r.startLine, end: r.endLine, isVizBlock: true });
  }

  const lines = code.split('\n');
  const indents = lines.map((line) => {
    const trimmed = line.trimStart();
    if (trimmed === '') return -1;
    if (trimmed.startsWith('#') && !trimmed.startsWith('# @viz') && !trimmed.startsWith('# @end'))
      return -1;
    return line.length - trimmed.length;
  });
  console.log(indents);
  const lastContentLine = indents.reduce((last, d, i) => (d !== -1 ? i + 1 : last), 0);
  const stack: { indent: number; startLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const indent = indents[i];
    if (indent === -1) continue;
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      const closed = stack.pop()!;
      let endIdx = i - 1;
      while (endIdx >= 0 && (lines[endIdx].trim() === '' || (lines[endIdx].trimStart().startsWith('#') && !lines[endIdx].trimStart().startsWith('# @viz') && !lines[endIdx].trimStart().startsWith('# @end')))) endIdx--;
      const endLine = endIdx + 1;
      if (endLine > closed.startLine) ranges.push({ start: closed.startLine, end: endLine });
    }
    let nextIndent = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (indents[j] !== -1) { nextIndent = indents[j]; break; }
    }
    if (nextIndent > indent) stack.push({ indent, startLine: i + 1 });
  }
  while (stack.length > 0) {
    const closed = stack.pop()!;
    if (lastContentLine > closed.startLine) ranges.push({ start: closed.startLine, end: lastContentLine });
  }

  return ranges;
}

export interface VizRangesFull {
  goodRanges: VizRange[];
  badRanges: VizRange[];
  errorMsg: string;
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

// TODO: consider using just this getVizRangesFull function everywhere.
export function getVizRangesFull(code: string): VizRangesFull {
  const lines = code.split('\n');
  const goodRanges: VizRange[] = [];
  const badRanges: VizRange[] = [];
  let errorMsg: string = '';
  let openStart: number | null = null;
  let openIndent: number | null = null;
  let goodBlock: boolean = true;

  for (let i = 0; i < lines.length; i++) {
    const indent = leadingSpaces(lines[i]);
    const t = lines[i].trim();

    if (t === '# @viz') {
      if (openStart !== null) {
        // Didn't close previous block before starting a new one — flag the previous block as bad, and continue checking for more errors in the new block
        badRanges.push({ startLine: openStart, endLine: openStart }); 
        if (errorMsg === '')
          errorMsg = `Line ${i+1}: nested # @viz blocks are not allowed (block opened on line ${openStart})`;        
      }
      goodBlock = true;
      openStart = i + 1;   // 1-based; also == 0-based index of first body line
      openIndent = indent;
    } else if (t === '# @end'){ 
      if (openStart === null) {
        // Orphan # @end
        badRanges.push({ startLine: i + 1, endLine: i + 1 });
        if (errorMsg === '')
          errorMsg = `Line ${i+1}: # @end without a matching # @viz`;
        continue;
      }
      if (indent !== openIndent) {
        // Mismatched indentation between # @viz and # @end
        badRanges.push({ startLine: openStart, endLine: i + 1 });
        if (errorMsg === '')
          errorMsg = `Lines ${openStart}–${i+1}: # @end indentation (${indent} spaces) does not match # @viz indentation (${openIndent} spaces)`;
        openStart = null;
        openIndent = null;
        continue;
      }
      if (!goodBlock) {
        // This block already has an error (e.g. a dedent inside the block) — just close it out as bad
        badRanges.push({ startLine: openStart, endLine: i + 1 });
        if (errorMsg === '')          
          errorMsg = `Lines ${openStart}–${i+1}: # @end found, but block is invalid due to previous errors (e.g. a line dedented below the marker level)`;  
        openStart = null;
        openIndent = null;
        continue;
      }
      goodRanges.push({ startLine: openStart, endLine: i + 1 });
      openStart = null;
      openIndent = null;
    } else if (openStart !== null) {
      // Inside a block, check for dedent below marker level
      if (lines[i].trim() !== '' && indent < openIndent!) {
        goodBlock = false;
        if (errorMsg === '')
          errorMsg = `Line ${i+1}: line inside viz block (lines ${openStart}–${i+1}) is dedented below the block markers (${indent} spaces < ${openIndent} spaces)`;
      }
    }
  }
  return {goodRanges, badRanges, errorMsg};
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
    const indent = leadingSpaces(lines[i]);
    const t = lines[i].trim();

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
 * Returns ranges for complete but malformed viz blocks, for live red-highlight.
 *
 * A range is "bad" when both markers are present but the block is structurally
 * invalid (mismatched indentation, or a body line dedents below the markers).
 * An orphan # @end (no opening # @viz) is also flagged as a single-line range.
 * An unclosed # @viz with no # @end is intentionally ignored — the user may
 * still be typing.
 */
export function getVizBadRanges(code: string): VizRange[] {
  const lines = code.split('\n');
  const bad: VizRange[] = [];
  let openStart: number | null = null;
  let openIndent: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const indent = leadingSpaces(lines[i]);
    const lineNum = i + 1;

    if (t === '# @viz') {
      openStart = lineNum;   // 1-based; also == 0-based index of first body line
      openIndent = indent;
    } else if (t === '# @end') {
      if (openStart === null) {
        // Orphan # @end
        bad.push({ startLine: lineNum, endLine: lineNum });
        continue;
      }
      // Check indentation match and body lines
      let invalid = indent !== openIndent;
      if (!invalid) {
        for (let j = openStart; j < i; j++) {
          if (lines[j].trim() !== '' && leadingSpaces(lines[j]) < openIndent!) {
            invalid = true;
            break;
          }
        }
      }
      if (invalid) bad.push({ startLine: openStart, endLine: lineNum });
      openStart = null;
      openIndent = null;
    }
  }
  return bad;
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
