const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

// 1. Remove calculateDrawdownProfile
const startCalculateDrawdown = code.indexOf('export function calculateDrawdownProfile');
const endCalculateDrawdown = code.indexOf('// Box-Muller transform');
if (startCalculateDrawdown !== -1 && endCalculateDrawdown !== -1) {
    code = code.substring(0, startCalculateDrawdown) + code.substring(endCalculateDrawdown);
}

// 2. Remove simulateNetWorthProbabilistic
const startSimulateNetWorth = code.indexOf('export function simulateNetWorthProbabilistic');
const endSimulateNetWorth = code.indexOf('export type MultiStageYearlySnapshot');
if (startSimulateNetWorth !== -1 && endSimulateNetWorth !== -1) {
    code = code.substring(0, startSimulateNetWorth) + code.substring(endSimulateNetWorth);
}

fs.writeFileSync('src/workers/simulation.worker.ts', code);
