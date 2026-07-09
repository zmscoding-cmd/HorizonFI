import { describe, it, expect } from 'vitest';
import { simulateMultiStageDrawdownWorker, MultiStageSimPayload } from '../workers/simulation.worker';

describe('Cumulative Income Gap Calculation (Non-Portfolio Income)', () => {
  const getBasePayload = (): MultiStageSimPayload => ({
    type: "MULTI_STAGE_DRAWDOWN",
    startYear: 2026,
    endYear: 2030,
    targetEndYear: 2030,
    currentAge: 65,
    assets: [
      {
        id: 'taxable-1',
        name: 'Brokerage',
        assetType: 'TAXABLE',
        value: 1000000,
        expectedGrowthRate: 0.05,
        expectedDividendYield: 0
      }
    ],
    stages: [
      {
        id: 'stage-1',
        name: 'Retirement Phase',
        startYearType: "absolute",
        startAbsoluteYear: 2026,
        fundingPriorities: ['TAXABLE'],
        includeGlobalIncomeStreams: true,
        includeAuxiliaryTaxFreeIncome: true
      }
    ],
    budgetPhases: [
      {
        id: 'phase-1',
        name: 'Retirement Phase',
        startYear: 2026,
        endYear: 2100,
        baselineAmount: 100000,
        lifestyleCreepActive: false
      }
    ],
    milestones: [],
    uprrDivestmentAnnualAmount: 0,
    dividendEtfId: '',
    uprrId: '',
    targetConstantMarketReturn: 0.05,
    inflationRate: 0.03,
    maxRealWithdrawal: 100000,
    liquidBufferYears: 0,
    nonPortfolioIncomeStreams: []
  });

  it('Test Case A: cumulative gap increases year-over-year when budget exceeds non-portfolio income', () => {
    const payload = getBasePayload();
    // Budget is 100k
    // Add non-portfolio income of 40k flat
    payload.nonPortfolioIncomeStreams = [
      {
        id: 'pension-1',
        name: 'Standard Pension',
        type: 'StandardPension',
        monthlyAmount: 3333.3333, // approx 40k/year
        inflationAdjusted: false,
        startAge: 65,
        endAge: 100,
      }
    ];

    const result = simulateMultiStageDrawdownWorker(payload);
    
    // Total steps: 2026, 2027, 2028, 2029, 2030 = 5 steps
    expect(result.length).toBeGreaterThan(0);

    let expectedCumulativeNominal = 0;
    let expectedCumulativeReal = 0;
    
    for (const yearSnap of result) {
      expectedCumulativeNominal += yearSnap.incomeGapNominal!;
      expectedCumulativeReal += (yearSnap.incomeGapNominal! / (yearSnap.cumulativeInflation || 1));
      
      expect(yearSnap.cumulativeIncomeGapNominal).toBeCloseTo(expectedCumulativeNominal, 1);
      expect(yearSnap.cumulativeIncomeGapReal).toBeCloseTo(expectedCumulativeReal, 1);
      
      // Since gap > 0, it should be strictly increasing
      expect(yearSnap.incomeGapNominal).toBeGreaterThan(0);
    }
  });

  it('Test Case B (The Floor Rule): if non-portfolio income exceeds budget, annual gap is 0, cumulative gap does NOT decrease', () => {
    const payload = getBasePayload();
    
    // Let's add a first phase where budget > income, and a second phase where income > budget
    payload.budgetPhases = [
      {
        id: 'phase-1',
        name: 'Phase 1 - High Spend',
        startYear: 2026,
        endYear: 2027,
        baselineAmount: 200000,
        lifestyleCreepActive: false
      },
      {
        id: 'phase-2',
        name: 'Phase 2 - Low Spend',
        startYear: 2028,
        endYear: 2100,
        baselineAmount: 100000,
        lifestyleCreepActive: false
      }
    ];
    
    // Add non-portfolio income of 150k flat
    payload.nonPortfolioIncomeStreams = [
      {
        id: 'pension-2',
        name: 'Huge Pension',
        type: 'StandardPension',
        monthlyAmount: 12500, // 150k/year
        inflationAdjusted: true, // Scales with inflation
        startAge: 65,
        endAge: 100,
      }
    ];

    const result = simulateMultiStageDrawdownWorker(payload);
    
    expect(result.length).toBeGreaterThan(0);

    const year1 = result.find(r => r.age === 65)!;
    const year2 = result.find(r => r.age === 66)!;
    const year3 = result.find(r => r.age === 67)!; // Income > budget
    const year4 = result.find(r => r.age === 68)!; // Income > budget

    // Year 1 gap is positive
    expect(year1.incomeGapNominal).toBeGreaterThan(0);
    expect(year1.cumulativeIncomeGapNominal).toBeCloseTo(year1.incomeGapNominal!, 1);

    // Year 2 gap is positive
    expect(year2.incomeGapNominal).toBeGreaterThan(0);
    expect(year2.cumulativeIncomeGapNominal).toBeGreaterThan(year1.cumulativeIncomeGapNominal!);

    // Year 3 gap should be 0 because 150k (adjusted) > 100k
    expect(year3.incomeGapNominal).toBe(0);
    // Cumulative gap should NOT decrease
    expect(year3.cumulativeIncomeGapNominal).toBeCloseTo(year2.cumulativeIncomeGapNominal!, 1);

    // Year 4 gap 0
    expect(year4.incomeGapNominal).toBe(0);
    expect(year4.cumulativeIncomeGapNominal).toBeCloseTo(year2.cumulativeIncomeGapNominal!, 1);
  });
});
