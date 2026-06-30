import { describe, it, expect } from 'vitest';
import { simulateMultiStageDrawdownWorker } from '../workers/simulation.worker';

describe('Web Worker - Phased Budget Multi-Stage Logic', () => {
  it('correctly transitions drawdown target when crossing the temporal boundary between two distinct budget phases', () => {
    // Current Year: 2026. Age: 60.
    // Phase 1 (Go-Go): 2026 to 2030, Baseline: 100000
    // Phase 2 (Slow-Go): 2031 to 2100, Baseline: 80000
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2032,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 2000000, type: 'cash', growthRate: 0.05 }
      ],
      stages: [
        { 
          id: 'stg1', 
          fundingPriorities: [],
          startYearType: 'absolute',
          startAbsoluteYear: 2026
        }
      ],
      milestones: [],
      targetConstantMarketReturn: 0.05, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2030, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 },
        { phaseId: 'p2', startYear: 2031, endYear: 2100, baselineAmount: 80000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      uprrDivestmentAnnualAmount: 0
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    // 2026 to 2032 -> 7 years
    expect(results).toHaveLength(7);
    
    // Years 2026-2030 should have a target budget of 100,000
    for (let i = 0; i <= 4; i++) {
      expect(results[i].year).toBe(2026 + i);
      expect(results[i].targetBudgetNominal).toBe(100000);
      expect(results[i].nominalWithdrawal).toBe(100000); // no tax drag since it's cash
    }

    // Years 2031-2032 should transition to target budget of 80,000
    for (let i = 5; i <= 6; i++) {
      expect(results[i].year).toBe(2026 + i);
      expect(results[i].targetBudgetNominal).toBe(80000);
      expect(results[i].nominalWithdrawal).toBe(80000);
    }
  });
});
