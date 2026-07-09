import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from './ThemeProvider';
import { useCurrencyMode } from '../contexts/CurrencyModeContext';
import { filterSimulationDataForView } from '../lib/chart-utils';
import { useScenarioManager } from '../contexts/ScenarioContext';
import { Coins, HelpCircle, Layers, ArrowRightLeft, TrendingUp } from 'lucide-react';

interface NonPortfolioIncomeChartProps {
  data: any[];
  displayStartYear?: number;
  displayEndYear?: number;
}

export function NonPortfolioIncomeChart({
  data,
  displayStartYear,
  displayEndYear
}: NonPortfolioIncomeChartProps) {
  const { currentlyViewingScenarioId } = useScenarioManager();
  const { theme } = useTheme();
  const { currencyMode } = useCurrencyMode();

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [showTooltipInfo, setShowTooltipInfo] = useState(false);

  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';
  const isCurrent = currencyMode === 'CURRENT';

  // 1. Filter simulation data according to active time horizon
  const filteredData = useMemo(() => {
    return filterSimulationDataForView(data, displayStartYear, displayEndYear);
  }, [data, displayStartYear, displayEndYear]);

  // 2. Map raw simulation data into chart-compatible structure
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    return filteredData.map((d) => {
      const divisor = isCurrent ? (d.cumulativeInflation || 1) : 1;

      // Extract and normalize income streams
      const giftAmount = (d.giftAmountUsed || 0) / divisor;
      const pensionAmount = (d.pensionIncome || 0) / divisor;
      const rrbAmount = (d.rrbIncome || 0) / divisor;
      const otherAmount = (d.otherIncomeUsed || 0) / divisor;
      const futureAmount = (d.futureIncomeUsed || 0) / divisor;
      const dividendAmount = (d.withdrawnDividends || 0) / divisor;

      // Sum net non-portfolio income streams
      const totalIncome = giftAmount + pensionAmount + rrbAmount + otherAmount + futureAmount + dividendAmount;

      // Active target budget (Current vs Future)
      const targetBudget = isCurrent 
        ? (d.targetBudgetReal ?? (d.targetBudgetNominal / divisor)) 
        : d.targetBudgetNominal;

      // The structural deficit that must be drawn from portfolio
      const incomeGap = Math.max(0, targetBudget - totalIncome);

      // Percentage coverage
      const coveragePercent = targetBudget > 0 ? (totalIncome / targetBudget) * 100 : 100;

      return {
        year: d.year,
        age: d.age,
        pension: Math.round(pensionAmount),
        rrb: Math.round(rrbAmount),
        gifts: Math.round(giftAmount),
        dividends: Math.round(dividendAmount),
        other: Math.round(otherAmount),
        future: Math.round(futureAmount),
        totalIncome: Math.round(totalIncome),
        targetBudget: Math.round(targetBudget),
        incomeGap: Math.round(incomeGap),
        coveragePercent: Math.round(coveragePercent),
        cumulativeInflation: d.cumulativeInflation || 1
      };
    });
  }, [filteredData, isCurrent]);

  // 3. Compute High-Level Aggregated KPI Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { avgGap: 0, avgCoverage: 0, totalNonPortfolio: 0 };

    const totalGap = chartData.reduce((sum, item) => sum + item.incomeGap, 0);
    const avgGap = totalGap / chartData.length;

    const totalCoverage = chartData.reduce((sum, item) => sum + item.coveragePercent, 0);
    const avgCoverage = totalCoverage / chartData.length;

    const totalNonPortfolio = chartData.reduce((sum, item) => sum + item.totalIncome, 0);

    return {
      avgGap,
      avgCoverage,
      totalNonPortfolio
    };
  }, [chartData]);

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 font-medium">
        <Coins className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-2 animate-pulse" />
        <span>Run simulation to visualize Non-Portfolio Income structures.</span>
      </div>
    );
  }

  // 4. Color Palettes and Styling Variables for Themes
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#f4f4f5');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTextColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  // Vibrant, high-contrast, theme-resilient colors for stacks
  const colors = {
    pension: '#8b5cf6', // Violet
    rrb: '#d946ef',     // Fuchsia/Magenta
    gifts: '#06b6d4',   // Cyan
    dividends: '#10b981', // Emerald/Green
    other: '#6366f1',   // Indigo
    future: '#0d9488',  // Teal
    targetBudget: isNightWatch ? '#ff4d4d' : (isDark ? '#f43f5e' : '#e11d48'), // Rose/Red
    incomeGap: isNightWatch ? '#b91c1c' : '#ef4444' // Error highlight red
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Statistical summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-4 transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
            Average Annual "Income Gap"
          </p>
          <p className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(stats.avgGap)}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
            Deficit requiring portfolio withdrawals.
          </p>
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-4 transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
            Average Non-Portfolio Budget Coverage
          </p>
          <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.avgCoverage.toFixed(1)}%
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
            Proportion of expenditure met by structural income.
          </p>
        </div>

        <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-4 transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
            Active Currency Mode
          </p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mt-1 flex items-center gap-1.5">
            {isCurrent ? 'Current Real $' : 'Future Nominal $'}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
            {isCurrent ? 'Inflation adjusted purchasing power' : 'Compounded future dollars'}
          </p>
        </div>
      </div>

      {/* Chart controller options card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/30 dark:bg-zinc-950/10 border border-zinc-150 dark:border-zinc-850/60 rounded-2xl p-3.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-450" />
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-650 dark:text-zinc-300">
            Net Revenue Layering View
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Chart style:</span>
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[32px] flex items-center justify-center gap-1.5 ${
                chartType === 'area'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
              }`}
            >
              Stacked Area
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[32px] flex items-center justify-center gap-1.5 ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
              }`}
            >
              Stacked Bar
            </button>
          </div>
        </div>
      </div>

      {/* Recharts container wrapper */}
      <div className="flex-1 w-full min-h-[400px] flex flex-col relative">
        <ResponsiveContainer key={`${currentlyViewingScenarioId || 'default'}-${chartType}-${currencyMode}`} initialDimension={{ width: 800, height: 400 }} width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
            <XAxis
              dataKey="year"
              type="number"
              domain={['dataMin', 'dataMax']}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              stroke={tickStroke}
              tick={{ fill: textFill }}
              tickFormatter={(val) => `'${val.toString().slice(2)}`}
            />
            <YAxis
              fontSize={11}
              tickLine={false}
              axisLine={false}
              stroke={tickStroke}
              tick={{ fill: textFill }}
              tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
            />

            <Tooltip
              wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const step = payload[0]?.payload;
                  const suffix = isCurrent ? ' (Today\'s Real Value)' : ' (Nominal Future)';
                  const title = `Year: ${label} (Age ${step?.age})${suffix}`;

                  return (
                    <div
                      className="p-3.5 rounded-2xl border shadow-xl transition-colors max-w-sm"
                      style={{
                        borderColor: tooltipBorder,
                        backgroundColor: tooltipBg,
                        color: tooltipTextColor,
                        fontSize: '12px'
                      }}
                    >
                      <p className="font-semibold mb-2" style={{ color: textFill }}>{title}</p>
                      
                      {/* Income Gap Warning highlight */}
                      <div className="mb-3 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 flex flex-col gap-1 font-medium">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-zinc-450 dark:text-zinc-400">Target Budget Requirement:</span>
                          <span className="font-mono font-bold">{formatCurrency(step?.targetBudget)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-zinc-455 dark:text-zinc-400">Total Structural Revenue:</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(step?.totalIncome)}</span>
                        </div>
                        <div className="border-t border-dashed border-zinc-250 dark:border-zinc-800/80 my-1" />
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-bold text-rose-500">Uncovered Income Gap:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-sm">
                            {formatCurrency(step?.incomeGap)}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-normal leading-normal mt-1">
                          Coverage: <strong className="text-zinc-700 dark:text-zinc-300">{step?.coveragePercent}%</strong> of budget met. remaining gap requires portfolio drawdown.
                        </div>
                      </div>

                      {/* Stack details */}
                      <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5">
                        Structural Revenue Breakdowns:
                      </p>
                      <ul className="space-y-1.5">
                        {payload.map((entry: any, index: number) => {
                          if (entry.dataKey === 'targetBudget' || entry.dataKey === 'incomeGap' || entry.dataKey === 'totalIncome') return null;
                          if (entry.value === 0) return null;

                          return (
                            <li key={`item-${index}`} className="flex items-center justify-between gap-6 w-full text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                <span>{entry.name}</span>
                              </div>
                              <span className="font-mono font-medium">
                                {formatCurrency(entry.value)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: textFill }} />

            {/* Layering areas or bars */}
            {chartType === 'area' ? (
              <>
                <Area type="monotone" dataKey="gifts" name="Non-Taxable Gifts" stackId="incomeStack" stroke={colors.gifts} fill={colors.gifts} fillOpacity={0.7} />
                <Area type="monotone" dataKey="dividends" name="Portfolio Dividends" stackId="incomeStack" stroke={colors.dividends} fill={colors.dividends} fillOpacity={0.7} />
                <Area type="monotone" dataKey="pension" name="Standard Pension" stackId="incomeStack" stroke={colors.pension} fill={colors.pension} fillOpacity={0.7} />
                <Area type="monotone" dataKey="rrb" name="Railroad Retirement" stackId="incomeStack" stroke={colors.rrb} fill={colors.rrb} fillOpacity={0.7} />
                <Area type="monotone" dataKey="other" name="Other Income" stackId="incomeStack" stroke={colors.other} fill={colors.other} fillOpacity={0.7} />
                <Area type="monotone" dataKey="future" name="Future Income" stackId="incomeStack" stroke={colors.future} fill={colors.future} fillOpacity={0.7} />
              </>
            ) : (
              <>
                <Bar dataKey="gifts" name="Non-Taxable Gifts" stackId="incomeStack" fill={colors.gifts} />
                <Bar dataKey="dividends" name="Portfolio Dividends" stackId="incomeStack" fill={colors.dividends} />
                <Bar dataKey="pension" name="Standard Pension" stackId="incomeStack" fill={colors.pension} />
                <Bar dataKey="rrb" name="Railroad Retirement" stackId="incomeStack" fill={colors.rrb} />
                <Bar dataKey="other" name="Other Income" stackId="incomeStack" fill={colors.other} />
                <Bar dataKey="future" name="Future Income" stackId="incomeStack" fill={colors.future} />
              </>
            )}

            {/* Target Budget expenditure limit line (thick outline for high contrast separation) */}
            <Line
              type="stepAfter"
              dataKey="targetBudget"
              legendType="none"
              stroke={isDark ? '#09090b' : '#ffffff'}
              strokeWidth={7.5}
              dot={false}
            />
            <Line
              type="stepAfter"
              dataKey="targetBudget"
              name={`Active Target Budget Limit${isCurrent ? ' (Real)' : ' (Nominal)'}`}
              stroke={colors.targetBudget}
              strokeWidth={4}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explainer / Legend of Income Gap */}
      <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-4 flex gap-3.5 items-start">
        <HelpCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Interpreting the "Income Gap"
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The solid <span className="font-semibold text-rose-600 dark:text-rose-400">Rose/Red threshold line</span> represents your target budget limits across successive retirement phases.
            The stacked colored area or bar blocks show cumulative, secure non-portfolio income streams.
            Any white-space gap below the <span className="font-semibold text-rose-600 dark:text-rose-400">rose boundary line</span> and above the stacked colors denotes your structural <strong>Income Gap</strong> — the specific amount that must be financed by withdrawing from your tax-sheltered and taxable portfolio assets.
          </p>
        </div>
      </div>
    </div>
  );
}
