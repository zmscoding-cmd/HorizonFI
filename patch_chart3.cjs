const fs = require('fs');
let code = fs.readFileSync('src/components/LongTermPortfolioChart.tsx', 'utf8');

code = code.replace(
`        liquidationTargetSaleAmount: (snapshot.liquidationTargetSaleAmount || 0) / divisor,
        liquidationTaxPaid: (snapshot.liquidationTaxPaid || 0) / divisor,`,
`        liquidationTargetSaleAmount: (snapshot.liquidationTargetSaleAmount || 0) / divisor,
        liquidationTaxPaid: (snapshot.liquidationTaxPaid || 0) / divisor,
        rothConversionAmount: (snapshot.rothConversionAmount || 0) / divisor,`
);

const oldTransitionBlock = `        {/* Transition Metrics */}
        {hasLiquidationTarget && (dataObj.liquidationTargetSaleAmount > 0 || dataObj.liquidationTaxPaid > 0) && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/85 pt-3 space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Concentrated Liquidation {currencySuffix}
            </div>
            {dataObj.liquidationTargetSaleAmount > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Target Shares Sold:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(dataObj.liquidationTargetSaleAmount)}</span>
              </div>
            )}
            {dataObj.liquidationTaxPaid > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Cap Gains Tax Paid:</span>
                <span className="font-mono text-rose-500 dark:text-rose-400 font-semibold">-{formatCurrency(dataObj.liquidationTaxPaid)}</span>
              </div>
            )}
          </div>
        )}`;

const newTransitionBlock = `        {/* Transition Metrics */}
        {(dataObj.liquidationTargetSaleAmount > 0 || dataObj.liquidationTaxPaid > 0 || dataObj.rothConversionAmount > 0) && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/85 pt-3 space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Strategy Execution {currencySuffix}
            </div>
            {dataObj.liquidationTargetSaleAmount > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Target Shares Sold:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(dataObj.liquidationTargetSaleAmount)}</span>
              </div>
            )}
            {dataObj.liquidationTaxPaid > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Cap Gains Tax Paid:</span>
                <span className="font-mono text-rose-500 dark:text-rose-400 font-semibold">-{formatCurrency(dataObj.liquidationTaxPaid)}</span>
              </div>
            )}
            {dataObj.rothConversionAmount > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Roth Conversion:</span>
                <span className="font-mono text-purple-500 dark:text-purple-400 font-semibold">{formatCurrency(dataObj.rothConversionAmount)}</span>
              </div>
            )}
          </div>
        )}`;

if (code.includes(oldTransitionBlock)) {
  code = code.replace(oldTransitionBlock, newTransitionBlock);
  fs.writeFileSync('src/components/LongTermPortfolioChart.tsx', code);
} else {
  console.log("Could not find Transition Metrics block");
}
