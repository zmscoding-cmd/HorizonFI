const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(
`export interface DPOptimizationParams {
  endAge: number;
  rrbTier1Benefits: number;
  baseOrdinaryIncome: number;
  guytonKlingerTarget: number;
  discountRate: number;
  rothConversionStartAge?: number;
  stockLiquidationStartAge?: number;
}`,
`export interface DPOptimizationParams {
  startAge?: number;
  endAge: number;
  rrbTier1Benefits: number;
  baseOrdinaryIncome: number;
  guytonKlingerTarget: number;
  discountRate: number;
  rothConversionStartAge?: number;
  stockLiquidationStartAge?: number;
  rothMarginalBrackets?: { startYear: number; endYear: number; bracket: number; }[];
}`
);

const oldRothOptions = `  if (!params.rothConversionStartAge || state.age >= params.rothConversionStartAge) {
    const fillStandardDeduction = Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
    const fill12PercentBracket = Math.max(0, 94300 + STANDARD_DEDUCTION - baseOrdinary);
    // Explicitly add an option to maximize the 22% and 24% brackets for aggressive Roth strategies
    // Cap Roth conversions at the 12% bracket to spread them out over the bridge period 
    // and prevent large single-year tax spikes, while ensuring stock liquidation 
    // (single-stock risk mitigation) is prioritized first in the 0% LTCG space.
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket]
      .map(amt => Math.floor(amt))
      .filter(amt => amt <= state.preTaxBalance && amt >= 0);
    rothOptions = Array.from(new Set(rothOptions)).sort((a, b) => a - b);
  }`;

const newRothOptions = `  if (!params.rothConversionStartAge || state.age >= params.rothConversionStartAge) {
    const currentYear = new Date().getFullYear() + (state.age - (params.startAge || state.age));
    
    let targetBracketRate = 0.12; 
    if (params.rothMarginalBrackets && params.rothMarginalBrackets.length > 0) {
      const activeBracket = params.rothMarginalBrackets.find(b => currentYear >= b.startYear && currentYear <= b.endYear);
      if (activeBracket) {
        targetBracketRate = activeBracket.bracket;
      }
    }
    
    // Map bracket rates to their taxable income ceilings (2026 MFJ projected)
    let bracketCeiling = 94300; // 12% default
    if (targetBracketRate <= 0.10) bracketCeiling = 23200;
    else if (targetBracketRate <= 0.12) bracketCeiling = 94300;
    else if (targetBracketRate <= 0.22) bracketCeiling = 201050;
    else if (targetBracketRate <= 0.24) bracketCeiling = 383900;
    else bracketCeiling = 487450;

    const fillStandardDeduction = Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
    const fillTargetBracket = Math.max(0, bracketCeiling + STANDARD_DEDUCTION - baseOrdinary);
    
    rothOptions = [0, fillStandardDeduction, fillTargetBracket]
      .map(amt => Math.floor(amt))
      .filter(amt => amt <= state.preTaxBalance && amt >= 0);
    rothOptions = Array.from(new Set(rothOptions)).sort((a, b) => a - b);
  }`;

code = code.replace(oldRothOptions, newRothOptions);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
