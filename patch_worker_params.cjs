const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(
  '  discountRate: number;',
  '  discountRate: number;\n  rothConversionStartAge?: number;\n  stockLiquidationStartAge?: number;'
);

code = code.replace(
  'const rothConversionOptions = [0, 50000, 100000, 150000].filter(amt => amt <= state.preTaxBalance);',
  'let rothConversionOptions = [0, 50000, 100000, 150000].filter(amt => amt <= state.preTaxBalance);\n  if (params.rothConversionStartAge && state.age < params.rothConversionStartAge) rothConversionOptions = [0];'
);

code = code.replace(
  'for (const lot of sortedLots) {\n      if (liquidityGenerated >= params.guytonKlingerTarget) break;',
  'const effectiveTarget = (params.stockLiquidationStartAge && state.age < params.stockLiquidationStartAge) ? 0 : params.guytonKlingerTarget;\n    for (const lot of sortedLots) {\n      if (liquidityGenerated >= effectiveTarget) break;'
);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
