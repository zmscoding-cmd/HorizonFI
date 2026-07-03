const fs = require('fs');
let code = fs.readFileSync('src/components/LongTermPortfolioChart.tsx', 'utf8');

code = code.replace(
`      // Remaining assets grouped into other investments
      const otherAssets = Math.max(0, total - liquidationTarget - dividendDestination);`,
`      const otherTaxable = Math.max(0, taxable - liquidationTarget - dividendDestination);`
);

code = code.replace(
`        OTHER_ASSETS: Math.max(0, otherAssets),`,
`        TAXABLE_OTHER: Math.max(0, otherTaxable),
        PRE_TAX: Math.max(0, preTax),
        ROTH: Math.max(0, roth),
        CASH: Math.max(0, cash),`
);

fs.writeFileSync('src/components/LongTermPortfolioChart.tsx', code);
