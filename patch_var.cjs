const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target = `    let cgTaxPenalty = 0;
    const combinedTaxableIncome = rothOrdinary + capitalGainsHarvested;`;
    
const replacement = `    let cgTaxPenalty = 0;
    const combinedTaxableIncomeForUI = rothOrdinary + capitalGainsHarvested;`;
    
const target2 = `    if (combinedTaxableIncome > 98900) {`;
const replacement2 = `    if (combinedTaxableIncomeForUI > 98900) {`;

const target3 = `cgTaxPenalty = (combinedTaxableIncome - 98900) * 0.15;`;
const replacement3 = `cgTaxPenalty = (combinedTaxableIncomeForUI - 98900) * 0.15;`;

code = code.replace(target, replacement);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
console.log("Patched var duplicate");
