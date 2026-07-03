import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface BridgeOptimizationData {
  year: number;
  ordinaryIncome: number;
  capitalGains: number;
  stockLiquidation: number;
  rothConversion: number;
  effectiveMarginalRate: number;
  estimatedTotalTax?: number;
  taxFromRoth?: number;
  taxFromStock?: number;
}

interface BridgeStrategyTableProps {
  data: BridgeOptimizationData[];
  onApplyYearlyStrategy?: (year: number, stockLiquidation: number, rothConversion: number) => void;
  onUnapplyYearlyStrategy?: (year: number) => void;
  appliedStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];
}

export const BridgeStrategyTable: React.FC<BridgeStrategyTableProps> = ({ 
  data = [], 
  onApplyYearlyStrategy,
  onUnapplyYearlyStrategy,
  appliedStrategies = []
}) => {
  return (
    <div id="bridge-strategy-table-card" className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full overflow-hidden transition-colors">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          Actionable Strategy Ledger
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Review dynamic-programming suggested targets for tax optimization per calendar year.
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Stock Liquidation</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Roth Conversion</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tax (Roth)</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tax (Stock)</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Est. Total Tax</th>
                <th className="py-2 px-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Execute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {data.map((row) => {
                const isApplied = appliedStrategies.some(
                  (a) => a.year === row.year && 
                         Math.abs((a.stockLiquidation || 0) - row.stockLiquidation) < 0.01 && 
                         Math.abs((a.rothConversion || 0) - row.rothConversion) < 0.01
                );

                return (
                  <tr key={row.year} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="py-1 px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.year}</td>
                    <td className="py-1 px-3 text-sm text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      ${row.stockLiquidation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-1 px-3 text-sm text-blue-600 dark:text-blue-400 font-mono font-medium">
                      ${row.rothConversion.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-1 px-3 text-sm text-red-500 dark:text-red-400 font-mono font-medium">
                      {row.taxFromRoth !== undefined ? '$' + row.taxFromRoth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                    </td>
                    <td className="py-1 px-3 text-sm text-amber-500 dark:text-amber-400 font-mono font-medium">
                      {row.taxFromStock !== undefined ? '$' + row.taxFromStock.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                    </td>
                    <td className="py-1 px-3 text-sm text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                      {row.estimatedTotalTax !== undefined ? '$' + row.estimatedTotalTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                    </td>
                    <td className="py-1 px-3 text-center">
                      {isApplied ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 animate-fade-in">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            Applied
                          </span>
                          <button 
                            type="button"
                            onClick={() => onUnapplyYearlyStrategy?.(row.year)}
                            className="px-2 py-1 text-[11px] font-bold bg-zinc-150 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/20 text-zinc-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700/50 rounded-lg transition-colors cursor-pointer min-h-[24px]"
                          >
                            Unapply
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => onApplyYearlyStrategy?.(row.year, row.stockLiquidation, row.rothConversion)}
                          className="min-w-[70px] min-h-[28px] px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <CheckCircle2 size={12} />
                          Apply
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No optimization data available for the selected horizon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
