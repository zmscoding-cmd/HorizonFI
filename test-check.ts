import { simulateMultiStageDrawdownWorker } from './src/workers/simulation.worker';
const payload = {
    type: "MULTI_STAGE_DRAWDOWN",
    startYear: 2026,
    endYear: 2030,
    targetEndYear: 2030,
    currentAge: 65,
    assets: [
      {
        id: 'taxable-1',
        name: 'Brokerage',
        type: 'TAXABLE',
        value: 1000000,
        costBasis: 500000,
        expectedReturn: 0.05
      }
    ],
    stages: [
      {
        id: 'stage-1',
        name: 'Retirement Phase',
        startAge: 65,
        endAge: 100,
        targetBudgetNominal: 100000, // Budget is 100k
        fundingPriorities: ['TAXABLE'],
        includeGlobalIncomeStreams: true,
        includeAuxiliaryTaxFreeIncome: true
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
    nonPortfolioIncomeStreams: [
      {
        id: 'pension-1',
        name: 'Standard Pension',
        type: 'StandardPension',
        monthlyAmount: 3333.3333, // approx 40k/year
        inflationAdjusted: false,
        startAge: 65,
        endAge: 100,
      }
    ]
  };
const result = simulateMultiStageDrawdownWorker(payload as any);
console.log(result.slice(0, 2).map(r => ({
  year: r.year, 
  budget: payload.stages[0].targetBudgetNominal,
  totalNonPortfolioIncome: r.totalNonPortfolioIncome, 
  incomeGapNominal: r.incomeGapNominal,
  net: r.netNonPortfolioIncomeNominal
})));
