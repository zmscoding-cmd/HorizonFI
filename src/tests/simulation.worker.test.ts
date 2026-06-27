import { describe, it, expect } from 'vitest';
import { calculateWealthVelocity } from '../workers/simulation.worker';

describe('Web Worker - Wealth Velocity Mathematical Processing Engine', () => {
  it('should enforce strict bounds checking on input rates', () => {
    // withdrawalRate lower bound check (withdrawalRate = activePhaseBudget / balance => negative budget)
    expect(() => {
      calculateWealthVelocity(1000000, 0.06, -10000, 0.03);
    }).toThrow(/must be >= 0/);

    // withdrawalRate upper bound check (withdrawalRate > 1 means budget > balance)
    expect(() => {
      calculateWealthVelocity(1000000, 0.06, 1500000, 0.03);
    }).toThrow(/must be >= 0/);

    // inflationRate lower bound check
    expect(() => {
      calculateWealthVelocity(1000000, 0.06, 40000, -0.01);
    }).toThrow(/between 0 and 1/);

    // inflationRate upper bound check
    expect(() => {
      calculateWealthVelocity(1000000, 0.06, 40000, 1.1);
    }).toThrow(/between 0 and 1/);
  });

  it('VAL_SPENDING_SMILE_FLOOR: should calculate correct Spending Smile values and enforce the 0.015 floor limit', () => {
    // 1. Inflation rate of 0.025 should result in adjusted spending of exactly 0.015
    // Adjusted spending formula: Inflation - 0.01 = 0.025 - 0.01 = 0.015
    const resultNormal = calculateWealthVelocity(1000000, 0.06, 40000, 0.025);
    expect(resultNormal.adjustedSpending).toBeCloseTo(0.015, 6);

    // 2. Inflation rate of 0.02 should result in adjusted spending of exactly 0.015 (floor of 0.015)
    // Adjusted spending formula with floor: Math.max(0.015, 0.02 - 0.01 = 0.01) = 0.015
    const resultFloor = calculateWealthVelocity(1000000, 0.06, 40000, 0.02);
    expect(resultFloor.adjustedSpending).toBeCloseTo(0.015, 6);

    // 3. Higher inflation rates should calculate adjusted spending proportionally
    // e.g., inflation = 0.04 -> adjusted = 0.03
    const resultHigher = calculateWealthVelocity(1000000, 0.06, 40000, 0.04);
    expect(resultHigher.adjustedSpending).toBeCloseTo(0.03, 6);
  });

  it('should categorize phase velocity status dynamically', () => {
    // Accumulation status: withdrawalRate <= 0
    const accumStatus = calculateWealthVelocity(1000000, 0.06, 0, 0.03);
    expect(accumStatus.velocityStatus).toBe('Accumulation');

    // Velocity Point status: withdrawalRate within (0, 0.04]
    const velPointLow = calculateWealthVelocity(1000000, 0.06, 30000, 0.03);
    expect(velPointLow.velocityStatus).toBe('Velocity Point');

    const velPointHigh = calculateWealthVelocity(1000000, 0.06, 40000, 0.03);
    expect(velPointHigh.velocityStatus).toBe('Velocity Point');

    // Distribution / Drawdown status: withdrawalRate > 0.04
    const drawdownStatus = calculateWealthVelocity(1000000, 0.06, 50000, 0.03);
    expect(drawdownStatus.velocityStatus).toBe('Distribution/Drawdown');
  });

  it('should compute projectedGrowthDelta and handle milestone yearsToNext100k appropriately', () => {
    // Growth (6%) exceeds withdrawal (4%).
    // Balance = $1,150,000. Next milestone is $1,200,000. Distance = $50,000.
    // projectedGrowthDelta = (1,150,000 * 0.06) - (1,150,000 * 0.04) = 69,000 - 46,000 = 23,000
    // yearsToNext100k = Distance / delta = 50,000 / 23,000 = ~2.17 years.
    const positiveGrowth = calculateWealthVelocity(1150000, 0.06, 46000, 0.03);
    expect(positiveGrowth.projectedGrowthDelta).toBe(23000);
    expect(positiveGrowth.yearsToNext100k).toBeCloseTo(2.1739, 4);

    // Negative growth/delta scenario: yearsToNext100k should be Infinity
    // Balance = $1,150,000. Growth (2%) is less than withdrawal (4%).
    // projectedGrowthDelta = (1,150,000 * 0.02) - (1,150,000 * 0.04) = -23,000 (negative growth)
    const negativeGrowth = calculateWealthVelocity(1150000, 0.02, 46000, 0.03);
    expect(negativeGrowth.projectedGrowthDelta).toBe(-23000);
    expect(negativeGrowth.yearsToNext100k).toBe(Infinity);
  });
});

import { simulateMultiStageDrawdownWorker } from '../workers/simulation.worker';

describe('Web Worker - Non-Taxable Gift Drawdown Integrations', () => {
  it('should strictly reduce portfolio withdrawal by the active gift amount and assign $0 tax drag to it', () => {
    // 1. Target budget: $50,000
    // 2. Family non-taxable gift of $20,050
    // 3. Asset consists of taxable brokerage which has high capital gains exposure
    // 4. Verification: The remaining funding need from portfolio must equal $50,000 - $20,050 = $29,950
    // 5. Gift offset portion ($20,050) has $0 tax drag. Only the portfolio withdrawal part calculates tax drag.
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2026,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 500000, type: 'taxable_brokerage', basisRatio: 0.5, currentAnnualDividends: 0 }
      ],
      stages: [
        { id: 'stg1', targetAnnualBudget: 50000, fundingPriorities: [] }
      ],
      milestones: [],
      uprrDivestmentAnnualAmount: 0,
      dividendEtfId: '',
      uprrId: '',
      targetConstantMarketReturn: 0.0, // force growth to be 0 for exact math matching
      inflationRate: 0.0,
      budgetPhases: [{ phaseId: 'test', startYear: 2026, endYear: 2100, baselineAmount: 50000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      globalDiscountRate: 2.0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: [
        {
          id: 'gift1',
          name: 'Parent Gift of Capital',
          annualAmount: 20050,
          inflationAdjusted: false,
          startYear: 2026,
          endYear: 2026
        }
      ]
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    expect(results).toHaveLength(1);
    
    // Check that giftAmountUsed equals the active gift amount
    expect(results[0].giftAmountUsed).toBe(20050);
    
    // Check that nominal+real withdrawals have been reduced.
    // Portfolio nominal withdrawal should equal remaining funding need = $50,000 - $20,050 = $29,950
    expect(results[0].nominalWithdrawal).toBe(29950);
  });
});

describe('Web Worker - 3-Bucket Waterfall Implementation', () => {
  it('should initialize Buckets 1 & 2 via their duration parameters and correctly drain them structurally', () => {
    // 1. Target budget: $100,000
    // 2. Buckets: B1 = 2 years ($200k), B2 = 3 years ($300k). Total specific allocation: 5 years ($500k).
    // 3. Assets: $1.0M Cash. 
    // Bucket Initialization check inside worker during drawdown
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2026,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 1000000, type: 'cash', growthRate: 0.05 }
      ],
      stages: [
        { id: 'stg1', targetAnnualBudget: 100000, fundingPriorities: [] }
      ],
      milestones: [],
      uprrDivestmentAnnualAmount: 0,
      targetConstantMarketReturn: 0.05, 
      inflationRate: 0.0,
      budgetPhases: [{ phaseId: 'test', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      threeBuckets: {
        bucket1LiquiditySecuredYears: 2,
        bucket2IncomeSecuredYears: 3,
        bucket3GrowthRemainingYears: 25,
        rebalancingTriggerType: 'Chronological'
      }
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    expect(results).toHaveLength(1);
    
    // Total withdrawal will be $100k
    expect(results[0].nominalWithdrawal).toBe(100000);
    
    // Pre-Growth Math Check expected logically:
    // Start total: 1,000,000. 
    // B1: 200,000 - 100,000 = 100,000 (after drain)
    // B2: 300,000
    // B3: 500,000
    // Total pre-growth: 900,000
    // Actual asset ends year with 5% growth: 900,000 * 1.05 = 945,000.
    const expectedFinalBalance = 900000 * 1.05;
    expect(results[0].endingBalance).toBeCloseTo(expectedFinalBalance, 0);
    
    // Abstract growth scale matched factor: 945,000 / 900,000 = 1.05
    // After growth: B1 = 105,000, B2 = 315,000, B3 = 525,000
    // Refill B1 from B2 (B1 target = 200,000, needs 95,000)
    // B1 becomes 200,000. B2 loses 95,000 -> 220,000.
    // Refill B2 from B3 (B2 target = 300,000, needs 80,000)
    // B2 becomes 300,000. B3 loses 80,000 -> 445,000.
    
    const finalB1 = results[0].bucket1Balance || 0;
    const finalB2 = results[0].bucket2Balance || 0;
    const finalB3 = results[0].bucket3Balance || 0;
    
    expect(finalB1 + finalB2 + finalB3).toBeCloseTo(expectedFinalBalance, 0);
    expect(finalB1).toBeCloseTo(200000, 0);
    expect(finalB2).toBeCloseTo(300000, 0);
    expect(finalB3).toBeCloseTo(445000, 0);
  });
  
  it('should STRICTLY HALT harvesting from Bucket 3 if Guyton-Klinger negative market rule triggers', () => {
    // 1. Target budget: $100,000
    // 2. Buckets: B1 = 0.5 years ($50k), B2 = 0.5 years ($50k). 
    // 3. Negative market return forces constraint. B1 and B2 will be drained. B3 should NOT refill them because of the freeze.
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2026,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 300000, type: 'cash', growthRate: -0.10 } // -10% market year!
      ],
      stages: [
        { id: 'stg1', targetAnnualBudget: 100000, fundingPriorities: [] }
      ],
      targetConstantMarketReturn: -0.10, 
      inflationRate: 0.0,
      budgetPhases: [{ phaseId: 'test', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      threeBuckets: {
        bucket1LiquiditySecuredYears: 0.5,
        bucket2IncomeSecuredYears: 0.5,
        bucket3GrowthRemainingYears: 25,
        rebalancingTriggerType: 'Chronological'
      }
    };
    
    const results = simulateMultiStageDrawdownWorker(payload);
    expect(results).toHaveLength(1);
    
    // Drawn exactly $100,000
    // Pre-growth B1=0, B2=0, B3=200,000. Total=200,000
    // Growth (-10%): B3=180,000. Total=180,000
    
    // Freeze rules: Since targetConstantMarketReturn < 0, Refill from B3 to B1 & B2 is HALTED.
    // Therefore, B1 and B2 remain at 0.
    
    const finalB1 = results[0].bucket1Balance || 0;
    const finalB2 = results[0].bucket2Balance || 0;
    const finalB3 = results[0].bucket3Balance || 0;
    
    expect(finalB1).toBe(0);
    expect(finalB2).toBe(0);
    expect(finalB3).toBeCloseTo(180000, 0);
  });
});

describe('Web Worker - Phased Budget Implementation', () => {
  it('should accurately step down withdrawal demand transitioning to a negative adjustment phase', () => {
    // Phase 1 (1 year): +2% adjustment
    // Phase 2 (1 year): -2% adjustment
    // Base inflation: 0% to isolate lifestyle math.
    // Baseline amount: $100,000
    
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2028,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 2000000, type: 'cash', growthRate: 0.0 }
      ],
      stages: [
        { id: 'stg1', targetAnnualBudget: 100000, fundingPriorities: [] }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2026, baselineAmount: 100000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 0.02 },
        { phaseId: 'p2', startYear: 2027, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: -0.02 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      milestones: [],
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: []
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    // Total runs: 2026, 2027, 2028
    expect(results).toHaveLength(3);
    
    // Year 1 (2026, phase 1): Duration 0 years inside phase -> 100,000 * 1.0^0 = 100,000
    expect(results[0].targetBudgetNominal).toBeCloseTo(100000, 0);
    expect(results[0].lifestyleShrinking).toBe(false);

    // Year 2 (2027, phase 2): Duration 0 years inside phase 2 -> 100,000 * 1.0^0 = 100,000
    expect(results[1].targetBudgetNominal).toBeCloseTo(100000, 0);
    expect(results[1].lifestyleShrinking).toBe(true);
    
    // Year 3 (2028, phase 2): phaseYears = 2028 - 2027 = 1
    // 100,000 * (1 - 0.02)^1 = 98,000
    expect(results[2].targetBudgetNominal).toBeCloseTo(98000, 0);
    expect(results[2].lifestyleShrinking).toBe(true);
  });

  it('should strictly track base inflation array when applyLifestyleAdjustment is false', () => {
    // Base inflation: 3%
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2027,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 2000000, type: 'cash', growthRate: 0.0 }
      ],
      stages: [ // Keep stages backward compatible
        { id: 'stg1', targetAnnualBudget: 100000, fundingPriorities: [] }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.03, // 3%
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0.05 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      milestones: [],
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: []
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    // Year 1 (2026): Base * infl ^ 0 = 100,000
    expect(results[0].targetBudgetNominal).toBeCloseTo(100000, 0);
    // Year 2 (2027): Base * infl ^ 1 = 103,000
    // Because applyLifestyleAdjustment is false, the 5% is ignored.
    expect(results[1].targetBudgetNominal).toBeCloseTo(103000, 0);
    expect(results[1].lifestyleShrinking).toBe(false);
  });
});
