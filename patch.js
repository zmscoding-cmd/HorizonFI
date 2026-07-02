const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

// 1. Remove calculateDrawdownProfile
const startCalculateDrawdown = code.indexOf('export function calculateDrawdownProfile');
const endCalculateDrawdown = code.indexOf('// Box-Muller transform');
code = code.substring(0, startCalculateDrawdown) + code.substring(endCalculateDrawdown);

// 2. Remove simulateNetWorthProbabilistic
const startSimulateNetWorth = code.indexOf('export function simulateNetWorthProbabilistic');
const endSimulateNetWorth = code.indexOf('export type MultiStageYearlySnapshot');
code = code.substring(0, startSimulateNetWorth) + code.substring(endSimulateNetWorth);

// 3. Remove NetWorthDatapoint, SimulationRequest, SimulationResult
// Wait, better to just let TypeScript complain and fix it if needed, or remove them specifically.
// Actually, I can use a simpler sed or regex.

fs.writeFileSync('src/workers/simulation.worker.ts', code);
