export type LineSource = 'debugger' | 'marker' | 'error' | 'viz';

export interface TerminalLine {
  text: string;
  source: LineSource;
}

function toLines(text: string, source: LineSource): TerminalLine[] {
  if (!text) return [];
  const parts = text.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.map((t) => ({ text: t, source }));
}

/**
 * Append an error to the terminal in red.
 * Use this for any execution error: click handlers, builder code, debugger code, etc.
 */
export function appendError(text: string): void {
  if (!text) return;
  _combinedEditorSteps.push({ text: text.trimEnd(), isViz: false });
  _notify();
}

// ── Combined editor per-step output ───────────────────────────────────────────
let _combinedEditorSteps: Array<{ text: string; isViz: boolean }> = [];

export function setOutputTimeline(steps: Array<{ text: string; isViz: boolean }>): void {
  _combinedEditorSteps = steps;
  _notify();
}

export function getCombinedEditorOutput(currentStep: number): TerminalLine[] {
  const lines: TerminalLine[] = [];
  const end = Math.min(currentStep + 1, _combinedEditorSteps.length);
  for (let i = 0; i < end; i++) {
    const { text, isViz } = _combinedEditorSteps[i];
    if (!text) continue;
    lines.push(...toLines(text, isViz ? 'viz' : 'debugger'));
  }
  return lines;
}

export function clearAll(): void {
  _combinedEditorSteps = [];
  _notify();
}

// ── Change notification ────────────────────────────────────────────────────
let _version = 0;
const _listeners = new Set<() => void>();

function _notify(): void {
  _version++;
  _listeners.forEach((fn) => fn());
}

export function subscribeTerminal(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getTerminalVersion(): number {
  return _version;
}
