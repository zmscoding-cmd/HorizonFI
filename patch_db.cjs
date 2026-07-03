const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

code = code.replace(
`  bridgeOptimizationEnabled?: boolean;
};`,
`  bridgeOptimizationEnabled?: boolean;
  bridgeStockLiquidationStartYear?: number;
  bridgeRothConversionStartYear?: number;
  bridgeRothMarginalBrackets?: { startYear: number; endYear: number; bracket: number; }[];
};`
);

code = code.replace(
`          stockLiquidationStartYear: { type: 'number' },
          rothConversionStartYear: { type: 'number' }
        }`,
`          stockLiquidationStartYear: { type: 'number' },
          rothConversionStartYear: { type: 'number' },
          bridgeStockLiquidationStartYear: { type: 'number' },
          bridgeRothConversionStartYear: { type: 'number' },
          bridgeRothMarginalBrackets: { 
            type: 'array', 
            items: { 
              type: 'object',
              properties: {
                startYear: { type: 'number' },
                endYear: { type: 'number' },
                bracket: { type: 'number' }
              }
            }
          }
        }`
);

fs.writeFileSync('src/lib/db.ts', code);
