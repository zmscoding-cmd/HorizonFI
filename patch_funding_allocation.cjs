const fs = require('fs');
let content = fs.readFileSync('src/components/FundingAllocation.tsx', 'utf-8');

const oldUpdateTaxEvents = `  const updateDatabaseTaxPlanningEvents = async (updates: any) => {
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

      const existing = await db.budgets.findOne({ selector: { userId } }).exec();
      if (existing) {
        await existing.patch({
          ...sanitizedUpdates,
          updatedAt: Date.now()
        });
      }
    } catch (e: any) {
      console.error("Error updating tax events", e);
    }
  };`;

const newUpdateTaxEvents = `  const updateDatabaseTaxPlanningEvents = async (updates: any) => {
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
         // Fallback if db isn't updated yet
         const existing = await db.budgets.findOne({ selector: { userId } }).exec();
         if (existing) {
           await existing.patch({
             ...sanitizedUpdates,
             updatedAt: Date.now()
           });
         }
      }
    } catch (e: any) {
      console.error("Error updating tax events", e);
    }
  };`;

content = content.replace(oldUpdateTaxEvents, newUpdateTaxEvents);

// Now patch the query
const oldQuery = `    // Subscribe to budget document to get tax events
    const query = db.budgets.findOne({ selector: { userId } });
    const subscription = query.$.subscribe((budgetDoc: any) => {
      if (budgetDoc) {
        setTargetNetExpense(budgetDoc.totalPlaintextAnnual || 0);
        setTaxEvents({
          targetRothConversionAmount: budgetDoc.targetRothConversionAmount || 0,
          taxableRebalancingSaleAmount: budgetDoc.taxableRebalancingSaleAmount || 0,
          rebalancingCapitalGainPercentage: budgetDoc.rebalancingCapitalGainPercentage || 0,
        });
        setLocalRothConversion(String(budgetDoc.targetRothConversionAmount || ''));
        setLocalTaxableSale(String(budgetDoc.taxableRebalancingSaleAmount || ''));
        setLocalCapitalGainPercent(String(budgetDoc.rebalancingCapitalGainPercentage || ''));
      }
    });`;

const newQuery = `    // Subscribe to budget document to get tax events
    const scenarioId = activeScenario?.id || 'Baseline';
    const query = db.tax_events ? db.tax_events.findOne({ selector: { userId, scenarioId } }) : db.budgets.findOne({ selector: { userId } });
    const subscription = query.$.subscribe((budgetDoc: any) => {
      if (budgetDoc) {
        if (db.budgets) {
           db.budgets.findOne({ selector: { userId } }).exec().then((b: any) => {
               if (b) setTargetNetExpense(b.totalPlaintextAnnual || 0);
           });
        }
        setTaxEvents({
          targetRothConversionAmount: budgetDoc.targetRothConversionAmount || 0,
          taxableRebalancingSaleAmount: budgetDoc.taxableRebalancingSaleAmount || 0,
          rebalancingCapitalGainPercentage: budgetDoc.rebalancingCapitalGainPercentage || 0,
        });
        setLocalRothConversion(String(budgetDoc.targetRothConversionAmount || ''));
        setLocalTaxableSale(String(budgetDoc.taxableRebalancingSaleAmount || ''));
        setLocalCapitalGainPercent(String(budgetDoc.rebalancingCapitalGainPercentage || ''));
      }
    });`;

content = content.replace(oldQuery, newQuery);

fs.writeFileSync('src/components/FundingAllocation.tsx', content);
