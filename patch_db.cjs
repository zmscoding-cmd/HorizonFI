const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

// Add TaxLot type and schema
const taxLotCode = `
export type TaxLot = {
  id: string;
  accountId: string;
  ticker: string;
  shares: number;
  costBasisPerShare: number;
  acquisitionDate: string;
  isTargetConcentratedPosition: boolean;
};

const taxLotSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: true,
  properties: {
    id: { type: 'string', maxLength: 100 },
    accountId: { type: 'string', maxLength: 100 },
    ticker: { type: 'string' },
    shares: { type: 'number' },
    costBasisPerShare: { type: 'number' },
    acquisitionDate: { type: 'string' },
    isTargetConcentratedPosition: { type: 'boolean' }
  },
  required: ['id', 'accountId', 'ticker', 'shares', 'costBasisPerShare', 'acquisitionDate', 'isTargetConcentratedPosition']
};
`;

content = content.replace('const planSchema = {', taxLotCode + '\nconst planSchema = {');

// Update SubScenario type
content = content.replace(
  '  displayEndYear?: number;\n};\n\nexport type PlanType = {',
  '  displayEndYear?: number;\n  stockLiquidationStartYear?: number;\n  rothConversionStartYear?: number;\n};\n\nexport type PlanType = {'
);

// Update planSchema version to 13
content = content.replace('const planSchema = {\n  version: 12,\n', 'const planSchema = {\n  version: 13,\n');

// Add properties to planSchema
content = content.replace(
  "          displayEndYear: { type: 'number' }\n        }\n      }\n    },\n    threeBuckets:",
  "          displayEndYear: { type: 'number' },\n          stockLiquidationStartYear: { type: 'number' },\n          rothConversionStartYear: { type: 'number' }\n        }\n      }\n    },\n    threeBuckets:"
);

// Add migration strategy 13
const migration13 = `
            13: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                // Initialize new start year targets as undefined/blank
                return sc;
              });
              return oldDoc;
            }
          }
`;
content = content.replace('            12: function (oldDoc: any) {\n              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {\n                // Initialize optional display years as undefined / blank\n                return sc;\n              });\n              return oldDoc;\n            }\n          }\n        };\n      }', '            12: function (oldDoc: any) {\n              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {\n                // Initialize optional display years as undefined / blank\n                return sc;\n              });\n              return oldDoc;\n            },' + migration13 + '\n        };\n      }');

// Add tax_lots collection creation
const taxLotsCollection = `
      if (!rxdb.collections.tax_lots) {
        collectionsToCreate.tax_lots = { schema: taxLotSchema };
      }
`;
content = content.replace('      if (!rxdb.collections.categories) collectionsToCreate.categories = { schema: categorySchema };', taxLotsCollection + '      if (!rxdb.collections.categories) collectionsToCreate.categories = { schema: categorySchema };');

fs.writeFileSync('src/lib/db.ts', content);
