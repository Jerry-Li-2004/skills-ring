import { afterEach, describe, expect, it, vi } from 'vitest';
import { runTourStep, type StepProgress } from './tour-runner';
afterEach(()=>vi.useRealTimers());
describe('tour playback lifecycle',()=>{
  it('does not invoke twice after pausing an action that already committed',()=>{
    vi.useFakeTimers(); const progress:StepProgress={invoked:false,completed:false}; let committed=false;
    const run=vi.fn(()=>{committed=true;});const advance=vi.fn();
    const options={progress,ready:()=>true,run,complete:()=>committed,holdMs:1000,onReady:vi.fn(),onAdvance:advance,onError:vi.fn()};
    const stop=runTourStep(options);stop();vi.advanceTimersByTime(2000);expect(advance).not.toHaveBeenCalled();
    runTourStep(options);vi.advanceTimersByTime(1000);expect(run).toHaveBeenCalledTimes(1);expect(advance).toHaveBeenCalledTimes(1);
  });
  it('cancels a missing-target wait on exit',()=>{
    vi.useFakeTimers();const run=vi.fn(),advance=vi.fn(),error=vi.fn();
    const stop=runTourStep({progress:{invoked:false,completed:false},ready:()=>false,run,complete:()=>false,holdMs:0,onReady:vi.fn(),onAdvance:advance,onError:error});
    stop();vi.advanceTimersByTime(20000);expect(run).not.toHaveBeenCalled();expect(advance).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();
  });
  it('reports missing targets and never advances over a failed outcome',()=>{
    vi.useFakeTimers();const error=vi.fn(),advance=vi.fn();
    runTourStep({progress:{invoked:false,completed:false},ready:()=>false,run:vi.fn(),complete:()=>false,holdMs:0,onReady:vi.fn(),onAdvance:advance,onError:error});
    vi.advanceTimersByTime(10000);expect(error).toHaveBeenCalledTimes(1);expect(advance).not.toHaveBeenCalled();
  });
  it('waits for verified completion before enabling Next or advancing',()=>{
    vi.useFakeTimers();let done=false;const ready=vi.fn(),advance=vi.fn(),run=vi.fn();
    runTourStep({progress:{invoked:false,completed:false},ready:()=>true,run,complete:()=>done,holdMs:300,onReady:ready,onAdvance:advance,onError:vi.fn()});
    vi.advanceTimersByTime(500);expect(run).toHaveBeenCalledTimes(1);expect(ready).not.toHaveBeenCalled();
    done=true;vi.advanceTimersByTime(100);expect(ready).toHaveBeenCalledTimes(1);expect(advance).not.toHaveBeenCalled();vi.advanceTimersByTime(300);expect(advance).toHaveBeenCalledTimes(1);
  });
});
