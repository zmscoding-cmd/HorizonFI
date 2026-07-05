const fs = require('fs');
const content = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');
const lines = content.split('\n');
let start = lines.findIndex(l => l.includes('export function evaluateMultiBucketTax'));
let end = lines.findIndex((l, i) => i > start && l.startsWith('}'));
console.log(lines.slice(start, start + 50).join('\n'));
