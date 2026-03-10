// Output from all finished segments (trace run + previous debug calls), including their end markers.
let _committedOutput = '';
// Per-step output deltas for the currently active trace or debug call.
let _currentStepOutputs: string[] = [];

/** Replace the current segment's per-step deltas (called after each trace/debug-call run). */
export function setCurrentStepOutputs(outputs: string[]): void {
  _currentStepOutputs = outputs;
}

/**
 * Append a marker line to the committed output (e.g. at the start of a debug call).
 * A leading newline is added when there is already committed content so the marker
 * always starts on its own line.
 */
export function appendMarker(text: string): void {
  if (_committedOutput && !_committedOutput.endsWith('\n')) {
    _committedOutput += '\n';
  }
  _committedOutput += text + '\n';
}

/**
 * Seal the current segment: join all its step outputs, optionally append an end marker,
 * then move everything into _committedOutput and clear the current segment.
 */
export function commitCurrentSegment(endMarker?: string): void {
  const segmentOutput = _currentStepOutputs.join('');
  if (segmentOutput) {
    if (_committedOutput && !_committedOutput.endsWith('\n')) {
      _committedOutput += '\n';
    }
    _committedOutput += segmentOutput;
  }
  if (endMarker) {
    if (_committedOutput && !_committedOutput.endsWith('\n')) {
      _committedOutput += '\n';
    }
    _committedOutput += endMarker + '\n';
  }
  _currentStepOutputs = [];
}

/**
 * Returns the full terminal text: everything committed so far plus the
 * current segment's output up to (and including) the given step index.
 */
export function getTerminalOutput(currentStep: number): string {
  return _committedOutput + _currentStepOutputs.slice(0, currentStep + 1).join('');
}

export function clearAll(): void {
  _committedOutput = '';
  _currentStepOutputs = [];
}
