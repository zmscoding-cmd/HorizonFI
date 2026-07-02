const fs = require('fs');
let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');

// 1. Remove import of runMultiDecadeSimulation
code = code.replace(/import \{ runMultiDecadeSimulation \} from "\.\.\/lib\/temporal-engine";/g, '');

// 2. Remove the runMultiDecadeSimulation call from handleRunSimulation
const runMultiStart = code.indexOf('const results = runMultiDecadeSimulation(config);');
if (runMultiStart !== -1) {
    const runMultiEnd = code.indexOf('// Dispatch to Web Worker', runMultiStart);
    code = code.substring(0, runMultiStart) + code.substring(runMultiEnd);
}

// 3. Remove simulationResults state and references to it.
code = code.replace(/const \[simulationResults, setSimulationResults\] = useState<[^>]+>\(\{\}\);/g, '');
code = code.replace(/setSimulationResults\(newResults\);/g, '');

// 4. Update combinedChartData to use multiStageResults instead of simulationResults.
// Previously:
/*
  const combinedChartData = [];
  if (Object.keys(simulationResults).length > 0) {
    const firstScenarioId = Object.keys(simulationResults)[0];
    const len = simulationResults[firstScenarioId]?.length || 0;
    for (let i = 0; i < len; i++) {
      const dataPoint: any = {
        year: simulationResults[firstScenarioId][i].calendarYear,
        age: simulationResults[firstScenarioId][i].age,
      };
      Object.entries(simulationResults).forEach(([id, res]) => {
...
*/

const oldCombinedStart = code.indexOf('const combinedChartData = [];');
const oldCombinedEnd = code.indexOf('  return (', oldCombinedStart);

const newCombined = `const combinedChartData = [];
  if (Object.keys(multiStageResults).length > 0) {
    const firstScenarioId = Object.keys(multiStageResults)[0];
    const len = multiStageResults[firstScenarioId]?.length || 0;
    for (let i = 0; i < len; i++) {
      const dataPoint: any = {
        year: multiStageResults[firstScenarioId][i].year,
        age: multiStageResults[firstScenarioId][i].age,
      };
      Object.entries(multiStageResults).forEach(([id, res]) => {
        const scenarioName = plan.scenarios?.find((s) => s.id === id)?.name || id;
        if (res[i]) {
          dataPoint[\`\${scenarioName} Balance\`] = Math.round(res[i].totalNetWorth || res[i].endingBalance || 0);
          dataPoint[\`\${scenarioName} Tax Drag\`] = Math.round(res[i].taxDrag || 0);
        }
      });
      combinedChartData.push(dataPoint);
    }
  }

`;

code = code.substring(0, oldCombinedStart) + newCombined + code.substring(oldCombinedEnd);

fs.writeFileSync('src/components/ScenarioBuilder.tsx', code);
