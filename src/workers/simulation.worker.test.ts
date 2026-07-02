import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOptimalMultiYearTaxPathDP, DPOptimizationState, DPOptimizationParams, clearDPMemoCache } from './simulation.worker';

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
});
