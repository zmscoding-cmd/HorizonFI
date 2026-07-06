const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf-8');

const scenarioSchema = `
export type ScenarioModel = {
  id: string;
  userId: string;
  name: string;
  isBaseline: boolean;
  activeTrackingYears: number[];
  createdAt: number;
  updatedAt: number;
};

export const scenarioSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    userId: { type: 'string', maxLength: 128 },
    name: { type: 'string' },
    isBaseline: { type: 'boolean' },
    activeTrackingYears: {
      type: 'array',
      items: { type: 'number' }
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  },
  required: ['id', 'userId', 'name', 'isBaseline', 'createdAt', 'updatedAt'],
  encrypted: ['name', 'activeTrackingYears']
};
`;

content = content.replace('export const budgetSchema = {', scenarioSchema + '\nexport const budgetSchema = {');

content = content.replace(
  /if \(!rxdb\.collections\.budgets\) \{/,
  `if (!rxdb.collections.scenarios) {
        collectionsToCreate.scenarios = {
          schema: scenarioSchema,
          migrationStrategies: {}
        };
      }
      if (!rxdb.collections.budgets) {`
);

content = content.replace(
  /const collectionsToCheck = \['categories', 'budgets', 'assets', 'planned_expenses', 'links'\];/,
  `const collectionsToCheck = ['scenarios', 'categories', 'budgets', 'assets', 'planned_expenses', 'links'];`
);

const replicationLogic = `
      const scenariosCollection = collection(db, \`users/\${syncUid}/scenarios\`);
      const scenariosReplication = replicateFirestore({
        replicationIdentifier: \`firestore-sync-scenarios-\${syncUid}\`,
        collection: (rxdb as any).scenarios,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: scenariosCollection
        },
        pull: { modifier: (docData) => docData },
        push: { modifier: (docData) => JSON.parse(JSON.stringify(docData)) },
        live: true,
        retryTime: 1000 * 5
      });
`;

content = content.replace(
  /const budgetsReplication = replicateFirestore\(\{/,
  replicationLogic + '\n      const budgetsReplication = replicateFirestore({'
);

content = content.replace(
  /activeReplications = \{/,
  `activeReplications = {
        scenariosReplication,`
);

fs.writeFileSync('src/lib/db.ts', content);
console.log('Patched db.ts with scenarios schema');
