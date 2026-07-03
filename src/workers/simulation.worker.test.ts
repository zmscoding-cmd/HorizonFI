import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOptimalMultiYearTaxPathDP, DPOptimizationState, DPOptimizationParams, clearDPMemoCache, TCJA_BRACKETS_2026, STANDARD_DEDUCTION_2026_EST } from './simulation.worker';

describe('Dynamic Programming Tax Optimization Engine', () => {
  beforeEach(() => {
    clearDPMemoCache();
  });

  it('Prioritizes liquidation and protects 0% LTCG threshold by limiting Roth conversions', () => {
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
    
    // Engine should prioritize stock liquidation to meet GK target ($100k)
    // This generates $80k in capital gains.
    // Base ordinary taxable is $90k - $30k = $60k.
    // Combined = $140k > $98,900 (0% LTCG limit).
    // Therefore, Roth conversion should be limited to 0 to avoid further pushing gains into 15% bracket.
    expect(result.rothConversionAmount).toBe(0);
    expect(result.lotsSold.length).toBe(1);
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
        { id: 'low-basis', shares: 1000, currentPrice: 100, costBasisPerShare: 10, acquisitionDate: '2020-01-01', isTargetConcentratedPosition: false },
        { id: 'high-basis', shares: 1000, currentPrice: 100, costBasisPerShare: 90, acquisitionDate: '2021-01-01', isTargetConcentratedPosition: false }
      ]
    };

    const params: DPOptimizationParams = {
      endAge: 61,
      rrbTier1Benefits: 0,
      baseOrdinaryIncome: 0, 
      guytonKlingerTarget: 50000,
      discountRate: 0.05
    };

    const result = calculateOptimalMultiYearTaxPathDP(state, params, 5);
    
    expect(result.lotsSold.length).toBe(1);
    expect(result.lotsSold[0].id).toBe('high-basis');
    expect(result.lotsSold[0].sharesSold).toBe(500);
  });
});
