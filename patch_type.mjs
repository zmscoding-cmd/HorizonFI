import fs from 'fs';
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target1 = `  liquidationTaxPaid?: number;
  rothConversionAmount?: number;
};`;

const replacement1 = `  liquidationTaxPaid?: number;
  rothConversionAmount?: number;
  excessExternalIncome?: number;
};`;

const target2 = `      liquidationTargetSaleAmount,
      liquidationTaxPaid,
      rothConversionAmount: targetRothConversionAmount
    });`;

const replacement2 = `      liquidationTargetSaleAmount,
      liquidationTaxPaid,
      rothConversionAmount: targetRothConversionAmount,
      excessExternalIncome
    });`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
}
if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
}
fs.writeFileSync('src/workers/simulation.worker.ts', code);
console.log('Patched worker type successfully.');
