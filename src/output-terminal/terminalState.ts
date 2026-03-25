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

// ── Committed output (survives entering interactive mode) ──────────────────────
// Cleared only on Analyze / load file.
let _committedLines: TerminalLine[] = [];

// ── Current trace segment (per-step deltas) ───────────────────────────────────
let _currentSteps: Array<{ text: string; isViz: boolean }> = [];

export function setOutputTimeline(steps: Array<{ text: string; isViz: boolean }>): void {
  _currentSteps = steps;
  _notify();
}

/**
 * Seal the current trace segment into committed lines, then optionally append
 * a marker. Called when transitioning trace → interactive.
 */
export function commitSegment(marker?: string): void {
  const before = _committedLines.length;
  for (const { text, isViz } of _currentSteps) {
    if (text) _committedLines.push(...toLines(text, isViz ? 'viz' : 'debugger'));
  }
  if (marker && _committedLines.length > before) {
    _committedLines.push({ text: marker, source: 'marker' });
  }
  _currentSteps = [];
  _notify();
}

/**
 * Append an error to committed lines in red.
 */
export function appendError(text: string): void {
  if (!text) return;
  _committedLines.push(...toLines(text.trimEnd(), 'error'));
  _notify();
}

// ── Getter ────────────────────────────────────────────────────────────────────

/** Committed lines from past segments + current segment up to currentStep. */
export function getEditorOutput(currentStep: number): TerminalLine[] {
  const lines = [..._committedLines];
  const end = Math.min(currentStep + 1, _currentSteps.length);
  for (let i = 0; i < end; i++) {
    const { text, isViz } = _currentSteps[i];
    if (!text) continue;
    lines.push(...toLines(text, isViz ? 'viz' : 'debugger'));
  }
  return lines;
}

/** Cleared only on Analyze / load file. */
export function clearAll(): void {
  _committedLines = [];
  _currentSteps = [];
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
