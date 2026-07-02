const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const replacement = `    // Calculate Tax Torpedo Avoidance (15% LTCG bracket threshold = $98,900 MFJ 2026)
    let taxPenalty = 0;
    if (combinedTaxableIncome > 98900) {
       if (taxableOrdinary <= 98900) {
         // Pushed into the 15% bracket partially or fully
         taxPenalty += (combinedTaxableIncome - 98900) * 0.15;
       } else {
         // All capital gains are in the 15% bracket
         taxPenalty += capitalGainsHarvested * 0.15;
       }
    }`;

code = code.replace(/\/\/ Calculate Tax Torpedo Avoidance[^]+?taxPenalty \+= \(combinedTaxableIncome - 98900\) \* 0\.15;\n    \}/, replacement);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
