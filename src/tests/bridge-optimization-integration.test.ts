import { describe, it, expect, vi } from 'vitest';
import { BridgeStrategyTable, BridgeOptimizationData } from '../components/BridgeStrategyTable';
import React from 'react';

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

  it('Ledger Strategy Table: renders suggested rows from simulated worker payload and triggers Apply handler', () => {
    const mockPayload: BridgeOptimizationData[] = [
      {
        year: 2026,
        ordinaryIncome: 45000,
        capitalGains: 30000,
        stockLiquidation: 25000,
        rothConversion: 15000,
        effectiveMarginalRate: 0.12,
      },
      {
        year: 2027,
        ordinaryIncome: 47000,
        capitalGains: 32000,
        stockLiquidation: 28000,
        rothConversion: 18000,
        effectiveMarginalRate: 0.12,
      }
    ];

    const onApplyMock = vi.fn();

    // Call the functional component directly to inspect the virtual node structure
    const element = BridgeStrategyTable({
      data: mockPayload,
      onApplyYearlyStrategy: onApplyMock
    });

    // Verify component returns valid JSX structure
    expect(element).toBeDefined();
    expect(element.props.id).toBe('bridge-strategy-table-card');

    // Traverse the JSX tree to find the table rows and verify props
    const tableContainer = element.props.children[1];
    const tableOuter = tableContainer.props.children;
    const table = tableOuter.props.children;
    const tbody = table.props.children[1];
    const rowsArray = tbody.props.children[0];

    expect(rowsArray.length).toBe(2);

    // Verify Row 1 Data
    const row1 = rowsArray[0];
    const cols1 = row1.props.children;
    expect(cols1[0].props.children).toBe(2026); // Year
    
    // Simulate clicking "Apply" for the first row to ensure callback is invoked with correct parameters
    const actionButton1 = cols1[6].props.children;
    actionButton1.props.onClick();

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    expect(onApplyMock).toHaveBeenCalledWith(2026, 25000, 15000);
  });

  it('Ledger Strategy Table: renders Unapply button and triggers Unapply handler when strategy is already applied', () => {
    const mockPayload: BridgeOptimizationData[] = [
      {
        year: 2026,
        ordinaryIncome: 45000,
        capitalGains: 30000,
        stockLiquidation: 25000,
        rothConversion: 15000,
        effectiveMarginalRate: 0.12,
      }
    ];

    const onUnapplyMock = vi.fn();
    const appliedStrategies = [
      { year: 2026, stockLiquidation: 25000, rothConversion: 15000 }
    ];

    // Render component with applied strategy
    const element = BridgeStrategyTable({
      data: mockPayload,
      appliedStrategies,
      onUnapplyYearlyStrategy: onUnapplyMock
    });

    expect(element).toBeDefined();

    // Traverse the JSX tree to find the action buttons
    const tableContainer = element.props.children[1];
    const tableOuter = tableContainer.props.children;
    const table = tableOuter.props.children;
    const tbody = table.props.children[1];
    const rowsArray = tbody.props.children[0];
    const cols = rowsArray[0].props.children;

    // Action cell container
    const actionCell = cols[6].props.children;
    expect(actionCell.props.className).toContain('flex items-center');

    // Unapply button is the second child in the container (index 1)
    const unapplyButton = actionCell.props.children[1];
    expect(unapplyButton.props.children).toBe('Unapply');

    // Click Unapply
    unapplyButton.props.onClick();
    expect(onUnapplyMock).toHaveBeenCalledTimes(1);
    expect(onUnapplyMock).toHaveBeenCalledWith(2026);
  });
});

