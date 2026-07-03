import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Info, Settings2, CheckCircle2 } from 'lucide-react';

export interface BridgeOptimizationData {
  year: number;
  ordinaryIncome: number;
  capitalGains: number;
  stockLiquidation: number;
  rothConversion: number;
  effectiveMarginalRate: number;
  estimatedTotalTax?: number;
  taxFromBase?: number;
  taxFromRoth?: number;
  taxFromStock?: number;
}

interface BridgeOptimizationDashboardProps {
  data: BridgeOptimizationData[];
  onApplyYearlyStrategy?: (year: number, stockLiquidation: number, rothConversion: number) => void;
}

export const BridgeOptimizationDashboard: React.FC<BridgeOptimizationDashboardProps> = ({ data = [], onApplyYearlyStrategy }) => {
  // 2026 Tax Brackets (MFJ)
  const STANDARD_DEDUCTION = 30000;
  const ORDINARY_12_LIMIT = 94300 + STANDARD_DEDUCTION; // 124,300
  const ORDINARY_22_LIMIT = 201050 + STANDARD_DEDUCTION; // 231,050
  const LTCG_0_LIMIT = 98900 + STANDARD_DEDUCTION; // 128,900

  const maxDomain = useMemo(() => {
    let max = 0;
    data.forEach(d => {
      const total = d.ordinaryIncome + d.capitalGains;
      if (total > max) max = total;
    });
    return Math.max(max, ORDINARY_22_LIMIT) * 1.1;
  }, [data]);

  return (
    <div className="flex flex-col space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Settings2 size={20} className="text-indigo-500" />
          Bridge Period Optimization
        </h3>
      </div>

      {/* Chart Section */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">
          Multistage Tax Stack Projection
        </h4>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
              <XAxis 
                dataKey="year" 
                tick={{ fill: '#71717a', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tickFormatter={(val) => `\$${(val / 1000)}k`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, maxDomain]}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.95)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                labelStyle={{ fontWeight: 'bold', color: '#f4f4f5', marginBottom: '4px' }}
                formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              
              {/* Tax Brackets */}
              <ReferenceLine y={ORDINARY_12_LIMIT} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.5} label={{ position: 'insideTopLeft', value: '12% Ord Limit', fill: '#3b82f6', fontSize: 10 }} />
              <ReferenceLine y={LTCG_0_LIMIT} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} label={{ position: 'insideTopLeft', value: '0% LTCG Limit', fill: '#10b981', fontSize: 10 }} />

              <Area 
                type="monotone" 
                dataKey="ordinaryIncome" 
                name="Ordinary Income" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#bfdbfe" 
                fillOpacity={0.8} 
              />
              <Area 
                type="monotone" 
                dataKey="capitalGains" 
                name="Capital Gains" 
                stackId="1" 
                stroke="#10b981" 
                fill="#a7f3d0" 
                fillOpacity={0.8} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Informational Box */}
        <div className="mt-4 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-2.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">Tax Stacking Rules:</span> Ordinary income fills the lowest brackets first. Capital gains stack on top. Watch the 0% LTCG limit ($128,900 MFJ) to avoid the "Tax Torpedo".
          </div>
        </div>
      </div>

      {/* Actionable Strategy Table */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full overflow-hidden">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">
          Actionable Strategy Ledger
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Stock Liquidation</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rec. Roth Conversion</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Effective Marginal Rate</th>
                <th className="py-3 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Execute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {data.map((row) => (
                <tr key={row.year} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.year}</td>
                  <td className="py-3 px-4 text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    ${row.stockLiquidation.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-blue-600 dark:text-blue-400 font-mono">
                    ${row.rothConversion.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300">
                    {(row.effectiveMarginalRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                     <button 
                       onClick={() => onApplyYearlyStrategy && onApplyYearlyStrategy(row.year, row.stockLiquidation, row.rothConversion)}
                       className="min-w-[44px] min-h-[44px] px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-2">
                       <CheckCircle2 size={14} />
                       Apply
                     </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
}
