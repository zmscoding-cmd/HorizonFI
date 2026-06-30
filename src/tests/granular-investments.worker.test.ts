import { describe, it, expect } from 'vitest';
import { simulateMultiStageDrawdownWorker, MultiStageSimPayload } from '../workers/simulation.worker';

describe('Web Worker - Granular Investments & Temporal Lockouts', () => {
  const defaultPayload: MultiStageSimPayload = {
    type: 'MULTI_STAGE_DRAWDOWN',
    startYear: 2026,
    endYear: 2028,
    currentAge: 40,
    assets: [],
    stages: [{
      id: 'default',
      name: 'Default',
      fundingPriorities: ['TAXABLE', 'PRE_TAX']
    }],
    budgetPhases: [{ phaseId: 'phase1', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
    milestones: [],
    uprrDivestmentAnnualAmount: 0,
    dividendEtfId: 'div',
    uprrId: 'uprr',
    targetConstantMarketReturn: 0.05,
    inflationRate: 0.0,
    budgetPhases: [{ phaseId: 'p1', startYear: 2026, endYear: 2028, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
    maxRealWithdrawal: 100000,
    liquidBufferYears: 0,
  };

  it('should explicitly assert that an asset with a future availableDate is NOT drawn down', () => {
    const payload: MultiStageSimPayload = {
      ...defaultPayload,
      assets: [
        {
          id: 'liquid',
          name: 'Liquid Savings',
          value: 100000,
          assetType: 'TAXABLE',
          expectedGrowthRate: 0.0,
          expectedDividendYield: 0.0
        },
        {
          id: 'locked_401k',
          name: 'Locked 401k',
          value: 500000,
          assetType: 'PRE_TAX',
          expectedGrowthRate: 0.0,
          expectedDividendYield: 0.0,
          availableDate: 'age:59.5' // Locked until age 59.5, currently age 40
        }
      ]
    };

    // Total expenses are 100k per year.
    // In year 2026: Liquid Savings (100k) should be depleted.
    // In year 2027: Locked 401k cannot be touched. The budget should be unfunded or drawn from nowhere.
    
    const snapshots = simulateMultiStageDrawdownWorker(payload);
    
    const year2026 = snapshots.find(s => s.year === 2026);
    const year2027 = snapshots.find(s => s.year === 2027);

    // Year 1: Liquid savings is fully drained
    expect(year2026?.assetBalances['liquid']).toBeCloseTo(0);
    // Locked 401k remains untouched
    expect(year2026?.assetBalances['locked_401k']).toBeCloseTo(500000);
    
    // Year 2: Locked 401k is STILL untouched because it's locked
    expect(year2027?.assetBalances['locked_401k']).toBeCloseTo(500000);
  });

  it('should compound assets exactly to their individual expectedGrowthRate rather than a global average', () => {
    const payload: MultiStageSimPayload = {
      ...defaultPayload,
      // No expenses so we can just see raw growth
      budgetPhases: [{ phaseId: 'p1', startYear: 2026, endYear: 2028, baselineAmount: 0, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
      assets: [
        {
          id: 'high_growth',
          name: 'Tech Stock',
          value: 100000,
          assetType: 'TAXABLE',
          expectedGrowthRate: 0.20, // 20%
          expectedDividendYield: 0.0
        },
        {
          id: 'low_growth',
          name: 'Bonds',
          value: 100000,
          assetType: 'TAXABLE',
          expectedGrowthRate: 0.02, // 2%
          expectedDividendYield: 0.0
        }
      ]
    };

    const snapshots = simulateMultiStageDrawdownWorker(payload);
    
    const year2026 = snapshots.find(s => s.year === 2026);
    
    // 100k @ 20% growth = 120k
    expect(year2026?.assetBalances['high_growth']).toBeCloseTo(120000);
    
    // 100k @ 2% growth = 102k
    expect(year2026?.assetBalances['low_growth']).toBeCloseTo(102000);
  });
});
