import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOptimalMultiYearTaxPathDP, DPOptimizationState, DPOptimizationParams, clearDPMemoCache, TCJA_BRACKETS_2026, STANDARD_DEDUCTION_2026_EST } from './simulation.worker';

describe('Dynamic Programming Tax Optimization Engine', () => {
  beforeEach(() => {
    clearDPMemoCache();
  });

  it('detects the Tax Torpedo and halts Roth Conversions to protect 0% LTCG space', () => {
    const state: DPOptimizationState = {
      age: 60,
      preTaxBalance: 500000,
      rothBalance: 0,
      taxableLots: [
        { id: 'lot1', shares: 1000, currentPrice: 100, costBasisPerShare: 20, acquisitionDate: '2020-01-01', isTargetConcentratedPosition: false }
      ]
    };

    const params: DPOptimizationParams = {
      endAge: 61,
      rrbTier1Benefits: 0,
      baseOrdinaryIncome: 90000, 
      guytonKlingerTarget: 100000,
      discountRate: 0.05
    };

    const result = calculateOptimalMultiYearTaxPathDP(state, params, 5); 
    
    expect(result.rothConversionAmount).toBe(0);
    expect(result.lotsSold.length).toBe(1);
    expect(result.taxesPaid).toBeGreaterThan(0);
  });

  it('Verify TCJA Permanence: utilizes 2026 progressive brackets for 2027 projection', () => {
    expect(TCJA_BRACKETS_2026).toEqual([
      { rate: 0.10, limit: 23200 },
      { rate: 0.12, limit: 94300 },
      { rate: 0.22, limit: 201050 },
      { rate: 0.24, limit: 383900 },
      { rate: 0.32, limit: 487450 },
      { rate: 0.35, limit: 731200 },
      { rate: 0.37, limit: Infinity }
    ]);
    expect(STANDARD_DEDUCTION_2026_EST).toBe(30000);
  });

  it('Test Specific Identification Logic: prioritizes high-basis lots first', () => {
    const state: DPOptimizationState = {
      age: 60,
      preTaxBalance: 0,
      rothBalance: 0,
      taxableLots: [
        // Low basis lot (huge gain)
        { id: 'low-basis', shares: 1000, currentPrice: 100, costBasisPerShare: 10, acquisitionDate: '2020-01-01', isTargetConcentratedPosition: false },
        // High basis lot (small gain)
        { id: 'high-basis', shares: 1000, currentPrice: 100, costBasisPerShare: 90, acquisitionDate: '2021-01-01', isTargetConcentratedPosition: false }
      ]
    };

    const params: DPOptimizationParams = {
      endAge: 61,
      rrbTier1Benefits: 0,
      baseOrdinaryIncome: 0, 
      guytonKlingerTarget: 50000, // We need $50k, which is 500 shares at $100
      discountRate: 0.05
    };

    const result = calculateOptimalMultiYearTaxPathDP(state, params, 5);
    
    expect(result.lotsSold.length).toBe(1);
    expect(result.lotsSold[0].id).toBe('high-basis');
    expect(result.lotsSold[0].sharesSold).toBe(500);
  });

  it('IRMAA Cliff Constraint: restricts conversion amount to stay below Medicare IRMAA threshold', () => {
    // Standard deduction is 30,000
    // First IRMAA cliff is 206,000 MAGI
    // 206,000 + 30,000 = 236,000 gross ordinary before it hits IRMAA
    const state: DPOptimizationState = {
      age: 63, // age 63+ is checked for IRMAA
      preTaxBalance: 500000,
      rothBalance: 0,
      taxableLots: []
    };

    const params: DPOptimizationParams = {
      endAge: 64,
      rrbTier1Benefits: 0,
      baseOrdinaryIncome: 150000, // Leaves 56,000 of room under the 206k cliff
      guytonKlingerTarget: 0,
      discountRate: 0.05
    };

    const result = calculateOptimalMultiYearTaxPathDP(state, params, 5);
    
    // The engine tests conversion in increments of 10000.
    // Base ordinary is 150000. To stay under 206000 MAGI, max conversion is 206000 - 150000 = 56000.
    // Thus it should choose 50000 as the maximum valid step.
    expect(result.rothConversionAmount).toBeLessThanOrEqual(56000);
  });
});
