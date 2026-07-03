const fs = require('fs');
let code = fs.readFileSync('src/components/BridgeStrategyTable.tsx', 'utf8');

const targetData = `export interface BridgeOptimizationData {
  year: number;
  ordinaryIncome: number;
  capitalGains: number;
  stockLiquidation: number;
  rothConversion: number;
  effectiveMarginalRate: number;
}`;

const replacementData = `export interface BridgeOptimizationData {
  year: number;
  ordinaryIncome: number;
  capitalGains: number;
  stockLiquidation: number;
  rothConversion: number;
  effectiveMarginalRate: number;
  estimatedTotalTax?: number;
  taxFromRoth?: number;
  taxFromStock?: number;
}`;

const targetThead = `              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Stock Liquidation</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Roth Conversion</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Effective Tax Impact</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Execute</th>
              </tr>`;

const replacementThead = `              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Stock Liquidation</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Roth Conversion</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tax (Roth)</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tax (Stock)</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Est. Total Tax</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Execute</th>
              </tr>`;

const targetRow = `                  <td className="py-3.5 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    {(row.effectiveMarginalRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-center">`;

const replacementRow = `                  <td className="py-3.5 px-4 text-sm text-red-500 dark:text-red-400 font-mono font-medium">
                    {row.taxFromRoth !== undefined ? '$' + row.taxFromRoth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-sm text-amber-500 dark:text-amber-400 font-mono font-medium">
                    {row.taxFromStock !== undefined ? '$' + row.taxFromStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                    {row.estimatedTotalTax !== undefined ? '$' + row.estimatedTotalTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">`;

const targetColSpan = `colSpan={5}`;
const replacementColSpan = `colSpan={7}`;

if (code.includes(targetData) && code.includes(targetThead) && code.includes(targetRow)) {
    code = code.replace(targetData, replacementData);
    code = code.replace(targetThead, replacementThead);
    code = code.replace(targetRow, replacementRow);
    code = code.replace(targetColSpan, replacementColSpan);
    fs.writeFileSync('src/components/BridgeStrategyTable.tsx', code);
    console.log("Table updated successfully.");
} else {
    console.log("Table target not found.");
}
