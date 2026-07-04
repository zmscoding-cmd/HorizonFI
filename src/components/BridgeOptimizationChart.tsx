import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Line
} from 'recharts';
import { Info, TrendingUp, DollarSign, Percent, ArrowUpRight } from 'lucide-react';

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

interface BridgeOptimizationChartProps {
  data: BridgeOptimizationData[];
  displayStartYear?: number;
  displayEndYear?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const ordIncome = data.ordinaryIncome || 0;
    const capGains = data.capitalGains || 0;
    const totalIncome = ordIncome + capGains;
    const stockLiq = data.stockLiquidation || 0;
    const rothConv = data.rothConversion || 0;
    const effRate = data.effectiveMarginalRate || 0;
    const estTax = data.estimatedTotalTax ?? (totalIncome * effRate);
    const rothTax = data.taxFromRoth || 0;
    const stockTax = data.taxFromStock || 0;
    const baseTax = data.taxFromBase || 0;

    return (
      <div className="p-4 rounded-xl border border-zinc-200/20 bg-zinc-950/95 shadow-xl text-zinc-100 max-w-sm">
        <p className="font-bold text-zinc-200 text-sm border-b border-zinc-800 pb-1.5 mb-2 flex justify-between">
          <span>Year {label}</span>
          <span className="text-indigo-400 font-mono text-xs">Tax Stack Detail</span>
        </p>
        
        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between font-semibold text-zinc-300">
              <span>Total Income Stack:</span>
              <span className="font-mono font-bold">${Math.round(totalIncome).toLocaleString()}</span>
            </div>
            <div className="pl-3 mt-1 space-y-0.5 text-zinc-400">
              <div className="flex justify-between">
                <span>• Ordinary Income (incl. Roth):</span>
                <span className="font-mono">${Math.round(ordIncome).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>• Capital Gains Stacked:</span>
                <span className="font-mono">${Math.round(capGains).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-2">
            <div className="flex justify-between font-semibold text-zinc-300">
              <span>Planned Actions:</span>
            </div>
            <div className="pl-3 mt-1 space-y-0.5 text-zinc-400">
              <div className="flex justify-between">
                <span>• Stock Liquidation:</span>
                <span className="font-mono text-emerald-400">${Math.round(stockLiq).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>• Roth Conversion:</span>
                <span className="font-mono text-blue-400">${Math.round(rothConv).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-2">
            <div className="flex justify-between font-bold text-red-400">
              <span>Estimated Annual Tax:</span>
              <span className="font-mono">${Math.round(estTax).toLocaleString()}</span>
            </div>
            <div className="pl-3 mt-1 space-y-0.5 text-zinc-400">
              <div className="flex justify-between">
                <span>• Baseline Tax (Budget/Income):</span>
                <span className="font-mono text-violet-400">${Math.round(baseTax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>• Tax from Roth:</span>
                <span className="font-mono">${Math.round(rothTax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>• Tax from Stock (LTCG):</span>
                <span className="font-mono">${Math.round(stockTax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-400">
                <span>• Effective Marginal Rate:</span>
                <span className="font-mono">{(effRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {totalIncome > 128900 && (
            <div className="mt-2 p-1.5 rounded bg-amber-950/25 border border-amber-800/30 text-[10px] text-amber-300 leading-tight">
              ⚠️ Income exceeds the 0% LTCG threshold ($128,900 MFJ in 2026). Part of capital gains are taxed at 15%.
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const BridgeOptimizationChart: React.FC<BridgeOptimizationChartProps> = ({ 
  data = [], 
  displayStartYear, 
  displayEndYear 
}) => {
  const [activeTab, setActiveTab] = useState<'stack' | 'tax'>('stack');

  // Filter data based on display timeline limits
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(d => {
      if (displayStartYear && d.year < displayStartYear) return false;
      if (displayEndYear && d.year > displayEndYear) return false;
      return true;
    });
  }, [data, displayStartYear, displayEndYear]);

  // 2026 Tax Brackets (MFJ)
  const STANDARD_DEDUCTION = 30000;
  const ORDINARY_12_LIMIT = 94300 + STANDARD_DEDUCTION; // 124,300
  const ORDINARY_22_LIMIT = 201050 + STANDARD_DEDUCTION; // 231,050
  const LTCG_0_LIMIT = 98900 + STANDARD_DEDUCTION; // 128,900

  const stats = useMemo(() => {
    let totalTax = 0;
    let totalRothTax = 0;
    let totalStockTax = 0;
    let maxMarginalRate = 0;

    filteredData.forEach(d => {
      const tax = d.estimatedTotalTax ?? ((d.ordinaryIncome + d.capitalGains) * d.effectiveMarginalRate);
      totalTax += tax;
      totalRothTax += d.taxFromRoth || 0;
      totalStockTax += d.taxFromStock || 0;
      if (d.effectiveMarginalRate > maxMarginalRate) {
        maxMarginalRate = d.effectiveMarginalRate;
      }
    });

    return {
      totalTax,
      totalRothTax,
      totalStockTax,
      maxMarginalRate
    };
  }, [filteredData]);

  const maxDomain = useMemo(() => {
    let max = 0;
    filteredData.forEach(d => {
      const total = d.ordinaryIncome + d.capitalGains;
      if (total > max) max = total;
    });
    return Math.max(max, ORDINARY_22_LIMIT) * 1.1;
  }, [filteredData, ORDINARY_22_LIMIT]);

  const maxTaxDomain = useMemo(() => {
    let max = 0;
    filteredData.forEach(d => {
      const tax = d.estimatedTotalTax ?? ((d.ordinaryIncome + d.capitalGains) * d.effectiveMarginalRate);
      if (tax > max) max = tax;
    });
    return Math.max(max, 10000) * 1.1;
  }, [filteredData]);

  return (
    <div id="bridge-optimization-chart-card" className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm w-full transition-colors">
      
      {/* Title & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 border-b border-zinc-150 dark:border-zinc-800 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Multistage Tax Stack Projection
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze bracket saturation, roth conversion runway, and tax liability.
          </p>
        </div>
        
        <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('stack')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 cursor-pointer ${
              activeTab === 'stack'
                ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/10'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Income & Brackets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 cursor-pointer ${
              activeTab === 'tax'
                ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/10'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            Annual Tax Drag
          </button>
        </div>
      </div>

      {/* Key Metrics / Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 transition-colors">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <DollarSign size={12} className="text-red-500" />
            Total Est. Taxes
          </div>
          <div className="text-base font-bold text-zinc-800 dark:text-zinc-100 font-mono">
            ${Math.round(stats.totalTax).toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Taxes owed over the display period</p>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 transition-colors">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Percent size={12} className="text-amber-500" />
            Peak Marginal Rate
          </div>
          <div className="text-base font-bold text-zinc-800 dark:text-zinc-100 font-mono">
            {(stats.maxMarginalRate * 100).toFixed(1)}%
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Highest tax rate encountered</p>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 transition-colors">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <ArrowUpRight size={12} className="text-blue-500" />
            Roth Tax Share
          </div>
          <div className="text-base font-bold text-zinc-800 dark:text-zinc-100 font-mono">
            ${Math.round(stats.totalRothTax).toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Taxes paid for Roth conversions</p>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 transition-colors">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <TrendingUp size={12} className="text-emerald-500" />
            Stock Tax Share
          </div>
          <div className="text-base font-bold text-zinc-800 dark:text-zinc-100 font-mono">
            ${Math.round(stats.totalStockTax).toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">LTCG capital gains taxes paid</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'stack' ? (
            <AreaChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
              <XAxis 
                dataKey="year" 
                tick={{ fill: '#71717a', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tickFormatter={(val) => `\$${(val / 1000).toFixed(0)}k`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, maxDomain]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {/* Tax Brackets */}
              <ReferenceLine y={ORDINARY_12_LIMIT} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.6} label={{ position: 'insideTopLeft', value: '12% Ord Limit', fill: '#3b82f6', fontSize: 9, fontWeight: 'bold' }} />
              <ReferenceLine y={LTCG_0_LIMIT} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.6} label={{ position: 'insideTopLeft', value: '0% LTCG Limit', fill: '#10b981', fontSize: 9, fontWeight: 'bold' }} />

              <Area 
                type="monotone" 
                dataKey="ordinaryIncome" 
                name="Ordinary Income (incl. Roth)" 
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
          ) : (
            <ComposedChart data={filteredData} margin={{ top: 20, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
              <XAxis 
                dataKey="year" 
                tick={{ fill: '#71717a', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(val) => `\$${(val / 1000).toFixed(1)}k`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, maxTaxDomain]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                tick={{ fill: '#f59e0b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, Math.max(0.4, stats.maxMarginalRate * 1.2)]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              <Bar 
                yAxisId="left" 
                dataKey="taxFromBase" 
                name="Baseline Tax" 
                stackId="tax" 
                fill="#8b5cf6" 
                fillOpacity={0.8} 
              />
              <Bar 
                yAxisId="left" 
                dataKey="taxFromRoth" 
                name="Tax from Roth Conversion" 
                stackId="tax" 
                fill="#3b82f6" 
                fillOpacity={0.8} 
              />
              <Bar 
                yAxisId="left" 
                dataKey="taxFromStock" 
                name="Tax from Stock Liquidation" 
                stackId="tax" 
                fill="#10b981" 
                fillOpacity={0.8} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="effectiveMarginalRate" 
                name="Effective Marginal Rate" 
                stroke="#f59e0b" 
                strokeWidth={2.5} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }} 
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* Informational Box */}
      <div className="mt-4 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-2.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 transition-colors">
        <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
        {activeTab === 'stack' ? (
          <div>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">How to Read:</span> This stacked area chart displays how different income types stack up against federal tax brackets. **Ordinary Income** (blue) includes base ordinary income plus Roth conversions, filling the lowest brackets first. **Capital Gains** (emerald) stack on top of ordinary income. If the total height of the stack crosses the green **0% LTCG Limit** line ($128,900 for MFJ), the portion above that line triggers a 15% long-term capital gains tax.
          </div>
        ) : (
          <div>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">How to Read:</span> This chart displays the specific annual tax liabilities generated by your planned bridge actions. **Violet bars** represent the baseline taxes owed from your budget and existing income sources. **Blue bars** represent the additional tax paid due to Roth conversions. **Emerald bars** represent capital gains tax incurred from stock liquidations. The **amber line** shows your effective marginal tax rate for each year (mapped to the right axis).
          </div>
        )}
      </div>
    </div>
  );
};
