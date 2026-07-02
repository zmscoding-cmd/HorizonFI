import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { HistoricalDatapointType } from '../lib/db';
import { useTheme } from './ThemeProvider';
import { filterSimulationDataForView } from '../lib/chart-utils';

export interface NetWorthChartProps {
  datapoints: HistoricalDatapointType[];
  currentAge: number;
  displayStartYear?: number;
  displayEndYear?: number;
}

interface Benchmark {
  label: string;
  median: number;
  average: number;
  top10: number;
}

// SCF Survey of Consumer Finances benchmarks based on age cohorts
export function getAgeCohortBenchmarks(age: number): Benchmark {
  if (age < 35) {
    return { label: 'Under 35 Cohort', median: 39000, average: 183000, top10: 650000 };
  } else if (age < 45) {
    return { label: '35-44 Cohort', median: 135000, average: 549000, top10: 1600000 };
  } else if (age < 55) {
    return { label: '45-54 Cohort', median: 247000, average: 975000, top10: 3200000 };
  } else if (age < 65) {
    return { label: '55-64 Cohort', median: 364000, average: 1560000, top10: 4800000 };
  } else if (age < 75) {
    return { label: '65-74 Cohort', median: 410000, average: 1800000, top10: 5500000 };
  } else {
    return { label: '75+ Cohort', median: 345000, average: 1600000, top10: 4500000 };
  }
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ datapoints, currentAge, displayStartYear, displayEndYear }) => {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // Dynamic theme colors for Recharts core boundaries
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#f4f4f5');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  const netWorthStroke = isNightWatch ? '#f87171' : (isDark ? '#ffffff' : '#0f172a');

  // Modular spectrum selection based on maritime night vision constraints
  const colors = isNightWatch 
    ? {
        brokerage: '#ef4444',
        preTax: '#b91c1c',
        roth: '#991b1b',
        other: '#7f1d1d'
      }
    : {
        brokerage: '#2563eb',
        preTax: '#16a34a',
        roth: '#9333ea',
        other: '#71717a'
      };

  // Map and sort datapoints temporally
  const chartData = useMemo(() => {
    if (!datapoints || datapoints.length === 0) return [];

    const mapped = [...datapoints]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(dp => {
        let timestamp: number;
        try {
          timestamp = parseISO(dp.date).getTime();
        } catch {
          // Fallback if parsing fails
          timestamp = Date.now();
        }

        // Segment assets to illustrate Bridge Period capital transition
        let taxableBrokerage = 0;
        let taxAdvantagedPreTax = 0;
        let taxFreeRoth = 0;
        let cashAndOther = 0;

        dp.assets?.forEach(asset => {
          const type = asset.type?.toLowerCase() || '';
          if (type.includes('brokerage') || type === 'taxable_brokerage') {
            taxableBrokerage += asset.value;
          } else if (type.includes('traditional') || type === 'traditional_ira') {
            taxAdvantagedPreTax += asset.value;
          } else if (type.includes('roth') || type === 'roth_ira') {
            taxFreeRoth += asset.value;
          } else {
            cashAndOther += asset.value;
          }
        });

        return {
          timestamp,
          dateLabel: dp.date,
          aggregatedNetWorth: dp.aggregatedNetWorth,
          taxableBrokerage,
          taxAdvantagedPreTax,
          taxFreeRoth,
          cashAndOther,
        };
      });

    return filterSimulationDataForView(mapped, displayStartYear, displayEndYear);
  }, [datapoints, displayStartYear, displayEndYear]);

  // Retrieve current benchmarks based on current age
  const benchmarks = useMemo(() => getAgeCohortBenchmarks(currentAge), [currentAge]);

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <div 
        id="net-worth-empty-state"
        className="flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 text-center text-zinc-500 dark:text-zinc-400 transition-colors"
      >
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">No Net Worth Data points Recorded</p>
        <p className="text-sm mt-1 max-w-sm text-zinc-500 dark:text-zinc-400">Add historical snapshots to visualize your longitudinal asset transitions and relative benchmarks.</p>
      </div>
    );
  }

  return (
    <div id="net-worth-chart-container" className="space-y-6">
      {/* Benchmark Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{benchmarks.label} Median</p>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">{currencyFormatter(benchmarks.median)}</p>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-1">Lower 50% cohort boundary (SCF)</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{benchmarks.label} Average</p>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">{currencyFormatter(benchmarks.average)}</p>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-1">Cohort arithmetic mean (SCF)</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-805/85 bg-linear-to-b from-blue-50/20 dark:from-red-950/15 to-transparent rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{benchmarks.label} Top 10%</p>
          <p className="text-2xl font-black text-blue-800 dark:text-blue-350 tracking-tight mt-1">{currencyFormatter(benchmarks.top10)}</p>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-1">Upper 90th percentile barrier</span>
        </div>
      </div>

      {/* Primary Chart Canvas */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col h-[400px] sm:h-[450px] transition-colors">
        <div className="mb-4">
          <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Capital Sinking and Transition Progression</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Stacked representation of the 'Bridge Period' transition from taxable brokerage to pre-tax IRA accounts.</p>
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer initialDimension={{ width: 800, height: 400 }} width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBrokerage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.brokerage} stopOpacity={isNightWatch ? 0.35 : 0.25}/>
                  <stop offset="95%" stopColor={colors.brokerage} stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorPreTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.preTax} stopOpacity={isNightWatch ? 0.35 : 0.25}/>
                  <stop offset="95%" stopColor={colors.preTax} stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.roth} stopOpacity={isNightWatch ? 0.35 : 0.25}/>
                  <stop offset="95%" stopColor={colors.roth} stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.other} stopOpacity={isNightWatch ? 0.3 : 0.2}/>
                  <stop offset="95%" stopColor={colors.other} stopOpacity={0.02}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
              
              <XAxis 
                dataKey="timestamp" 
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(val) => format(new Date(val), 'MMM yyyy')}
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke={tickStroke}
                tick={{ fill: textFill }}
              />
              
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke={tickStroke}
                tick={{ fill: textFill }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
              />
              
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: `1px solid ${tooltipBorder}`, 
                  boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.45)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                  backgroundColor: tooltipBg,
                  color: tooltipTexColor,
                  fontSize: '11px' 
                }}
                itemStyle={{ color: tooltipTexColor }}
                labelStyle={{ color: textFill }}
                formatter={(value: number) => [currencyFormatter(value), '']}
                labelFormatter={(label) => `Statement Date: ${format(new Date(label), 'PPP')}`}
              />
              
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px', color: textFill }} />

              {/* Stacked Area segments for Bridge Progression */}
              <Area 
                type="monotone" 
                dataKey="taxableBrokerage" 
                name="Taxable Brokerage (Bridge Asset)" 
                stackId="1" 
                stroke={colors.brokerage} 
                strokeWidth={1.5}
                fill="url(#colorBrokerage)" 
              />
              
              <Area 
                type="monotone" 
                dataKey="taxAdvantagedPreTax" 
                name="Traditional / Pre-Tax Assets" 
                stackId="1" 
                stroke={colors.preTax} 
                strokeWidth={1.5}
                fill="url(#colorPreTax)" 
              />

              <Area 
                type="monotone" 
                dataKey="taxFreeRoth" 
                name="Roth / Tax-Free Assets" 
                stackId="1" 
                stroke={colors.roth} 
                strokeWidth={1.5}
                fill="url(#colorRoth)" 
              />

              <Area 
                type="monotone" 
                dataKey="cashAndOther" 
                name="Cash & Other Assets" 
                stackId="1" 
                stroke={colors.other} 
                strokeWidth={1.5}
                fill="url(#colorOther)" 
              />

              {/* Line representing aggregatedNetWorth macro-level trajectory */}
              <Line 
                type="monotone" 
                dataKey="aggregatedNetWorth" 
                name="Aggregated Net Worth" 
                stroke={netWorthStroke} 
                strokeWidth={3} 
                dot={{ r: 3, stroke: netWorthStroke, strokeWidth: 1, fill: isDark ? '#111827' : '#fff' }}
                activeDot={{ r: 6 }} 
              />

              {/* SCF Reference benchmarks (semi-transparent horizontal lines) */}
              <ReferenceLine 
                y={benchmarks.median} 
                stroke={isNightWatch ? '#991b1b' : '#f59e0b'} 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                opacity={0.65}
                label={{ 
                  value: 'SCF Median', 
                  fill: isNightWatch ? '#f87171' : (isDark ? '#d97706' : '#b45309'), 
                  position: 'bottom', 
                  fontSize: 9, 
                  fontWeight: 700 
                }} 
              />
              
              <ReferenceLine 
                y={benchmarks.average} 
                stroke={isNightWatch ? '#7f1d1d' : '#6b7280'} 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                opacity={0.65}
                label={{ 
                  value: 'SCF Average', 
                  fill: isNightWatch ? '#f87171' : (isDark ? '#9ca3af' : '#4b5563'), 
                  position: 'bottom', 
                  fontSize: 9, 
                  fontWeight: 700 
                }} 
              />

              <ReferenceLine 
                y={benchmarks.top10} 
                stroke={isNightWatch ? '#ef4444' : '#dc2626'} 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                opacity={0.65}
                label={{ 
                  value: 'SCF Top 10%', 
                  fill: isNightWatch ? '#fca5a5' : (isDark ? '#f87171' : '#b91c1c'), 
                  position: 'top', 
                  fontSize: 9, 
                  fontWeight: 700 
                }} 
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default NetWorthChart;
