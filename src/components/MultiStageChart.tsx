import React, { useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCurrencyMode } from '../contexts/CurrencyModeContext';
import { useTheme } from './ThemeProvider';

export function MultiStageChart({ data, stages }: { data: any[], stages: any[] }) {
  const { currencyMode } = useCurrencyMode();
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';
  const isCurrent = currencyMode === 'CURRENT';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        Run simulation to view income sources.
      </div>
    );
  }

  const transitionYears = [];
  let currentStageId = data[0]?.activeStageId;
  
  const chartData = data.map((d) => {
    const divisor = isCurrent ? (d.cumulativeInflation || 1) : 1;
    const budgetVal = isCurrent ? (d.targetBudgetReal || (d.targetBudgetNominal / divisor)) : d.targetBudgetNominal;
    
    const startAssets = (d.endingBalance || 0) - (d.changeInNetWorth || 0);
    const withdrawalRate = startAssets > 0 ? ((d.nominalWithdrawal || 0) / startAssets) * 100 : 0;

    return {
      ...d,
      giftAmountUsed: (d.giftAmountUsed || 0) / divisor,
      pensionIncome: (d.pensionIncome || 0) / divisor,
      rrbIncome: (d.rrbIncome || 0) / divisor,
      withdrawnDividends: (d.withdrawnDividends || 0) / divisor,
      withdrawnTaxable: (d.withdrawnTaxable || 0) / divisor,
      withdrawnTaxAdvantaged: (d.withdrawnTaxAdvantaged || 0) / divisor,
      targetBudgetGrowing: d.lifestyleShrinking ? null : budgetVal,
      targetBudgetShrinking: d.lifestyleShrinking ? budgetVal : null,
      withdrawalRate: Math.max(0, Math.min(100, withdrawalRate)),
    };
  });

  for (let i = 1; i < chartData.length; i++) {
    if (chartData[i].activeStageId !== currentStageId) {
      transitionYears.push({ year: chartData[i].year, stageId: chartData[i].activeStageId });
      currentStageId = chartData[i].activeStageId;
    }
  }

  // Theme-sensitive styling for Recharts
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#f4f4f5');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTextColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  return (
    <div className="flex-1 w-full pt-2">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
          <XAxis 
            dataKey="year" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke={tickStroke}
            tick={{ fill: textFill }}
            tickFormatter={(val) => `'${val.toString().slice(2)}`} 
          />
          <YAxis 
            yAxisId="left"
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke={tickStroke}
            tick={{ fill: textFill }}
            tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke={tickStroke}
            tick={{ fill: textFill }}
            tickFormatter={(val) => `${val.toFixed(1)}%`} 
          />
          <Tooltip 
             contentStyle={{ 
               borderRadius: '16px', 
               border: `1px solid ${tooltipBorder}`, 
               backgroundColor: tooltipBg,
               color: tooltipTextColor,
               fontSize: '12px',
               boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.45)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
             }}
             itemStyle={{ color: tooltipTextColor }}
             labelStyle={{ color: textFill }}
             formatter={(value: any, name: any) => {
               if (name && name.toLowerCase().includes('rate')) {
                 return [`${Number(value).toFixed(2)}%`, name];
               }
               const formattedVal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
               return [formattedVal, name];
             }}
             labelFormatter={(label, payload) => {
                const step = payload?.[0]?.payload;
                const activeStg = stages.find(s => s.id === step?.activeStageId);
                const suffix = isCurrent ? ' (Today\'s Value)' : ' (Nominal Future)';
                return `Year: ${label} (Age ${step?.age}) - ${activeStg?.name || 'Default Stage'}${suffix}`;
             }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: textFill }} />
          
          {transitionYears.map((t, idx) => (
            <ReferenceLine key={idx} x={t.year} stroke="#ef4444" strokeDasharray="3 3" opacity={0.8} label={{ position: 'insideTopLeft', value: 'Shift', fill: '#ef4444', fontSize: 10 }} />
          ))}

          <Area yAxisId="left" type="monotone" dataKey="giftAmountUsed" name="Non-Taxable Gift" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="pensionIncome" name="Pension" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="rrbIncome" name="RRB Income" stackId="1" stroke="#d946ef" fill="#d946ef" fillOpacity={0.8} />
          
          <Area yAxisId="left" type="monotone" dataKey="withdrawnDividends" name="Dividends" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="withdrawnTaxable" name="Taxable Principal" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="withdrawnTaxAdvantaged" name="401k/IRA" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
          
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetGrowing" 
            name={`Target Budget (Growing/Flat)${isCurrent ? ' - Real' : ' - Nominal'}`} 
            stroke="#10b981" 
            strokeWidth={3}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetShrinking" 
            name={`Target Budget (Shrinking)${isCurrent ? ' - Real' : ' - Nominal'}`} 
            stroke="#ef4444" 
            strokeWidth={3}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />

          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="withdrawalRate" 
            name="Portfolio Withdrawal Rate" 
            stroke="#ec4899" 
            strokeWidth={2}
            dot={{ r: 1.5 }}
            activeDot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
