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

interface NetWorthProjectionChartProps {
  data: any[];
  assets: AssetModel[];
}

export function NetWorthProjectionChart({ data, assets }: NetWorthProjectionChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'night-watch';
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((snapshot) => {
      let cash = 0;
      let taxable = 0;
      let preTax = 0;
      let roth = 0;

      if (snapshot.assetBalances) {
        for (const [assetId, balance] of Object.entries(snapshot.assetBalances)) {
          const asset = assets.find((a) => a.id === assetId);
          const val = Number(balance) || 0;
          if (asset) {
            if (asset.assetType === 'CASH') cash += val;
            else if (asset.assetType === 'TAXABLE') taxable += val;
            else if (asset.assetType === 'PRE_TAX') preTax += val;
            else if (asset.assetType === 'ROTH') roth += val;
            else taxable += val; // Fallback
          } else {
            // Fallback for legacy items without asset mapping
            taxable += val;
          }
        }
      } else {
        // Fallback if assetBalances doesn't exist yet (e.g. older workers)
        taxable += snapshot.endingBalance || 0;
      }

      return {
        year: snapshot.year,
        age: snapshot.age,
        CASH: Math.max(0, cash),
        TAXABLE: Math.max(0, taxable),
        PRE_TAX: Math.max(0, preTax),
        ROTH: Math.max(0, roth),
        Total: Math.max(0, cash + taxable + preTax + roth)
      };
    });
  }, [data, assets]);

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

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
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
            className="text-xs font-mono"
            tick={{ fill: isDark ? '#a1a1aa' : '#71717a' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            className="text-xs font-mono"
            tick={{ fill: isDark ? '#a1a1aa' : '#71717a' }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              borderRadius: '0.75rem',
              color: isDark ? '#f4f4f5' : '#09090b',
              boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.45)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 500 }}
            labelStyle={{
              color: isDark ? '#a1a1aa' : '#71717a',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
            formatter={(value: number) => [formatCurrency(value)]}
            labelFormatter={(label, payload) =>
              `Year: ${label} ${
                payload && payload[0] && payload[0].payload.age
                  ? `(Age ${payload[0].payload.age})`
                  : ''
              }`
            }
          />
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
