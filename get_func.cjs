const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const startIdx = code.indexOf('export function calculateOptimalMultiYearTaxPathDP(');
const endIdx = code.indexOf('dpMemoCache.set(stateKey, bestPath);\n  return bestPath;\n}');

if (startIdx !== -1 && endIdx !== -1) {
    const funcCode = code.substring(startIdx, endIdx + 'dpMemoCache.set(stateKey, bestPath);\n  return bestPath;\n}'.length);
    fs.writeFileSync('target_func.txt', funcCode);
    console.log("Dumped target function to target_func.txt");
} else {
    console.log("Could not find boundaries");
}
