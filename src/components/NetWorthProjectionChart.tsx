import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
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

interface NetWorthProjectionChartProps {
  data: any[];
  assets: AssetModel[];
  displayStartYear?: number;
  displayEndYear?: number;
}

export function NetWorthProjectionChart({ data, assets, displayStartYear, displayEndYear }: NetWorthProjectionChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'night-watch';
  const { currencyMode } = useCurrencyMode();
  
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

      return {
        year: snapshot.year,
        age: snapshot.age,
        CASH: Math.max(0, cash),
        TAXABLE: Math.max(0, taxable),
        PRE_TAX: Math.max(0, preTax),
        ROTH: Math.max(0, roth),
        Total: total,
        expectedSpend: (isCurrent ? snapshot.targetBudgetReal : snapshot.targetBudgetNominal) || 0,
        expectedGrowth: (snapshot.expectedGrowth || 0) / divisor,
        expectedYield: (snapshot.expectedYield || 0) / divisor,
        actualSpend: (isCurrent ? snapshot.realWithdrawal : snapshot.nominalWithdrawal) || 0,
        taxDrag: (snapshot.taxDrag || 0) / divisor,
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
        Run simulation to view net worth projection.
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
    const cash = dataObj.CASH;
    const taxable = dataObj.TAXABLE;
    const preTax = dataObj.PRE_TAX;
    const roth = dataObj.ROTH;
    const total = dataObj.Total;
    
    const spend = dataObj.expectedSpend;
    const growth = dataObj.expectedGrowth;
    const yieldVal = dataObj.expectedYield;
    const change = dataObj.changeInNetWorth;

    const isChangePositive = change >= 0;
    const isCurrent = currencyMode === 'CURRENT';
    const currencySuffix = isCurrent ? ' (Today\'s Value)' : ' (Nominal Future)';

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
            Portfolio Balances {currencySuffix}
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Cash
            </span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{formatCurrency(cash)}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Taxable
            </span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{formatCurrency(taxable)}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Pre-Tax
            </span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{formatCurrency(preTax)}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Roth
            </span>
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{formatCurrency(roth)}</span>
          </div>
          <div className="flex justify-between gap-8 items-center border-t border-zinc-100 dark:border-zinc-850/60 pt-1.5 mt-1 font-bold">
            <span className="text-zinc-900 dark:text-zinc-50">Total Net Worth</span>
            <span className="font-mono text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

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
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorTaxable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorPreTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
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
            wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#a1a1aa' : '#71717a' }}
          />

          <Area
            type="monotone"
            dataKey="CASH"
            name="Cash"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorCash)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="TAXABLE"
            name="Taxable"
            stackId="1"
            stroke="#8b5cf6"
            fill="url(#colorTaxable)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="PRE_TAX"
            name="Pre-Tax"
            stackId="1"
            stroke="#f97316"
            fill="url(#colorPreTax)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="ROTH"
            name="Roth"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorRoth)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
