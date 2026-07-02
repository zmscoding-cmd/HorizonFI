const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const newLogic = `
export function generateBridgeOptimizationTimeline(initialState, params) {
  const timeline = [];
  let currentState = { ...initialState };
  // Clone lots
  currentState.taxableLots = currentState.taxableLots.map(l => ({ ...l }));

  for (let age = params.startAge || currentState.age; age <= params.endAge; age++) {
    // Current year optimal path
    const result = calculateOptimalMultiYearTaxPathDP(currentState, { ...params, endAge: params.endAge }, 0);
    
    // Compute the actual liquidation and gains for this year
    let stockLiquidation = 0;
    let capitalGainsHarvested = 0;
    for (const sold of result.lotsSold) {
      const lot = currentState.taxableLots.find(l => l.id === sold.id);
      if (lot) {
        stockLiquidation += sold.sharesSold * lot.currentPrice;
        capitalGainsHarvested += sold.sharesSold * Math.max(0, lot.currentPrice - lot.costBasisPerShare);
        
        // Update state for next iteration
        lot.shares -= sold.sharesSold;
      }
    }
    
    // Remove empty lots
    currentState.taxableLots = currentState.taxableLots.filter(l => l.shares > 0);
    
    // Update pretax/roth balances
    const rothConv = result.rothConversionAmount;
    currentState.preTaxBalance = Math.max(0, currentState.preTaxBalance - rothConv);
    currentState.rothBalance += rothConv;
    currentState.age = age + 1;

    // Estimate effective marginal rate
    const combinedTaxableIncome = Math.max(0, params.baseOrdinaryIncome + rothConv - STANDARD_DEDUCTION_2026_EST) + capitalGainsHarvested;
    const taxesPaid = result.taxesPaid;
    const effectiveMarginalRate = combinedTaxableIncome > 0 ? taxesPaid / combinedTaxableIncome : 0;

    timeline.push({
      year: new Date().getFullYear() + (age - (params.startAge || initialState.age)),
      ordinaryIncome: params.baseOrdinaryIncome + rothConv,
      capitalGains: capitalGainsHarvested,
      stockLiquidation: stockLiquidation,
      rothConversion: rothConv,
      effectiveMarginalRate: effectiveMarginalRate
    });
  }
  
  return timeline;
}
`;

code = code + '\n' + newLogic;

code = code.replace(`
    } else if (e.data.type === 'BRIDGE_OPTIMIZATION') {
      const { state, params, depth, scenarioId } = e.data;
      const result = calculateOptimalMultiYearTaxPathDP(state, params, depth || 0);
      self.postMessage({ success: true, type: 'BRIDGE_OPTIMIZATION', scenarioId, data: result });
    } else {
`, `
    } else if (e.data.type === 'BRIDGE_OPTIMIZATION') {
      const { state, params, scenarioId } = e.data;
      clearDPMemoCache(); // Clear cache before full run
      const result = generateBridgeOptimizationTimeline(state, params);
      self.postMessage({ success: true, type: 'BRIDGE_OPTIMIZATION', scenarioId, data: result });
    } else {
`);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
