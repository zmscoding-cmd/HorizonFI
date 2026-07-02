import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useTheme } from './ThemeProvider';
import { MultiStageYearlySnapshot } from '../workers/simulation.worker';
import { filterSimulationDataForView } from '../lib/chart-utils';

export interface BucketWaterfallChartProps {
  data: MultiStageYearlySnapshot[];
  displayStartYear?: number;
  displayEndYear?: number;
}

export const BucketWaterfallChart: React.FC<BucketWaterfallChartProps> = ({ data, displayStartYear, displayEndYear }) => {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  const filteredData = useMemo(() => {
    return filterSimulationDataForView(data, displayStartYear, displayEndYear);
  }, [data, displayStartYear, displayEndYear]);

  // Format data for stacked area chart
  const formattedData = useMemo(() => {
    return filteredData.map((d) => ({
      year: d.year,
      label: `${d.year}`,
      bucket1: Math.round(d.bucket1Balance || 0),
      bucket2: Math.round(d.bucket2Balance || 0),
      bucket3: Math.round(d.bucket3Balance || 0),
    }));
  }, [filteredData]);

  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#f4f4f5');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  // Bucket colors matching the configurator (Emerald, Blue, Purple)
  const b1Color = isNightWatch ? '#b91c1c' : '#10b981';
  const b2Color = isNightWatch ? '#7f1d1d' : '#3b82f6';
  const b3Color = isNightWatch ? '#450a0a' : '#8b5cf6';

  const currencyFormatter = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6 transition-colors">
      <div>
        <h3 className="text-lg font-bold tracking-tight mb-1 text-zinc-900 dark:text-zinc-100 night-watch:text-red-500">
          3-Bucket Strategy Waterfall
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 night-watch:text-red-300 font-medium">
          Sequential capital drawdown and automated trailing-year rebalancing mechanics across the active strategy runtime.
        </p>
      </div>

      <div className="flex-1 w-full min-h-[300px] h-[350px]">
        <ResponsiveContainer initialDimension={{ width: 800, height: 400 }} width="100%" height="100%" minHeight={300}>
          <ComposedChart data={formattedData} margin={{ top: 15, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorB1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={b1Color} stopOpacity={isNightWatch ? 0.6 : 0.4}/>
                <stop offset="95%" stopColor={b1Color} stopOpacity={isNightWatch ? 0.1 : 0.05}/>
              </linearGradient>
              <linearGradient id="colorB2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={b2Color} stopOpacity={isNightWatch ? 0.6 : 0.4}/>
                <stop offset="95%" stopColor={b2Color} stopOpacity={isNightWatch ? 0.1 : 0.05}/>
              </linearGradient>
              <linearGradient id="colorB3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={b3Color} stopOpacity={isNightWatch ? 0.6 : 0.4}/>
                <stop offset="95%" stopColor={b3Color} stopOpacity={isNightWatch ? 0.1 : 0.05}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />

            <XAxis 
              dataKey="year" 
              type="number"
              domain={['dataMin', 'dataMax']}
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              stroke={tickStroke}
              tick={{ fill: textFill }}
              tickFormatter={(val) => String(val)}
            />

            <YAxis 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              stroke={tickStroke}
              tick={{ fill: textFill }}
              tickFormatter={currencyFormatter} 
            />

            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: `1px solid ${tooltipBorder}`, 
                backgroundColor: tooltipBg,
                color: tooltipTexColor,
                fontSize: '11px',
                padding: '12px',
                boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.45)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: tooltipTexColor, fontWeight: 600 }}
              labelStyle={{ color: textFill, marginBottom: '6px', paddingBottom: '6px', borderBottom: `1px solid ${gridKeyline}` }}
              labelFormatter={(label) => `Simulation Year: ${label}`}
              formatter={(value: number, name: string) => {
                let displayName = name;
                if (name === 'bucket1') displayName = 'Bucket 1 (Liquidity)';
                if (name === 'bucket2') displayName = 'Bucket 2 (Income)';
                if (name === 'bucket3') displayName = 'Bucket 3 (Growth)';
                
                return [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value), displayName];
              }}
            />

            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '11px', paddingTop: '15px', color: textFill }} 
              formatter={(value) => {
                if (value === 'bucket1') return 'Liquidity';
                if (value === 'bucket2') return 'Income';
                if (value === 'bucket3') return 'Growth';
                return value;
              }}
            />

            <Area 
              type="monotone" 
              dataKey="bucket3" 
              stackId="1"
              stroke={b3Color} 
              fill="url(#colorB3)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="bucket2" 
              stackId="1"
              stroke={b2Color} 
              fill="url(#colorB2)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="bucket1" 
              stackId="1"
              stroke={b1Color} 
              fill="url(#colorB1)" 
              strokeWidth={2}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BucketWaterfallChart;
