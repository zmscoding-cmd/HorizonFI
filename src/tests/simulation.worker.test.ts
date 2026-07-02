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
        { id: 'stg1', fundingPriorities: [], includeAuxiliaryTaxFreeIncome: true }
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
        { id: 'stg1', fundingPriorities: [] }
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
    // Actual asset ends year with 5% growth calculated FIRST: 1,000,000 * 1.05 = 1,050,000.
    // Withdraw 100,000.
    // Expected final balance = 950,000.
    const expectedFinalBalance = 950000;
    expect(results[0].endingBalance).toBeCloseTo(expectedFinalBalance, 0);
    
    // Abstract growth scale matched factor: 1,050,000 / 1,000,000 = 1.05
    // After growth: B1 = 200,000 * 1.05 = 210,000, B2 = 300,000 * 1.05 = 315,000, B3 = 500,000 * 1.05 = 525,000
    // Total = 1,050,000.
    // Withdraw 100,000 from B1. B1 becomes 110,000. B2 = 315,000. B3 = 525,000.
    // Refill B1 from B2 (B1 target = 200,000, needs 90,000)
    // B1 becomes 200,000. B2 loses 90,000 -> 225,000.
    // Refill B2 from B3 (B2 target = 300,000, needs 75,000)
    // B2 becomes 300,000. B3 loses 75,000 -> 450,000.
    
    const finalB1 = results[0].bucket1Balance || 0;
    const finalB2 = results[0].bucket2Balance || 0;
    const finalB3 = results[0].bucket3Balance || 0;
    
    expect(finalB1 + finalB2 + finalB3).toBeCloseTo(expectedFinalBalance, 0);
    expect(finalB1).toBeCloseTo(200000, 0);
    expect(finalB2).toBeCloseTo(300000, 0);
    expect(finalB3).toBeCloseTo(450000, 0);
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
        { id: 'ast1', value: 300000, type: 'cash', expectedGrowthRate: -0.10 } // -10% market year!
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [] }
      ],
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
    
    // Start total: 300,000.
    // Growth calculated FIRST: 300,000 * -10% = -30,000. 
    // New total: 270,000.
    // Withdraw 100,000.
    // Final balance = 170,000.
    // B1: 50,000 * 0.9 = 45,000. B2: 50,000 * 0.9 = 45,000. B3: 200,000 * 0.9 = 180,000. Total = 270,000.
    // Withdraw 100,000. B1 has 45,000 (drawn to 0). Need 55,000 more.
    // B2 has 45,000 (drawn to 0). Need 10,000 more.
    // B3 has 180,000. Drawn 10,000 -> 170,000.
    // Freeze rules: Refill from B3 to B1 & B2 is HALTED because it's a negative market year.
    
    const finalB1 = results[0].bucket1Balance || 0;
    const finalB2 = results[0].bucket2Balance || 0;
    const finalB3 = results[0].bucket3Balance || 0;
    
    expect(finalB1).toBe(0);
    expect(finalB2).toBe(0);
    expect(finalB3).toBeCloseTo(170000, 0);
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
        { id: 'stg1', fundingPriorities: [] }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2026, baselineAmount: 100000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 2.0 },
        { phaseId: 'p2', startYear: 2027, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: -2.0 }
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
      stages: [
        { id: 'stg1', fundingPriorities: [] }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.03, // 3%
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 5.0 }
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

  it('VAL_PHASE_CASH_BUFFER_REALLOCATION: should handle drop in cash target on phase transition from Year 5 to 6 without losing assets', () => {
    // Year 1 (2026) to Year 5 (2030): Phase 1 (Multiplier 3.0, Budget $100k) -> target b1Target should be $300k
    // Year 6 (2031) onwards: Phase 2 (Multiplier 1.0, Budget $80k) -> target b1Target should be $80k
    // Starting total asset = $1,000,000. No market growth or inflation. No taxes. No other expenses.
    // Ensure that B1 target drops correctly from $300k to $80k, and the $220k excess from B1 is transferred to B2 or B3 (not lost/vanished)
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2031, // Year 1 to 6 (6 years: 2026, 2027, 2028, 2029, 2030, 2031)
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 1000000, type: 'cash', growthRate: 0.0 }
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [] }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2030, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0.0, cashBufferMultiplier: 3.0 },
        { phaseId: 'p2', startYear: 2031, endYear: 2100, baselineAmount: 80000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0.0, cashBufferMultiplier: 1.0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      milestones: [],
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: [],
      threeBuckets: {
        bucket1LiquiditySecuredYears: 3.0,
        bucket2IncomeSecuredYears: 5.0,
        bucket3GrowthRemainingYears: 25.0,
        rebalancingTriggerType: 'Chronological'
      }
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    expect(results).toHaveLength(6);

    // Verify Year 5 (2030, index 4):
    const y5 = results[4];
    expect(y5.year).toBe(2030);
    // Budget is 100,000. Multiplier is 3.0. B1 Target = $300,000.
    expect(y5.bucket1Balance).toBe(300000);

    // Verify Year 6 (2031, index 5):
    const y6 = results[5];
    expect(y6.year).toBe(2031);
    // Budget drops to 80,000. Multiplier is 1.0. B1 Target = $80,000.
    expect(y6.bucket1Balance).toBe(80000);

    // Ensure the total assets are mathematically accounted for:
    // Starting Year 5 assets: $1M initially, minus $100k withdrawal for year 1, $100k for year 2, $100k for year 3, $100k for year 4.
    // So start of Year 5 assets is $600k. Year 5 withdrawal is $100k. Total end of Year 5 assets should be $500k.
    expect(y5.endingBalance).toBeCloseTo(500000, 0);
    // At end of Year 5: B1 has 300,000. B2 + B3 have the rest = 200,000.
    expect(y5.bucket1Balance + y5.bucket2Balance! + y5.bucket3Balance!).toBeCloseTo(500000, 0);

    // Year 6 start assets: $500k. Year 6 withdrawal is $80k. Total end of Year 6 assets should be $420k.
    expect(y6.endingBalance).toBeCloseTo(420000, 0);
    // B1 target is $80k. So B1 balance should be $80k. B2 + B3 should have $340k.
    expect(y6.bucket1Balance).toBe(80000);
    expect(y6.bucket2Balance! + y6.bucket3Balance!).toBeCloseTo(340000, 0);
    expect(y6.bucket1Balance + y6.bucket2Balance! + y6.bucket3Balance!).toBeCloseTo(420000, 0);
  });
});

describe('Web Worker - Multi-Stage Dynamic Temporal Logic', () => {
  it('should correctly resolve dynamic stage boundaries linked to milestones', () => {
    // Stage 1 linked to milestone (Age 65) -> Start Year: 2031
    // Stage 2 absolute year -> Start Year: 2035
    // Current Year: 2026, Age: 60
    
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2036,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 1000000, type: 'cash', growthRate: 0.0 }
      ],
      stages: [
        { 
          id: 'stg1', 
          name: 'Stage 1',
          fundingPriorities: [],
          startYearType: 'milestone',
          startMilestoneId: 'ms1'
        },
        { 
          id: 'stg2', 
          name: 'Stage 2',
          fundingPriorities: [],
          startYearType: 'absolute',
          startAbsoluteYear: 2035
        }
      ],
      milestones: [
        { id: 'ms1', name: 'Retirement', isTriggerByAge: true, triggerAge: 65, type: 'other', amount: 0 }
      ],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2034, baselineAmount: 50000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 },
        { phaseId: 'p2', startYear: 2035, endYear: 2100, baselineAmount: 80000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: []
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    expect(results).toHaveLength(11);
    
    const year2026 = results.find(r => r.year === 2026);
    expect(year2026?.activeStageId).toBe('stg1');
    expect(year2026?.targetBudgetNominal).toBe(50000);
    
    const year2031 = results.find(r => r.year === 2031);
    expect(year2031?.activeStageId).toBe('stg1');
    expect(year2031?.targetBudgetNominal).toBe(50000);
    
    const year2035 = results.find(r => r.year === 2035);
    expect(year2035?.activeStageId).toBe('stg2');
    expect(year2035?.targetBudgetNominal).toBe(80000);
  });

  it('should reduce withdrawal demand by auxiliary tax-free income only when includeAuxiliaryTaxFreeIncome is true', () => {
    // 1. Target budget: $100,000
    // 2. Gift: $30,000
    // 3. Stage 1 has includeAuxiliaryTaxFreeIncome = true -> withdrawal = 70k
    // 4. Stage 2 has includeAuxiliaryTaxFreeIncome = false -> withdrawal = 100k
    
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2027,
      currentAge: 60,
      assets: [
        { id: 'ast1', value: 1000000, type: 'cash', growthRate: 0.0 }
      ],
      stages: [
        { 
          id: 'stg_true', 
          fundingPriorities: [],
          startYearType: 'absolute',
          startAbsoluteYear: 2026,
          includeAuxiliaryTaxFreeIncome: true
        },
        { 
          id: 'stg_false', 
          fundingPriorities: [],
          startYearType: 'absolute',
          startAbsoluteYear: 2027,
          includeAuxiliaryTaxFreeIncome: false
        }
      ],
      milestones: [],
      targetConstantMarketReturn: 0.0, 
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'test', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: [
        {
          id: 'gift1',
          name: 'Gift',
          annualAmount: 30000,
          inflationAdjusted: false,
          startYear: 2026,
          endYear: 2100
        }
      ]
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    expect(results).toHaveLength(2);
    
    const year1 = results[0];
    expect(year1.activeStageId).toBe('stg_true');
    expect(year1.giftAmountUsed).toBe(30000);
    expect(year1.nominalWithdrawal).toBe(70000);
    
    const year2 = results[1];
    expect(year2.activeStageId).toBe('stg_false');
    expect(year2.giftAmountUsed).toBe(0);
    expect(year2.nominalWithdrawal).toBe(100000);
  });
});

describe('Web Worker - Real vs Nominal Dollar Discounting Calculations', () => {
  it('should mathematically discount nominal values to real values using cumulative inflation', () => {
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2035, // 10 years: 2026 to 2035 inclusive (10 snapshots)
      currentAge: 60,
      assets: [
        { id: 'cash1', value: 1000000, type: 'cash', growthRate: 0.05, expectedGrowthRate: 0.05, expectedDividendYield: 0.0 }
      ],
      stages: [
        { id: 'st1', fundingPriorities: ['TAXABLE'], startYearType: 'absolute', startAbsoluteYear: 2026 }
      ],
      targetConstantMarketReturn: 0.05,
      inflationRate: 0.03, // 3% inflation
      budgetPhases: [
        { phaseId: 'phase1', startYear: 2026, endYear: 2100, baselineAmount: 100000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0.0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0,
      milestones: [],
      futureIncomeStreams: [],
      futureLiabilities: [],
      nonTaxableGifts: []
    };

    const snapshots = simulateMultiStageDrawdownWorker(payload);

    // We expect exactly 10 snapshots (2026 to 2035 inclusive)
    expect(snapshots).toHaveLength(10);

    // Verify Year 1 (2026, Year Offset 0) - inflation should be 1.0 (no discount yet)
    const year1 = snapshots[0];
    expect(year1.year).toBe(2026);
    expect(year1.cumulativeInflation).toBe(1.0);
    expect(year1.endingBalanceReal).toBeCloseTo(year1.endingBalance, 2);
    expect(year1.targetBudgetReal).toBeCloseTo(year1.targetBudgetNominal!, 2);

    // Verify Year 10 (2035, Year Offset 9) - inflation should be (1 + 0.03)^9
    const year10 = snapshots[9];
    expect(year10.year).toBe(2035);
    const expectedCumInflation = Math.pow(1 + 0.03, 9);
    expect(year10.cumulativeInflation).toBeCloseTo(expectedCumInflation, 5);

    // Ensure ending balance is correctly discounted
    expect(year10.endingBalanceReal).toBeCloseTo(year10.endingBalance / expectedCumInflation, 2);

    // Ensure target budget is correctly discounted
    expect(year10.targetBudgetReal).toBeCloseTo(year10.targetBudgetNominal! / expectedCumInflation, 2);

    // Ensure bucket balances are correctly discounted
    if (year10.bucket1Balance !== undefined) {
      expect(year10.bucket1BalanceReal).toBeCloseTo(year10.bucket1Balance / expectedCumInflation, 2);
    }
  });
});

describe('Web Worker - Bottom-up Asset Growth and Yield', () => {
  it('should correctly produce $50,000 in capital growth and $30,000 in dividend yield for the year, ignoring any obsolete global return rates', () => {
    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2026, 
      currentAge: 45,
      assets: [
        { id: 'astA', value: 1000000, type: 'taxable_brokerage', assetType: 'TAXABLE', expectedGrowthRate: 0.05, expectedDividendYield: 0.0, dividendReinvestment: 'reinvest' },
        { id: 'astB', value: 1000000, type: 'taxable_brokerage', assetType: 'TAXABLE', expectedGrowthRate: 0.0, expectedDividendYield: 0.03, dividendReinvestment: 'payout' }
      ],
      stages: [
        { id: 'stg1', fundingPriorities: [] }
      ],
      milestones: [],
      inflationRate: 0.0,
      budgetPhases: [
        { phaseId: 'p1', startYear: 2026, endYear: 2100, baselineAmount: 0, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
      ],
      maxRealWithdrawal: 1000000,
      liquidBufferYears: 0
    };
    
    const results = simulateMultiStageDrawdownWorker(payload);
    
    expect(results).toHaveLength(1);
    expect(results[0].expectedGrowth).toBe(50000); // 1,000,000 * 0.05
    expect(results[0].expectedYield).toBe(30000);  // 1,000,000 * 0.03
  });
});

