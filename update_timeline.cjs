const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target = `    timeline.push({
      year: new Date().getFullYear() + (age - (params.startAge || initialState.age)),
      ordinaryIncome: params.baseOrdinaryIncome + rothConv,
      capitalGains: capitalGainsHarvested,
      stockLiquidation: stockLiquidation,
      rothConversion: rothConv,
      effectiveMarginalRate: effectiveMarginalRate
    });`;

const replacement = `    // Estimate isolated taxes for UI display
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
    const combinedTaxableIncome = rothOrdinary + capitalGainsHarvested;
    if (combinedTaxableIncome > 98900) {
       if (rothOrdinary <= 98900) {
         cgTaxPenalty = (combinedTaxableIncome - 98900) * 0.15;
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
    });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/workers/simulation.worker.ts', code);
    console.log("Timeline generator updated successfully.");
} else {
    console.log("Timeline target not found.");
}
