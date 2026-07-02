const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const newOnMessage = `
    if (e.data.type === 'MULTI_STAGE_DRAWDOWN') {
      const safePayload = sanitizeMultiStageDrawdownPayload(e.data);
      const result = simulateMultiStageDrawdownWorker(safePayload);
      self.postMessage({ success: true, type: 'MULTI_STAGE_DRAWDOWN', scenarioId: (safePayload as any).scenarioId || (e.data as any).scenarioId, data: result });
    } else if (e.data.type === 'BUDGET_SIMULATION') {
      const safePayload = sanitizeBudgetPayload(e.data);
      const result = computeBudgetSimulation(safePayload.expenses || [], safePayload.assets || []);
      self.postMessage({ success: true, type: 'BUDGET_SIMULATION', data: result });
    } else if (e.data.type === 'BRIDGE_OPTIMIZATION') {
      const { state, params, depth, scenarioId } = e.data;
      const result = calculateOptimalMultiYearTaxPathDP(state, params, depth || 0);
      self.postMessage({ success: true, type: 'BRIDGE_OPTIMIZATION', scenarioId, data: result });
    } else {
`;

code = code.replace(`
    if (e.data.type === 'MULTI_STAGE_DRAWDOWN') {
      const safePayload = sanitizeMultiStageDrawdownPayload(e.data);
      const result = simulateMultiStageDrawdownWorker(safePayload);
      self.postMessage({ success: true, type: 'MULTI_STAGE_DRAWDOWN', scenarioId: (safePayload as any).scenarioId || (e.data as any).scenarioId, data: result });
    } else if (e.data.type === 'BUDGET_SIMULATION') {
      const safePayload = sanitizeBudgetPayload(e.data);
      const result = computeBudgetSimulation(safePayload.expenses || [], safePayload.assets || []);
      self.postMessage({ success: true, type: 'BUDGET_SIMULATION', data: result });
    } else {
`, newOnMessage);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
