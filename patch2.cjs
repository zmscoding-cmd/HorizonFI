const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

// Rename MultiStageYearlySnapshot array from snapshots to chronologicalLedger
code = code.replace(/const snapshots: MultiStageYearlySnapshot\[\] = \[\];/g, 'const chronologicalLedger: MultiStageYearlySnapshot[] = [];');
code = code.replace(/snapshots\.push\(\{/g, 'chronologicalLedger.push({');
code = code.replace(/return snapshots;/g, 'return chronologicalLedger;');

// Add totalNetWorth to MultiStageYearlySnapshot
code = code.replace(/changeInNetWorth\?: number;/g, 'changeInNetWorth?: number;\n  totalNetWorth: number;');
code = code.replace(/changeInNetWorth: Math.round\(\(finalBalance - startAssets\) \* 100\) \/ 100/g, 'changeInNetWorth: Math.round((finalBalance - startAssets) * 100) / 100,\n      totalNetWorth: finalBalance');

fs.writeFileSync('src/workers/simulation.worker.ts', code);
