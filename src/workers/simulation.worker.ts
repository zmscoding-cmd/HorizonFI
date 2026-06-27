export type SimulationRequest = {
  yearIndex: number;
  initialPortfolioValue: number;
  portfolioBalance: number;
  marketReturn: number; // e.g. -0.05 for -5%
  inflationRate: number; // e.g. 0.03 for 3%
  lifestyleCreepRate?: number; // e.g. 0.02 for 2%, defaults to 0.02
  previousNominalWithdrawal: number;
  initialWithdrawalRate: number; 
  cumulativeInflation: number;
  maxRealWithdrawal: number; // Cap on real growth
  
  // Custom G-K parameters
  upperGuardrailMultiplier?: number;
  lowerGuardrailMultiplier?: number;
  guardrailUpwardFactor?: number;
  guardrailDownwardFactor?: number;
};

export type SimulationResult = {
  yearIndex: number;
  startingBalance: number;
  marketGain: number;
  nominalWithdrawal: number;
  realWithdrawal: number;
  endingBalance: number;
  newCumulativeInflation: number;
  ruleApplied: string | null;
};

// Error protocol
export type SimulationError = {
  success: false;
  error: string;
};

export type SimulationSuccess = {
  success: true;
  result: SimulationResult;
};

export type SimulationResponse = SimulationSuccess | SimulationError;

export type WealthVelocityResult = {
  currentSpendingRate: number;
  adjustedSpending: number;
  velocityStatus: 'Accumulation' | 'Velocity Point' | 'Distribution/Drawdown';
  projectedGrowthDelta: number;
  yearsToNext100k: number;
};

/**
 * Calculates current Wealth Velocity metrics.
 * 
 * --- BOUNDS AND SPENDING SMILE CALCULATION RULES ---
 * 1. Explicit Bounds-Checking: withdrawalRate and inflationRate must be within [0, 1].
 * 2. "Spending Smile": Adjusted Spending = Inflation - 0.01 (hard floor of 0.015).
 * 3. Status Determination: <=0 is 'Accumulation', (0, 0.05] is 'Velocity Point' and otherwise 'Distribution/Drawdown'.
 * 4. Next $100k milestone projection: yearsToNext100k based on projectedGrowthDelta.
 * 
 * --- CALLING LOGIC & DECIMATION EXAMPLE IN 600-MILESTONE LOOP ---
 * ```typescript
 * // Example: Calling within simulation loop running for N years/milestones:
 * const rawDatapoints: any[] = [];
 * for (let year = 1; year <= 600; year++) {
 *   const velocity = calculateWealthVelocity(currentBalance, growthRate, withdrawalRate, inflation);
 *   rawDatapoints.push({
 *     year,
 *     balance: currentBalance,
 *     wealthVelocity: {
 *       currentSpendingRate: velocity.currentSpendingRate,
 *       velocityStatus: velocity.velocityStatus,
 *       projectedGrowthDelta: velocity.projectedGrowthDelta,
 *     },
 *     yearsToNext100k: velocity.yearsToNext100k,
 *   });
 *   currentBalance += velocity.projectedGrowthDelta;
 * }
 * 
 * // Array decimation for memory optimization (maximum limit of 600 elements)
 * const decimatedArray: any[] = [];
 * if (rawDatapoints.length <= 600) {
 *   decimatedArray.push(...rawDatapoints);
 * } else {
 *   const step = rawDatapoints.length / 600;
 *   for (let i = 0; i < 600; i++) {
 *     const index = Math.min(rawDatapoints.length - 1, Math.floor(i * step));
 *     decimatedArray.push(rawDatapoints[index]);
 *   }
 * }
 * self.postMessage({ success: true, type: 'WEALTH_VELOCITY_SIMULATION', data: decimatedArray });
 * ```
 */
export function calculateWealthVelocity(
  currentBalance: number,
  growthRate: number,
  activePhaseBudget: number,
  inflationRate: number
): WealthVelocityResult {
  const withdrawalRate = currentBalance > 0 ? activePhaseBudget / currentBalance : 0;
  
  // Explicit Bounds-Checking: withdrawalRate and inflationRate must be within 0 to 1 bounds
  if (withdrawalRate < 0 || withdrawalRate > 1 || inflationRate < 0 || inflationRate > 1) {
    throw new Error("Invalid parameters: withdrawalRate must be >= 0 and <= 1, and inflationRate must be between 0 and 1.");
  }

  // Apply the "Spending Smile" calculation: Adjusted Spending = Inflation - 0.01 (min floor of 0.015)
  const adjustedSpending = Math.max(0.015, inflationRate - 0.01);

  // The spending rate is represented by the withdrawalRate
  const currentSpendingRate = withdrawalRate;

  // Determine velocity status: <=0 is Accumulation, <=0.04 (4% target against active phase budget) is Velocity Point, otherwise Distribution/Drawdown
  let velocityStatus: 'Accumulation' | 'Velocity Point' | 'Distribution/Drawdown';
  if (withdrawalRate <= 0) {
    velocityStatus = 'Accumulation';
  } else if (withdrawalRate <= 0.04) {
    velocityStatus = 'Velocity Point';
  } else {
    velocityStatus = 'Distribution/Drawdown';
  }

  // Calculate projected growth delta: (currentBalance * growthRate) - (currentBalance * withdrawalRate)
  const projectedGrowthDelta = (currentBalance * growthRate) - (currentBalance * withdrawalRate);

  // Calculate the next $100k milestone yearsToNext100k (handle negative/zero growth as Infinity)
  let yearsToNext100k = Infinity;
  if (projectedGrowthDelta > 0) {
    const nextMilestone = Math.floor(currentBalance / 100000) * 100000 + 100000;
    const distanceToNext100k = nextMilestone - currentBalance || 100000;
    yearsToNext100k = distanceToNext100k / projectedGrowthDelta;
  }

  return {
    currentSpendingRate,
    adjustedSpending,
    velocityStatus,
    projectedGrowthDelta,
    yearsToNext100k
  };
}

function sanitizeInput(req: SimulationRequest): SimulationRequest {
  return {
    yearIndex: Math.max(0, Math.min(2100, Number(req.yearIndex) || 0)),
    initialPortfolioValue: Math.max(0, Number(req.initialPortfolioValue) || 0),
    portfolioBalance: Math.max(0, Number(req.portfolioBalance) || 0),
    marketReturn: Math.max(-1, Math.min(10, Number(req.marketReturn) || 0)),
    inflationRate: Math.max(-0.5, Math.min(10, Number(req.inflationRate) || 0)),
    lifestyleCreepRate: Math.max(-0.5, Math.min(10, Number(req.lifestyleCreepRate) || 0)),
    previousNominalWithdrawal: Math.max(0, Number(req.previousNominalWithdrawal) || 0),
    initialWithdrawalRate: Math.max(0, Math.min(1, Number(req.initialWithdrawalRate) || 0)),
    cumulativeInflation: Math.max(0.01, Number(req.cumulativeInflation) || 1),
    maxRealWithdrawal: Math.max(0, Number(req.maxRealWithdrawal) || 0),
    upperGuardrailMultiplier: req.upperGuardrailMultiplier !== undefined ? Math.max(0.1, Number(req.upperGuardrailMultiplier)) : undefined,
    lowerGuardrailMultiplier: req.lowerGuardrailMultiplier !== undefined ? Math.max(0.1, Number(req.lowerGuardrailMultiplier)) : undefined,
    guardrailUpwardFactor: req.guardrailUpwardFactor !== undefined ? Math.max(0.1, Number(req.guardrailUpwardFactor)) : undefined,
    guardrailDownwardFactor: req.guardrailDownwardFactor !== undefined ? Math.max(0.1, Number(req.guardrailDownwardFactor)) : undefined,
  };
}

function sanitizeNetWorthRequest(req: any): NetWorthSimRequest {
  if (!req || typeof req !== 'object') {
    throw new Error("Invalid NetWorth request object.");
  }
  
  const startYear = Math.max(1900, Math.min(2100, Number(req.startYear) || 2026));
  const endYear = Math.max(startYear, Math.min(startYear + 100, Number(req.endYear) || (startYear + 50)));
  const currentAge = Math.max(0, Math.min(120, Number(req.currentAge) || 40));
  const numPaths = Math.max(1, Math.min(500, Number(req.numPaths) || 100));
  const inflationRate = Math.max(-0.2, Math.min(1.0, Number(req.inflationRate) || 0.03));
  
  const rrt1AmountAt67 = Math.max(0, Math.min(1000000, Number(req.rrt1AmountAt67) || 0));
  const rrt2AmountAt67 = Math.max(0, Math.min(1000000, Number(req.rrt2AmountAt67) || 0));
  const pensionAmountAt65 = Math.max(0, Math.min(1000000, Number(req.pensionAmountAt65) || 0));

  const assets: NetWorthAssetInput[] = Array.isArray(req.assets) 
    ? req.assets.slice(0, 100).map((a: any) => ({
        id: String(a?.id || '').substring(0, 128),
        name: String(a?.name || 'Asset').substring(0, 120),
        value: Math.max(0, Math.min(1e12, Number(a?.value) || 0)),
        type: ['taxable_brokerage', 'traditional_ira', 'roth_ira', 'cash', 'other_asset'].includes(a?.type) ? a.type : 'other_asset',
        growthRate: Math.max(-0.5, Math.min(2.0, Number(a?.growthRate) || 0)),
        dividendYield: a?.dividendYield !== undefined ? Math.max(0, Math.min(1.0, Number(a?.dividendYield) || 0)) : undefined,
        dividendReinvestment: ['reinvest', 'payout'].includes(a?.dividendReinvestment) ? a.dividendReinvestment : undefined
      }))
    : [];
    
  const liabilities: NetWorthLiabilityInput[] = Array.isArray(req.liabilities)
    ? req.liabilities.slice(0, 100).map((l: any) => ({
        id: String(l?.id || '').substring(0, 128),
        name: String(l?.name || 'Liability').substring(0, 120),
        value: Math.max(0, Math.min(1e12, Number(l?.value) || 0)),
        type: ['mortgage', 'other_liability'].includes(l?.type) ? l.type : 'other_liability',
        interestRate: Math.max(0, Math.min(1.0, Number(l?.interestRate) || 0))
      }))
    : [];
    
  return {
    type: 'COMPUTE_NET_WORTH',
    userId: String(req.userId || '').substring(0, 128),
    startYear,
    endYear,
    currentAge,
    assets,
    liabilities,
    rrt1AmountAt67,
    rrt2AmountAt67,
    pensionAmountAt65,
    inflationRate,
    numPaths,
    milestones: Array.isArray(req.milestones) ? req.milestones.slice(0, 50) : undefined
  };
}

function sanitizeMultiStageDrawdownPayload(req: any): MultiStageSimPayload {
  if (!req || typeof req !== 'object') {
    throw new Error("Invalid MultiStageDrawdown payload.");
  }
  
  const startYear = Math.max(1900, Math.min(2100, Number(req.startYear) || 2026));
  const endYear = Math.max(startYear, Math.min(startYear + 100, Number(req.endYear) || (startYear + 50)));
  const currentAge = Math.max(0, Math.min(120, Number(req.currentAge) || 40));
  const inflationRate = Math.max(-0.2, Math.min(1.0, Number(req.inflationRate) || 0.03));
  const targetConstantMarketReturn = Math.max(-0.5, Math.min(2.0, Number(req.targetConstantMarketReturn) || 0.07));
  const maxRealWithdrawal = Math.max(0, Math.min(1e9, Number(req.maxRealWithdrawal) || 1000000));
  const liquidBufferYears = Math.max(0, Math.min(20, Number(req.liquidBufferYears) || 2));
  const uprrDivestmentAnnualAmount = Math.max(0, Math.min(1e9, Number(req.uprrDivestmentAnnualAmount) || 0));
  const globalDiscountRate = req.globalDiscountRate !== undefined ? Math.max(0, Math.min(1.0, Number(req.globalDiscountRate))) : undefined;

  const assets: NetWorthAssetInput[] = Array.isArray(req.assets)
    ? req.assets.slice(0, 100).map((a: any) => ({
        id: String(a?.id || '').substring(0, 128),
        name: String(a?.name || 'Asset').substring(0, 120),
        value: Math.max(0, Math.min(1e12, Number(a?.value) || 0)),
        type: ['taxable_brokerage', 'traditional_ira', 'roth_ira', 'cash', 'other_asset'].includes(a?.type) ? a.type : 'other_asset',
        growthRate: Math.max(-0.5, Math.min(2.0, Number(a?.growthRate) || 0)),
        dividendYield: a?.dividendYield !== undefined ? Math.max(0, Math.min(1.0, Number(a?.dividendYield) || 0)) : undefined,
        dividendReinvestment: ['reinvest', 'payout'].includes(a?.dividendReinvestment) ? a.dividendReinvestment : undefined
      }))
    : [];

  const stages: Stage[] = Array.isArray(req.stages)
    ? req.stages.slice(0, 20).map((s: any) => ({
        id: String(s?.id || '').substring(0, 128),
        name: String(s?.name || 'Stage').substring(0, 120),
        triggerMilestoneId: s?.triggerMilestoneId ? String(s.triggerMilestoneId).substring(0, 128) : undefined,
        targetAnnualBudget: Math.max(0, Math.min(1e9, Number(s?.targetAnnualBudget) || 0)),
        fundingPriorities: Array.isArray(s?.fundingPriorities) ? s.fundingPriorities.slice(0, 10).map((p: any) => String(p).substring(0, 128)) : []
      }))
    : [];

  const futureIncomeStreams: FutureIncomeStreamInput[] = Array.isArray(req.futureIncomeStreams)
    ? req.futureIncomeStreams.slice(0, 30).map((stream: any) => ({
        id: String(stream?.id || '').substring(0, 128),
        name: String(stream?.name || 'Income').substring(0, 120),
        type: ['Pension', 'SocialSecurity', 'Annuity', 'Other'].includes(stream?.type) ? stream.type : 'Other',
        monthlyAmount: Math.max(0, Math.min(1e6, Number(stream?.monthlyAmount) || 0)),
        activationAge: Math.max(0, Math.min(120, Number(stream?.activationAge) || 65)),
        inflationAdjusted: !!stream?.inflationAdjusted
      }))
    : [];

  const futureLiabilities: FutureLiabilityInput[] = Array.isArray(req.futureLiabilities)
    ? req.futureLiabilities.slice(0, 30).map((liab: any) => ({
        id: String(liab?.id || '').substring(0, 128),
        name: String(liab?.name || 'Liability').substring(0, 120),
        type: ['Mortgage', 'Loan', 'Healthcare', 'Other'].includes(liab?.type) ? liab.type : 'Other',
        monthlyAmount: Math.max(0, Math.min(1e6, Number(liab?.monthlyAmount) || 0)),
        activationAge: Math.max(0, Math.min(120, Number(liab?.activationAge) || 40)),
        endAge: liab?.endAge !== undefined ? Math.max(0, Math.min(120, Number(liab?.endAge))) : undefined
      }))
    : [];

  const nonTaxableGifts: NonTaxableType[] = Array.isArray(req.nonTaxableGifts)
    ? req.nonTaxableGifts.slice(0, 20).map((gift: any) => ({
        id: String(gift?.id || '').substring(0, 128),
        name: String(gift?.name || 'Gift').substring(0, 120),
        annualAmount: Math.max(0, Math.min(1e9, Number(gift?.annualAmount) || 0)),
        startAge: gift?.startAge !== undefined ? Math.max(0, Math.min(120, Number(gift?.startAge))) : undefined,
        startYear: gift?.startYear !== undefined ? Math.max(1900, Math.min(2100, Number(gift?.startYear))) : undefined,
        endAge: gift?.endAge !== undefined ? Math.max(0, Math.min(120, Number(gift?.endAge))) : undefined,
        endYear: gift?.endYear !== undefined ? Math.max(1900, Math.min(2100, Number(gift?.endYear))) : undefined,
        inflationAdjusted: !!gift?.inflationAdjusted
      }))
    : [];

  const threeBuckets: ThreeBucketConfig | undefined = req.threeBuckets && typeof req.threeBuckets === 'object'
    ? {
        bucket1LiquiditySecuredYears: Math.max(0, Math.min(50, Number(req.threeBuckets.bucket1LiquiditySecuredYears) || 0)),
        bucket2IncomeSecuredYears: Math.max(0, Math.min(50, Number(req.threeBuckets.bucket2IncomeSecuredYears) || 0)),
        bucket3GrowthRemainingYears: Math.max(0, Math.min(100, Number(req.threeBuckets.bucket3GrowthRemainingYears) || 0)),
        rebalancingTriggerType: ['Chronological', 'Threshold', 'Opportunistic'].includes(req.threeBuckets.rebalancingTriggerType) 
          ? req.threeBuckets.rebalancingTriggerType 
          : 'Chronological',
        rebalancingThresholdPercent: req.threeBuckets.rebalancingThresholdPercent !== undefined 
          ? Math.max(0, Math.min(100, Number(req.threeBuckets.rebalancingThresholdPercent))) 
          : undefined
      }
    : undefined;

  return {
    type: 'MULTI_STAGE_DRAWDOWN',
    startYear,
    endYear,
    currentAge,
    assets,
    stages,
    milestones: Array.isArray(req.milestones) ? req.milestones.slice(0, 50) : [],
    uprrDivestmentAnnualAmount,
    dividendEtfId: String(req.dividendEtfId || '').substring(0, 128),
    uprrId: String(req.uprrId || '').substring(0, 128),
    targetConstantMarketReturn,
    inflationRate,
    budgetPhases: Array.isArray(req.budgetPhases) ? req.budgetPhases.slice(0, 20) : undefined,
    maxRealWithdrawal,
    liquidBufferYears,
    globalDiscountRate,
    futureIncomeStreams,
    futureLiabilities,
    nonTaxableGifts,
    threeBuckets
  };
}

function sanitizeBudgetPayload(req: any): BudgetSimulationPayload {
  if (!req || typeof req !== 'object') {
    throw new Error("Invalid budget simulation payload.");
  }
  
  const expenses: PlannedExpenseModel[] = Array.isArray(req.expenses)
    ? req.expenses.slice(0, 200).map((e: any) => ({
        id: String(e?.id || '').substring(0, 128),
        userId: String(e?.userId || '').substring(0, 128),
        name: String(e?.name || 'Expense').substring(0, 120),
        frequency: ['Monthly', 'Annual'].includes(e?.frequency) ? e.frequency : 'Monthly',
        valuationType: ['Static', 'Relational'].includes(e?.valuationType) ? e.valuationType : 'Static',
        categoryId: e?.categoryId ? String(e.categoryId).substring(0, 128) : undefined,
        staticAmount: e?.staticAmount !== undefined ? Math.max(0, Math.min(1e9, Number(e.staticAmount) || 0)) : undefined,
        relationalTargetId: e?.relationalTargetId ? String(e.relationalTargetId).substring(0, 128) : undefined,
        relationalPercent: e?.relationalPercent !== undefined ? Math.max(0, Math.min(100, Number(e.relationalPercent) || 0)) : undefined,
        notes: e?.notes ? String(e.notes).substring(0, 1000) : undefined,
        urls: Array.isArray(e?.urls) ? e.urls.slice(0, 10).map((u: any) => String(u).substring(0, 500)) : undefined,
        renewalDate: e?.renewalDate ? String(e.renewalDate).substring(0, 100) : undefined,
        createdAt: Number(e?.createdAt) || undefined,
        updatedAt: Number(e?.updatedAt) || undefined
      }))
    : [];
    
  const assets: AssetReferenceModel[] = Array.isArray(req.assets)
    ? req.assets.slice(0, 100).map((a: any) => ({
        id: String(a?.id || '').substring(0, 128),
        name: String(a?.name || 'Asset').substring(0, 120),
        value: Math.max(0, Math.min(1e12, Number(a?.value) || 0))
      }))
    : [];
    
  return {
    type: 'BUDGET_SIMULATION',
    expenses,
    assets
  };
}

// Net Worth Types
export type NetWorthAssetInput = {
  id: string;
  name: string;
  value: number;
  type: 'taxable_brokerage' | 'traditional_ira' | 'roth_ira' | 'cash' | 'other_asset';
  growthRate: number;
  dividendYield?: number;
  dividendReinvestment?: 'reinvest' | 'payout';
};

export type FutureIncomeStreamInput = {
  id: string;
  name: string;
  type: 'Pension' | 'SocialSecurity' | 'Annuity' | 'Other';
  monthlyAmount: number;
  activationAge: number;
  inflationAdjusted: boolean;
};

export type FutureLiabilityInput = {
  id: string;
  name: string;
  type: 'Mortgage' | 'Loan' | 'Healthcare' | 'Other';
  monthlyAmount: number;
  activationAge: number;
  endAge?: number;
};

export type NonTaxableType = {
  id: string;
  name: string;
  annualAmount: number;
  startAge?: number;
  startYear?: number;
  endAge?: number;
  endYear?: number;
  inflationAdjusted: boolean;
};

export type Stage = {
  id: string;
  name: string;
  triggerMilestoneId?: string;
  targetAnnualBudget: number;
  fundingPriorities: string[];
};

export interface ThreeBucketConfig {
  bucket1LiquiditySecuredYears: number;
  bucket2IncomeSecuredYears: number;
  bucket3GrowthRemainingYears: number;
  rebalancingTriggerType: 'Chronological' | 'Threshold' | 'Opportunistic';
  rebalancingThresholdPercent?: number;
}

export type MultiStageSimPayload = {
  type: 'MULTI_STAGE_DRAWDOWN';
  startYear: number;
  endYear: number;
  currentAge: number;
  assets: NetWorthAssetInput[];
  stages: Stage[];
  milestones: any[];
  uprrDivestmentAnnualAmount: number;
  dividendEtfId: string;
  uprrId: string;
  targetConstantMarketReturn: number;
  inflationRate: number;
  budgetPhases?: any[];
  maxRealWithdrawal: number;
  liquidBufferYears: number;
  globalDiscountRate?: number;
  futureIncomeStreams?: FutureIncomeStreamInput[];
  futureLiabilities?: FutureLiabilityInput[];
  nonTaxableGifts?: NonTaxableType[];
  threeBuckets?: ThreeBucketConfig;
};

export type NetWorthLiabilityInput = {
  id: string;
  name: string;
  value: number;
  type: 'mortgage' | 'other_liability';
  interestRate: number;
};

export type NetWorthSimRequest = {
  type: 'COMPUTE_NET_WORTH';
  userId: string;
  startYear: number;
  endYear: number;
  assets: NetWorthAssetInput[];
  liabilities: NetWorthLiabilityInput[];
  rrt1AmountAt67: number;
  rrt2AmountAt67: number;
  pensionAmountAt65: number;
  currentAge: number;
  inflationRate: number;
  numPaths?: number;
  milestones?: any[];
};

export type NetWorthDatapoint = {
  year: number;
  age: number;
  netWorth10th: number;
  netWorth50th: number;
  netWorth90th: number;
  deferredTaxLiability: number;
};

// Tax Engine Types and Functions
export interface AllocationBuckets {
  qualifiedDividends: number;
  taxableBrokerage: number;
  traditional401kIra: number;
  rothIra: number;
  nonTaxableGift: number;
}

export interface TaxEngineInput {
  targetNetExpense: number;
  allocationMode: 'PERCENTAGE' | 'DOLLARS';
  buckets: AllocationBuckets;
  blendedCostBasisPercentage: number;
  preExistingOrdinaryIncome: number; // For structural streams like pensions
}

export interface TaxEngineOutput {
  grossWithdrawalTotal: number;
  totalTaxOwed: number;
  bucketBreakdown: {
    qualifiedDividendsGross: number;
    taxableBrokerageGross: number;
    traditional401kIraGross: number;
    rothIraGross: number;
    nonTaxableGiftGross: number;
  };
}

interface TaxBracket {
  limit: number;
  rate: number;
}

export function evaluateMultiBucketTax(input: TaxEngineInput): TaxEngineOutput {
  const { targetNetExpense, allocationMode, buckets, blendedCostBasisPercentage, preExistingOrdinaryIncome } = input;

  let netTargets = { ...buckets };

  if (allocationMode === 'PERCENTAGE') {
    const totalPct = Object.values(buckets).reduce((a, b) => a + b, 0) || 100;
    netTargets = {
      qualifiedDividends: (buckets.qualifiedDividends / totalPct) * targetNetExpense,
      taxableBrokerage: (buckets.taxableBrokerage / totalPct) * targetNetExpense,
      traditional401kIra: (buckets.traditional401kIra / totalPct) * targetNetExpense,
      rothIra: (buckets.rothIra / totalPct) * targetNetExpense,
      nonTaxableGift: (buckets.nonTaxableGift / totalPct) * targetNetExpense,
    };
  } else {
    // If sum of explicit DOLLARS falls short of targetNetExpense, add to nonTaxableGift buffer
    const sumNet = Object.values(buckets).reduce((a, b) => a + b, 0);
    if (sumNet < targetNetExpense) {
      netTargets.nonTaxableGift += (targetNetExpense - sumNet);
    }
  }

  // 2026 MFJ Threshold Baselines
  const ordinaryBrackets: TaxBracket[] = [
    { limit: 23200, rate: 0.10 },
    { limit: 94300, rate: 0.12 },
    { limit: 201050, rate: 0.22 },
    { limit: Infinity, rate: 0.24 }
  ];

  const ltcgBrackets: TaxBracket[] = [
    { limit: 98900, rate: 0.0 },
    { limit: 613700, rate: 0.15 },
    { limit: Infinity, rate: 0.20 }
  ];

  const brokerageGainRatio = Math.max(0, Math.min(1, 1.0 - (blendedCostBasisPercentage / 100)));

  // Convergence parameters for the multi-variable loop
  let traditionalGross = netTargets.traditional401kIra;
  let brokerageGross = netTargets.taxableBrokerage;
  let dividendGross = netTargets.qualifiedDividends;

  const TOLERANCE = 0.01;
  const MAX_ITERATIONS = 25;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Compute active progressive taxable incomes
    const ordinaryTaxableBase = preExistingOrdinaryIncome + traditionalGross;
    const ltcgTaxableGains = dividendGross + (brokerageGross * brokerageGainRatio);

    // Run structural statutory stacking logic
    const ordTax = computeProgressiveTax(traditionalGross, preExistingOrdinaryIncome, ordinaryBrackets);
    const ltcgTax = computeStackedLtcgTax(ltcgTaxableGains, ordinaryTaxableBase, ltcgBrackets);
    const totalCalculatedTax = ordTax + ltcgTax;

    // Distribute tax drag proportionally across the tax-bearing funding sources
    const totalTaxBearingNet = netTargets.traditional401kIra + netTargets.taxableBrokerage + netTargets.qualifiedDividends;
    
    if (totalTaxBearingNet <= 0) break;

    const actualNetAchieved = (traditionalGross + brokerageGross + dividendGross) - totalCalculatedTax;
    const missingNetShortfall = totalTaxBearingNet - actualNetAchieved;

    if (Math.abs(missingNetShortfall) < TOLERANCE) {
      break;
    }

    // Dynamic adjustment of gross parameters based on source weightings
    traditionalGross += missingNetShortfall * (netTargets.traditional401kIra / totalTaxBearingNet);
    brokerageGross += missingNetShortfall * (netTargets.taxableBrokerage / totalTaxBearingNet);
    dividendGross += missingNetShortfall * (netTargets.qualifiedDividends / totalTaxBearingNet);
  }

  const computedTaxTotal = (traditionalGross + brokerageGross + dividendGross) - 
                           (netTargets.traditional401kIra + netTargets.taxableBrokerage + netTargets.qualifiedDividends);

  return {
    grossWithdrawalTotal: Math.round((traditionalGross + brokerageGross + dividendGross + netTargets.rothIra + netTargets.nonTaxableGift) * 100) / 100,
    totalTaxOwed: Math.round(computedTaxTotal * 100) / 100,
    bucketBreakdown: {
      qualifiedDividendsGross: Math.round(dividendGross * 100) / 100,
      taxableBrokerageGross: Math.round(brokerageGross * 100) / 100,
      traditional401kIraGross: Math.round(traditionalGross * 100) / 100,
      rothIraGross: Math.round(netTargets.rothIra * 100) / 100,
      nonTaxableGiftGross: Math.round(netTargets.nonTaxableGift * 100) / 100,
    }
  };
}

function computeProgressiveTax(amount: number, base: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let remaining = amount;
  let currentBase = base;

  for (const b of brackets) {
    if (currentBase < b.limit) {
      const chunk = Math.min(remaining, b.limit - currentBase);
      if (chunk > 0) {
        tax += chunk * b.rate;
        remaining -= chunk;
        currentBase += chunk;
      }
    }
    if (remaining <= 0) break;
  }
  return tax;
}

function computeStackedLtcgTax(gains: number, ordinaryBase: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let remainingGains = gains;
  let currentBase = ordinaryBase;

  for (const b of brackets) {
    if (currentBase < b.limit) {
      const chunk = Math.min(remainingGains, b.limit - currentBase);
      if (chunk > 0) {
        tax += chunk * b.rate;
        remainingGains -= chunk;
        currentBase += chunk;
      }
    }
    if (remainingGains <= 0) break;
  }
  return tax;
}

// Granular Budgeting Models and Types
export type PlannedExpenseModel = {
  id: string;
  userId?: string;
  categoryId?: string;
  name: string;
  frequency: 'Monthly' | 'Annual';
  valuationType: 'Static' | 'Relational';
  staticAmount?: number;
  relationalTargetId?: string;
  relationalPercent?: number;
  notes?: string;
  urls?: string[];
  renewalDate?: string;
  createdAt?: number;
  updatedAt?: number;
  monthlyValue?: number; // Calculated & injected
  annualValue?: number; // Calculated & injected
};

export type AssetReferenceModel = {
  id: string;
  name: string;
  value: number;
};

export type BudgetSimulationPayload = {
  type: 'BUDGET_SIMULATION';
  expenses: PlannedExpenseModel[];
  assets: AssetReferenceModel[];
};

export type BudgetSimulationResponse = {
  success: boolean;
  type: 'BUDGET_SIMULATION';
  data?: {
    expenses: PlannedExpenseModel[];
    totalMonthly: number;
    totalAnnual: number;
  };
  error?: string;
};

/**
 * Resolves planned expenses with relational formulas using Kahn's Algorithm (Topological Sort).
 * Returns the expenses with normalized monthlyValue and annualValue populated.
 * Throws "Cyclic dependency detected" error if a loop is detected.
 */
export function computeBudgetSimulation(
  expenses: PlannedExpenseModel[],
  assets: AssetReferenceModel[]
): { expenses: PlannedExpenseModel[]; totalMonthly: number; totalAnnual: number } {
  const nodesById = new Map<string, PlannedExpenseModel>();
  const assetsById = new Map<string, AssetReferenceModel>();
  const categoryToExpenses = new Map<string, PlannedExpenseModel[]>();

  // Initialize maps
  expenses.forEach(exp => {
    // Clone to avoid side-effects on original structures
    const clone: PlannedExpenseModel = { ...exp, monthlyValue: 0, annualValue: 0 };
    nodesById.set(exp.id, clone);

    if (exp.categoryId) {
      if (!categoryToExpenses.has(exp.categoryId)) {
        categoryToExpenses.set(exp.categoryId, []);
      }
      categoryToExpenses.get(exp.categoryId)!.push(clone);
    }
  });

  assets.forEach(asset => {
    assetsById.set(asset.id, asset);
  });

  // Build Adjacency Matrix and In-Degree maps for Kahn's Algorithm
  // Only nodes/expenses present in our list participate as DAG edges.
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Set initial inDegrees to 0
  expenses.forEach(exp => {
    inDegree.set(exp.id, 0);
    adj.set(exp.id, []);
  });

  expenses.forEach(u => {
    const parents = new Set<string>(); // Use a set to avoid duplicate dependency counts

    if (u.valuationType === 'Relational' && u.relationalTargetId) {
      const targetId = u.relationalTargetId;
      
      // If target is an asset, no expense-level dependency exists (assets are static inputs)
      if (!assetsById.has(targetId)) {
        // If targeting another expense directly
        if (nodesById.has(targetId)) {
          parents.add(targetId);
        } else {
          // Check if targeting a category. If so, depends on all expenses within that category
          const catExpenses = categoryToExpenses.get(targetId) || [];
          catExpenses.forEach(parentExp => {
            parents.add(parentExp.id);
          });
        }
      }
    }

    inDegree.set(u.id, parents.size);
    parents.forEach(pId => {
      if (!adj.has(pId)) {
        adj.set(pId, []);
      }
      adj.get(pId)!.push(u.id);
    });
  });

  // Kahn's Algorithm (Topological Sort)
  const queue: string[] = [];
  expenses.forEach(exp => {
    if ((inDegree.get(exp.id) || 0) === 0) {
      queue.push(exp.id);
    }
  });

  const sortedOrder: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    sortedOrder.push(currId);

    const children = adj.get(currId) || [];
    children.forEach(childId => {
      const deg = (inDegree.get(childId) || 0) - 1;
      inDegree.set(childId, deg);
      if (deg === 0) {
        queue.push(childId);
      }
    });
  }

  // Security/Stability check: Cyclic dependency detection
  if (sortedOrder.length < expenses.length) {
    throw new Error("Cyclic dependency detected");
  }

  // Process the sorted nodes in topological order
  let totalMonthly = 0;
  let totalAnnual = 0;

  sortedOrder.forEach(uId => {
    const u = nodesById.get(uId)!;

    if (u.valuationType === 'Static') {
      const amt = u.staticAmount || 0;
      if (u.frequency === 'Monthly') {
        u.monthlyValue = amt;
        u.annualValue = amt * 12;
      } else {
        u.monthlyValue = amt / 12;
        u.annualValue = amt;
      }
    } else {
      // Relational
      const percent = u.relationalPercent || 0;
      const pct = percent / 100;
      const targetId = u.relationalTargetId || '';

      if (assetsById.has(targetId)) {
        // Asset Target: percentage of asset total balance calculated as annual distribution
        const asset = assetsById.get(targetId)!;
        const assetVal = asset.value || 0;
        const calculatedAnnual = pct * assetVal;
        
        u.annualValue = calculatedAnnual;
        u.monthlyValue = calculatedAnnual / 12;
      } else if (nodesById.has(targetId)) {
        // Expense Target (e.g. 10% of Expense B)
        const targetExp = nodesById.get(targetId)!;
        const targetMonthly = targetExp.monthlyValue || 0;
        const calcMonthly = pct * targetMonthly;
        
        u.monthlyValue = calcMonthly;
        u.annualValue = calcMonthly * 12;
      } else {
        // Category Target (e.g. 10% of total Expenses in Category C)
        const catExpenses = categoryToExpenses.get(targetId) || [];
        let categoryMonthlySum = 0;
        
        catExpenses.forEach(exp => {
          if (exp.id !== u.id) {
            categoryMonthlySum += exp.monthlyValue || 0;
          }
        });

        const calcMonthly = pct * categoryMonthlySum;
        u.monthlyValue = calcMonthly;
        u.annualValue = calcMonthly * 12;
      }
    }

    totalMonthly += u.monthlyValue || 0;
    totalAnnual += u.annualValue || 0;
  });

  // Rebuild final cloned sorted results map to original layout order
  const finalExpenses = expenses.map(original => nodesById.get(original.id)!);

  return {
    expenses: finalExpenses,
    totalMonthly,
    totalAnnual
  };
}

const workerGlobal = typeof self !== 'undefined' ? self : globalThis as any;

// Web Worker handler supporting multi-message execution with strict schema validation & input sanitization
workerGlobal.onmessage = (e: MessageEvent<any>) => {
  try {
    if (!e.data || typeof e.data !== 'object') {
      throw new Error("Invalid request payload. Expected an object.");
    }

    if (e.data.type === 'COMPUTE_NET_WORTH') {
      const safeReq = sanitizeNetWorthRequest(e.data);
      const result = simulateNetWorthProbabilistic(safeReq);
      self.postMessage({ success: true, type: 'COMPUTE_NET_WORTH', data: result });
    } else if (e.data.type === 'MULTI_STAGE_DRAWDOWN') {
      const safePayload = sanitizeMultiStageDrawdownPayload(e.data);
      const result = simulateMultiStageDrawdownWorker(safePayload);
      self.postMessage({ success: true, type: 'MULTI_STAGE_DRAWDOWN', scenarioId: (safePayload as any).scenarioId || (e.data as any).scenarioId, data: result });
    } else if (e.data.type === 'BUDGET_SIMULATION') {
      const safePayload = sanitizeBudgetPayload(e.data);
      const result = computeBudgetSimulation(safePayload.expenses || [], safePayload.assets || []);
      self.postMessage({ success: true, type: 'BUDGET_SIMULATION', data: result });
    } else {
      // Default to old drawdown simulation behavior
      const safeReq = sanitizeInput(e.data as SimulationRequest);
      const result = calculateDrawdownProfile(safeReq);
      self.postMessage({ success: true, result });
    }
  } catch (error: any) {
    self.postMessage({ 
      success: false, 
      type: e.data?.type || 'SIMULATE_DRAWDOWN',
      error: error.message || 'Unknown worker error' 
    });
  }
};

/**
 * Executes a single year of the Guyton-Klinger drawdown simulation.
 */
export function calculateDrawdownProfile(req: SimulationRequest): SimulationResult {
  const {
    yearIndex,
    portfolioBalance,
    marketReturn,
    inflationRate,
    lifestyleCreepRate = 0.02,
    previousNominalWithdrawal,
    initialWithdrawalRate,
    maxRealWithdrawal,
    upperGuardrailMultiplier = 0.80,
    lowerGuardrailMultiplier = 1.20,
    guardrailUpwardFactor = 1.10,
    guardrailDownwardFactor = 0.90,
  } = req;

  // Next year's cumulative inflation tracker
  const newCumulativeInflation = req.cumulativeInflation * (1 + inflationRate);
  
  let proposedNominalWithdrawal = previousNominalWithdrawal;
  let ruleApplied: string | null = null;

  // 1. Base Adjustment & Capital Preservation Rule
  if (marketReturn < 0) {
    // Suspend inflation and lifestyle adjustments during negative market returns
    proposedNominalWithdrawal = previousNominalWithdrawal;
    ruleApplied = "Capital Preservation Rule (Freeze)";
  } else {
    // Normal growth: automatically compound by inflation + lifestyle creep
    proposedNominalWithdrawal = previousNominalWithdrawal * (1 + inflationRate) * (1 + lifestyleCreepRate);
    
    // Check max real growth threshold cap
    const proposedRealWithdrawal = proposedNominalWithdrawal / newCumulativeInflation;
    if (proposedRealWithdrawal > maxRealWithdrawal) {
      // Scale only nominally for inflation at the threshold limit
      proposedNominalWithdrawal = maxRealWithdrawal * newCumulativeInflation;
      ruleApplied = "Max Real Withdrawal Cap reached";
    }
  }

  // 2. Guardrails Logic
  // Calculate Current Withdrawal Rate prior to deducting
  const currentWithdrawalRate = proposedNominalWithdrawal / portfolioBalance;

  // Upper Guardrail: Excess wealth (Withdrawal rate falls below threshold)
  if (currentWithdrawalRate < initialWithdrawalRate * upperGuardrailMultiplier) {
    // Permanently increase baseline spending
    proposedNominalWithdrawal *= guardrailUpwardFactor;
    const pct = Math.round((guardrailUpwardFactor - 1) * 100);
    ruleApplied = ruleApplied ? ruleApplied + ` + Upper Guardrail (+${pct}% bump)` : `Upper Guardrail (+${pct}% bump)`;
  } 
  // Lower Guardrail: Portfolio depletion risk (Withdrawal rate rises above threshold)
  else if (currentWithdrawalRate > initialWithdrawalRate * lowerGuardrailMultiplier) {
    // Force spending cut
    proposedNominalWithdrawal *= guardrailDownwardFactor;
    const pct = Math.round((1 - guardrailDownwardFactor) * 100);
    ruleApplied = ruleApplied ? ruleApplied + ` + Lower Guardrail (-${pct}% cut)` : `Lower Guardrail (-${pct}% cut)`;
  }

  // Ensure Withdrawal does not drop below 0 or exceed available balance
  proposedNominalWithdrawal = Math.max(0, Math.min(proposedNominalWithdrawal, portfolioBalance));

  // 3. Process Portfolio
  const balanceAfterWithdrawal = portfolioBalance - proposedNominalWithdrawal;
  const marketGain = balanceAfterWithdrawal * marketReturn;
  let endingBalance = balanceAfterWithdrawal + marketGain;
  
  // Guard against negative balance
  if (endingBalance < 0) {
    endingBalance = 0;
  }

  const realWithdrawal = proposedNominalWithdrawal / newCumulativeInflation;

  return {
    yearIndex,
    startingBalance: portfolioBalance,
    marketGain,
    nominalWithdrawal: proposedNominalWithdrawal,
    realWithdrawal,
    endingBalance,
    newCumulativeInflation,
    ruleApplied
  };
}

// Box-Muller transform for normal distributions
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Post-TCJA Tax Bracket Helper
const STANDARD_DEDUCTION_2026_EST = 15000;
const TCJA_BRACKETS_2026 = [
  { rate: 0.10, limit: 23000 },
  { rate: 0.15, limit: 94000 },
  { rate: 0.25, limit: 190000 },
  { rate: 0.28, limit: 285000 },
  { rate: 0.33, limit: 495000 },
  { rate: 0.35, limit: 560000 },
  { rate: 0.396, limit: Infinity },
];

function estimateOrdinaryIncomeTax(taxableOrdinaryIncome: number): number {
  if (taxableOrdinaryIncome <= 0) return 0;
  let tax = 0;
  let previousLimit = 0;
  for (const bracket of TCJA_BRACKETS_2026) {
    if (taxableOrdinaryIncome > previousLimit) {
      const taxableAtThisRate = Math.min(taxableOrdinaryIncome, bracket.limit) - previousLimit;
      tax += taxableAtThisRate * bracket.rate;
      previousLimit = bracket.limit;
    } else {
      break;
    }
  }
  return tax;
}

/**
 * Probabilistic multidimensional Net Worth simulation handling Railroad Retirement and Deferred Taxes.
 */
export function simulateNetWorthProbabilistic(req: NetWorthSimRequest): NetWorthDatapoint[] {
  const {
    assets,
    liabilities,
    startYear,
    endYear,
    currentAge,
    pensionAmountAt65,
    rrt1AmountAt67,
    rrt2AmountAt67,
    inflationRate,
    numPaths = 100
  } = req;

  const totalYears = endYear - startYear;
  const totalMonths = totalYears * 12;
  
  // Outer matrix: [monthIndex] -> array of path net worths
  const monthlyNetWorthPaths: number[][] = Array.from({ length: totalMonths + 1 }, () => []);
  const monthlyDtlPaths: number[][] = Array.from({ length: totalMonths + 1 }, () => []);

  // Run Monte Carlo simulations
  for (let path = 0; path < numPaths; path++) {
    // Clone starting balances for this path
    const pathAssets = assets.map(a => ({ ...a }));
    const pathLiabilities = liabilities.map(a => ({ ...a }));

    // Precalculate amortization factors for liabilities
    const amortPayments = liabilities.map(lib => {
      if (lib.value <= 0) return 0;
      const r = lib.interestRate / 12;
      const n = 360; // Assume 30 year standard amortization terms
      if (r === 0) return lib.value / n;
      return lib.value * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    });

    for (let m = 0; m <= totalMonths; m++) {
      const yearOffset = Math.floor(m / 12);
      const currentYear = startYear + yearOffset;
      const age = currentAge + (m / 12);

      // 1. Calculate values of Assets (with volatility)
      let preTaxBalance = 0;
      let totalAssetVal = 0;

      pathAssets.forEach((asset) => {
        if (m > 0) {
          const isReinvest = (asset.dividendReinvestment ?? 'reinvest') === 'reinvest';
          const yieldRate = isReinvest ? (asset.dividendYield ?? 0) : 0;
          const annualRate = asset.growthRate + yieldRate;
          const monthlyRate = annualRate / 12;
          
          // Introduce equity volatility for tax-advantaged and brokerage accounts (e.g. standard 15% annual)
          let volatility = 0;
          if (asset.type === 'taxable_brokerage' || asset.type === 'traditional_ira' || asset.type === 'roth_ira') {
            volatility = 0.15; // 15% standard market dev
          }
          
          const monthlyStd = volatility / Math.sqrt(12);
          const growthFactor = 1 + randomNormal(monthlyRate, monthlyStd);
          asset.value = Math.max(0, asset.value * growthFactor);
        }

        totalAssetVal += asset.value;
        if (asset.type === 'traditional_ira') {
          preTaxBalance += asset.value;
        }
      });

      // 2. Calculate values of Liabilities (constant amortization payments)
      let totalLiabilityVal = 0;
      pathLiabilities.forEach((lib, idx) => {
        if (m > 0 && lib.value > 0) {
          const monthlyRate = lib.interestRate / 12;
          const interestCharge = lib.value * monthlyRate;
          const payment = Math.min(lib.value + interestCharge, amortPayments[idx]);
          lib.value = Math.max(0, lib.value + interestCharge - payment);
        }
        totalLiabilityVal += lib.value;
      });

      // 3. Dynamic Deferred Tax Liability calculation ("The Tax Bomb")
      // Pre-tax traditional balance distribution modeling (estimating 4% annual structured distributions)
      const estimatedAnnualDistribution = preTaxBalance * 0.04;
      
      let pension = 0;
      let tier1 = 0;
      let tier2 = 0;

      if (req.milestones && req.milestones.length > 0) {
        req.milestones.forEach((m: any) => {
          const isTriggered = m.isTriggerByAge
            ? age >= (m.triggerAge ?? 65)
            : currentYear >= (m.triggerYear ?? 2030);

          if (isTriggered && m.type !== 'capex') {
            if (m.type === 'pension') {
              pension += m.amount;
            } else if (m.type === 'rrt1') {
              tier1 += m.amount;
            } else if (m.type === 'rrt2') {
              tier2 += m.amount;
            } else if (m.type === 'other_income') {
              pension += m.amount;
            }
          }
        });
      } else {
        // Fallback to legacy triggers
        if (age >= 65) pension = pensionAmountAt65;
        if (age >= 67) {
          tier1 = rrt1AmountAt67;
          tier2 = rrt2AmountAt67;
        }
      }

      let otherMagi = estimatedAnnualDistribution + pension + tier2;

      // Provisional Income matching for Railroad Retirement Tax stacking
      const provisionalIncome = otherMagi + 0.5 * tier1;
      let taxableTier1 = 0;
      const base1 = 32000;
      const base2 = 44000;

      if (provisionalIncome > base2) {
        const amtOverBase2 = provisionalIncome - base2;
        const betweenBases = base2 - base1;
        taxableTier1 = (0.85 * amtOverBase2) + Math.min(0.50 * betweenBases, 0.50 * tier1);
      } else if (provisionalIncome > base1) {
        taxableTier1 = 0.50 * (provisionalIncome - base1);
      }
      taxableTier1 = Math.min(taxableTier1, 0.85 * tier1);

      // Standard Deduction adjusting for inflation
      const adjustedStandardDeduction = STANDARD_DEDUCTION_2026_EST * Math.pow(1 + inflationRate, yearOffset);
      const taxableOrdinaryIncome = Math.max(0, (otherMagi + taxableTier1) - adjustedStandardDeduction);
      const estimatedIncomeTax = estimateOrdinaryIncomeTax(taxableOrdinaryIncome);

      // Determine dynamic effective tax rate on withdrawals
      const totalTaxedInflow = otherMagi + taxableTier1;
      const taxRate = totalTaxedInflow > 0 ? Math.min(0.40, estimatedIncomeTax / totalTaxedInflow) : 0.15;
      
      // Deferred Tax Liability (explicit contra-asset/liability)
      const deferredTaxLiability = preTaxBalance * taxRate;

      // Foundational Aggregation Formula matching guidelines
      // NetWorth_t = Sum(Asset_t) - Sum(Liability_t) - DeferredTaxLiability_t
      const netWorth = totalAssetVal - totalLiabilityVal - deferredTaxLiability;

      monthlyNetWorthPaths[m].push(netWorth);
      monthlyDtlPaths[m].push(deferredTaxLiability);
    }
  }

  // Aggregate path outcomes into percentiles per month index
  const verboseDatapoints: NetWorthDatapoint[] = [];
  for (let m = 0; m <= totalMonths; m++) {
    const yearOffset = Math.floor(m / 12);
    const calendarYear = startYear + yearOffset;
    const age = currentAge + (m / 12);

    const sortedNetWorths = [...monthlyNetWorthPaths[m]].sort((a, b) => a - b);
    const sortedDtls = [...monthlyDtlPaths[m]].sort((a, b) => a - b);

    // Standard percentile positions
    const p10Index = Math.min(sortedNetWorths.length - 1, Math.floor(0.10 * sortedNetWorths.length));
    const p50Index = Math.min(sortedNetWorths.length - 1, Math.floor(0.50 * sortedNetWorths.length));
    const p90Index = Math.min(sortedNetWorths.length - 1, Math.floor(0.90 * sortedNetWorths.length));

    verboseDatapoints.push({
      year: calendarYear,
      age: Math.round(age * 10) / 10,
      netWorth10th: sortedNetWorths[p10Index],
      netWorth50th: sortedNetWorths[p50Index],
      netWorth90th: sortedNetWorths[p90Index],
      deferredTaxLiability: sortedDtls[p50Index]
    });
  }

  // Embed decimation algorithm for memory management (maximum 600 points limit)
  if (verboseDatapoints.length <= 600) {
    return verboseDatapoints;
  }

  const decimatedDatapoints: NetWorthDatapoint[] = [];
  const totalPoints = verboseDatapoints.length;
  const decimationStep = totalPoints / 600;

  for (let i = 0; i < 600; i++) {
    const idx = Math.min(totalPoints - 1, Math.floor(i * decimationStep));
    decimatedDatapoints.push(verboseDatapoints[idx]);
  }

  return decimatedDatapoints;
}

export type MultiStageYearlySnapshot = {
  year: number;
  age: number;
  activeStageId: string;
  nominalWithdrawal: number;
  realWithdrawal: number;
  pensionIncome: number;
  rrbIncome: number;
  taxDrag: number;
  endingBalance: number;
  assetBalances: Record<string, number>;
  uprrDivested: number;
  withdrawnDividends: number;
  withdrawnTaxable: number;
  withdrawnTaxAdvantaged: number;
  fundedRatio: number;
  pvFutureIncome: number;
  pvFutureLiabilities: number;
  giftAmountUsed: number;
  targetBudgetNominal?: number;
  lifestyleShrinking?: boolean;
  bucket1Balance?: number;
  bucket2Balance?: number;
  bucket3Balance?: number;
};

export function computePresentValue(
  annualCashflows: number[],
  discountRate: number
): number {
  let pv = 0;
  for (let i = 0; i < annualCashflows.length; i++) {
    pv += annualCashflows[i] / Math.pow(1 + discountRate, i);
  }
  return pv;
}

export function simulateMultiStageDrawdownWorker(payload: MultiStageSimPayload): MultiStageYearlySnapshot[] {
  if (payload.startYear > payload.endYear) {
    throw new Error('Simulation end year must be strictly greater than or equal to start year.');
  }
  
  if (payload.assets && payload.assets.length > 200) {
    throw new Error('Asset count exceeds computational limits (max 200).');
  }

  if (payload.inflationRate < -0.2 || payload.inflationRate > 1.0) {
    throw new Error('Inflation rate out of bounds. Must be between -20% and 100%.');
  }

  const snapshots: MultiStageYearlySnapshot[] = [];
  
  // Clone assets to prevent reference mutation
  let currentAssets = payload.assets.map(a => ({ ...a }));
  let cumInflation = 1.0;
  
  const totalYears = payload.endYear - payload.startYear;
  
  // Initialize Buckets 1, 2, and 3 abstract layers
  const use3Bucket = !!payload.threeBuckets;
  let bucket1Balance = 0;
  let bucket2Balance = 0;
  let bucket3Balance = 0;
  
  if (use3Bucket && payload.stages && payload.stages.length > 0) {
    const totalAssets = currentAssets.reduce((sum, a) => sum + a.value, 0);
    const initialTargetBudget = payload.stages[0].targetAnnualBudget;
    const b1Target = initialTargetBudget * (payload.threeBuckets!.bucket1LiquiditySecuredYears || 2);
    const b2Target = initialTargetBudget * (payload.threeBuckets!.bucket2IncomeSecuredYears || 5);
    
    bucket1Balance = Math.min(totalAssets, b1Target);
    bucket2Balance = Math.min(Math.max(0, totalAssets - bucket1Balance), b2Target);
    bucket3Balance = Math.max(0, totalAssets - bucket1Balance - bucket2Balance);
  }
  
  for (let step = 0; step <= totalYears; step++) {
    const currentYear = payload.startYear + step;
    const currentAge = payload.currentAge + step;

    // --- Funded Ratio Calculation ---
    const remainingYears = totalYears - step;
    const futureIncomeCashflows: number[] = new Array(remainingYears + 1).fill(0);
    const futureLiabilityCashflows: number[] = new Array(remainingYears + 1).fill(0);
    
    for (let f = 0; f <= remainingYears; f++) {
      const fAge = currentAge + f; 
      const fYear = currentYear + f;

      if (payload.futureIncomeStreams) {
        for (const stream of payload.futureIncomeStreams) {
          if (fAge >= stream.activationAge) {
            futureIncomeCashflows[f] += (stream.monthlyAmount * 12);
          }
        }
      }

      let fActiveStage: Stage | null = null;
      if (payload.stages) {
        for (const stage of payload.stages) {
          if (!stage.triggerMilestoneId) {
            if (!fActiveStage) fActiveStage = stage;
          } else {
             const ms = payload.milestones?.find(m => m.id === stage.triggerMilestoneId);
             if (ms) {
               const msTriggerY = ms.isTriggerByAge 
                 ? payload.startYear + ((ms.triggerAge ?? 65) - payload.currentAge)
                 : (ms.triggerYear ?? 2030);
               if (fYear >= msTriggerY) {
                 fActiveStage = stage;
               }
             }
          }
        }
      }
      if (!fActiveStage && payload.stages && payload.stages.length > 0) fActiveStage = payload.stages[0];
      futureLiabilityCashflows[f] += (fActiveStage?.targetAnnualBudget || 0);

      if (payload.futureLiabilities) {
        for (const liab of payload.futureLiabilities) {
          if (fAge >= liab.activationAge && (!liab.endAge || fAge <= liab.endAge)) {
            futureLiabilityCashflows[f] += (liab.monthlyAmount * 12);
          }
        }
      }

      if (payload.milestones) {
        for (const ms of payload.milestones) {
          if (ms.type === 'capex') {
             const triggerY = ms.isTriggerByAge 
               ? payload.startYear + ((ms.triggerAge ?? 65) - payload.currentAge)
               : (ms.triggerYear ?? 2030);
             if (fYear === triggerY) {
               futureLiabilityCashflows[f] += (ms.amount || 0);
             }
          }
        }
      }
    }

    const discountRate = (payload.globalDiscountRate ?? 2.0) / 100;
    const pvFutureIncome = computePresentValue(futureIncomeCashflows, discountRate);
    const pvFutureLiabilities = computePresentValue(futureLiabilityCashflows, discountRate);

    const startAssets = currentAssets.reduce((sum, a) => sum + a.value, 0);

    const fundedRatio = pvFutureLiabilities > 0 
      ? (startAssets + pvFutureIncome) / pvFutureLiabilities
      : 1;
    // --------------------------------
    
    // 1. Determine active stage (Chronological evaluation)
    let activeStage: Stage | null = null;
    let pensionIncome = 0;
    let rrbIncome = 0;
    
    // Evaluate milestones up to current year
    if (payload.milestones) {
      payload.milestones.forEach((m: any) => {
        const triggerY = m.isTriggerByAge 
          ? payload.startYear + ((m.triggerAge ?? 65) - payload.currentAge)
          : (m.triggerYear ?? 2030);
          
        if (currentYear >= triggerY) {
          if (m.type === 'pension') pensionIncome += m.amount;
          if (m.type === 'rrt1' || m.type === 'rrt2') rrbIncome += m.amount;
        }
      });
    }

    // Determine Stage
    // Iterate to find the latest valid stage based on chronological milestones
    if (payload.stages) {
      for (const stage of payload.stages) {
        if (!stage.triggerMilestoneId) {
          if (!activeStage) activeStage = stage; // fallback default
        } else {
          const ms = payload.milestones?.find(m => m.id === stage.triggerMilestoneId);
          if (ms) {
            const triggerY = ms.isTriggerByAge 
              ? payload.startYear + ((ms.triggerAge ?? 65) - payload.currentAge)
              : (ms.triggerYear ?? 2030);
              
            if (currentYear >= triggerY) {
              activeStage = stage; // latest passing stage overrides
            }
          }
        }
      }
    }
    
    if (!activeStage && payload.stages && payload.stages.length > 0) activeStage = payload.stages[0];
    
    // 2. Budget adjustment
    let stageTargetBudgetNominal = 0;
    let lifestyleShrinking = false;
    
    const activePhase = payload.budgetPhases?.find(p => currentYear >= p.startYear && currentYear <= p.endYear) || payload.budgetPhases?.[0];
    
    if (activePhase) {
      let lsAdjustmentCum = 1.0;
      let phaseYears = currentYear - activePhase.startYear;
      if (phaseYears < 0) phaseYears = 0;
      
      if (activePhase.applyLifestyleAdjustment) {
        lsAdjustmentCum = Math.pow(1 + activePhase.lifestyleAdjustmentRate, phaseYears);
        if (activePhase.lifestyleAdjustmentRate < 0) {
          lifestyleShrinking = true;
        }
      } else {
        lsAdjustmentCum = 1.0;
      }
      stageTargetBudgetNominal = activePhase.baselineAmount * cumInflation * lsAdjustmentCum;
    } else {
      stageTargetBudgetNominal = (activeStage?.targetAnnualBudget || 0) * cumInflation;
    }
    
    // 3. UPRR Divestment Logic (Convert concentrated UPRR into SCHD ETF)
    let divestedAmount = 0;
    const uprrAsset = currentAssets.find(a => a.id === payload.uprrId);
    const schdAsset = currentAssets.find(a => a.id === payload.dividendEtfId);
    
    if (uprrAsset && schdAsset && payload.uprrDivestmentAnnualAmount > 0) {
      const divestAmount = Math.min(uprrAsset.value, payload.uprrDivestmentAnnualAmount);
      if (divestAmount > 0) {
        uprrAsset.value -= divestAmount;
        // Capital Gains tax drag on divestment (estimate 15%)
        const estimatedCGTax = divestAmount * 0.15;
        schdAsset.value += (divestAmount - estimatedCGTax);
        divestedAmount = divestAmount;
      }
    }
    
    // 4. Calculate total dividens paid out vs reinvested
    let availableDividendsCash = 0;
    currentAssets.forEach(a => {
      const yieldRate = a.dividendYield || 0;
      if (a.dividendReinvestment === 'payout' && yieldRate > 0) {
        availableDividendsCash += a.value * yieldRate;
      }
    });
    
    // 5. Income gaps and Drawdown logic
    let activeGiftAmount = 0;
    if (payload.nonTaxableGifts) {
      payload.nonTaxableGifts.forEach(gift => {
        let active = true;
        if (gift.startAge !== undefined && currentAge < gift.startAge) active = false;
        if (gift.startYear !== undefined && currentYear < gift.startYear) active = false;
        if (gift.endAge !== undefined && currentAge > gift.endAge) active = false;
        if (gift.endYear !== undefined && currentYear > gift.endYear) active = false;
        
        if (active) {
          const giftVal = gift.inflationAdjusted ? gift.annualAmount * cumInflation : gift.annualAmount;
          activeGiftAmount += giftVal;
        }
      });
    }

    const giftAmountUsed = Math.min(stageTargetBudgetNominal, activeGiftAmount);
    const remainingFundingNeed = Math.max(0, stageTargetBudgetNominal - activeGiftAmount);

    let remainingBudgetTarget = Math.max(0, remainingFundingNeed - pensionIncome - rrbIncome);
    let actualNominalWithdrawal = remainingBudgetTarget;
    
    // --- 3-Bucket Strategy Waterfall & Guardrails ---
    if (use3Bucket && payload.threeBuckets) {
      let amountNeeded = remainingBudgetTarget;
      
      const currentTotalAssets = currentAssets.reduce((sum, a) => sum + a.value, 0);
      let isNegativeMarketYear = payload.targetConstantMarketReturn < 0;
      if (currentTotalAssets > 0) {
        const weightedGrowth = currentAssets.reduce((sum, a) => sum + (a.value * (a.growthRate || 0)), 0) / currentTotalAssets;
        if (weightedGrowth < 0) isNegativeMarketYear = true;
      }
      
      // 1. Drain from Bucket 1
      const drawnFrom1 = Math.min(bucket1Balance, amountNeeded);
      bucket1Balance -= drawnFrom1;
      amountNeeded -= drawnFrom1;
      
      // 2. Drain from Bucket 2
      const drawnFrom2 = Math.min(bucket2Balance, amountNeeded);
      bucket2Balance -= drawnFrom2;
      amountNeeded -= drawnFrom2;
      
      // 3. Drain from Bucket 3 ONLY if not negative market year
      let drawnFrom3 = 0;
      if (!isNegativeMarketYear) {
         drawnFrom3 = Math.min(bucket3Balance, amountNeeded);
         bucket3Balance -= drawnFrom3;
         amountNeeded -= drawnFrom3;
      }
      
      const actuallyGathered = drawnFrom1 + drawnFrom2 + drawnFrom3;
      remainingBudgetTarget = actuallyGathered;
      actualNominalWithdrawal = actuallyGathered;
    }
    
    let withdrawnDividends = 0;
    let withdrawnTaxable = 0;
    let withdrawnTaxAdvantaged = 0;
    
    // Deduct from pure cash/dividends first
    if (remainingBudgetTarget > 0 && availableDividendsCash > 0) {
      if (availableDividendsCash >= remainingBudgetTarget) {
        withdrawnDividends += remainingBudgetTarget;
        availableDividendsCash -= remainingBudgetTarget;
        remainingBudgetTarget = 0;
      } else {
        withdrawnDividends += availableDividendsCash;
        remainingBudgetTarget -= availableDividendsCash;
        availableDividendsCash = 0;
      }
    }
    
    // Reinvest leftover dividends
    if (availableDividendsCash > 0 && schdAsset) {
      schdAsset.value += availableDividendsCash;
    }
    
    // If still need money, pull from assets following fundingPriorities
    if (remainingBudgetTarget > 0 && activeStage?.fundingPriorities) {
      for (const pType of activeStage.fundingPriorities) {
        if (remainingBudgetTarget <= 0) break;
        
        const eligibleAssets = currentAssets.filter(a => a.type === pType && a.value > 0);
        const poolValue = eligibleAssets.reduce((sum, a) => sum + a.value, 0);
        
        if (poolValue > 0) {
           const withdrawFromPool = Math.min(poolValue, remainingBudgetTarget);
           const pullFactor = withdrawFromPool / poolValue;
           
           eligibleAssets.forEach(a => {
             a.value -= (a.value * pullFactor);
           });
           
           if (pType === 'taxable_brokerage' || pType === 'investment') withdrawnTaxable += withdrawFromPool;
           if (pType === 'tax_advantaged_401k' || pType === 'traditional_ira' || pType === 'roth_ira') withdrawnTaxAdvantaged += withdrawFromPool;
           
           remainingBudgetTarget -= withdrawFromPool;
        }
      }
      
      // If STILL short, fallback to any available liquid assets
      if (remainingBudgetTarget > 0) {
        const liquidAssets = currentAssets.filter(a => a.value > 0);
        const totalLiq = liquidAssets.reduce((sum, a) => sum + a.value, 0);
        if (totalLiq > 0) {
           const withdrawFromLiq = Math.min(totalLiq, remainingBudgetTarget);
           const pullFactor = withdrawFromLiq / totalLiq;
           liquidAssets.forEach(a => {
             a.value -= (a.value * pullFactor);
           });
           withdrawnTaxable += withdrawFromLiq; // Fallback mapping
           remainingBudgetTarget -= withdrawFromLiq;
        }
      }
    }
    
    // 6. Grow / Appreciate Assets for remainder of year
    currentAssets.forEach(a => {
      const growth = a.growthRate || 0;
      const isReinvest = a.dividendReinvestment === 'reinvest';
      const yieldRate = isReinvest ? (a.dividendYield || 0) : 0;
      a.value = Math.max(0, a.value * (1 + growth + yieldRate));
    });
    
    const balanceAfterGrowth = currentAssets.reduce((sum, a) => sum + a.value, 0);
    const estimatedTaxDrag = (pensionIncome + rrbIncome) * 0.15;
    
    // Deduct tax drag
    if (balanceAfterGrowth > 0 && estimatedTaxDrag > 0) {
      const taxFactor = Math.max(0, (balanceAfterGrowth - estimatedTaxDrag) / balanceAfterGrowth);
      currentAssets.forEach(a => {
         a.value *= taxFactor;
      });
    }
    
    const finalBalance = currentAssets.reduce((sum, a) => sum + a.value, 0);
    
    // Abstract bucket growth and refill logic matching the portfolio's net changes
    if (use3Bucket && payload.threeBuckets) {
       const preGrowthBucketTotal = bucket1Balance + bucket2Balance + bucket3Balance;
       if (preGrowthBucketTotal > 0 && finalBalance > 0) {
          const factor = finalBalance / preGrowthBucketTotal;
          bucket1Balance *= factor;
          bucket2Balance *= factor;
          bucket3Balance *= factor;
       } else {
          bucket1Balance = 0;
          bucket2Balance = 0;
          bucket3Balance = 0;
       }
       
       // Refill Buckets based on Target Configuration
       const b1TargetMultiplier = payload.threeBuckets.bucket1LiquiditySecuredYears || 2;
       const b2TargetMultiplier = payload.threeBuckets.bucket2IncomeSecuredYears || 5;
       const b1Target = stageTargetBudgetNominal * b1TargetMultiplier;
       const b2Target = stageTargetBudgetNominal * b2TargetMultiplier;
       
       // Refill Bucket 1 from Bucket 2
       if (bucket1Balance < b1Target) {
          const shortfall = b1Target - bucket1Balance;
          const transfer = Math.min(bucket2Balance, shortfall);
          bucket2Balance -= transfer;
          bucket1Balance += transfer;
       }
       
       // Refill Bucket 1 & 2 from Bucket 3 (strictly halted during negative market years)
       let isNegativeMarketYear = payload.targetConstantMarketReturn < 0;
       if (finalBalance > 0) {
         const weightedGrowth = currentAssets.reduce((sum, a) => sum + (a.value * (a.growthRate || 0)), 0) / finalBalance;
         if (weightedGrowth < 0) isNegativeMarketYear = true;
       }
       
       if (!isNegativeMarketYear) {
          if (bucket1Balance < b1Target) {
             const shortfall = b1Target - bucket1Balance;
             const transfer = Math.min(bucket3Balance, shortfall);
             bucket3Balance -= transfer;
             bucket1Balance += transfer;
          }
          if (bucket2Balance < b2Target) {
             const shortfall = b2Target - bucket2Balance;
             const transfer = Math.min(bucket3Balance, shortfall);
             bucket3Balance -= transfer;
             bucket2Balance += transfer;
          }
       }
    }
    
    // Extract per-asset balances
    const astMap: Record<string, number> = {};
    currentAssets.forEach(a => astMap[a.id] = a.value);

    snapshots.push({
      year: currentYear,
      age: Math.round(currentAge * 10) / 10,
      activeStageId: activeStage?.id || 'default',
      nominalWithdrawal: actualNominalWithdrawal,
      realWithdrawal: actualNominalWithdrawal / cumInflation,
      pensionIncome,
      rrbIncome,
      taxDrag: estimatedTaxDrag,
      endingBalance: finalBalance,
      assetBalances: astMap,
      uprrDivested: divestedAmount,
      withdrawnDividends,
      withdrawnTaxable,
      withdrawnTaxAdvantaged,
      fundedRatio,
      pvFutureIncome,
      pvFutureLiabilities,
      giftAmountUsed,
      targetBudgetNominal: stageTargetBudgetNominal,
      lifestyleShrinking,
      bucket1Balance,
      bucket2Balance,
      bucket3Balance
    });
    
    cumInflation *= (1 + payload.inflationRate);
  }
  
  return snapshots;
}
