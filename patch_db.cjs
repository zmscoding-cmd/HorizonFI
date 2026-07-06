const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf-8');

// Add scenarioId to plannedExpenseSchema
content = content.replace(
  "userId: { type: 'string', maxLength: 100 },",
  "userId: { type: 'string', maxLength: 100 },\n    scenarioId: { type: 'string', maxLength: 100 },"
);

const newSchemas = `
const fundingAllocationSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    scenarioId: { type: 'string', maxLength: 100 },
    traditional401kIra: { type: 'number' },
    taxableBrokerage: { type: 'number' },
    qualifiedDividends: { type: 'number' },
    rothIra: { type: 'number' },
    nonTaxableGift: { type: 'number' },
    allocationMode: { type: 'string' }
  },
  required: ['id', 'userId', 'scenarioId']
};

const taxEventSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    scenarioId: { type: 'string', maxLength: 100 },
    targetRothConversionAmount: { type: 'number' },
    taxableRebalancingSaleAmount: { type: 'number' },
    rebalancingCapitalGainPercentage: { type: 'number' }
  },
  required: ['id', 'userId', 'scenarioId']
};
`;

if (!content.includes('const fundingAllocationSchema')) {
  content = content.replace('const assetSchema = {', newSchemas + '\nconst assetSchema = {');
}

// add to collectionsToCreate
if (!content.includes('funding_allocations')) {
  content = content.replace(
    /if \(!rxdb\.collections\.planned_expenses\) \{/,
    `if (!rxdb.collections.funding_allocations) {
        collectionsToCreate.funding_allocations = { schema: fundingAllocationSchema };
      }
      if (!rxdb.collections.tax_events) {
        collectionsToCreate.tax_events = { schema: taxEventSchema };
      }
      if (!rxdb.collections.planned_expenses) {`
  );
}

// collectionsToCheck
content = content.replace(
  "const collectionsToCheck = ['scenarios', 'categories', 'budgets', 'assets', 'planned_expenses', 'links'];",
  "const collectionsToCheck = ['scenarios', 'categories', 'budgets', 'assets', 'planned_expenses', 'funding_allocations', 'tax_events', 'links'];"
);

// firestore sync setup
if (!content.includes('funding_allocationsCollection')) {
  content = content.replace(
    "const plannedExpensesCollection = collection(db, `users/${syncUid}/planned_expenses`);",
    "const plannedExpensesCollection = collection(db, `users/${syncUid}/planned_expenses`);\n      const fundingAllocationsCollection = collection(db, `users/${syncUid}/funding_allocations`);\n      const taxEventsCollection = collection(db, `users/${syncUid}/tax_events`);"
  );
}

if (!content.includes('fundingAllocationsReplication')) {
  content = content.replace(
    "const assetsReplication = replicateFirestore({",
    `const fundingAllocationsReplication = replicateFirestore({
        replicationIdentifier: \`firestore-sync-funding_allocations-\${syncUid}\`,
        collection: (rxdb as any).funding_allocations,
        firestore: { projectId: db.app.options.projectId!, database: db, collection: fundingAllocationsCollection },
        pull: {}, push: {}, live: true, retryTime: 1000 * 5
      });
      const taxEventsReplication = replicateFirestore({
        replicationIdentifier: \`firestore-sync-tax_events-\${syncUid}\`,
        collection: (rxdb as any).tax_events,
        firestore: { projectId: db.app.options.projectId!, database: db, collection: taxEventsCollection },
        pull: {}, push: {}, live: true, retryTime: 1000 * 5
      });
      const assetsReplication = replicateFirestore({`
  );
}

// Wait, the user said "Provide a database migration script (or initialization logic) that takes any existing global expenses and assigns them to the 'Baseline' scenario to prevent data loss or orphan records." in the PREVIOUS prompt.
// I should add this initialization logic to db.ts.
const migrationLogic = `
      // MIGRATION: Assign 'Baseline' scenario to any planned_expenses missing a scenarioId
      if (rxdb.collections.planned_expenses) {
        const expensesWithoutScenario = await rxdb.planned_expenses.find({ selector: { scenarioId: { $exists: false } } }).exec();
        for (const exp of expensesWithoutScenario) {
          await exp.patch({ scenarioId: 'Baseline' });
        }
      }
`;
if (!content.includes("expensesWithoutScenario")) {
  content = content.replace(
    "return rxdb;",
    migrationLogic + "\n      return rxdb;"
  );
}

fs.writeFileSync('src/lib/db.ts', content);
