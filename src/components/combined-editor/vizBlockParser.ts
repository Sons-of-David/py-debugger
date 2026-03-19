export interface VizRange {
  startLine: number; // line number of # @viz  (1-based)
  endLine: number;   // line number of # @end  (1-based)
}

export function getVizRanges(code: string): VizRange[] {
  const lines = code.split('\n');
  const ranges: VizRange[] = [];
  let openStart: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '# @viz') openStart = i + 1;        // 1-based
    else if (t === '# @end' && openStart !== null) {
      ranges.push({ startLine: openStart, endLine: i + 1 });
      openStart = null;
    }
  }
  return ranges;
}
