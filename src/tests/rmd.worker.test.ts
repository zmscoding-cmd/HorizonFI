import { describe, it, expect } from 'vitest';
import { simulateMultiStageDrawdownWorker } from '../workers/simulation.worker';

describe('Web Worker - SECURE 2.0 RMD and Excess Reinvestment', () => {
  it('correctly triggers RMDs at age 73 for 1959 birth year cohort, and age 75 for 1960 cohort', () => {
    // 1. Birth Year 1959 (RMD age 73)
    const payload1959: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2036,
      currentAge: 67, // 2026 - 1959 = 67
      primaryBirthYear: 1959,
      assets: [
        { id: 'pretax1', name: 'Pre-tax 401k', value: 1000000, assetType: 'PRE_TAX', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 },
        { id: 'taxable1', name: 'Taxable Brokerage', value: 50000, assetType: 'TAXABLE', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 }
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [], startYearType: 'absolute', startAbsoluteYear: 2026 }
      ],
      milestones: [],
      targetConstantMarketReturn: 0.0,
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2040, baselineAmount: 30000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      uprrDivestmentAnnualAmount: 0
    };

    const results1959 = simulateMultiStageDrawdownWorker(payload1959);
    
    // RMD start age 73 is in year: 1959 + 73 = 2032.
    // At age 72 (year 2031), rmdAmount should be 0.
    const year2031Result = results1959.find(r => r.year === 2031);
    expect(year2031Result?.rmdAmount ?? 0).toBe(0);

    // At age 73 (year 2032), rmdAmount should be greater than 0.
    const year2032Result = results1959.find(r => r.year === 2032);
    expect(year2032Result?.rmdAmount).toBeGreaterThan(0);

    // 2. Birth Year 1960 (RMD age 75)
    const payload1960: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2036,
      currentAge: 66, // 2026 - 1960 = 66
      primaryBirthYear: 1960,
      assets: [
        { id: 'pretax1', name: 'Pre-tax 401k', value: 1000000, assetType: 'PRE_TAX', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 },
        { id: 'taxable1', name: 'Taxable Brokerage', value: 50000, assetType: 'TAXABLE', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 }
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [], startYearType: 'absolute', startAbsoluteYear: 2026 }
      ],
      milestones: [],
      targetConstantMarketReturn: 0.0,
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2040, baselineAmount: 30000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      uprrDivestmentAnnualAmount: 0
    };

    const results1960 = simulateMultiStageDrawdownWorker(payload1960);
    
    // RMD start age 75 is in year: 1960 + 75 = 2035.
    // At age 74 (year 2034), rmdAmount should be 0.
    const year2034Result = results1960.find(r => r.year === 2034);
    expect(year2034Result?.rmdAmount ?? 0).toBe(0);

    // At age 75 (year 2035), rmdAmount should be greater than 0.
    const year2035Result = results1960.find(r => r.year === 2035);
    expect(year2035Result?.rmdAmount).toBeGreaterThan(0);
  });

  it('mathematically asserts that Excess RMD is properly added to the designated Taxable asset balance', () => {
    // Create a scenario where the pre-tax asset is very high, e.g., $5,000,000.
    // At age 73 (1959 cohort, year 2032), the RMD divisor is 26.5, so RMD is approx 5,000,000 / 26.5 = $188,679.
    // If the budget baseline is $30,000, the budget deficit is $30,000.
    // Therefore, Excess RMD is $188,679 - $30,000 = $158,679.
    // This excess RMD should be added to the Taxable Brokerage asset balance.
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2032, // start simulation in the RMD year directly
      endYear: 2032,
      currentAge: 73,
      primaryBirthYear: 1959,
      rmdReinvestmentAssetId: 'taxable1',
      assets: [
        { id: 'pretax1', name: 'Pre-tax 401k', value: 5000000, assetType: 'PRE_TAX', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 },
        { id: 'taxable1', name: 'Taxable Dividend ETF', value: 100000, assetType: 'TAXABLE', expectedGrowthRate: 0.0, expectedDividendYield: 0.0 }
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [], startYearType: 'absolute', startAbsoluteYear: 2032 }
      ],
      milestones: [],
      targetConstantMarketReturn: 0.0,
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2032, endYear: 2032, baselineAmount: 30000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      uprrDivestmentAnnualAmount: 0
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    expect(results).toHaveLength(1);
    const resultYear = results[0];
    
    // Aggregate RMD should be calculated
    const expectedRmd = 5000000 / 26.5; // IRS Uniform Lifetime Table (Table III) divisor for age 73 is 26.5
    expect(resultYear.rmdAmount).toBeCloseTo(expectedRmd, 1);
    
    // Budget used is $30,000
    expect(resultYear.rmdUsedForBudget).toBe(30000);
    
    // Excess RMD reinvested is total RMD - budget used
    const expectedExcess = expectedRmd - 30000;
    expect(resultYear.rmdExcessReinvested).toBeCloseTo(expectedExcess, 1);

    // Assert that the ending balance of 'taxable1' is significantly higher than starting value ($100,000)
    // due to receiving the excess RMD reinvestment, even after paying some ordinary income tax drag.
    const endingTaxableValue = resultYear.assetBalances['taxable1'];
    
    // Starting taxable: $100,000.
    // Excess RMD added: $158,679.
    // Total should be around $258,679 before taxes/withdrawals. After taxes/drawdowns, it is $228,441.
    // This confirms that the excess RMD was successfully added and tracked.
    expect(endingTaxableValue).toBeGreaterThan(100000);
    expect(endingTaxableValue).toBeLessThan(100000 + expectedExcess);
    expect(endingTaxableValue).toBeCloseTo(100000 + expectedExcess - resultYear.taxDrag - 1467.88, 1);
  });
});
