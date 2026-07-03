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
  startingBalanceReal: number;
  marketGain: number;
  marketGainReal: number;
  nominalWithdrawal: number;
  realWithdrawal: number;
  endingBalance: number;
  endingBalanceReal: number;
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
  const endYear = Math.max(startYear, Math.min(startYear + 100, Number(req.targetEndYear) || Number(req.endYear) || (startYear + 50)));
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
    targetEndYear: Number(req.targetEndYear) || endYear,
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
  const endYear = Math.max(startYear, Math.min(startYear + 100, Number(req.targetEndYear) || Number(req.endYear) || (startYear + 50)));
  const currentAge = Math.max(0, Math.min(120, Number(req.currentAge) || 40));
  const inflationRate = Math.max(-0.2, Math.min(1.0, Number(req.inflationRate) || 0.03));
  const targetConstantMarketReturn = Math.max(-0.5, Math.min(2.0, Number(req.targetConstantMarketReturn) || 0.07));
  const maxRealWithdrawal = Math.max(0, Math.min(1e9, Number(req.maxRealWithdrawal) || 1000000));
  const liquidBufferYears = Math.max(0, Math.min(20, Number(req.liquidBufferYears) || 2));
  const uprrDivestmentAnnualAmount = Math.max(0, Math.min(1e9, Number(req.uprrDivestmentAnnualAmount) || 0));
  const globalDiscountRate = req.globalDiscountRate !== undefined ? Math.max(0, Math.min(1.0, Number(req.globalDiscountRate))) : undefined;

  const assets: NetWorthAssetInput[] = Array.isArray(req.assets)
    ? req.assets.slice(0, 100).map((a: any) => {
        let newType = 'TAXABLE';
        if (a?.assetType) {
          if (['CASH', 'TAXABLE', 'PRE_TAX', 'ROTH'].includes(a.assetType)) {
             newType = a.assetType;
          }
        } else if (a?.type) {
          if (a.type === 'traditional_ira' || a.type === 'PRE_TAX') newType = 'PRE_TAX';
          else if (a.type === 'roth_ira' || a.type === 'ROTH') newType = 'ROTH';
          else if (a.type === 'cash' || a.type === 'CASH') newType = 'CASH';
        }
        
        return {
          id: String(a?.id || '').substring(0, 128),
          name: String(a?.name || 'Asset').substring(0, 120),
          value: Math.max(0, Math.min(1e12, Number(a?.value) || 0)),
          assetType: newType as 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH',
          expectedGrowthRate: Math.max(-1.0, Math.min(1.0, a?.expectedGrowthRate !== undefined ? Number(a.expectedGrowthRate) : (Number(a?.growthRate) || 0.05))),
          expectedDividendYield: Math.max(-1.0, Math.min(1.0, a?.expectedDividendYield !== undefined ? Number(a.expectedDividendYield) : (Number(a?.dividendYield) || 0.02))),
          availableDate: a?.availableDate ? String(a.availableDate).substring(0, 64) : undefined,
          type: a?.type,
          growthRate: a?.growthRate !== undefined ? Number(a.growthRate) : undefined,
          dividendYield: a?.dividendYield !== undefined ? Number(a.dividendYield) : undefined,
          dividendReinvestment: ['reinvest', 'payout'].includes(a?.dividendReinvestment) ? a.dividendReinvestment : undefined,
          isLiquidationTarget: a?.isLiquidationTarget !== undefined ? !!a.isLiquidationTarget : undefined,
          isDividendDestination: a?.isDividendDestination !== undefined ? !!a.isDividendDestination : undefined
        };
      })
    : [];

  const stages: Stage[] = Array.isArray(req.stages)
    ? req.stages.slice(0, 20).map((s: any) => ({
        id: String(s?.id || '').substring(0, 128),
        name: String(s?.name || 'Stage').substring(0, 120),
        triggerMilestoneId: s?.triggerMilestoneId ? String(s.triggerMilestoneId).substring(0, 128) : undefined,
        startYearType: s?.startYearType === 'milestone' ? 'milestone' : 'absolute',
        startMilestoneId: s?.startMilestoneId ? String(s.startMilestoneId).substring(0, 128) : undefined,
        startAbsoluteYear: s?.startAbsoluteYear !== undefined ? Number(s.startAbsoluteYear) : undefined,
        fundingPriorities: Array.isArray(s?.fundingPriorities) ? s.fundingPriorities.slice(0, 10).map((p: any) => String(p).substring(0, 128)) : [],
        includeGlobalIncomeStreams: Boolean(s?.includeGlobalIncomeStreams),
        includeAuxiliaryTaxFreeIncome: Boolean(s?.includeAuxiliaryTaxFreeIncome)
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
    targetEndYear: Number(req.targetEndYear) || endYear,
    currentAge,
    assets,
    stages,
    milestones: Array.isArray(req.milestones) ? req.milestones.slice(0, 50) : [],
    uprrDivestmentAnnualAmount,
    dividendEtfId: String(req.dividendEtfId || '').substring(0, 128),
    uprrId: String(req.uprrId || '').substring(0, 128),
    targetConstantMarketReturn,
    inflationRate,
    budgetPhases: Array.isArray(req.budgetPhases) ? req.budgetPhases.slice(0, 20).map((p: any) => ({
      phaseId: String(p.phaseId || '').substring(0, 128),
      startYear: Number(p.startYear) || startYear,
      endYear: Number(p.endYear) || endYear,
      baselineAmount: Number(p.baselineAmount) || 0,
      applyLifestyleAdjustment: Boolean(p.applyLifestyleAdjustment),
      lifestyleAdjustmentRate: Number(p.lifestyleAdjustmentRate) || 0,
      cashBufferMultiplier: p.cashBufferMultiplier !== undefined ? Number(p.cashBufferMultiplier) : 2.0
    })) : undefined,
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
        excluded: e?.excluded !== undefined ? !!e.excluded : undefined,
        urls: Array.isArray(e?.urls)
          ? e.urls.slice(0, 10).map((u: any) => {
              if (typeof u === 'string') {
                return { url: String(u).substring(0, 500), name: '' };
              }
              return {
                url: String(u?.url || '').substring(0, 500),
                name: String(u?.name || '').substring(0, 120)
              };
            })
          : undefined,
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
  assetType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH';
  expectedGrowthRate: number;
  expectedDividendYield: number;
  availableDate?: string;
  isLiquidationTarget?: boolean;
  isDividendDestination?: boolean;
  type?: string;
  growthRate?: number;
  dividendYield?: number;
  dividendReinvestment?: string;
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
  startYearType?: 'absolute' | 'milestone';
  startMilestoneId?: string;
  startAbsoluteYear?: number;
  fundingPriorities: string[];
  includeGlobalIncomeStreams?: boolean;
  includeAuxiliaryTaxFreeIncome?: boolean;
};

function resolveStageStartYear(stage: Stage, payload: MultiStageSimPayload): number {
  if (stage.startYearType === 'milestone') {
    const msId = stage.startMilestoneId || stage.triggerMilestoneId;
    if (msId && payload.milestones) {
      const ms = payload.milestones.find(m => m.id === msId);
      if (ms) {
        return ms.isTriggerByAge 
          ? payload.startYear + ((ms.triggerAge ?? 65) - payload.currentAge)
          : (ms.triggerYear ?? 2030);
      }
    }
  } else if (stage.startYearType === 'absolute') {
    return stage.startAbsoluteYear ?? payload.startYear;
  }
  
  // Legacy fallback
  if (stage.triggerMilestoneId && payload.milestones) {
    const ms = payload.milestones.find(m => m.id === stage.triggerMilestoneId);
    if (ms) {
      return ms.isTriggerByAge 
        ? payload.startYear + ((ms.triggerAge ?? 65) - payload.currentAge)
        : (ms.triggerYear ?? 2030);
    }
  }
  
  return payload.startYear;
}

export interface ThreeBucketConfig {
  bucket1LiquiditySecuredYears: number;
  bucket2IncomeSecuredYears: number;
  bucket3GrowthRemainingYears: number;
  rebalancingTriggerType: 'Chronological' | 'Threshold' | 'Opportunistic';
  rebalancingThresholdPercent?: number;
}

export type AppliedBridgeStrategy = { year: number; stockLiquidation: number; rothConversion: number; };

export type MultiStageSimPayload = {
  type: 'MULTI_STAGE_DRAWDOWN';
  startYear: number;
  endYear: number;
  targetEndYear?: number;
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
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;
  appliedBridgeStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];
  rebalancingCapitalGainPercentage?: number;
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
  targetEndYear?: number;
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
  netWorth10thReal: number;
  netWorth50thReal: number;
  netWorth90thReal: number;
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
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;
  rebalancingCapitalGainPercentage?: number;
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
  netBreakdown: {
    qualifiedDividendsNet: number;
    taxableBrokerageNet: number;
    traditional401kIraNet: number;
    rothIraNet: number;
    nonTaxableGiftNet: number;
  };
}

interface TaxBracket {
  limit: number;
  rate: number;
}

export interface OptimalTaxMovesResult {
  maxRecommendedRothConversion: number;
  maxRecommendedStockSale: number;
  remainingOrdinaryCapacity: number;
  remainingLtcgCapacity: number;
}

export function calculateOptimalTaxMoves(
  currentOrdinaryIncome: number,
  currentLTCG: number,
  targetOrdinaryBracket: number,
  targetLTCGBracket: number,
  estimatedCostBasisPercentage: number
): OptimalTaxMovesResult {
  // Post-2026 TCJA Threshold Baselines (MFJ)
  const STANDARD_DEDUCTION = 30000;
  
  // These represent the maximum gross ordinary income that keeps you within a specific bracket.
  // Taxable limit + Standard Deduction.
  const ordinaryGrossLimits: Record<number, number> = {
    0.00: STANDARD_DEDUCTION,
    0.10: STANDARD_DEDUCTION + 23200,
    0.12: STANDARD_DEDUCTION + 94300,
    0.22: STANDARD_DEDUCTION + 201050,
    0.24: Infinity
  };

  const ltcgBrackets: TaxBracket[] = [
    { limit: 98900, rate: 0.0 },
    { limit: 613700, rate: 0.15 },
    { limit: Infinity, rate: 0.20 }
  ];

  // 1. Calculate remaining capacity in targetOrdinaryBracket
  const targetOrdinaryGrossLimit = ordinaryGrossLimits[targetOrdinaryBracket] || Infinity;
  const remainingOrdinaryCapacity = Math.max(0, targetOrdinaryGrossLimit - currentOrdinaryIncome);
  
  // This exact capacity is the Maximum Recommended Roth Conversion
  const maxRecommendedRothConversion = remainingOrdinaryCapacity;

  // 2. Stack that simulated Roth conversion on top of currentOrdinaryIncome
  const simulatedOrdinaryIncome = currentOrdinaryIncome + maxRecommendedRothConversion;
  
  // Calculate new baseline for Capital Gains (Taxable Ordinary Income)
  const simulatedTaxableOrdinaryIncome = Math.max(0, simulatedOrdinaryIncome - STANDARD_DEDUCTION);

  // 3. Calculate remaining capacity in targetLTCGBracket
  // Find the limit for the requested LTCG bracket
  const targetLtcgBracketLimit = ltcgBrackets.find(b => b.rate === targetLTCGBracket)?.limit || Infinity;
  
  // LTCG stacks on top of Taxable Ordinary Income
  const combinedTaxableIncome = simulatedTaxableOrdinaryIncome + currentLTCG;
  const remainingLtcgCapacity = Math.max(0, targetLtcgBracketLimit - combinedTaxableIncome);

  // 4. Calculate Max Stock Sale using estimatedCostBasisPercentage
  // Ensure we use a value between 0 and 100 for cost basis
  const safeCostBasisPct = Math.max(0, Math.min(100, estimatedCostBasisPercentage));
  const gainsRatio = Math.max(0, Math.min(1, 1.0 - (safeCostBasisPct / 100)));
  
  // Max Stock Sale = Remaining LTCG Capacity / (1 - Cost Basis Percentage)
  const maxRecommendedStockSale = gainsRatio > 0 ? remainingLtcgCapacity / gainsRatio : Infinity;

  return {
    maxRecommendedRothConversion,
    maxRecommendedStockSale,
    remainingOrdinaryCapacity,
    remainingLtcgCapacity
  };
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
  const rebalancingGainRatio = Math.max(0, Math.min(1, (input.rebalancingCapitalGainPercentage || 0) / 100));
  const targetRothConversionAmount = input.targetRothConversionAmount || 0;
  const taxableRebalancingSaleAmount = input.taxableRebalancingSaleAmount || 0;

  // Convergence parameters for the multi-variable loop
  let traditionalGross = netTargets.traditional401kIra;
  let brokerageGross = netTargets.taxableBrokerage;
  let dividendGross = netTargets.qualifiedDividends;
  let rothGross = netTargets.rothIra;
  let cashGross = netTargets.nonTaxableGift;

  const totalAllocationNet = traditionalGross + brokerageGross + dividendGross + rothGross + cashGross;

  const TOLERANCE = 0.01;
  const MAX_ITERATIONS = 40;
  let iteration = 0;
  
  // Apply Standard Deduction (2026 MFJ projected standard deduction: $30,000)
  const STANDARD_DEDUCTION = 30000;
  
  // 1. Manual Tax Events Pre-Calculation (Strategic Tax Events)
  const manualOrdinaryIncome = preExistingOrdinaryIncome + targetRothConversionAmount;
  const manualLtcgIncome = taxableRebalancingSaleAmount * rebalancingGainRatio;

  let computedTaxTotal = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Compute active progressive taxable incomes
    const totalOrdinaryIncome = manualOrdinaryIncome + traditionalGross;
    const taxableOrdinaryIncome = Math.max(0, totalOrdinaryIncome - STANDARD_DEDUCTION);
    
    // Stack Capital Gains (LTCG sits on top of ordinary income)
    const totalLtcgGains = manualLtcgIncome + dividendGross + (brokerageGross * brokerageGainRatio);
    
    // Note: If standard deduction wasn't fully used by ordinary income, the remainder offsets LTCG
    const remainingStandardDeduction = Math.max(0, STANDARD_DEDUCTION - totalOrdinaryIncome);
    const taxableLtcgGains = Math.max(0, totalLtcgGains - remainingStandardDeduction);

    // Run structural statutory stacking logic
    const ordTax = computeProgressiveTax(taxableOrdinaryIncome, 0, ordinaryBrackets);
    const ltcgTax = computeStackedLtcgTax(taxableLtcgGains, taxableOrdinaryIncome, ltcgBrackets);
    const totalCalculatedTax = ordTax + ltcgTax;
    computedTaxTotal = totalCalculatedTax;

    const actualNetAchieved = (traditionalGross + brokerageGross + dividendGross + rothGross + cashGross) - totalCalculatedTax;
    const missingNetShortfall = totalAllocationNet - actualNetAchieved;

    if (Math.abs(missingNetShortfall) < TOLERANCE) {
      break;
    }

    if (totalAllocationNet <= 0) {
      // If no allocation is specified, default to taking tax out of cash
      cashGross += missingNetShortfall;
    } else {
      // Dynamic adjustment of gross parameters based on source weightings
      traditionalGross += missingNetShortfall * (netTargets.traditional401kIra / totalAllocationNet);
      brokerageGross += missingNetShortfall * (netTargets.taxableBrokerage / totalAllocationNet);
      dividendGross += missingNetShortfall * (netTargets.qualifiedDividends / totalAllocationNet);
      rothGross += missingNetShortfall * (netTargets.rothIra / totalAllocationNet);
      cashGross += missingNetShortfall * (netTargets.nonTaxableGift / totalAllocationNet);
    }
  }

  return {
    grossWithdrawalTotal: Math.round((traditionalGross + brokerageGross + dividendGross + rothGross + cashGross) * 100) / 100,
    totalTaxOwed: Math.round(computedTaxTotal * 100) / 100,
    bucketBreakdown: {
      qualifiedDividendsGross: Math.round(dividendGross * 100) / 100,
      taxableBrokerageGross: Math.round(brokerageGross * 100) / 100,
      traditional401kIraGross: Math.round(traditionalGross * 100) / 100,
      rothIraGross: Math.round(rothGross * 100) / 100,
      nonTaxableGiftGross: Math.round(cashGross * 100) / 100,
    },
    netBreakdown: {
      qualifiedDividendsNet: Math.round(netTargets.qualifiedDividends * 100) / 100,
      taxableBrokerageNet: Math.round(netTargets.taxableBrokerage * 100) / 100,
      traditional401kIraNet: Math.round(netTargets.traditional401kIra * 100) / 100,
      rothIraNet: Math.round(netTargets.rothIra * 100) / 100,
      nonTaxableGiftNet: Math.round(netTargets.nonTaxableGift * 100) / 100,
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
  excluded?: boolean;
  urls?: { url: string; name?: string }[];
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

    if (u.excluded) {
      u.monthlyValue = 0;
      u.annualValue = 0;
    } else if (u.valuationType === 'Static') {
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

    if (e.data.type === 'MULTI_STAGE_DRAWDOWN') {
      const safePayload = sanitizeMultiStageDrawdownPayload(e.data);
      const result = simulateMultiStageDrawdownWorker(safePayload);
      self.postMessage({ success: true, type: 'MULTI_STAGE_DRAWDOWN', scenarioId: (safePayload as any).scenarioId || (e.data as any).scenarioId, data: result });
    } else if (e.data.type === 'BUDGET_SIMULATION') {
      const safePayload = sanitizeBudgetPayload(e.data);
      const result = computeBudgetSimulation(safePayload.expenses || [], safePayload.assets || []);
      self.postMessage({ success: true, type: 'BUDGET_SIMULATION', data: result });
    } else if (e.data.type === 'BRIDGE_OPTIMIZATION') {
      const { state, params, scenarioId } = e.data;
      clearDPMemoCache(); // Clear cache before full run
      const result = generateBridgeOptimizationTimeline(state, params);
      self.postMessage({ success: true, type: 'BRIDGE_OPTIMIZATION', scenarioId, data: result });
    } else {
      throw new Error('Unsupported or removed simulation type: ' + e.data.type);
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
// Box-Muller transform for normal distributions
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Post-TCJA Tax Bracket Helper
export const STANDARD_DEDUCTION_2026_EST = 30000;
export const TCJA_BRACKETS_2026 = [
  { rate: 0.10, limit: 23200 },
  { rate: 0.12, limit: 94300 },
  { rate: 0.22, limit: 201050 },
  { rate: 0.24, limit: 383900 },
  { rate: 0.32, limit: 487450 },
  { rate: 0.35, limit: 731200 },
  { rate: 0.37, limit: Infinity },
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
  endingBalanceReal: number;
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
  targetBudgetReal?: number;
  cumulativeInflation?: number;
  lifestyleShrinking?: boolean;
  lifestyleGrowing?: boolean;
  lifestyleFlat?: boolean;
  bucket1Balance?: number;
  bucket1BalanceReal?: number;
  bucket2Balance?: number;
  bucket2BalanceReal?: number;
  bucket3Balance?: number;
  bucket3BalanceReal?: number;
  expectedGrowth?: number;
  expectedYield?: number;
  changeInNetWorth?: number;
  totalNetWorth: number;
  cashNominal?: number;
  cashReal?: number;
  taxableNominal?: number;
  taxableReal?: number;
  preTaxNominal?: number;
  preTaxReal?: number;
  rothNominal?: number;
  rothReal?: number;
  liquidationTargetBalance?: number;
  dividendDestinationBalance?: number;
  liquidationTargetSaleAmount?: number;
  liquidationTaxPaid?: number;
  rothConversionAmount?: number;
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

  const chronologicalLedger: MultiStageYearlySnapshot[] = [];
  
  // Clone assets to prevent reference mutation
  let currentAssets = payload.assets.map(a => ({ ...a }));
  let cumInflation = 1.0;
  
  const targetEndYear = payload.targetEndYear ?? payload.endYear;
  const totalYears = targetEndYear - payload.startYear;
  
  // Initialize Buckets 1, 2, and 3 abstract layers
  const use3Bucket = !!payload.threeBuckets || !!payload.budgetPhases?.some(p => p.cashBufferMultiplier !== undefined);
  let bucket1Balance = 0;
  let bucket2Balance = 0;
  let bucket3Balance = 0;
  
  if (use3Bucket && payload.stages && payload.stages.length > 0) {
    const totalAssets = currentAssets.reduce((sum, a) => sum + a.value, 0);
    const initialActivePhase = payload.budgetPhases?.find(p => payload.startYear >= p.startYear && payload.startYear <= p.endYear) || payload.budgetPhases?.[0];
    const initialTargetBudget = initialActivePhase?.baselineAmount || 0;
    const b1Target = initialTargetBudget * (initialActivePhase?.cashBufferMultiplier ?? payload.threeBuckets?.bucket1LiquiditySecuredYears ?? 2.0);
    const b2Target = initialTargetBudget * (payload.threeBuckets?.bucket2IncomeSecuredYears || 5);
    
    bucket1Balance = Math.min(totalAssets, b1Target);
    bucket2Balance = Math.min(Math.max(0, totalAssets - bucket1Balance), b2Target);
    bucket3Balance = Math.max(0, totalAssets - bucket1Balance - bucket2Balance);
  }
  
  // Pre-tax retirement accounts availability milestones
  let jessePreTaxTriggerYear = -1;
  let corriePreTaxTriggerYear = -1;
  if (payload.milestones) {
    const jesseM = payload.milestones.find((m: any) => m.type === 'pretax_avail_jesse');
    if (jesseM) {
      jessePreTaxTriggerYear = jesseM.isTriggerByAge
        ? payload.startYear + ((jesseM.triggerAge ?? 65) - payload.currentAge)
        : (jesseM.triggerYear ?? 2030);
    }
    const corrieM = payload.milestones.find((m: any) => m.type === 'pretax_avail_corrie');
    if (corrieM) {
      corriePreTaxTriggerYear = corrieM.isTriggerByAge
        ? payload.startYear + ((corrieM.triggerAge ?? 65) - payload.currentAge)
        : (corrieM.triggerYear ?? 2030);
    }
  }
  
  for (let step = 0; step <= totalYears; step++) {
    const currentYear = payload.startYear + step;
    if (currentYear > targetEndYear) {
      break;
    }
    const currentAge = payload.currentAge + step;
    
    const matchedStrategy = payload.appliedBridgeStrategies?.find(s => s.year === currentYear);
    const targetRothConversionAmount = matchedStrategy ? matchedStrategy.rothConversion : (payload.targetRothConversionAmount || 0);

    // --- 0. Granular Asset Loop: Establish Total Portfolio Return ---
    let growthAppreciation = 0;
    let reinvestedYield = 0;
    let paidOutYield = 0;

    const startAssets = currentAssets.reduce((sum, a) => sum + a.value, 0);

    currentAssets.forEach(a => {
      if (a.value > 0) {
        let isUnlockedAndActive = true;
        
        if (a.assetType === 'PRE_TAX') {
          const assetNameLower = (a.name || '').toLowerCase();
          const isCorrie = assetNameLower.includes('corrie');
          const isJesse = assetNameLower.includes('jesse') || !isCorrie;
          if (isJesse && jessePreTaxTriggerYear !== -1 && currentYear < jessePreTaxTriggerYear) {
            isUnlockedAndActive = false;
          }
          if (isCorrie && corriePreTaxTriggerYear !== -1 && currentYear < corriePreTaxTriggerYear) {
            isUnlockedAndActive = false;
          }
        }

        if (a.availableDate) {
          if (a.availableDate.includes('-')) {
            const availableYear = parseInt(a.availableDate.split('-')[0]);
            if (currentYear < availableYear) isUnlockedAndActive = false;
          } else if (a.availableDate.toLowerCase().startsWith('age:')) {
             const triggerAge = parseFloat(a.availableDate.split(':')[1]);
             if (currentAge < triggerAge) isUnlockedAndActive = false;
          } else {
             const availableYear = parseInt(a.availableDate);
             if (!isNaN(availableYear) && currentYear < availableYear) isUnlockedAndActive = false;
          }
        }

        const growth = a.expectedGrowthRate !== undefined ? a.expectedGrowthRate : (a.growthRate || 0);
        const yieldRate = a.expectedDividendYield !== undefined ? a.expectedDividendYield : (a.dividendYield || 0);
        let isReinvest = a.dividendReinvestment === 'reinvest';
        
        // Force reinvestment if the asset is still locked/unavailable for withdrawal
        if (!isUnlockedAndActive) {
          isReinvest = true;
        }

        const assetCapitalGrowth = a.value * growth;
        const assetDividendYield = a.value * yieldRate;

        growthAppreciation += assetCapitalGrowth;
        if (isReinvest) {
          reinvestedYield += assetDividendYield;
        } else {
          paidOutYield += assetDividendYield;
        }
        
        a.value = Math.max(0, a.value + assetCapitalGrowth + (isReinvest ? assetDividendYield : 0));
      }
    });

    const totalGrowthAndYield = growthAppreciation + reinvestedYield + paidOutYield;
    const portfolioReturnRate = startAssets > 0 ? totalGrowthAndYield / startAssets : 0;
    const isNegativeMarketYear = portfolioReturnRate < 0;

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
      const fActivePhase = payload.budgetPhases?.find(p => fYear >= p.startYear && fYear <= p.endYear) || payload.budgetPhases?.[0];
      futureLiabilityCashflows[f] += (fActivePhase?.baselineAmount || 0);

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

    const fundedRatio = pvFutureLiabilities > 0 
      ? (startAssets + pvFutureIncome) / pvFutureLiabilities
      : 1;
    // --------------------------------
    
    // 1. Determine active stage (Chronological evaluation)
    let activeStage: Stage | null = null;
    let pensionIncome = 0;
    let rrbIncome = 0;
    let otherIncome = 0;
    
    // Evaluate milestones up to current year
    if (payload.milestones) {
      payload.milestones.forEach((m: any) => {
        const triggerY = m.isTriggerByAge 
          ? payload.startYear + ((m.triggerAge ?? 65) - payload.currentAge)
          : (m.triggerYear ?? 2030);
          
        if (currentYear >= triggerY) {
          if (m.type === 'pension') pensionIncome += m.amount;
          if (m.type === 'rrt1' || m.type === 'rrt2') rrbIncome += m.amount;
          if (m.type === 'other_income') otherIncome += m.amount;
        }
      });
    }

    let currentFutureIncome = 0;
    if (payload.futureIncomeStreams) {
      for (const stream of payload.futureIncomeStreams) {
        if (currentAge >= stream.activationAge) {
          currentFutureIncome += (stream.monthlyAmount * 12);
        }
      }
    }

    // Determine Stage
    // Iterate to find the latest valid stage based on chronological resolution
    if (payload.stages) {
      const resolvedStages = payload.stages.map(s => ({
        stage: s,
        startYear: resolveStageStartYear(s, payload)
      })).sort((a, b) => a.startYear - b.startYear);
      
      for (const rs of resolvedStages) {
        if (currentYear >= rs.startYear) {
          activeStage = rs.stage;
        }
      }
    }
    
    if (!activeStage && payload.stages && payload.stages.length > 0) activeStage = payload.stages[0];
    
    // 2. Budget adjustment
    let stageTargetBudgetNominal = 0;
    let lifestyleShrinking = false;
    let lifestyleGrowing = false;
    let lifestyleFlat = false;
    
    const activePhase = payload.budgetPhases?.find(p => currentYear >= p.startYear && currentYear <= p.endYear) || payload.budgetPhases?.[0];
    
    if (activePhase) {
      let lsAdjustmentCum = 1.0;
      let phaseYears = currentYear - activePhase.startYear;
      if (phaseYears < 0) phaseYears = 0;
      
      if (activePhase.applyLifestyleAdjustment) {
        const lsRate = (activePhase.lifestyleAdjustmentRate || 0) / 100;
        lsAdjustmentCum = Math.pow(1 + lsRate, phaseYears);
        if (lsRate < 0) {
          lifestyleShrinking = true;
        } else if (lsRate > 0) {
          lifestyleGrowing = true;
        } else {
          lifestyleFlat = true;
        }
      } else {
        lsAdjustmentCum = 1.0;
        lifestyleFlat = true;
      }
      stageTargetBudgetNominal = activePhase.baselineAmount * cumInflation * lsAdjustmentCum;
    } else {
      stageTargetBudgetNominal = 0;
      lifestyleFlat = true;
    }
    
    let divestedAmount = 0;
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

    const includeAuxiliary = activeStage?.includeAuxiliaryTaxFreeIncome ?? false;
    const giftAmountUsed = includeAuxiliary ? Math.min(stageTargetBudgetNominal, activeGiftAmount) : 0;
    const remainingFundingNeed = Math.max(0, stageTargetBudgetNominal - giftAmountUsed);

    const includeGlobal = activeStage?.includeGlobalIncomeStreams ?? false;
    const totalGlobalIncome = pensionIncome + rrbIncome + otherIncome + currentFutureIncome;
    const appliedGlobalIncome = includeGlobal ? totalGlobalIncome : 0;

    let remainingBudgetTarget = Math.max(0, remainingFundingNeed - appliedGlobalIncome);
    let actualNominalWithdrawal = remainingBudgetTarget;
    
    // --- Concentrated Stock Liquidation & Transfer Logic ---
    let liquidationTargetSaleAmount = 0;
    let liquidationTaxPaid = 0;
    
    const liqTargetAsset = currentAssets.find(a => a.isLiquidationTarget);
    const divDestAsset = currentAssets.find(a => a.isDividendDestination);
    
    if (liqTargetAsset && divDestAsset && liqTargetAsset.value > 0) {
      // 1. Calculate Taxable Ordinary Income this year (excluding capital gains)
      const ordinaryIncomeThisYear = pensionIncome + rrbIncome + otherIncome + currentFutureIncome + targetRothConversionAmount;
      const taxableOrdinaryIncomeThisYear = Math.max(0, ordinaryIncomeThisYear - STANDARD_DEDUCTION_2026_EST);
      
      // 2. Pre-existing LTCG this year
      const preExistingLTCG = (paidOutYield + reinvestedYield) + 
        ((payload.taxableRebalancingSaleAmount || 0) * ((payload.rebalancingCapitalGainPercentage || 0) / 100));
        
      // 3. Calculate remaining 0% LTCG capacity
      const remaining0PercentLtcgSpace = Math.max(0, 98900 - (taxableOrdinaryIncomeThisYear + preExistingLTCG));
      
      // 4. Calculate gain ratio of liquidation target (using standard 60% cost basis)
      const costBasisPercentage = 60;
      const gainRatio = Math.max(0, Math.min(1, 1 - (costBasisPercentage / 100))); // 0.40
      
      // 5. Max sale amount that stays within 0% LTCG space
      const maxSaleFor0PercentLtcg = gainRatio > 0 ? (remaining0PercentLtcgSpace / gainRatio) : 0;
      
      // 6. Overriding cash flow required to fund baseline budget
      // Calculate value of ALL eligible drawdown assets OTHER than the liquidation target
      const otherEligibleAssetsValue = currentAssets
        .filter(a => {
          if (a.value <= 0 || a.isLiquidationTarget) return false;
          // Apply same lockout and pre-tax availability checks if we want to be fully accurate
          if (a.assetType === 'PRE_TAX') {
            const assetNameLower = (a.name || '').toLowerCase();
            const isCorrie = assetNameLower.includes('corrie');
            const isJesse = assetNameLower.includes('jesse') || !isCorrie;
            if (isJesse && jessePreTaxTriggerYear !== -1 && currentYear < jessePreTaxTriggerYear) return false;
            if (isCorrie && corriePreTaxTriggerYear !== -1 && currentYear < corriePreTaxTriggerYear) return false;
          }
          if (a.availableDate) {
            if (a.availableDate.includes('-')) {
              const availableYear = parseInt(a.availableDate.split('-')[0]);
              if (currentYear < availableYear) return false;
            } else if (a.availableDate.toLowerCase().startsWith('age:')) {
               const triggerAge = parseFloat(a.availableDate.split(':')[1]);
               if (currentAge < triggerAge) return false;
            } else {
               const availableYear = parseInt(a.availableDate);
               if (!isNaN(availableYear) && currentYear < availableYear) return false;
            }
          }
          return true;
        })
        .reduce((sum, a) => sum + a.value, 0);
        
      const baselineBudgetShortfall = Math.max(0, remainingBudgetTarget - otherEligibleAssetsValue);
      
      // 7. Optimal sale amount: Maximize 0% LTCG space, but cover budget shortfall if required
      let optimalSaleAmount = Math.max(maxSaleFor0PercentLtcg, baselineBudgetShortfall);
      if (matchedStrategy !== undefined && matchedStrategy.stockLiquidation !== undefined) {
        optimalSaleAmount = matchedStrategy.stockLiquidation;
      }
      optimalSaleAmount = Math.min(liqTargetAsset.value, optimalSaleAmount);
      
      if (optimalSaleAmount > 0) {
        // 8. Subtract liquidated amount from the target asset
        liqTargetAsset.value -= optimalSaleAmount;
        
        // 9. Calculate capital gains tax progressively
        const capitalGainsGenerated = optimalSaleAmount * gainRatio;
        
        const calculateLtcgTaxForGains = (newGains: number, existingTaxableIncomeAndGains: number): number => {
          const start = existingTaxableIncomeAndGains;
          const end = existingTaxableIncomeAndGains + newGains;
          let tax = 0;
          
          const start15 = Math.max(98900, start);
          const end15 = Math.min(613700, end);
          if (end15 > start15) {
            tax += (end15 - start15) * 0.15;
          }
          
          const start20 = Math.max(613700, start);
          const end20 = Math.max(613700, end);
          if (end20 > start20) {
            tax += (end20 - start20) * 0.20;
          }
          
          return tax;
        };
        
        const taxOwedOnThisSale = calculateLtcgTaxForGains(capitalGainsGenerated, taxableOrdinaryIncomeThisYear + preExistingLTCG);
        const netProceeds = optimalSaleAmount - taxOwedOnThisSale;
        
        // 10. Add net proceeds directly to dividend destination
        divDestAsset.value += netProceeds;
        
        liquidationTargetSaleAmount = optimalSaleAmount;
        liquidationTaxPaid = taxOwedOnThisSale;
      }
    }
    
    // --- 3-Bucket Strategy Waterfall & Guardrails ---
    if (use3Bucket) {
      let amountNeeded = remainingBudgetTarget;
      
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
    
    const eligibleDrawdownAssets = currentAssets.filter(a => {
      if (a.value <= 0) return false;
      
      // Handle Jesse & Corrie pre-tax availability milestones
      if (a.assetType === 'PRE_TAX') {
        const assetNameLower = (a.name || '').toLowerCase();
        const isCorrie = assetNameLower.includes('corrie');
        const isJesse = assetNameLower.includes('jesse') || !isCorrie; // Default to Jesse if not Corrie
        
        if (isJesse && jessePreTaxTriggerYear !== -1 && currentYear < jessePreTaxTriggerYear) {
          return false;
        }
        if (isCorrie && corriePreTaxTriggerYear !== -1 && currentYear < corriePreTaxTriggerYear) {
          return false;
        }
      }

      if (a.availableDate) {
        if (a.availableDate.includes('-')) {
          const availableYear = parseInt(a.availableDate.split('-')[0]);
          if (currentYear < availableYear) return false;
        } else if (a.availableDate.toLowerCase().startsWith('age:')) {
           const triggerAge = parseFloat(a.availableDate.split(':')[1]);
           if (currentAge < triggerAge) return false;
        } else {
           const availableYear = parseInt(a.availableDate);
           if (!isNaN(availableYear) && currentYear < availableYear) return false;
        }
      }
      return true;
    });

    let availableDividendsCash = paidOutYield;

    let remainingNetNeed = remainingBudgetTarget;
    let netDrawn = {
      traditional401kIra: 0,
      taxableBrokerage: 0,
      qualifiedDividends: 0,
      rothIra: 0,
      nonTaxableGift: giftAmountUsed
    };

    if (remainingNetNeed > 0 && availableDividendsCash > 0) {
      const take = Math.min(availableDividendsCash, remainingNetNeed);
      netDrawn.qualifiedDividends += take;
      remainingNetNeed -= take;
    }

    if (remainingNetNeed > 0 && activeStage?.fundingPriorities) {
      for (const pType of activeStage.fundingPriorities) {
        if (remainingNetNeed <= 0) break;
        
        let mappedType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH' | 'ALL' = 'ALL';
        if (pType === 'taxable_brokerage' || pType === 'TAXABLE') mappedType = 'TAXABLE';
        else if (pType === 'tax_advantaged_401k' || pType === 'traditional_ira' || pType === 'PRE_TAX') mappedType = 'PRE_TAX';
        else if (pType === 'roth_ira' || pType === 'ROTH') mappedType = 'ROTH';
        else if (pType === 'cash' || pType === 'CASH') mappedType = 'CASH';

        const pool = eligibleDrawdownAssets.filter(a => (mappedType === 'ALL' || a.assetType === mappedType) && a.value > 0);
        const poolValue = pool.reduce((sum, a) => sum + a.value, 0);
        
        if (poolValue > 0) {
           const takeNet = Math.min(poolValue, remainingNetNeed);
           if (mappedType === 'PRE_TAX') netDrawn.traditional401kIra += takeNet;
           else if (mappedType === 'TAXABLE') netDrawn.taxableBrokerage += takeNet;
           else if (mappedType === 'ROTH') netDrawn.rothIra += takeNet;
           else if (mappedType === 'CASH') netDrawn.nonTaxableGift += takeNet; 
           else netDrawn.taxableBrokerage += takeNet;
           
           remainingNetNeed -= takeNet;
        }
      }
      
      if (remainingNetNeed > 0) {
        const pool = eligibleDrawdownAssets.filter(a => a.value > 0);
        const poolValue = pool.reduce((sum, a) => sum + a.value, 0);
        if (poolValue > 0) {
           const takeNet = Math.min(poolValue, remainingNetNeed);
           netDrawn.taxableBrokerage += takeNet; // Fallback
           remainingNetNeed -= takeNet;
        }
      }
    }

    const taxOutput = evaluateMultiBucketTax({
       targetNetExpense: actualNominalWithdrawal,
       allocationMode: 'DOLLARS',
       buckets: netDrawn,
       blendedCostBasisPercentage: 60,
       preExistingOrdinaryIncome: pensionIncome + rrbIncome + otherIncome + currentFutureIncome,
       targetRothConversionAmount: targetRothConversionAmount,
       taxableRebalancingSaleAmount: payload.taxableRebalancingSaleAmount,
       rebalancingCapitalGainPercentage: payload.rebalancingCapitalGainPercentage
    });

    let withdrawnDividends = 0;
    let withdrawnTaxable = 0;
    let withdrawnTaxAdvantaged = 0;

    let remainingGrossNeed = {
      PRE_TAX: taxOutput.bucketBreakdown.traditional401kIraGross,
      TAXABLE: taxOutput.bucketBreakdown.taxableBrokerageGross,
      ROTH: taxOutput.bucketBreakdown.rothIraGross,
      CASH: Math.max(0, taxOutput.bucketBreakdown.nonTaxableGiftGross - giftAmountUsed),
      DIVIDENDS: taxOutput.bucketBreakdown.qualifiedDividendsGross
    };

    if (remainingGrossNeed.DIVIDENDS > 0 && availableDividendsCash > 0) {
       const takeGross = Math.min(availableDividendsCash, remainingGrossNeed.DIVIDENDS);
       withdrawnDividends += takeGross;
       availableDividendsCash -= takeGross;
       remainingGrossNeed.DIVIDENDS -= takeGross;
    }
    
    if (availableDividendsCash > 0 && divDestAsset) {
      divDestAsset.value += availableDividendsCash;
    }

    if (activeStage?.fundingPriorities) {
      for (const pType of activeStage.fundingPriorities) {
        let mappedType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH' | 'ALL' = 'ALL';
        if (pType === 'taxable_brokerage' || pType === 'TAXABLE') mappedType = 'TAXABLE';
        else if (pType === 'tax_advantaged_401k' || pType === 'traditional_ira' || pType === 'PRE_TAX') mappedType = 'PRE_TAX';
        else if (pType === 'roth_ira' || pType === 'ROTH') mappedType = 'ROTH';
        else if (pType === 'cash' || pType === 'CASH') mappedType = 'CASH';

        const pool = eligibleDrawdownAssets.filter(a => (mappedType === 'ALL' || a.assetType === mappedType) && a.value > 0);
        const poolValue = pool.reduce((sum, a) => sum + a.value, 0);
        
        let amountToDrawGross = 0;
        if (mappedType === 'PRE_TAX') amountToDrawGross = remainingGrossNeed.PRE_TAX;
        else if (mappedType === 'TAXABLE') amountToDrawGross = remainingGrossNeed.TAXABLE;
        else if (mappedType === 'ROTH') amountToDrawGross = remainingGrossNeed.ROTH;
        else if (mappedType === 'CASH') amountToDrawGross = remainingGrossNeed.CASH;
        else amountToDrawGross = remainingGrossNeed.TAXABLE + remainingGrossNeed.PRE_TAX + remainingGrossNeed.ROTH + remainingGrossNeed.CASH;

        if (poolValue > 0 && amountToDrawGross > 0) {
           const withdrawFromPool = Math.min(poolValue, amountToDrawGross);
           const pullFactor = withdrawFromPool / poolValue;
           
           pool.forEach(a => {
             a.value -= (a.value * pullFactor);
           });
           
           if (mappedType === 'TAXABLE' || mappedType === 'CASH' || mappedType === 'ALL') withdrawnTaxable += withdrawFromPool;
           if (mappedType === 'PRE_TAX' || mappedType === 'ROTH') withdrawnTaxAdvantaged += withdrawFromPool;
           
           if (mappedType === 'PRE_TAX') remainingGrossNeed.PRE_TAX -= withdrawFromPool;
           else if (mappedType === 'TAXABLE') remainingGrossNeed.TAXABLE -= withdrawFromPool;
           else if (mappedType === 'ROTH') remainingGrossNeed.ROTH -= withdrawFromPool;
           else if (mappedType === 'CASH') remainingGrossNeed.CASH -= withdrawFromPool;
           else {
              remainingGrossNeed.TAXABLE = 0; remainingGrossNeed.PRE_TAX = 0; remainingGrossNeed.ROTH = 0; remainingGrossNeed.CASH = 0;
           }
        }
      }
      
      const totalRemainingGross = remainingGrossNeed.PRE_TAX + remainingGrossNeed.TAXABLE + remainingGrossNeed.ROTH + remainingGrossNeed.CASH;
      if (totalRemainingGross > 0) {
        const pool = eligibleDrawdownAssets.filter(a => a.value > 0);
        const poolValue = pool.reduce((sum, a) => sum + a.value, 0);
        if (poolValue > 0) {
           const withdrawFromLiq = Math.min(poolValue, totalRemainingGross);
           const pullFactor = withdrawFromLiq / poolValue;
           pool.forEach(a => {
             a.value -= (a.value * pullFactor);
           });
           withdrawnTaxable += withdrawFromLiq; 
        }
      }
    }

    const balanceAfterGrowth = currentAssets.reduce((sum, a) => sum + a.value, 0);
    const estimatedTaxDrag = taxOutput.totalTaxOwed + ((pensionIncome + rrbIncome + otherIncome + currentFutureIncome) * 0.15);
    
    // Deduct tax drag
    if (balanceAfterGrowth > 0 && estimatedTaxDrag > 0) {
      let remainingTaxDrag = estimatedTaxDrag;
      
      // 1. Attempt to deduct from taxable accounts first
      const taxableAssets = currentAssets.filter(a => a.assetType === "TAXABLE");
      for (const a of taxableAssets) {
        if (remainingTaxDrag <= 0) break;
        if (a.value > 0) {
          const deduction = Math.min(a.value, remainingTaxDrag);
          a.value -= deduction;
          remainingTaxDrag -= deduction;
        }
      }
      
      // 2. If there is still tax drag remaining, deduct proportionally from all remaining assets as a fallback
      if (remainingTaxDrag > 0) {
        const remainingBalance = currentAssets.reduce((sum, a) => sum + a.value, 0);
        if (remainingBalance > 0) {
          const factor = Math.max(0, (remainingBalance - remainingTaxDrag) / remainingBalance);
          currentAssets.forEach(a => {
             a.value *= factor;
          });
        }
      }
    }
    
    const finalBalance = currentAssets.reduce((sum, a) => sum + a.value, 0);
    
    // Abstract bucket growth and refill logic matching the portfolio's net changes
    if (use3Bucket) {
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
       const b1TargetMultiplier = activePhase?.cashBufferMultiplier ?? payload.threeBuckets?.bucket1LiquiditySecuredYears ?? 2.0;
       const b2TargetMultiplier = payload.threeBuckets?.bucket2IncomeSecuredYears || 5;
       const b1Target = stageTargetBudgetNominal * b1TargetMultiplier;
       const b2Target = stageTargetBudgetNominal * b2TargetMultiplier;
       
       // Handle drop in Cash Buffer Target: reallocate excess to Bucket 2/3
       if (bucket1Balance > b1Target) {
          const excess = bucket1Balance - b1Target;
          bucket1Balance -= excess;
          if (bucket2Balance < b2Target) {
             const b2Shortfall = b2Target - bucket2Balance;
             const toBucket2 = Math.min(excess, b2Shortfall);
             bucket2Balance += toBucket2;
             bucket3Balance += (excess - toBucket2);
          } else {
             bucket3Balance += excess;
          }
       }
       
       // Refill Bucket 1 from Bucket 2
       if (bucket1Balance < b1Target) {
          const shortfall = b1Target - bucket1Balance;
          const transfer = Math.min(bucket2Balance, shortfall);
          bucket2Balance -= transfer;
          bucket1Balance += transfer;
       }
       
       // Refill Bucket 1 & 2 from Bucket 3 (strictly halted during negative market years)
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

    // Calculate categorical nominal and real totals for dumb UI rendering
    let cashNominal = 0;
    let taxableNominal = 0;
    let preTaxNominal = 0;
    let rothNominal = 0;

    if (use3Bucket) {
      cashNominal = bucket1Balance;
      taxableNominal = bucket2Balance;

      let rawPreTax = 0;
      let rawRoth = 0;
      currentAssets.forEach(a => {
        if (a.assetType === 'PRE_TAX') rawPreTax += a.value;
        else if (a.assetType === 'ROTH') rawRoth += a.value;
      });

      const totalRawGrowth = rawPreTax + rawRoth;
      if (totalRawGrowth > 0) {
        preTaxNominal = bucket3Balance * (rawPreTax / totalRawGrowth);
        rothNominal = bucket3Balance * (rawRoth / totalRawGrowth);
      } else {
        preTaxNominal = bucket3Balance;
      }
    } else {
      currentAssets.forEach(a => {
        if (a.assetType === 'CASH') cashNominal += a.value;
        else if (a.assetType === 'TAXABLE') taxableNominal += a.value;
        else if (a.assetType === 'PRE_TAX') preTaxNominal += a.value;
        else if (a.assetType === 'ROTH') rothNominal += a.value;
        else taxableNominal += a.value; // Fallback
      });
    }

    const cashReal = cashNominal / cumInflation;
    const taxableReal = taxableNominal / cumInflation;
    const preTaxReal = preTaxNominal / cumInflation;
    const rothReal = rothNominal / cumInflation;

    const finalLiqTarget = currentAssets.find(a => a.isLiquidationTarget);
    const finalDivDest = currentAssets.find(a => a.isDividendDestination);
    const liquidationTargetBalance = finalLiqTarget ? finalLiqTarget.value : 0;
    const dividendDestinationBalance = finalDivDest ? finalDivDest.value : 0;

    chronologicalLedger.push({
      year: currentYear,
      age: Math.round(currentAge * 10) / 10,
      activeStageId: activeStage?.id || 'default',
      nominalWithdrawal: actualNominalWithdrawal,
      realWithdrawal: actualNominalWithdrawal / cumInflation,
      pensionIncome,
      rrbIncome,
      taxDrag: estimatedTaxDrag,
      endingBalance: finalBalance,
      endingBalanceReal: finalBalance / cumInflation,
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
      targetBudgetReal: stageTargetBudgetNominal / cumInflation,
      cumulativeInflation: cumInflation,
      lifestyleShrinking,
      lifestyleGrowing,
      lifestyleFlat,
      bucket1Balance,
      bucket1BalanceReal: bucket1Balance / cumInflation,
      bucket2Balance,
      bucket2BalanceReal: bucket2Balance / cumInflation,
      bucket3Balance,
      bucket3BalanceReal: bucket3Balance / cumInflation,
      expectedGrowth: Math.round(growthAppreciation * 100) / 100,
      expectedYield: Math.round((paidOutYield + reinvestedYield) * 100) / 100,
      changeInNetWorth: Math.round((finalBalance - startAssets) * 100) / 100,
      totalNetWorth: finalBalance,
      cashNominal,
      cashReal,
      taxableNominal,
      taxableReal,
      preTaxNominal,
      preTaxReal,
      rothNominal,
      rothReal,
      liquidationTargetBalance,
      dividendDestinationBalance,
      liquidationTargetSaleAmount,
      liquidationTaxPaid,
      rothConversionAmount: targetRothConversionAmount
    });
    
    cumInflation *= (1 + payload.inflationRate);
  }
  
  return chronologicalLedger;
}
export interface SpecificTaxLot {
  id: string;
  shares: number;
  costBasisPerShare: number;
  currentPrice: number;
  acquisitionDate: string;
  isTargetConcentratedPosition: boolean;
}

export interface DPOptimizationState {
  age: number;
  preTaxBalance: number;
  rothBalance: number;
  taxableLots: SpecificTaxLot[];
}

export interface DPOptimizationParams {
  startAge?: number;
  endAge: number;
  rrbTier1Benefits: number;
  baseOrdinaryIncome: number;
  guytonKlingerTarget: number;
  discountRate: number;
  rothConversionStartAge?: number;
  stockLiquidationStartAge?: number;
  rothMarginalBrackets?: { startYear: number; endYear: number; bracket: number; }[];
}

export interface DPOptimalPath {
  utility: number;
  rothConversionAmount: number;
  lotsSold: { id: string, sharesSold: number }[];
  taxesPaid: number;
}

// State discretization for memoization (nearest $10k to constrain state space)
function hashState(state: DPOptimizationState): string {
  const round10k = (val: number) => Math.round(val / 10000) * 10000;
  const taxableTotal = state.taxableLots.reduce((sum, lot) => sum + (lot.shares * lot.currentPrice), 0);
  return `${state.age}_${round10k(state.preTaxBalance)}_${round10k(state.rothBalance)}_${round10k(taxableTotal)}`;
}

export function calculateProvisionalIncome(magi: number, rrbTier1: number): { provisionalIncome: number, taxableRRB: number } {
  const provisionalIncome = magi + (0.5 * rrbTier1);
  let taxableRRB = 0;
  // 2026 MFJ Thresholds
  const baseAmount = 32000;
  const adjustedBaseAmount = 44000;

  if (provisionalIncome > adjustedBaseAmount) {
    taxableRRB = Math.min(
      0.85 * rrbTier1,
      0.85 * (provisionalIncome - adjustedBaseAmount) + Math.min(0.5 * rrbTier1, 6000)
    );
  } else if (provisionalIncome > baseAmount) {
    taxableRRB = Math.min(
      0.5 * rrbTier1,
      0.5 * (provisionalIncome - baseAmount)
    );
  }
  return { provisionalIncome, taxableRRB };
}

export function checkIrmaaCliff(magi: number): boolean {
  // 2026 est MFJ IRMAA Cliffs
  const IRMAA_TIERS = [206000, 258000, 322000, 386000, 750000];
  // Strict penalty if MAGI lands exactly within a small window over the cliff
  for (const cliff of IRMAA_TIERS) {
    if (magi >= cliff && magi <= cliff + 1000) {
      return true; // IRMAA Cliff triggered
    }
  }
  return false;
}

const dpMemoCache = new Map<string, DPOptimalPath>();

export function calculateOptimalMultiYearTaxPathDP(
  state: DPOptimizationState,
  params: DPOptimizationParams,
  depth: number = 0
): DPOptimalPath {
  // Base Case: Reached End Age
  if (state.age >= params.endAge || depth > 5) {
    const estimatedFutureOrdinaryTax = 0.32; // Model ~25% effective tax rate on future RMDs
    const estimatedFutureCGTax = 0.15; // Model 15% LTCG on future concentrated stock liquidation
    
    const preTaxValue = state.preTaxBalance * (1 - estimatedFutureOrdinaryTax);
    const rothValue = state.rothBalance;
    const taxableValue = state.taxableLots.reduce((s, l) => {
      const gain = Math.max(0, l.currentPrice - l.costBasisPerShare);
      const tax = l.isTargetConcentratedPosition ? gain * estimatedFutureCGTax : 0;
      return s + (l.shares * l.currentPrice) - tax * l.shares;
    }, 0);
    
    return { 
      utility: preTaxValue + rothValue + taxableValue, 
      rothConversionAmount: 0, 
      lotsSold: [], 
      taxesPaid: 0 
    };
  }

  const stateKey = hashState(state);
  if (dpMemoCache.has(stateKey)) {
    return dpMemoCache.get(stateKey)!;
  }

  const STANDARD_DEDUCTION = 30000;
  
  // 3. Tax Lot Liquidation Strategy (Knapsack-like for Guyton-Klinger target)
  // Sort lots by least embedded capital gain (highest cost basis percentage) to minimize tax drag
  const sortedLots = [...state.taxableLots].sort((a, b) => {
    // Prioritize concentrated positions first
    if (a.isTargetConcentratedPosition !== b.isTargetConcentratedPosition) {
      return a.isTargetConcentratedPosition ? -1 : 1;
    }
    const aGain = a.currentPrice - a.costBasisPerShare;
    const bGain = b.currentPrice - b.costBasisPerShare;
    return aGain - bGain;
  });

    const baseOrdinary = params.baseOrdinaryIncome;
  let bestPath: DPOptimalPath = { utility: -Infinity, rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };

  // 1. Determine Target Bracket Rate
  let targetOrdinaryRate = 0.12; 
  const currentYear = new Date().getFullYear() + (state.age - (params.startAge || state.age));
  if (params.rothMarginalBrackets && params.rothMarginalBrackets.length > 0) {
    const activeBracket = params.rothMarginalBrackets.find(b => currentYear >= b.startYear && currentYear <= b.endYear);
    if (activeBracket) {
      targetOrdinaryRate = activeBracket.bracket;
    }
  }
  
  let ordinaryCeiling = 94300; // 12% default
  if (targetOrdinaryRate <= 0.10) ordinaryCeiling = 23200;
  else if (targetOrdinaryRate <= 0.12) ordinaryCeiling = 94300;
  else if (targetOrdinaryRate <= 0.22) ordinaryCeiling = 201050;
  else if (targetOrdinaryRate <= 0.24) ordinaryCeiling = 383900;
  else ordinaryCeiling = 487450;

  // 2. Determine Stock Liquidation Targets (Prioritized)
  let stockTargets = [params.guytonKlingerTarget];
  
  if (!params.stockLiquidationStartAge || state.age >= params.stockLiquidationStartAge) {
    const hasConcentrated = sortedLots.some(l => l.isTargetConcentratedPosition);
    if (hasConcentrated) {
       // Prioritize Liquidation: Assume 0 Roth conversion when calculating max gains
       const maxGains0Percent = Math.max(0, 98900 + STANDARD_DEDUCTION - baseOrdinary);
       let currentGain = 0;
       let currentLiquidity = 0;
       for (const lot of sortedLots) {
          if (!lot.isTargetConcentratedPosition) continue;
          const gainRatio = Math.max(0, lot.currentPrice - lot.costBasisPerShare) / lot.currentPrice;
          if (gainRatio === 0) {
              currentLiquidity += lot.shares * lot.currentPrice;
          } else {
              const remainingGain = maxGains0Percent - currentGain;
              if (remainingGain <= 0) break;
              const maxSharesForGain = remainingGain / (lot.currentPrice - lot.costBasisPerShare);
              const sharesToSell = Math.min(lot.shares, maxSharesForGain);
              currentGain += sharesToSell * (lot.currentPrice - lot.costBasisPerShare);
              currentLiquidity += sharesToSell * lot.currentPrice;
          }
       }
       stockTargets.push(Math.max(params.guytonKlingerTarget, currentLiquidity));
    }
  } else {
    stockTargets = [0];
  }
  
  stockTargets = Array.from(new Set(stockTargets.map(amt => Math.floor(amt)))).sort((a, b) => a - b);

  // 3. Evaluate each Stock Target
  for (const effectiveTarget of stockTargets) {
    let capitalGainsHarvested = 0;
    let liquidityGenerated = 0;
    const lotsSold: { id: string, sharesSold: number }[] = [];
    const nextLots = state.taxableLots.map(l => ({ ...l }));
    
    for (const lot of sortedLots) {
      if (liquidityGenerated >= effectiveTarget) break;
      const lotIndex = nextLots.findIndex(l => l.id === lot.id);
      const liquidityNeeded = effectiveTarget - liquidityGenerated;
      const sharesToSell = Math.min(lot.shares, liquidityNeeded / lot.currentPrice);
      if (sharesToSell > 0) {
        lotsSold.push({ id: lot.id, sharesSold: sharesToSell });
        liquidityGenerated += sharesToSell * lot.currentPrice;
        capitalGainsHarvested += sharesToSell * Math.max(0, lot.currentPrice - lot.costBasisPerShare);
        nextLots[lotIndex].shares -= sharesToSell;
      }
    }

    // 4. Determine Roth Conversion Options (Remaining Space)
    let rothOptions = [0];
    if (!params.rothConversionStartAge || state.age >= params.rothConversionStartAge) {
      const fillStandardDeduction = Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
      
      // Calculate remaining space in the 0% LTCG bracket
      const baselineTaxableOrdinary = Math.max(0, baseOrdinary - STANDARD_DEDUCTION);
      const combinedTaxableSoFar = baselineTaxableOrdinary + capitalGainsHarvested;
      const remainingLTCGCapacity = Math.max(0, 98900 - combinedTaxableSoFar);
      
      // Ordinary limit is bounded by the target ordinary ceiling AND the remaining LTCG capacity
      // so that Roth conversions don't push the prioritized stock sales into the 15% bracket
      const fillTargetBracket = Math.max(0, ordinaryCeiling + STANDARD_DEDUCTION - baseOrdinary);
      const safeRothToProtectLTCG = remainingLTCGCapacity + Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
      const optimalRothConversion = Math.min(fillTargetBracket, safeRothToProtectLTCG);
      
      rothOptions = [0, fillStandardDeduction, optimalRothConversion]
        .map(amt => Math.floor(amt))
        .filter(amt => amt <= state.preTaxBalance && amt >= 0);
      rothOptions = Array.from(new Set(rothOptions)).sort((a, b) => a - b);
    }

    // 5. Evaluate Roth Options for this Stock Target
    for (const rothConversion of rothOptions) {
      // 1. Calculate Ordinary Income & RRB Taxation
      const baseMagi = baseOrdinary + rothConversion;
      const { taxableRRB } = calculateProvisionalIncome(baseMagi, params.rrbTier1Benefits);
      const totalOrdinaryIncome = baseMagi + taxableRRB;
      const taxableOrdinary = Math.max(0, totalOrdinaryIncome - STANDARD_DEDUCTION);

      // 2. Prevent IRMAA Cliff
      if (checkIrmaaCliff(baseMagi)) continue; // Reject path if it trips IRMAA cliff

      // 4. Tax Stacking (LTCG on top of Ordinary)
      const combinedTaxableIncome = taxableOrdinary + capitalGainsHarvested;
      // Calculate Tax Torpedo Avoidance (15% LTCG bracket threshold = $98,900 MFJ 2026)
      let taxPenalty = 0;
      if (combinedTaxableIncome > 98900) {
         if (taxableOrdinary <= 98900) {
           // Pushed into the 15% bracket partially or fully
           taxPenalty += (combinedTaxableIncome - 98900) * 0.15;
         } else {
           // All capital gains are in the 15% bracket
           taxPenalty += capitalGainsHarvested * 0.15;
         }
      }

      // Rough tax estimation
      const taxesPaid = (taxableOrdinary * 0.12) + taxPenalty;
      
      const nextState: DPOptimizationState = {
        age: state.age + 1,
        preTaxBalance: state.preTaxBalance - rothConversion,
        rothBalance: state.rothBalance + rothConversion,
        taxableLots: nextLots.filter(l => l.shares > 0.001)
      };

      // Recurse
      const nextResult = calculateOptimalMultiYearTaxPathDP(nextState, params, depth + 1);
      
      // Discounted Utility
      // We add an early action bonus to mathematically strongly prefer doing Roth conversions 
      // and concentrated stock liquidations as early as possible in the bridge timeline.
      const earlyActionBonus = params.discountRate <= 0 ? (rothConversion * 0.002 + liquidityGenerated * 0.005) * Math.max(0, params.endAge - state.age) : 0;
      const safeDiscount = Math.max(0, params.discountRate || 0);
      const currentUtility = (liquidityGenerated - taxesPaid) + earlyActionBonus + (nextResult.utility / (1 + safeDiscount));

      if (currentUtility > bestPath.utility) {
        bestPath = {
          utility: currentUtility,
          rothConversionAmount: rothConversion,
          lotsSold,
          taxesPaid
        };
      }
    }
  }

  dpMemoCache.set(stateKey, bestPath);
  return bestPath;
}

export function clearDPMemoCache() {
  dpMemoCache.clear();
}


export function generateBridgeOptimizationTimeline(initialState, params) {
  const timeline = [];
  let currentState = { ...initialState };
  // Clone lots
  currentState.taxableLots = currentState.taxableLots.map(l => ({ ...l }));

  for (let age = params.startAge || currentState.age; age <= params.endAge; age++) {
    // Current year optimal path
    const result = calculateOptimalMultiYearTaxPathDP(currentState, { ...params, endAge: params.endAge }, 0);
    
    // Compute the actual liquidation and gains for this year
    let stockLiquidation = 0;
    let capitalGainsHarvested = 0;
    for (const sold of result.lotsSold) {
      const lot = currentState.taxableLots.find(l => l.id === sold.id);
      if (lot) {
        stockLiquidation += sold.sharesSold * lot.currentPrice;
        capitalGainsHarvested += sold.sharesSold * Math.max(0, lot.currentPrice - lot.costBasisPerShare);
        
        // Update state for next iteration
        lot.shares -= sold.sharesSold;
      }
    }
    
    // Remove empty lots
    currentState.taxableLots = currentState.taxableLots.filter(l => l.shares > 0);
    
    // Update pretax/roth balances
    const rothConv = result.rothConversionAmount;
    currentState.preTaxBalance = Math.max(0, currentState.preTaxBalance - rothConv);
    currentState.rothBalance += rothConv;
    currentState.age = age + 1;

    // Estimate effective marginal rate
    const combinedTaxableIncome = Math.max(0, params.baseOrdinaryIncome + rothConv - STANDARD_DEDUCTION_2026_EST) + capitalGainsHarvested;
    const taxesPaid = result.taxesPaid;
    const effectiveMarginalRate = combinedTaxableIncome > 0 ? taxesPaid / combinedTaxableIncome : 0;

    // Estimate isolated taxes for UI display
    // Base standard tax
    const STANDARD_DEDUCTION = 30000;
    const baseMagi = params.baseOrdinaryIncome;
    const baseOrdinary = Math.max(0, baseMagi - STANDARD_DEDUCTION);
    const baseTax = baseOrdinary * 0.12;

    // Tax with Roth
    const rothMagi = params.baseOrdinaryIncome + rothConv;
    const rothOrdinary = Math.max(0, rothMagi - STANDARD_DEDUCTION);
    let rothTax = 0;
    
    // Calculate precise bracket overlay for Roth
    if (rothOrdinary > 383900) {
      rothTax = (rothOrdinary - 383900) * 0.32 + (383900 - 201050) * 0.24 + (201050 - 94300) * 0.22 + (94300) * 0.12;
    } else if (rothOrdinary > 201050) {
      rothTax = (rothOrdinary - 201050) * 0.24 + (201050 - 94300) * 0.22 + (94300) * 0.12;
    } else if (rothOrdinary > 94300) {
      rothTax = (rothOrdinary - 94300) * 0.22 + (94300) * 0.12;
    } else {
      rothTax = rothOrdinary * 0.12;
    }
    const rothOnlyTaxImpact = rothTax - baseTax;

    let cgTaxPenalty = 0;
    const combinedTaxableIncomeForUI = rothOrdinary + capitalGainsHarvested;
    if (combinedTaxableIncomeForUI > 98900) {
       if (rothOrdinary <= 98900) {
         cgTaxPenalty = (combinedTaxableIncomeForUI - 98900) * 0.15;
       } else {
         cgTaxPenalty = capitalGainsHarvested * 0.15;
       }
    }

    timeline.push({
      year: new Date().getFullYear() + (age - (params.startAge || initialState.age)),
      ordinaryIncome: params.baseOrdinaryIncome + rothConv,
      capitalGains: capitalGainsHarvested,
      stockLiquidation: stockLiquidation,
      rothConversion: rothConv,
      effectiveMarginalRate: effectiveMarginalRate,
      estimatedTotalTax: baseTax + rothOnlyTaxImpact + cgTaxPenalty,
      taxFromRoth: rothOnlyTaxImpact,
      taxFromStock: cgTaxPenalty
    });
  }
  
  const startAge = Math.max(
    params.startAge || initialState.age,
    Math.min(
      params.stockLiquidationStartAge !== undefined ? params.stockLiquidationStartAge : (params.startAge || initialState.age),
      params.rothConversionStartAge !== undefined ? params.rothConversionStartAge : (params.startAge || initialState.age)
    )
  );

  return timeline.filter(row => {
    const age = (params.startAge || initialState.age) + (row.year - new Date().getFullYear());
    return age >= startAge;
  });
}
