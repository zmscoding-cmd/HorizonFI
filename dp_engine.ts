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
  endAge: number;
  rrbTier1Benefits: number;
  baseOrdinaryIncome: number;
  guytonKlingerTarget: number;
  discountRate: number;
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
    return { utility: state.preTaxBalance + state.rothBalance + state.taxableLots.reduce((s, l) => s + l.shares * l.currentPrice, 0), rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };
  }

  const stateKey = hashState(state);
  if (dpMemoCache.has(stateKey)) {
    return dpMemoCache.get(stateKey)!;
  }

  const STANDARD_DEDUCTION = 30000;
  
  // Possible action spaces (Discretized Roth conversions)
  const rothConversionOptions = [0, 50000, 100000, 150000].filter(amt => amt <= state.preTaxBalance);
  
  let bestPath: DPOptimalPath = { utility: -Infinity, rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };

  for (const rothConversion of rothConversionOptions) {
    // 1. Calculate Ordinary Income & RRB Taxation
    const baseMagi = params.baseOrdinaryIncome + rothConversion;
    const { taxableRRB } = calculateProvisionalIncome(baseMagi, params.rrbTier1Benefits);
    const totalOrdinaryIncome = baseMagi + taxableRRB;
    const taxableOrdinary = Math.max(0, totalOrdinaryIncome - STANDARD_DEDUCTION);

    // 2. Prevent IRMAA Cliff
    if (checkIrmaaCliff(baseMagi)) continue; // Reject path if it trips IRMAA cliff

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

    let capitalGainsHarvested = 0;
    let liquidityGenerated = 0;
    const lotsSold: { id: string, sharesSold: number }[] = [];
    const nextLots = state.taxableLots.map(l => ({ ...l }));

    for (const lot of sortedLots) {
      if (liquidityGenerated >= params.guytonKlingerTarget) break;
      const lotIndex = nextLots.findIndex(l => l.id === lot.id);
      
      const liquidityNeeded = params.guytonKlingerTarget - liquidityGenerated;
      const sharesToSell = Math.min(lot.shares, liquidityNeeded / lot.currentPrice);
      
      if (sharesToSell > 0) {
        lotsSold.push({ id: lot.id, sharesSold: sharesToSell });
        liquidityGenerated += sharesToSell * lot.currentPrice;
        capitalGainsHarvested += sharesToSell * Math.max(0, lot.currentPrice - lot.costBasisPerShare);
        
        nextLots[lotIndex].shares -= sharesToSell;
      }
    }

    // 4. Tax Stacking (LTCG on top of Ordinary)
    const combinedTaxableIncome = taxableOrdinary + capitalGainsHarvested;
    // Calculate Tax Torpedo Avoidance (15% LTCG bracket threshold = $98,900 MFJ 2026)
    let taxPenalty = 0;
    if (combinedTaxableIncome > 98900 && taxableOrdinary <= 98900) {
       // Pushed into the 15% bracket
       taxPenalty += (combinedTaxableIncome - 98900) * 0.15;
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
    const currentUtility = (liquidityGenerated - taxesPaid) + (nextResult.utility / (1 + params.discountRate));

    if (currentUtility > bestPath.utility) {
      bestPath = {
        utility: currentUtility,
        rothConversionAmount: rothConversion,
        lotsSold,
        taxesPaid
      };
    }
  }

  dpMemoCache.set(stateKey, bestPath);
  return bestPath;
}

export function clearDPMemoCache() {
  dpMemoCache.clear();
}
