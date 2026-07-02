const fs = require('fs');
const file = 'src/workers/simulation.worker.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /export function calculateOptimalMultiYearTaxPathDP\([\s\S]*?export function clearDPMemoCache/g;

const newFunc = `export function calculateOptimalMultiYearTaxPathDP(
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

  const effectiveTarget = (params.stockLiquidationStartAge && state.age < params.stockLiquidationStartAge) ? 0 : params.guytonKlingerTarget;
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

  // Possible action spaces (Dynamic exact dollar amounts for tax brackets)
  const baseOrdinary = params.baseOrdinaryIncome;
  let maxRothFor0PercentLTCG = 98900 - capitalGainsHarvested + STANDARD_DEDUCTION - baseOrdinary;
  maxRothFor0PercentLTCG = Math.max(0, maxRothFor0PercentLTCG);

  let fillStandardDeduction = Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
  let fill12PercentBracket = Math.max(0, 94300 + STANDARD_DEDUCTION - baseOrdinary);
  
  // We want to evaluate doing nothing, just filling standard deduction, 
  // maximizing 0% LTCG (most optimal tax stacking), and filling up to the 12% ordinary limit.
  let rothConversionOptions = [0, fillStandardDeduction, maxRothFor0PercentLTCG, fill12PercentBracket]
    .map(amt => Math.floor(amt))
    .filter(amt => amt <= state.preTaxBalance && amt >= 0);

  // Remove duplicates and sort
  rothConversionOptions = Array.from(new Set(rothConversionOptions)).sort((a, b) => a - b);

  if (params.rothConversionStartAge && state.age < params.rothConversionStartAge) {
    rothConversionOptions = [0];
  }
  
  let bestPath: DPOptimalPath = { utility: -Infinity, rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };

  for (const rothConversion of rothConversionOptions) {
    // 1. Calculate Ordinary Income & RRB Taxation
    const baseMagi = params.baseOrdinaryIncome + rothConversion;
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
    // Maximize generated liquidity and future utility while minimizing taxes paid
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

export function clearDPMemoCache`;

code = code.replace(regex, newFunc);
fs.writeFileSync(file, code);
