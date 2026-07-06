const fs = require('fs');
let lines = fs.readFileSync('src/components/FundingAllocation.tsx', 'utf-8').split('\n');

const newQueryLines = `    // Subscribe to tax events
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
      }
    });`.split('\n');

// Replace 43 to 55 (0-indexed 43 to 55)
lines.splice(43, 13, ...newQueryLines);

fs.writeFileSync('src/components/FundingAllocation.tsx', lines.join('\n'));
