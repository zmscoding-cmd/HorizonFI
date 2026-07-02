const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

// Fix worker onmessage
const onmessageStart = code.indexOf('workerGlobal.onmessage =');
const onmessageEnd = code.indexOf('};', onmessageStart) + 2;

const newOnMessage = `workerGlobal.onmessage = (e: MessageEvent<any>) => {
  try {
    if (!e.data || typeof e.data !== 'object') {
      throw new Error("Invalid request payload. Expected an object.");
    }

    if (e.data.type === 'MULTI_STAGE_DRAWDOWN') {
      const safePayload = sanitizeMultiStageDrawdownPayload(e.data);
      const result = simulateMultiStageDrawdownWorker(safePayload);
      self.postMessage({ success: true, type: 'MULTI_STAGE_DRAWDOWN', scenarioId: (safePayload as any).scenarioId || (e.data as any).scenarioId, data: result });
    } else if (e.data.type === 'BUDGET_SIMULATION') {
      const safePayload = sanitizeBudgetPayload(e.data);
      const result = computeBudgetSimulation(safePayload.expenses || [], safePayload.assets || []);
      self.postMessage({ success: true, type: 'BUDGET_SIMULATION', data: result });
    } else {
      throw new Error('Unsupported or removed simulation type: ' + e.data.type);
    }
  } catch (error: any) {
    self.postMessage({ 
      success: false, 
      type: e.data?.type || 'SIMULATE_DRAWDOWN',
      error: error.message || 'Unknown worker error' 
    });
  }
};`;

code = code.substring(0, onmessageStart) + newOnMessage + code.substring(onmessageEnd);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
