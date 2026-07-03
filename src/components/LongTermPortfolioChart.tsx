import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AssetModel } from '../lib/db';
import { useTheme } from './ThemeProvider';
import { useCurrencyMode } from '../contexts/CurrencyModeContext';
import { filterSimulationDataForView } from '../lib/chart-utils';

interface LongTermPortfolioChartProps {
  data: any[];
  assets: AssetModel[];
  displayStartYear?: number;
  displayEndYear?: number;
}

export function LongTermPortfolioChart({ data, assets, displayStartYear, displayEndYear }: LongTermPortfolioChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'night-watch';
  const { currencyMode } = useCurrencyMode();

  const hasLiquidationTarget = useMemo(() => {
    return assets.some(a => a.isLiquidationTarget);
  }, [assets]);

  const hasDividendDestination = useMemo(() => {
    return assets.some(a => a.isDividendDestination);
  }, [assets]);
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const filtered = filterSimulationDataForView(data, displayStartYear, displayEndYear);

    return filtered.map((snapshot) => {
      const isCurrent = currencyMode === 'CURRENT';
      const divisor = isCurrent ? (snapshot.cumulativeInflation || 1) : 1;
      
      const cash = isCurrent ? (snapshot.cashReal ?? 0) : (snapshot.cashNominal ?? 0);
      const taxable = isCurrent ? (snapshot.taxableReal ?? 0) : (snapshot.taxableNominal ?? 0);
      const preTax = isCurrent ? (snapshot.preTaxReal ?? 0) : (snapshot.preTaxNominal ?? 0);
      const roth = isCurrent ? (snapshot.rothReal ?? 0) : (snapshot.rothNominal ?? 0);
      
      const total = cash + taxable + preTax + roth;

      const liquidationTarget = isCurrent 
        ? (snapshot.liquidationTargetBalance ?? 0) / divisor
        : (snapshot.liquidationTargetBalance ?? 0);
        
      const dividendDestination = isCurrent
        ? (snapshot.dividendDestinationBalance ?? 0) / divisor
        : (snapshot.dividendDestinationBalance ?? 0);

      const otherTaxable = Math.max(0, taxable - liquidationTarget - dividendDestination);

      return {
        year: snapshot.year,
        age: snapshot.age,
        Total: total,
        LIQUIDATION_TARGET: Math.max(0, liquidationTarget),
        DIVIDEND_DESTINATION: Math.max(0, dividendDestination),
        TAXABLE_OTHER: Math.max(0, otherTaxable),
        PRE_TAX: Math.max(0, preTax),
        ROTH: Math.max(0, roth),
        CASH: Math.max(0, cash),
        // Absolute (non-stacked) values for overlaying comparative lines
        LIQUIDATION_TARGET_LINE: Math.max(0, liquidationTarget),
        DIVIDEND_DESTINATION_LINE: Math.max(0, dividendDestination),
        expectedSpend: (isCurrent ? snapshot.targetBudgetReal : snapshot.targetBudgetNominal) || 0,
        expectedGrowth: (snapshot.expectedGrowth || 0) / divisor,
        expectedYield: (snapshot.expectedYield || 0) / divisor,
        actualSpend: (isCurrent ? snapshot.realWithdrawal : snapshot.nominalWithdrawal) || 0,
        taxDrag: (snapshot.taxDrag || 0) / divisor,
        liquidationTargetSaleAmount: (snapshot.liquidationTargetSaleAmount || 0) / divisor,
        liquidationTaxPaid: (snapshot.liquidationTaxPaid || 0) / divisor,
        rothConversionAmount: (snapshot.rothConversionAmount || 0) / divisor,
        _nominalTotal: snapshot.totalNetWorth ?? (cash + taxable + preTax + roth),
        _nominalChange: snapshot.changeInNetWorth || 0,
        _divisor: divisor
      };
    }).map((item, index, arr) => {
      let changeInNetWorth = 0;
      if (index === 0) {
        const startingNominal = item._nominalTotal - item._nominalChange;
        changeInNetWorth = item.Total - startingNominal;
      } else {
        changeInNetWorth = item.Total - arr[index - 1].Total;
      }
      
      return {
        ...item,
        changeInNetWorth
      };
    });
  }, [data, assets, currencyMode, displayStartYear, displayEndYear]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        Run simulation to view long-term portfolio projection.
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  const formatYAxis = (val: number) => {
    if (val === 0) return '$0';
    return `$${(val / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const dataObj = payload[0].payload;
    const year = dataObj.year;
    const age = dataObj.age;
    const total = dataObj.Total;
    
    const liqVal = dataObj.LIQUIDATION_TARGET;
    const divVal = dataObj.DIVIDEND_DESTINATION;
    const preTaxVal = dataObj.PRE_TAX;
    const rothVal = dataObj.ROTH;
    const cashVal = dataObj.CASH;
    const taxableOtherVal = dataObj.TAXABLE_OTHER;
    
    const spend = dataObj.expectedSpend;
    const growth = dataObj.expectedGrowth;
    const yieldVal = dataObj.expectedYield;
    const change = dataObj.changeInNetWorth;

    const isChangePositive = change >= 0;
    const isCurrent = currencyMode === 'CURRENT';
    const currencySuffix = isCurrent ? " (Today's Value)" : " (Nominal Future)";

    return (
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl text-xs max-w-xs transition-colors space-y-3.5">
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/85 pb-2">
          <span className="font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider font-mono">
            Year {year}
          </span>
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full font-mono">
            Age {age}
          </span>
        </div>
        
        {/* Asset Classes Breakdown */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Portfolio Breakdown {currencySuffix}
          </div>
          
          {hasLiquidationTarget && (
            <div className="flex justify-between gap-8 items-center">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Liquidation Target
              </span>
              <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(liqVal)}</span>
            </div>
          )}

          {hasDividendDestination && (
            <div className="flex justify-between gap-8 items-center">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Div Destination
              </span>
              <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(divVal)}</span>
            </div>
          )}

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Taxable (Other)
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(taxableOtherVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
              Cash
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(cashVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Pre-Tax
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(preTaxVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Roth
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(rothVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center border-t border-zinc-100 dark:border-zinc-850/60 pt-1.5 mt-1 font-bold">
            <span className="text-zinc-900 dark:text-zinc-50">Total Net Worth</span>
            <span className="font-mono text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Transition Metrics */}
        {(dataObj.liquidationTargetSaleAmount > 0 || dataObj.liquidationTaxPaid > 0 || dataObj.rothConversionAmount > 0) && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/85 pt-3 space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
              Strategy Execution {currencySuffix}
            </div>
            {dataObj.liquidationTargetSaleAmount > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Target Shares Sold:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(dataObj.liquidationTargetSaleAmount)}</span>
              </div>
            )}
            {dataObj.liquidationTaxPaid > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Cap Gains Tax Paid:</span>
                <span className="font-mono text-rose-500 dark:text-rose-400 font-semibold">-{formatCurrency(dataObj.liquidationTaxPaid)}</span>
              </div>
            )}
            {dataObj.rothConversionAmount > 0 && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">Roth Conversion:</span>
                <span className="font-mono text-purple-500 dark:text-purple-400 font-semibold">{formatCurrency(dataObj.rothConversionAmount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Yearly Details */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/85 pt-3.5 space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Yearly Flow & Growth {currencySuffix}
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-500 dark:text-zinc-500">Target Spend:</span>
            <span className="font-mono text-zinc-500 dark:text-zinc-500">{formatCurrency(spend)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">Actual Withdrawal:</span>
            <span className="font-mono text-rose-500 dark:text-rose-400">-{formatCurrency(dataObj.actualSpend)}</span>
          </div>
          
          {dataObj.taxDrag > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-zinc-600 dark:text-zinc-400">Taxes & Fees:</span>
              <span className="font-mono text-rose-500 dark:text-rose-400">-{formatCurrency(dataObj.taxDrag)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">Portfolio Growth:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">+{formatCurrency(growth)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-zinc-600 dark:text-zinc-400">Portfolio Yield:</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400">+{formatCurrency(yieldVal)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-2 font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300">Yearly Change:</span>
            <span className={`font-mono ${isChangePositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isChangePositive ? '+' : ''}{formatCurrency(change)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <ResponsiveContainer initialDimension={{ width: 800, height: 400 }} width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorPreTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#047857" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#047857" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorOtherTaxable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorLiquidation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorDividend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={isDark ? '#27272a' : '#f4f4f5'}
          />
          <XAxis
            dataKey="year"
            type="number"
            domain={['dataMin', 'dataMax']}
            className="text-xs font-mono"
            tick={{ fill: isDark ? '#a1a1aa' : '#71717a' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tickFormatter={(val) => String(val)}
          />
          <YAxis
            tickFormatter={formatYAxis}
            className="text-xs font-mono"
            tick={{ fill: isDark ? '#a1a1aa' : '#71717a' }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', fontWeight: 500, color: isDark ? '#a1a1aa' : '#71717a' }}
          />

          {/* 1. Stacked Areas representing Net Worth breakdown */}
          <Area
            type="monotone"
            dataKey="PRE_TAX"
            name="Pre-Tax"
            stackId="1"
            stroke="#6366f1"
            fill="url(#colorPreTax)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="ROTH"
            name="Roth"
            stackId="1"
            stroke="#a855f7"
            fill="url(#colorRoth)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="CASH"
            name="Cash"
            stackId="1"
            stroke="#047857"
            fill="url(#colorCash)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="TAXABLE_OTHER"
            name="Taxable (Other)"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorOtherTaxable)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          
          {hasDividendDestination && (
            <Area
              type="monotone"
              dataKey="DIVIDEND_DESTINATION"
              name="Div Destination Stack"
              stackId="1"
              stroke="#10b981"
              fill="url(#colorDividend)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )}

          {hasLiquidationTarget && (
            <Area
              type="monotone"
              dataKey="LIQUIDATION_TARGET"
              name="Liquidation Target Stack"
              stackId="1"
              stroke="#f59e0b"
              fill="url(#colorLiquidation)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )}

          {/* 2. Overlaid Absolute Lines to clearly visualize absolute crossover points */}
          {hasLiquidationTarget && (
            <Line
              type="monotone"
              dataKey="LIQUIDATION_TARGET_LINE"
              name="🎯 Liquidation Target (Absolute)"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}

          {hasDividendDestination && (
            <Line
              type="monotone"
              dataKey="DIVIDEND_DESTINATION_LINE"
              name="📥 Div Destination (Absolute)"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LongTermPortfolioChart;
