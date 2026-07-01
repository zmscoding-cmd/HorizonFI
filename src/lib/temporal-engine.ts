import { calculateDrawdownProfile, SimulationRequest, SimulationResult } from '../workers/simulation.worker';
import { calculateFederalOrdinaryTax, calculateTaxableRRBenefits, POST_TCJA_2026_MFJ_STANDARD_DEDUCTION } from './tax-engine';

export type TemporalAssetInput = {
  id: string;
  name: string;
  value: number;
  type?: string;
  growthRate: number; // e.g. 0.07 or -0.05
  dividendYield?: number; // e.g. 0.02
  dividendReinvestment?: 'reinvest' | 'payout';
};

export type SimulationMilestone = {
  id: string;
  name: string;
  type: 'capex' | 'pension' | 'rrt1' | 'rrt2' | 'other_income' | 'pretax_avail_jesse' | 'pretax_avail_corrie';
  amount: number;
  isTriggerByAge: boolean;
  triggerAge?: number;
  triggerYear?: number;
};

export type TemporalConfig = {
  currentAge: number;
  startYear: number;
  endYear: number;
  
  initialPortfolioValue: number;
  targetConstantMarketReturn: number; // e.g. 0.05
  inflationRate: number; // e.g. 0.03
  budgetPhases?: any[];
  maxRealWithdrawal: number;
  
  // Temporal Milestones Configurations
  privatePensionAmountAt65: number;
  rrTier1AmountAt67: number;
  rrTier2AmountAt67: number;
  oneOffCapEx: { year: number, amount: number, description: string }[];
  assets?: TemporalAssetInput[];
  milestones?: SimulationMilestone[];

  // Custom simulation options
  liquidBufferYears?: number;
  upperGuardrailMultiplier?: number;
  lowerGuardrailMultiplier?: number;
  guardrailUpwardFactor?: number;
  guardrailDownwardFactor?: number;
  
  // Strategic Tax Events
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;
  rebalancingCapitalGainPercentage?: number;
};

export type YearlySimResult = SimulationResult & {
  age: number;
  calendarYear: number;
  taxDrag: number;
  liquidBufferDepletion: number;
  pensionIncome: number;
  rrIncome: number;
  capExInjected: number;
};

export function runMultiDecadeSimulation(config: TemporalConfig): YearlySimResult[] {
  const results: YearlySimResult[] = [];
  
  // Clone assets for dynamic yearly individual growth/appreciation/depreciation tracking
  const currentAssets = config.assets && config.assets.length > 0
    ? config.assets.map(a => ({
        ...a,
        dividendYield: a.dividendYield !== undefined ? a.dividendYield : 0,
        dividendReinvestment: a.dividendReinvestment || 'reinvest'
      }))
    : [{ id: 'default', name: 'Portfolio', value: config.initialPortfolioValue, growthRate: config.targetConstantMarketReturn, dividendYield: 0, dividendReinvestment: 'reinvest' as const }];
  
  let previousWithdrawal = config.budgetPhases && config.budgetPhases.length > 0 ? config.budgetPhases[0].baselineAmount : 5000 * 12;
  let cumInflation = 1.0;
  
  const initialPortfolioValue = currentAssets.reduce((sum, a) => sum + a.value, 0) || 1;
  const initialWithdrawalRate = previousWithdrawal / initialPortfolioValue;
  
  let initialPhase = config.budgetPhases?.find(p => config.startYear >= p.startYear && config.startYear <= p.endYear) || config.budgetPhases?.[0];
  let liquidBuffer = previousWithdrawal * (initialPhase?.cashBufferMultiplier ?? 2.0); // Start with phase-based buffer

  // We loop year by year
  for (let y = config.startYear; y <= config.endYear; y++) {
    const age = config.currentAge + (y - config.startYear);
    
    let pension = 0;
    let rrt1 = 0;
    let rrt2 = 0;
    let capEx = 0;

    if (config.milestones && config.milestones.length > 0) {
      config.milestones.forEach(m => {
        const isTriggered = m.isTriggerByAge
          ? age >= (m.triggerAge ?? 65)
          : y >= (m.triggerYear ?? 2030);

        if (m.type === 'capex') {
          const isOneTimeEvent = m.isTriggerByAge
            ? Math.round(age) === (m.triggerAge ?? 65)
            : y === (m.triggerYear ?? 2030);
          if (isOneTimeEvent) {
            capEx += m.amount;
          }
        } else if (isTriggered) {
          if (m.type === 'pension') {
            pension += m.amount;
          } else if (m.type === 'rrt1') {
            rrt1 += m.amount;
          } else if (m.type === 'rrt2') {
            rrt2 += m.amount;
          } else if (m.type === 'other_income') {
            pension += m.amount;
          }
        }
      });
    } else {
      // Fallback to legacy triggers
      if (age >= 65) pension += config.privatePensionAmountAt65;
      if (age >= 67) {
        rrt1 = config.rrTier1AmountAt67;
        rrt2 = config.rrTier2AmountAt67;
      }
      const capExMatch = config.oneOffCapEx.find(c => c.year === y);
      capEx = capExMatch ? capExMatch.amount : 0;
    }
    
    // Sum total assets at start of the year
    const startingBalance = currentAssets.reduce((sum, a) => sum + a.value, 0);

    // Step 1: Deduct CapEx from assets pro-rata
    if (startingBalance > 0 && capEx > 0) {
      const capExFactor = Math.max(0, (startingBalance - capEx) / startingBalance);
      currentAssets.forEach(a => {
        a.value = a.value * capExFactor;
      });
    }

    // Recalculate balance after CapEx deduction
    const balanceAfterCapEx = currentAssets.reduce((sum, a) => sum + a.value, 0);

    let activePhase = config.budgetPhases?.find(p => y >= p.startYear && y <= p.endYear) || config.budgetPhases?.[0];
    let lsRate = activePhase ? (activePhase.applyLifestyleAdjustment ? activePhase.lifestyleAdjustmentRate : 0) : 0.02;

    // Calculate effective weighted return rate of remaining assets for the drawdown profile logic
    // Reinvested dividends directly scale the asset's total yield (DRIP), while paid out dividends are harvested as cash flow.
    let weightedReturn = config.targetConstantMarketReturn;
    if (balanceAfterCapEx > 0) {
      weightedReturn = currentAssets.reduce((sum, a) => {
        const rate = (a.growthRate ?? config.targetConstantMarketReturn) +
          ((a.dividendReinvestment === 'reinvest') ? (a.dividendYield ?? 0) : 0);
        return sum + (a.value * rate);
      }, 0) / balanceAfterCapEx;
    }

    // Simulate drawdown for this year using our worker logic (calling the function synchronously for simplicity here)
    const req: SimulationRequest = {
      yearIndex: y,
      initialPortfolioValue: initialPortfolioValue,
      portfolioBalance: balanceAfterCapEx,
      marketReturn: weightedReturn,
      inflationRate: config.inflationRate,
      lifestyleCreepRate: lsRate,
      previousNominalWithdrawal: previousWithdrawal,
      initialWithdrawalRate: initialWithdrawalRate,
      cumulativeInflation: cumInflation,
      maxRealWithdrawal: config.maxRealWithdrawal,
      upperGuardrailMultiplier: config.upperGuardrailMultiplier,
      lowerGuardrailMultiplier: config.lowerGuardrailMultiplier,
      guardrailUpwardFactor: config.guardrailUpwardFactor,
      guardrailDownwardFactor: config.guardrailDownwardFactor
    };
    
    const res = calculateDrawdownProfile(req);

    // Calculate total dividends paid out as cash (for payout reinvestment option)
    let totalPaidOutDividends = 0;
    currentAssets.forEach(a => {
      const yieldRate = a.dividendYield ?? 0;
      const reinvest = a.dividendReinvestment ?? 'reinvest';
      if (reinvest === 'payout' && yieldRate > 0) {
        totalPaidOutDividends += Math.max(0, a.value * yieldRate);
      }
    });

    // Step 2: Deduct nominal withdrawal from assets pro-rata (before growth step is applied)
    // Paid-out dividends offset and reduce the required net assets liquidation.
    const netWithdrawalFromAssets = Math.max(0, res.nominalWithdrawal - totalPaidOutDividends);

    if (balanceAfterCapEx > 0 && netWithdrawalFromAssets > 0) {
      const withdrawalFactor = Math.max(0, (balanceAfterCapEx - netWithdrawalFromAssets) / balanceAfterCapEx);
      currentAssets.forEach(a => {
        a.value = a.value * withdrawalFactor;
      });
    }

    // Reinvest any surplus paid-out dividends (when they exceed target withdrawals) pro-rata back to the portfolio
    const surplusDividendsToReinvest = totalPaidOutDividends - res.nominalWithdrawal;
    if (surplusDividendsToReinvest > 0 && balanceAfterCapEx > 0) {
      const reinvestFactor = (balanceAfterCapEx + surplusDividendsToReinvest) / balanceAfterCapEx;
      currentAssets.forEach(a => {
        a.value = a.value * reinvestFactor;
      });
    }

    // Step 3: Grow/Appreciate/Depreciate each asset individually
    currentAssets.forEach(a => {
      const growth = a.growthRate ?? config.targetConstantMarketReturn;
      const isReinvest = (a.dividendReinvestment ?? 'reinvest') === 'reinvest';
      const yieldRate = isReinvest ? (a.dividendYield ?? 0) : 0;
      a.value = Math.max(0, a.value * (1 + growth + yieldRate));
    });

    // Compute Taxes for the year (simplified)
    const { taxableTier1, taxableTier2 } = calculateTaxableRRBenefits(rrt1, rrt2, pension + res.nominalWithdrawal);
    const taxableOrdinary = Math.max(0, (pension + taxableTier1 + taxableTier2 + res.nominalWithdrawal) - POST_TCJA_2026_MFJ_STANDARD_DEDUCTION);
    const taxDrag = calculateFederalOrdinaryTax(taxableOrdinary);
    
    // Step 4: Deduct tax drag from ending portfolio value pro-rata
    const balanceAfterGrowth = currentAssets.reduce((sum, a) => sum + a.value, 0);
    if (balanceAfterGrowth > 0 && taxDrag > 0) {
      const taxFactor = Math.max(0, (balanceAfterGrowth - taxDrag) / balanceAfterGrowth);
      currentAssets.forEach(a => {
        a.value = a.value * taxFactor;
      });
    }

    const endingBalance = currentAssets.reduce((sum, a) => sum + a.value, 0);
    
    // Update variables for next run
    previousWithdrawal = res.nominalWithdrawal;
    cumInflation = res.newCumulativeInflation;
    
    // Liquid buffer simplistic tracking (depletes on negative market years / negative weighted return)
    let bufferDepletion = 0;
    if (weightedReturn < 0) {
      bufferDepletion = res.nominalWithdrawal;
      liquidBuffer -= bufferDepletion;
      if (liquidBuffer < 0) liquidBuffer = 0;
    } else {
      // refill
      let baseline = activePhase ? activePhase.baselineAmount : (config.budgetPhases?.[0]?.baselineAmount ?? 54000);
      let multiplier = activePhase?.cashBufferMultiplier ?? 2.0;
      liquidBuffer = baseline * multiplier;
    }
    
    results.push({
      ...res,
      endingBalance,
      age,
      calendarYear: y,
      taxDrag,
      liquidBufferDepletion: bufferDepletion,
      pensionIncome: pension,
      rrIncome: rrt1 + rrt2,
      capExInjected: capEx
    });
  }
  
  return results;
}
