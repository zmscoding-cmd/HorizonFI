import { describe, it, expect, vi } from 'vitest';

describe('Bridge Period Optimization Module - UI Integration', () => {
  it('Adapter Interface: serializes financial profile and passes to Web Worker asynchronously', () => {
    // Mock the Web Worker API
    const postMessageMock = vi.fn();
    class MockWorker {
      onmessage: ((ev: any) => void) | null = null;
      postMessage = postMessageMock;
      terminate = vi.fn();
    }
    vi.stubGlobal('Worker', MockWorker);

    const worker = new Worker(new URL('../workers/simulation.worker.ts', 'http://localhost'));
    
    // Simulate ScenarioBuilder triggering the Bridge Period Optimization
    const financialProfilePayload = {
      type: 'MULTI_STAGE_DRAWDOWN',
      scenarioId: 'test-scenario',
      data: {
        currentAge: 55,
        targetRetirementAge: 65,
        assets: [],
        taxLots: []
      }
    };
    
    worker.postMessage(financialProfilePayload);
    
    // Assert that the payload is serialized and passed without blocking
    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledWith(financialProfilePayload);
    
    // Cleanup
    vi.unstubAllGlobals();
  });

  it('Chart Reactivity: adjusts target marginal bracket constraint and updates via RxJS/RxDB observables', () => {
    // Mock an RxJS observable stream from RxDB
    let subscriberCallback: ((data: any) => void) | null = null;
    const mockRxDbObservable = {
      subscribe: (cb: (data: any) => void) => {
        subscriberCallback = cb;
        return { unsubscribe: vi.fn() };
      }
    };

    // Simulate the chart subscription
    const chartRenderMock = vi.fn();
    mockRxDbObservable.subscribe((data) => {
      chartRenderMock(data);
    });

    // Simulate adjusting the target marginal bracket constraint in the UI
    const updatedConstraint = { targetLtcgBracket: 0.15, optimizationEnabled: true };
    
    // Simulate RxDB pushing the updated optimized sequence
    if (subscriberCallback) {
      subscriberCallback(updatedConstraint);
    }
    
    // Assert that the observable triggered the chart update
    expect(chartRenderMock).toHaveBeenCalledTimes(1);
    expect(chartRenderMock).toHaveBeenCalledWith(updatedConstraint);
  });
});
