export const POST_TCJA_2026_MFJ_STANDARD_DEDUCTION = 15000; // Estimated projected standard deduction post reversion
export const LTCG_0_PERCENT_LIMIT_MFJ = 94000; // Estimated 2026 limit for 0% bracket
export const RR_BASE_1_MFJ = 32000;
export const RR_BASE_2_MFJ = 44000;

export type TaxBracket = {
  rate: number;
  upperLimit: number;
};

// 2026 Reverted Brackets (Post-TCJA)
export const POST_TCJA_BRACKETS_MFJ: TaxBracket[] = [
  { rate: 0.10, upperLimit: 23000 },
  { rate: 0.15, upperLimit: 94000 },
  { rate: 0.25, upperLimit: 190000 },
  { rate: 0.28, upperLimit: 285000 },
  { rate: 0.33, upperLimit: 495000 },
  { rate: 0.35, upperLimit: 560000 },
  { rate: 0.396, upperLimit: Infinity },
];

/**
 * Calculates Federal Ordinary Income Tax based on Post-TCJA brackets.
 * Assumes Florida residency (0% state income tax).
 */
export function calculateFederalOrdinaryTax(taxableOrdinaryIncome: number): number {
  if (taxableOrdinaryIncome <= 0) return 0;
  
  let tax = 0;
  let previousLimit = 0;
  
  for (const bracket of POST_TCJA_BRACKETS_MFJ) {
    if (taxableOrdinaryIncome > previousLimit) {
      const taxableAtThisRate = Math.min(taxableOrdinaryIncome, bracket.upperLimit) - previousLimit;
      tax += taxableAtThisRate * bracket.rate;
      previousLimit = bracket.upperLimit;
    } else {
      break;
    }
  }
  
  return tax;
}

/**
 * Calculates taxable Railroad Retirement Tier 1 benefits based on the Provisional Income formula.
 */
export function calculateTaxableRRBenefits(
  tier1Benefits: number,
  tier2Benefits: number, // Tier 2 is fully taxable standard pension
  otherMagi: number
): { taxableTier1: number; taxableTier2: number } {
  // Tier 2 is fully taxable as ordinary pension income
  const taxableTier2 = tier2Benefits;
  
  // Provisional Income = MAGI (includes Tier 2) + 50% Tier 1 + non-taxable interest
  const provisionalIncome = otherMagi + tier2Benefits + (0.5 * tier1Benefits);
  
  let taxableTier1 = 0;
  
  if (provisionalIncome > RR_BASE_2_MFJ) {
    // Up to 85% taxable
    const amtOverBase2 = provisionalIncome - RR_BASE_2_MFJ;
    const betweenBases = RR_BASE_2_MFJ - RR_BASE_1_MFJ;
    taxableTier1 = (0.85 * amtOverBase2) + Math.min(0.50 * betweenBases, 0.50 * tier1Benefits);
  } else if (provisionalIncome > RR_BASE_1_MFJ) {
    // Up to 50% taxable
    const amtOverBase1 = Math.min(provisionalIncome - RR_BASE_1_MFJ, 0.50 * tier1Benefits);
    taxableTier1 = 0.50 * amtOverBase1;
  }
  
  // Cap at 85% of total Tier 1
  taxableTier1 = Math.min(taxableTier1, 0.85 * tier1Benefits);
  
  return { taxableTier1, taxableTier2 };
}

/**
 * Computes the optimal Roth Conversion amount from a 401(k) to Roth IRA during zero-earned-income bridge years.
 * Prevents harvested capital gains from spilling out of the 0% LTCG boundary.
 */
export function calculateOptimalRothConversion(
  targetHarvestedCapitalGains: number,
  otherOrdinaryIncome: number,
  standardDeduction: number = POST_TCJA_2026_MFJ_STANDARD_DEDUCTION
): number {
  // Total taxable space at 0% LTCG = LTCG Limit
  // Stack: Ordinary Income (after deductions) sits at the bottom, Capital Gains stack on top.
  // We need: max(0, Taxable Ordinary Income) + targetHarvestedCapitalGains <= LTCG_0_PERCENT_LIMIT_MFJ
  
  const maxTaxableOrdinary = Math.max(0, LTCG_0_PERCENT_LIMIT_MFJ - targetHarvestedCapitalGains);
  
  // Working backward: Total Gross Ordinary Income = maxTaxableOrdinary + standardDeduction
  const maxGrossOrdinary = maxTaxableOrdinary + standardDeduction;
  
  // The available space for Roth Conversion is the remaining allowable ordinary income 
  const rothSpace = maxGrossOrdinary - otherOrdinaryIncome;
  
  return Math.max(0, rothSpace);
}

/**
 * Asset Transition Simulator
 * Models divesting a concentrated single-stock position (UPRR) over a multi-year schedule,
 * targeting the 0% LTCG threshold and reinvesting proceeds into a dividend yield asset (SCHD).
 */
export function simulateAssetTransitionTranche(
  uprrBalance: number,
  uprrCostBasisRate: number, // Ratio of cost to value, e.g. 0.20 for 80% unrealized gain
  expectedOtherOrdinaryIncome: number,
  standardDeduction: number = POST_TCJA_2026_MFJ_STANDARD_DEDUCTION,
  lctg0PercentLimit: number = LTCG_0_PERCENT_LIMIT_MFJ
): { divestAmount: number; capitalGain: number; remainingUprr: number; reinvestToSchd: number; lctgTax: number } {
  // Compute remaining 0% LTCG space available
  const taxableOrdinary = Math.max(0, expectedOtherOrdinaryIncome - standardDeduction);
  const availableLtcg0Space = Math.max(0, lctg0PercentLimit - taxableOrdinary);
  
  // Unrealized gain ratio per dollar divested: 1 - costBasisRate
  const gainRatio = Math.max(0, 1 - uprrCostBasisRate);
  
  // Maximum divesture value to stay strictly within 0% LTCG
  let targetDivestValue = gainRatio > 0 ? availableLtcg0Space / gainRatio : uprrBalance;
  
  // Cap by the actual UPRR balance remaining
  targetDivestValue = Math.min(targetDivestValue, uprrBalance);
  
  const realizedGain = targetDivestValue * gainRatio;
  
  return {
    divestAmount: targetDivestValue,
    capitalGain: realizedGain,
    remainingUprr: Math.max(0, uprrBalance - targetDivestValue),
    reinvestToSchd: targetDivestValue, // 100% of proceeds transitioned to dividend yield asset
    lctgTax: 0 // Mechanically constrained to remain tax-free
  };
}

/**
 * Liquid Buffer Management
 * Drains an 'X years' cash bucket during negative market years to prevent forced equity sales,
 * and refills automatically only during highly positive market years.
 */
export function manageLiquidBuffer(
  cashBucketBalance: number,
  targetBufferCapacity: number, // Target fiat capacity (e.g., 3x annual withdrawal limit)
  marketReturn: number,         // Benchmark return for the year
  requiredWithdrawal: number,   // Calculated gross withdrawal need
  equityPortfolioBalance: number
): {
  newCashBalance: number;
  newEquityBalance: number;
  actualEquitySold: number;
  bufferAction: "drained" | "refilled" | "maintained" | "exhausted";
} {
  let equitySold = 0;
  let newCash = cashBucketBalance;
  let newEquity = equityPortfolioBalance;
  let action: "drained" | "refilled" | "maintained" | "exhausted" = "maintained";

  if (marketReturn < 0) {
    // Sequential drain strategy during negative years
    if (newCash >= requiredWithdrawal) {
      newCash -= requiredWithdrawal;
      action = "drained";
    } else {
      // Cash exhausted, bridging deficit with forced equity sales
      const deficit = requiredWithdrawal - newCash;
      newCash = 0;
      equitySold = deficit;
      newEquity -= deficit;
      action = "exhausted";
    }
  } else {
    // Normal positive year: drain withdrawals from equities
    equitySold = requiredWithdrawal;
    newEquity -= requiredWithdrawal;
    
    // Automatic Refill Guardrail (e.g. >10% Highly Positive Year)
    if (marketReturn > 0.10 && newCash < targetBufferCapacity) {
      const refillAmount = targetBufferCapacity - newCash;
      const refilledFromEquity = Math.min(refillAmount, newEquity);
      
      newCash += refilledFromEquity;
      newEquity -= refilledFromEquity;
      equitySold += refilledFromEquity;
      action = "refilled";
    }
  }
  
  return {
    newCashBalance: Math.max(0, newCash),
    newEquityBalance: Math.max(0, newEquity),
    actualEquitySold: Math.max(0, equitySold),
    bufferAction: action
  };
}
