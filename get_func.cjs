const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const startIdx = code.indexOf('export function calculateOptimalMultiYearTaxPathDP(');
const endIdx = code.indexOf('export function clearDPMemoCache() {');

if (startIdx !== -1 && endIdx !== -1) {
    const funcCode = code.substring(startIdx, endIdx);
    fs.writeFileSync('target_func.txt', funcCode);
    console.log("Dumped target function");
} else {
    console.log("Could not find boundaries");
}
