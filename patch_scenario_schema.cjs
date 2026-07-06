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

const scenarioSchema = {
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

if (!content.includes('const scenarioSchema = {')) {
  content = content.replace('const budgetSchema = {', scenarioSchema + '\nconst budgetSchema = {');
  fs.writeFileSync('src/lib/db.ts', content);
  console.log('Injected scenarioSchema');
}
