const fs = require('fs');
let content = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');
content = content.replace('function computeVarianceAggregation(', 'export function computeVarianceAggregation(');
fs.writeFileSync('src/workers/simulation.worker.ts', content);
