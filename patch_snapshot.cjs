const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(
`  liquidationTargetSaleAmount?: number;
  liquidationTaxPaid?: number;`,
`  liquidationTargetSaleAmount?: number;
  liquidationTaxPaid?: number;
  rothConversionAmount?: number;`
);

code = code.replace(
`      liquidationTargetSaleAmount,
      liquidationTaxPaid
    });`,
`      liquidationTargetSaleAmount,
      liquidationTaxPaid,
      rothConversionAmount: targetRothConversionAmount
    });`
);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
