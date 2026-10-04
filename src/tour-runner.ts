/** A cancellable single-step runner. Progress survives pauses; timers do not. */
export type StepProgress = { invoked: boolean; completed: boolean };
export function runTourStep(options: {
  progress: StepProgress;
  ready: () => boolean;
  run: () => void;
  complete: () => boolean;
  holdMs: number;
  onReady: () => void;
  onAdvance: () => void;
  onError: (error: Error) => void;
}) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const started = Date.now();
  const stop = () => { stopped = true; clearTimeout(timer); };
  const poll = () => {
    if (stopped) return;
    try {
      if (options.progress.completed || options.complete()) {
        options.progress.completed = true;
        options.onReady();
        timer = setTimeout(() => { if (!stopped) options.onAdvance(); }, options.holdMs);
        return;
      }
      if (Date.now() - started >= 10000) throw Error('This step could not finish. Retry, or replay this chapter from its starting point.');
      if (!options.progress.invoked && options.ready()) {
        // Mark before invocation so even an interrupted callback cannot be repeated.
        options.progress.invoked = true;
        options.run();
      }
      timer = setTimeout(poll, 100);
    } catch (error) {
      stop();
      options.onError(error instanceof Error ? error : Error('Unable to run this step.'));
    }
  };
  poll();
  return stop;
}
