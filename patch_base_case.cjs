const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target = `  if (state.age >= params.endAge || depth > 5) {
    return { utility: state.preTaxBalance + state.rothBalance + state.taxableLots.reduce((s, l) => s + l.shares * l.currentPrice, 0), rothConversionAmount: 0, lotsSold: [], taxesPaid: 0 };
  }`;

const replacement = `  if (state.age >= params.endAge || depth > 5) {
    const estimatedFutureOrdinaryTax = 0.25; // Model ~25% effective tax rate on future RMDs
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
  }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/workers/simulation.worker.ts', code);
    console.log("Patched base case successfully");
} else {
    console.log("Target not found!");
}
