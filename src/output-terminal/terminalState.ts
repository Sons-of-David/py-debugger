let _debuggerStepOutputs: string[] = [];

export function setDebuggerStepOutputs(outputs: string[]): void {
  _debuggerStepOutputs = outputs;
}

export function getDebuggerOutputUpToStep(step: number): string {
  return _debuggerStepOutputs.slice(0, step + 1).join('');
}

export function clearAll(): void {
  _debuggerStepOutputs = [];
}
