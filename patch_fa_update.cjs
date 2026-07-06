const fs = require('fs');
let lines = fs.readFileSync('src/components/FundingAllocation.tsx', 'utf-8').split('\n');

const newUpdate = `  const updateDatabaseTaxPlanningEvents = async (updates: any) => {
    if (!db || !userId) return;
    try {
      const sanitizedUpdates: any = {};
      if ('targetRothConversionAmount' in updates) {
        sanitizedUpdates.targetRothConversionAmount = Math.max(0, Number(updates.targetRothConversionAmount) || 0);
      }
      if ('taxableRebalancingSaleAmount' in updates) {
        sanitizedUpdates.taxableRebalancingSaleAmount = Math.max(0, Number(updates.taxableRebalancingSaleAmount) || 0);
      }
      if ('rebalancingCapitalGainPercentage' in updates) {
        sanitizedUpdates.rebalancingCapitalGainPercentage = Math.max(0, Math.min(100, Number(updates.rebalancingCapitalGainPercentage) || 0));
      }

      const scenarioId = activeScenario?.id || 'Baseline';
      
      // Update tax events collection
      if (db.tax_events) {
        const existingTax = await db.tax_events.findOne({ selector: { userId, scenarioId } }).exec();
        if (existingTax) {
          await existingTax.patch({ ...sanitizedUpdates, updatedAt: Date.now() });
        } else {
          await db.tax_events.insert({
            id: crypto.randomUUID(),
            userId,
            scenarioId,
            targetRothConversionAmount: 0,
            taxableRebalancingSaleAmount: 0,
            rebalancingCapitalGainPercentage: 0,
            ...sanitizedUpdates,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      } else {
         const existing = await db.budgets.findOne({ selector: { userId } }).exec();
         if (existing) {
           await existing.patch({
             ...sanitizedUpdates,
             updatedAt: Date.now()
           });
         }
      }
      handleRunSimulation();
    } catch (e: any) {
      console.error("Error updating tax events", e);
    }
  };`.split('\n');

// Replace lines 70 to 108 (index 69, delete 39 lines)
lines.splice(69, 39, ...newUpdate);

fs.writeFileSync('src/components/FundingAllocation.tsx', lines.join('\n'));
