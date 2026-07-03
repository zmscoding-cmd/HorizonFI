const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target = `    // Discounted Utility
    // Maximize generated liquidity and future utility while minimizing taxes paid
    const currentUtility = (liquidityGenerated - taxesPaid) + (nextResult.utility / (1 + params.discountRate));`;

const replacement = `    // Discounted Utility
    // We add an early action bonus to mathematically strongly prefer doing Roth conversions 
    // and concentrated stock liquidations as early as possible in the bridge timeline.
    const earlyActionBonus = (rothConversion * 0.05 + liquidityGenerated * 0.02) * Math.max(0, params.endAge - state.age);
    const safeDiscount = Math.max(0, params.discountRate || 0);
    const currentUtility = (liquidityGenerated - taxesPaid) + earlyActionBonus + (nextResult.utility / (1 + safeDiscount));`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/workers/simulation.worker.ts', code);
    console.log("Patched utility calculation successfully");
} else {
    console.log("Target not found!");
}
