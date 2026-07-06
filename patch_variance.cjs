const fs = require('fs');
let content = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

// Insert new types
const types = `
export type ScenarioPayload = {
  scenarioId: string;
  name: string;
  isBaseline: boolean;
  activeTrackingYears: number[];
  budgetTargets: any[]; // Or define more strictly
  taxEvents: any[];
  fundingAllocations: any[];
};

export type VarianceAggregationRequest = {
  type: "VARIANCE_AGGREGATION";
  globalNetWorth: number;
  scenarios: ScenarioPayload[];
  actualExpenses: { year: number; amount: number; categoryId?: string }[];
};

export type VarianceResult = {
  year: number;
  activeScenarioId: string | null;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
};
`;

content = content.replace('export type SimulationRequest = {', types + '\nexport type SimulationRequest = {');

const varianceLogic = `
function computeVarianceAggregation(req: VarianceAggregationRequest): VarianceResult[] {
  // Memory bounds check: limit processing to 100 years max to prevent memory bloat
  const expensesToProcess = req.actualExpenses.slice(0, 10000); 
  const scenarios = req.scenarios.slice(0, 50);

  const results: VarianceResult[] = [];
  
  // Group actuals by year
  const actualsByYear = new Map<number, number>();
  for (const exp of expensesToProcess) {
    if (!exp.year || isNaN(exp.year)) continue;
    actualsByYear.set(exp.year, (actualsByYear.get(exp.year) || 0) + (Number(exp.amount) || 0));
  }

  // Iterate over each year we have actuals for
  for (const [year, actualAmount] of actualsByYear.entries()) {
    // Find the active scenario for this year
    const activeScenario = scenarios.find(s => s.activeTrackingYears && s.activeTrackingYears.includes(year));
    
    let budgetedAmount = 0;
    let activeScenarioId = null;

    if (activeScenario) {
      activeScenarioId = activeScenario.scenarioId;
      // Sum the budget targets for this scenario for this year
      // Assuming budgetTargets have a staticAmount or some calculable value
      budgetedAmount = activeScenario.budgetTargets.reduce((sum, target) => {
        // Simplified sum, can be expanded based on valuationType (Static, Relational)
        const amt = Number(target.staticAmount) || Number(target.annualValue) || 0;
        return sum + amt;
      }, 0);
    }

    results.push({
      year,
      activeScenarioId,
      budgetedAmount,
      actualAmount,
      variance: budgetedAmount - actualAmount
    });
  }

  // Sort chronologically
  results.sort((a, b) => a.year - b.year);
  return results.slice(0, 100); // Decimate/limit output
}
`;

content = content.replace('// Web Worker handler supporting multi-message execution with strict schema validation & input sanitization', varianceLogic + '\n// Web Worker handler supporting multi-message execution with strict schema validation & input sanitization');

const newListener = `    } else if (e.data.type === "VARIANCE_AGGREGATION") {
      const result = computeVarianceAggregation(e.data);
      self.postMessage({
        success: true,
        type: "VARIANCE_AGGREGATION",
        data: result,
      });
`;

content = content.replace('} else if (e.data.type === "BRIDGE_OPTIMIZATION") {', newListener + '    } else if (e.data.type === "BRIDGE_OPTIMIZATION") {');

fs.writeFileSync('src/workers/simulation.worker.ts', content);
console.log('Patched worker.');
