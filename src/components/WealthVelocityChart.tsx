import React, { useState, useMemo } from 'react';
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
import { useTheme } from './ThemeProvider';
import { Info, TrendingUp, DollarSign, Percent, Zap } from 'lucide-react';

export interface WealthVelocityChartProps {
  initialBalance?: number;
  initialGrowthRate?: number; // as percentage, e.g. 6.0
  initialWithdrawalRate?: number; // as percentage, e.g. 4.5
  initialInflationRate?: number; // as percentage, e.g. 3.0
}

interface Datapoint {
  year: number;
  label: string;
  portfolioBalance: number;
  currentSpendingRate: number;
  adjustedSpending: number;
  velocityStatus: 'Accumulation' | 'Velocity Point' | 'Distribution/Drawdown';
  projectedGrowthDelta: number;
  yearsToNext100k: number;
}

export const WealthVelocityChart: React.FC<WealthVelocityChartProps> = ({
  initialBalance = 1200000,
  initialGrowthRate = 6.0,
  initialWithdrawalRate = 4.5,
  initialInflationRate = 3.0
}) => {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // State sliders for real-time sandbox simulations
  const [balance, setBalance] = useState<number>(initialBalance);
  const [growth, setGrowth] = useState<number>(initialGrowthRate);
  const [withdrawal, setWithdrawal] = useState<number>(initialWithdrawalRate);
  const [inflation, setInflation] = useState<number>(initialInflationRate);
  const [smileIntensity, setSmileIntensity] = useState<number>(45); // percent reduction of spending at age 15

  // Generate 30-year projections incorporating Spending Smile
  const chartData = useMemo<Datapoint[]>(() => {
    const data: Datapoint[] = [];
    let currentBalance = balance;
    const baseGrowth = growth / 100;
    const baseWithdrawal = withdrawal / 100;
    const baseInflation = inflation / 100;
    const baseSmile = smileIntensity / 100;

    const startYear = new Date().getFullYear();

    for (let t = 0; t <= 30; t++) {
      const yearIndex = t;
      const calendarYear = startYear + t;

      // Model the Spencer/Spending Smile curve transition
      // Quadratic curve that peaks at starts/ends, bottoms out at year 15
      const x = t / 30;
      const smileReductionFactor = 4 * x * (1 - x); // 0 at t=0 and t=30, 1.0 at t=15
      const multiplier = 1.0 - baseSmile * smileReductionFactor;

      // Apply modifiers
      const currentSpendingRate = baseWithdrawal * multiplier;
      const adjustedSpending = Math.max(0.015, baseInflation - 0.01) * multiplier;

      // Explicit bounds-checking to guarantee mathematical safety
      const safeSpendingRate = Math.max(0, Math.min(1, currentSpendingRate));
      const safeInflation = Math.max(0, Math.min(1, baseInflation));

      // Calculate status
      let velocityStatus: 'Accumulation' | 'Velocity Point' | 'Distribution/Drawdown';
      if (safeSpendingRate <= 0) {
        velocityStatus = 'Accumulation';
      } else if (safeSpendingRate <= 0.05) {
        velocityStatus = 'Velocity Point';
      } else {
        velocityStatus = 'Distribution/Drawdown';
      }

      // Growth and drawdowns
      const projectedGrowthDelta = (currentBalance * baseGrowth) - (currentBalance * safeSpendingRate);

      // Milestone years calculation
      let yearsToNext100k = Infinity;
      if (projectedGrowthDelta > 0) {
        const nextMilestone = Math.floor(currentBalance / 100000) * 100000 + 100000;
        const distanceToNext100k = nextMilestone - currentBalance || 100000;
        yearsToNext100k = distanceToNext100k / projectedGrowthDelta;
      }

      data.push({
        year: yearIndex,
        label: `${calendarYear}`,
        portfolioBalance: Math.round(currentBalance),
        currentSpendingRate: parseFloat((safeSpendingRate * 100).toFixed(2)),
        adjustedSpending: parseFloat((adjustedSpending * 100).toFixed(2)),
        velocityStatus,
        projectedGrowthDelta: Math.round(projectedGrowthDelta),
        yearsToNext100k: parseFloat(yearsToNext105(yearsToNext100k))
      });

      // Update balance for subsequent periods
      currentBalance = Math.max(0, currentBalance + projectedGrowthDelta);
    }
    return data;
  }, [balance, growth, withdrawal, inflation, smileIntensity]);

  function yearsToNext105(years: number): string {
    if (years === Infinity || isNaN(years) || years < 0) return 'Infinity';
    return years.toFixed(1);
  }

  // Aggregate current metrics
  const currentMetrics = useMemo(() => {
    if (chartData.length === 0) return null;
    const finalPt = chartData[chartData.length - 1];
    const initialPt = chartData[0];
    const isSuccess = finalPt.portfolioBalance >= initialPt.portfolioBalance;
    const averageSpending = chartData.reduce((acc, cur) => acc + cur.currentSpendingRate, 0) / chartData.length;
    
    // Check years with status
    const velocityPointCount = chartData.filter(d => d.velocityStatus === 'Velocity Point').length;

    return {
      isSuccess,
      averageSpending: averageSpending.toFixed(2),
      velocityPointCount,
      finalProduct: finalPt.portfolioBalance,
      delta: finalPt.portfolioBalance - initialPt.portfolioBalance
    };
  }, [chartData]);

  // Design/Theme specifics matching HorizonFI palettes
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#f4f4f5');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  const areaColor = isNightWatch ? '#991b1b' : '#3b82f6';
  const lineColor = isNightWatch ? '#ef4444' : '#10b981';

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const percentFormatter = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Accumulation':
        return 'bg-blue-50 dark:bg-blue-950/35 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/35';
      case 'Velocity Point':
        return 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/35';
      default:
        return 'bg-rose-50 dark:bg-rose-950/35 text-rose-750 dark:text-rose-350 border-rose-100 dark:border-rose-900/35';
    }
  };

  return (
    <div id="wealth-velocity-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Simulation Controllers (Sandbox Sidebar) */}
      <div className="col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-5 flex flex-col gap-6 shadow-sm transition-colors text-zinc-950 dark:text-zinc-50">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
            Velocity Parameters
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Customize multi-decade parameters to model direct spending contractions in real-time.
          </p>
        </div>

        <div className="space-y-5">
          {/* Slider 1: Portfolio Balance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <DollarSign size={14} className="text-zinc-400" />
                Capital Balance
              </span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                {currencyFormatter(balance)}
              </span>
            </div>
            <input
              id="wv-balance-slider"
              type="range"
              min={100000}
              max={5000000}
              step={50000}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400 min-h-[44px]"
            />
          </div>

          {/* Slider 2: Growth Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <TrendingUp size={14} className="text-zinc-400" />
                Annual Growth Rate
              </span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                {growth.toFixed(1)}%
              </span>
            </div>
            <input
              id="wv-growth-slider"
              type="range"
              min={1}
              max={15}
              step={0.1}
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400 min-h-[44px]"
            />
          </div>

          {/* Slider 3: Base Withdrawal Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Percent size={14} className="text-zinc-400" />
                Initial Withdrawal Rate
              </span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                {withdrawal.toFixed(2)}%
              </span>
            </div>
            <input
              id="wv-withdrawal-slider"
              type="range"
              min={0}
              max={15}
              step={0.05}
              value={withdrawal}
              onChange={(e) => setWithdrawal(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400 min-h-[44px]"
            />
          </div>

          {/* Slider 4: Base Inflation Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Zap size={14} className="text-zinc-400" />
                Base Inflation Rate
              </span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                {inflation.toFixed(1)}%
              </span>
            </div>
            <input
              id="wv-inflation-slider"
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={inflation}
              onChange={(e) => setInflation(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400 min-h-[44px]"
            />
          </div>

          {/* Slider 5: Spending Smile Curvature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Info size={14} className="text-zinc-400" />
                Spending Smile Drop
              </span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                -{smileIntensity}%
              </span>
            </div>
            <input
              id="wv-smile-slider"
              type="range"
              min={0}
              max={80}
              step={5}
              value={smileIntensity}
              onChange={(e) => setSmileIntensity(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400 min-h-[44px]"
            />
          </div>
        </div>

        {/* Quick Presets row with min touch target 44x44px */}
        <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 mt-1 space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Retirement Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setWithdrawal(4.0);
                setSmileIntensity(0);
              }}
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-55 dark:hover:bg-zinc-800 transition cursor-pointer text-center"
            >
              Classic 4% Fixed
            </button>
            <button
              onClick={() => {
                setWithdrawal(5.0);
                setSmileIntensity(40);
              }}
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition cursor-pointer text-center"
            >
              5% Spending Smile
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Simulation Graph Area */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6 transition-colors text-zinc-950 dark:text-zinc-50">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-1">
                30-Year Wealth Velocity Projection
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Plotting overall capital value alongside the active spending smile curve over 30 years.
              </p>
            </div>
            
            {currentMetrics && (
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeColor(chartData[15]?.velocityStatus || 'Velocity Point')}`}>
                  {chartData[15]?.velocityStatus} (Mid-Retirement)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Summary Indicators above graph */}
        {currentMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50/50 dark:bg-zinc-950/50 p-4 rounded-xl border border-zinc-205/45 dark:border-zinc-805/40 text-xs font-sans">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Ending Balance</p>
              <h5 className={`text-base font-black tracking-tight mt-1 ${currentMetrics.isSuccess ? 'text-zinc-900 dark:text-zinc-100' : 'text-red-655'}`}>
                {currencyFormatter(currentMetrics.finalProduct)}
              </h5>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Terminal Growth Delta</p>
              <h5 className={`text-base font-black tracking-tight mt-1 ${currentMetrics.delta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                {currentMetrics.delta >= 0 ? '+' : ''}{currencyFormatter(currentMetrics.delta)}
              </h5>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Average Spending Rate</p>
              <h5 className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
                {currentMetrics.averageSpending}%
              </h5>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Years Safely Under 5%</p>
              <h5 className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                {currentMetrics.velocityPointCount} / 31 Years
              </h5>
            </div>
          </div>
        )}

        {/* Primary Chart Canvas */}
        <div id="wealth-velocity-chart-wrapper" className="flex-1 w-full min-h-[300px] h-[350px]">
          <ResponsiveContainer initialDimension={{ width: 800, height: 400 }} width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: -5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaColor} stopOpacity={isNightWatch ? 0.35 : 0.2}/>
                  <stop offset="95%" stopColor={areaColor} stopOpacity={0.01}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />

              <XAxis 
                dataKey="label" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke={tickStroke}
                tick={{ fill: textFill }}
              />

              {/* Left Y-Axis for portfolioBalance Area */}
              <YAxis 
                yAxisId="left"
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke={tickStroke}
                tick={{ fill: textFill }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
              />

              {/* Right Y-Axis for currentSpendingRate Line */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke={tickStroke} 
                tick={{ fill: textFill }}
                tickFormatter={(val) => `${val.toFixed(1)}%`}
                domain={[0, Math.max(withdrawal + 2, 8)]}
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
                labelFormatter={(label) => `Projected Year: ${label}`}
              />

              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px', color: textFill }} />

              {/* Left axis overall portfolio balance */}
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="portfolioBalance" 
                name="Projected Portfolio Value" 
                stroke={areaColor} 
                strokeWidth={2}
                fill="url(#colorBalance)" 
              />

              {/* Right axis Spending Smile curve */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="currentSpendingRate" 
                name="Spending Smile Rate" 
                stroke={lineColor} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Static ReferenceLine at 4% marking Safe Velocity zone */}
              <ReferenceLine 
                yAxisId="right"
                y={4.0} 
                stroke={isNightWatch ? '#b91c1c' : '#ef4444'} 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: '4% Safe Velocity', 
                  fill: isNightWatch ? '#f87171' : '#ef4444', 
                  position: 'insideBottomRight', 
                  fontSize: 10, 
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

export default WealthVelocityChart;
