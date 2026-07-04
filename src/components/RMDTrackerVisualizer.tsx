import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from './ThemeProvider';
import { useCurrencyMode } from '../contexts/CurrencyModeContext';
import { filterSimulationDataForView } from '../lib/chart-utils';
import { TrendingUp, Shield, ArrowUpRight, Percent, Award, AlertCircle } from 'lucide-react';

interface RMDTrackerVisualizerProps {
  data: any[];
  displayStartYear?: number;
  displayEndYear?: number;
}

export function RMDTrackerVisualizer({ data, displayStartYear, displayEndYear }: RMDTrackerVisualizerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'night-watch';
  const { currencyMode } = useCurrencyMode();

  // 1. Process and filter data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const filtered = filterSimulationDataForView(data, displayStartYear, displayEndYear);
    
    return filtered.map((snapshot) => {
      const divisor = currencyMode === 'CURRENT' ? (snapshot.cumulativeInflation || 1) : 1;
      
      const targetBudget = currencyMode === 'CURRENT'
        ? (snapshot.targetBudgetReal ?? (snapshot.targetBudgetNominal ? snapshot.targetBudgetNominal / divisor : 0))
        : (snapshot.targetBudgetNominal ?? 0);
        
      const fixedIncomes = (
        (snapshot.pensionIncome || 0) + 
        (snapshot.rrbIncome || 0) + 
        (snapshot.otherIncomeUsed || 0) + 
        (snapshot.futureIncomeUsed || 0) + 
        (snapshot.giftAmountUsed || 0)
      ) / (currencyMode === 'CURRENT' ? divisor : 1);
      
      const baseBudgetDeficit = Math.max(0, targetBudget - fixedIncomes);
      
      const rmdAmount = (snapshot.rmdAmount || 0) / divisor;
      const rmdUsedForBudget = (snapshot.rmdUsedForBudget || 0) / divisor;
      const rmdExcessReinvested = (snapshot.rmdExcessReinvested || 0) / divisor;
      
      // Estimated tax drag. We model ordinary income tax on pre-tax RMD withdrawals (approx. 22% effective)
      const estimatedRmdTaxDrag = rmdAmount * 0.22;
      
      return {
        year: snapshot.year,
        age: Math.round(snapshot.age),
        targetBudget,
        fixedIncomes,
        baseBudgetDeficit,
        rmdAmount,
        rmdUsedForBudget,
        rmdExcessReinvested,
        estimatedRmdTaxDrag,
      };
    });
  }, [data, displayStartYear, displayEndYear, currencyMode]);

  // 2. Compute aggregate RMD metrics for top KPI cards
  const metrics = useMemo(() => {
    if (processedData.length === 0) {
      return { totalRmd: 0, totalReinvested: 0, rmdYearsCount: 0, peakRmd: 0 };
    }
    
    let totalRmd = 0;
    let totalReinvested = 0;
    let rmdYearsCount = 0;
    let peakRmd = 0;
    
    processedData.forEach((d) => {
      if (d.rmdAmount > 0) {
        totalRmd += d.rmdAmount;
        totalReinvested += d.rmdExcessReinvested;
        rmdYearsCount++;
        if (d.rmdAmount > peakRmd) {
          peakRmd = d.rmdAmount;
        }
      }
    });
    
    return { totalRmd, totalReinvested, rmdYearsCount, peakRmd };
  }, [processedData]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatYAxis = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
    return `$${val}`;
  };

  // Custom styling based on active theme
  const colors = {
    grid: isDark ? 'rgba(63, 63, 70, 0.4)' : 'rgba(228, 228, 231, 0.6)',
    budgetArea: isDark ? 'rgba(82, 82, 91, 0.2)' : 'rgba(212, 212, 216, 0.4)',
    budgetBorder: isDark ? '#71717a' : '#a1a1aa',
    rmdLine: isDark ? '#60a5fa' : '#2563eb',
    excessBar: isDark ? '#10b981' : '#059669',
    text: isDark ? '#a1a1aa' : '#71717a',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#27272a' : '#e4e4e7',
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          No simulation results available. Run the simulation to view RMD tracking metrics.
        </p>
      </div>
    );
  }

  return (
    <div id="rmd-tracker-visualizer" className="space-y-6">
      {/* 1. SECURE 2.0 KPI Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Lifetime RMDs</p>
              <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
                {formatCurrency(metrics.totalRmd)}
              </h4>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Projected Required Minimum Distributions over {metrics.rmdYearsCount} years.
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Excess Reinvested</p>
              <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                {formatCurrency(metrics.totalReinvested)}
              </h4>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            {metrics.totalRmd > 0 ? ((metrics.totalReinvested / metrics.totalRmd) * 100).toFixed(1) : 0}% of lifetime distributions saved.
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Peak Annual RMD</p>
              <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
                {formatCurrency(metrics.peakRmd)}
              </h4>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600 dark:text-purple-400">
              <Award size={18} />
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Maximum single-year required pre-tax payout.
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Est. Tax Drag</p>
              <h4 className="text-2xl font-black text-rose-500 dark:text-rose-400 tracking-tight mt-1">
                {formatCurrency(metrics.totalRmd * 0.22)}
              </h4>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-500 dark:text-rose-400">
              <Percent size={18} />
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Computed at statutory ord. income marginal estimates.
          </div>
        </div>
      </div>

      {/* 2. Recharts Composed Chart Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            Required Minimum Distributions vs. Budget Deficit
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Visualizing the integration of statutory RMDs with the annual budget deficit, showcasing automatic excess reinvestment events.
          </p>
        </div>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis 
                dataKey="year" 
                stroke={colors.text} 
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11, fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke={colors.text} 
                tickFormatter={formatYAxis} 
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11, fontFamily: 'monospace' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-lg text-xs space-y-2">
                      <div className="font-bold border-b border-zinc-100 dark:border-zinc-800 pb-1 text-zinc-900 dark:text-zinc-50">
                        Year {d.year} (Age {d.age})
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-6">
                          <span className="text-zinc-500 dark:text-zinc-400">Base Budget Deficit:</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(d.baseBudgetDeficit)}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-zinc-500 dark:text-zinc-400">Required Distribution (RMD):</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(d.rmdAmount)}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-zinc-500 dark:text-zinc-400">RMD Used for Budget:</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(d.rmdUsedForBudget)}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-zinc-500 dark:text-zinc-400">Excess Reinvested:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(d.rmdExcessReinvested)}</span>
                        </div>
                        <div className="flex justify-between gap-6 border-t border-dashed border-zinc-100 dark:border-zinc-800 pt-1">
                          <span className="text-zinc-500 dark:text-zinc-400">Est. Tax Drag (Ordinary):</span>
                          <span className="font-bold text-rose-500 dark:text-rose-400">{formatCurrency(d.estimatedRmdTaxDrag)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={8}
                style={{ fontSize: 11 }}
              />
              {/* Deficit Base (Muted Area) */}
              <Area 
                type="monotone" 
                dataKey="baseBudgetDeficit" 
                name="Base Budget Deficit" 
                fill={colors.budgetArea} 
                stroke={colors.budgetBorder} 
                strokeWidth={1.5}
                activeDot={false}
              />
              {/* Excess Reinvested Stacked Bar */}
              <Bar 
                dataKey="rmdExcessReinvested" 
                name="Excess RMD Reinvested" 
                fill={colors.excessBar} 
                radius={[4, 4, 0, 0]} 
                barSize={12}
              />
              {/* RMD Requirement Line (Distinct Contrast) */}
              <Line 
                type="monotone" 
                dataKey="rmdAmount" 
                name="Total Statutory RMD" 
                stroke={colors.rmdLine} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Actionable RMD Ledger Data Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Actionable RMD Ledger
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Annual statutory lookup details and exact simulation-driven distributions.
            </p>
          </div>
          <div className="text-xs bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 font-mono font-medium self-start sm:self-auto">
            Mode: {currencyMode === 'CURRENT' ? 'Inflation-Adjusted Real' : 'Nominal'}
          </div>
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3 text-right">Required Distribution</th>
                <th className="px-4 py-3 text-right">Budget Used</th>
                <th className="px-4 py-3 text-right">Excess Reinvested</th>
                <th className="px-4 py-3 text-right">Estimated Tax Drag</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {processedData.filter(d => d.rmdAmount > 0).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400 font-medium font-mono">
                    No active RMD years in the selected projection period.
                  </td>
                </tr>
              ) : (
                processedData.filter(d => d.rmdAmount > 0).map((d) => {
                  const hasRMD = d.rmdAmount > 0;
                  return (
                    <tr 
                      key={d.year} 
                      className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20"
                    >
                      <td className="px-4 py-3.5 font-mono text-zinc-900 dark:text-zinc-100 font-bold">{d.year}</td>
                      <td className="px-4 py-3.5 font-mono">{d.age}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(d.rmdAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(d.rmdUsedForBudget)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono font-bold ${d.rmdExcessReinvested > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {d.rmdExcessReinvested > 0 ? formatCurrency(d.rmdExcessReinvested) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-rose-500">
                        {formatCurrency(d.estimatedRmdTaxDrag)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {d.rmdExcessReinvested > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            Reinvested
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            Budget Met
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
