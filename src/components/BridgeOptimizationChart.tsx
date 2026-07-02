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
import { Info } from 'lucide-react';

export interface BridgeOptimizationData {
  year: number;
  ordinaryIncome: number;
  capitalGains: number;
  stockLiquidation: number;
  rothConversion: number;
  effectiveMarginalRate: number;
}

interface BridgeOptimizationChartProps {
  data: BridgeOptimizationData[];
}

export const BridgeOptimizationChart: React.FC<BridgeOptimizationChartProps> = ({ data = [] }) => {
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
    <div id="bridge-optimization-chart-card" className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full transition-colors">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          Multistage Tax Stack Projection
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Visualizing ordinary income stacked below capital gains against key tax thresholds.
        </p>
      </div>

      <div className="w-full h-72 sm:h-80">
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
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            
            {/* Tax Brackets */}
            <ReferenceLine y={ORDINARY_12_LIMIT} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.6} label={{ position: 'insideTopLeft', value: '12% Ord Limit', fill: '#3b82f6', fontSize: 9, fontWeight: 'bold' }} />
            <ReferenceLine y={LTCG_0_LIMIT} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} label={{ position: 'insideTopLeft', value: '0% LTCG Limit', fill: '#10b981', fontSize: 9, fontWeight: 'bold' }} />

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
      <div className="mt-4 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-2.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 transition-colors">
        <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">Tax Stacking Rules:</span> Ordinary income (including Roth conversions) fills the lowest brackets first. Capital gains stack on top of ordinary income. Keep total income under the 0% LTCG threshold ($128,900 for MFJ in 2026) to harvest capital gains tax-free.
        </div>
      </div>
    </div>
  );
};
