const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

// The replacement in DP method should be combinedTaxableIncome because it's defined on line 2176
// Let's just fix the DP method specifically

code = code.replace(`    const combinedTaxableIncome = taxableOrdinary + capitalGainsHarvested;
    // Calculate Tax Torpedo Avoidance (15% LTCG bracket threshold = $98,900 MFJ 2026)
    let taxPenalty = 0;
    if (combinedTaxableIncomeForUI > 98900) { 
       if (taxableOrdinary <= 98900) {
         // Pushed into the 15% bracket partially or fully
         taxPenalty += (combinedTaxableIncomeForUI - 98900) * 0.15;
       } else {
         // All capital gains are in the 15% bracket
         taxPenalty += capitalGainsHarvested * 0.15;
       }
    }`, `    const combinedTaxableIncome = taxableOrdinary + capitalGainsHarvested;
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
    }`);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
console.log("Patched test error");
