import fs from 'fs';
let code = fs.readFileSync('src/components/LongTermPortfolioChart.tsx', 'utf8');

const target1 = `        liquidationTaxPaid: (snapshot.liquidationTaxPaid || 0) / divisor,
        rothConversionAmount: (snapshot.rothConversionAmount || 0) / divisor,`;

const replacement1 = `        liquidationTaxPaid: (snapshot.liquidationTaxPaid || 0) / divisor,
        rothConversionAmount: (snapshot.rothConversionAmount || 0) / divisor,
        excessExternalIncome: (snapshot.excessExternalIncome || 0) / divisor,`;

const target2 = `          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">Actual Withdrawal:</span>
            <span className="font-mono text-rose-500 dark:text-rose-400">-{formatCurrency(dataObj.actualSpend)}</span>
          </div>`;

const replacement2 = `          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">Actual Withdrawal:</span>
            <span className="font-mono text-rose-500 dark:text-rose-400">-{formatCurrency(dataObj.actualSpend)}</span>
          </div>
          
          {dataObj.excessExternalIncome > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-zinc-600 dark:text-zinc-400">Excess Reinvested:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">+{formatCurrency(dataObj.excessExternalIncome)}</span>
            </div>
          )}`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
}
if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
}
fs.writeFileSync('src/components/LongTermPortfolioChart.tsx', code);
console.log('Patched LongTermPortfolioChart successfully.');
