const fs = require('fs');
let code = fs.readFileSync('target_func.txt', 'utf8');

const targetStr = `  let stockLiquidationTargets = [params.guytonKlingerTarget];
  if (params.stockLiquidationStartAge && state.age >= params.stockLiquidationStartAge) {
    const hasConcentrated = sortedLots.some(l => l.isTargetConcentratedPosition);
    if (hasConcentrated) {
       // max gains before hitting 15% bracket
       const maxGains0Percent = Math.max(0, 98900 + STANDARD_DEDUCTION - params.baseOrdinaryIncome);
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
       stockLiquidationTargets.push(Math.max(params.guytonKlingerTarget, currentLiquidity));
    }
  }

  if (params.stockLiquidationStartAge && state.age < params.stockLiquidationStartAge) {
      stockLiquidationTargets = [0];
  }
  
  stockLiquidationTargets = Array.from(new Set(stockLiquidationTargets.map(amt => Math.floor(amt)))).sort((a, b) => a - b);
  
  let bestPath: DPOptimalPath = { utility: -Infinity, rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };

  for (const effectiveTarget of stockLiquidationTargets) {
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
    
    for (const rothConversion of rothConversionOptions) {`;

const newLogic = `  const baseOrdinary = params.baseOrdinaryIncome;
  let rothOptions = [0];
  if (!params.rothConversionStartAge || state.age >= params.rothConversionStartAge) {
    const fillStandardDeduction = Math.max(0, STANDARD_DEDUCTION - baseOrdinary);
    const fill12PercentBracket = Math.max(0, 94300 + STANDARD_DEDUCTION - baseOrdinary);
    // Explicitly add an option to maximize the 22% and 24% brackets for aggressive Roth strategies
    const fill22PercentBracket = Math.max(0, 201050 + STANDARD_DEDUCTION - baseOrdinary);
    const fill24PercentBracket = Math.max(0, 383900 + STANDARD_DEDUCTION - baseOrdinary);
    
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket, fill22PercentBracket, fill24PercentBracket]
      .map(amt => Math.floor(amt))
      .filter(amt => amt <= state.preTaxBalance && amt >= 0);
    rothOptions = Array.from(new Set(rothOptions)).sort((a, b) => a - b);
  }

  let bestPath: DPOptimalPath = { utility: -Infinity, rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };

  for (const rothConversion of rothOptions) {
    let stockTargets = [params.guytonKlingerTarget];
    
    if (!params.stockLiquidationStartAge || state.age >= params.stockLiquidationStartAge) {
      const hasConcentrated = sortedLots.some(l => l.isTargetConcentratedPosition);
      if (hasConcentrated) {
         // Max gains before hitting 15% bracket, GIVEN the current roth conversion
         // If we are doing a large roth conversion, maxGains0Percent might be 0, which correctly halts stock liquidation
         const maxGains0Percent = Math.max(0, 98900 + STANDARD_DEDUCTION - (baseOrdinary + rothConversion));
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
      }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newLogic);
    
    // In addition, update the base case to assume 32% future RMD tax to heavily favor aggressive Roth conversions
    code = code.replace('const estimatedFutureOrdinaryTax = 0.25;', 'const estimatedFutureOrdinaryTax = 0.32;');
    
    fs.writeFileSync('replacement_func.txt', code);
    console.log("Successfully prepared replacement.");
} else {
    console.log("Target not found!");
}
