import React, { useState, useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCurrencyMode } from '../contexts/CurrencyModeContext';
import { useTheme } from './ThemeProvider';
import { filterSimulationDataForView } from '../lib/chart-utils';

export function MultiStageChart({ data, stages, displayStartYear, displayEndYear }: { data: any[], stages: any[], displayStartYear?: number, displayEndYear?: number }) {
  const { currencyMode } = useCurrencyMode();
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';
  const isCurrent = currencyMode === 'CURRENT';

  const filteredData = useMemo(() => {
    return filterSimulationDataForView(data, displayStartYear, displayEndYear);
  }, [data, displayStartYear, displayEndYear]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        No simulation data in selected time horizon.
      </div>
    );
  }

  const transitionYears = [];
  let currentStageId = filteredData[0]?.activeStageId;
  
  const rawChartData = filteredData.map((d) => {
    const divisor = isCurrent ? (d.cumulativeInflation || 1) : 1;
    const budgetVal = isCurrent ? (d.targetBudgetReal || (d.targetBudgetNominal / divisor)) : d.targetBudgetNominal;
    
    const startAssets = (d.endingBalance || 0) - (d.changeInNetWorth || 0);
    const withdrawalRate = startAssets > 0 ? ((d.nominalWithdrawal || 0) / startAssets) * 100 : 0;

    // Real-term trend classification (growth from inflation is factored out)
    const isShrinking = !!d.lifestyleShrinking;
    const isGrowing = d.lifestyleGrowing !== undefined ? !!d.lifestyleGrowing : false;
    const isFlat = d.lifestyleFlat !== undefined ? !!d.lifestyleFlat : !isShrinking;

    return {
      ...d,
      divisor,
      budgetVal,
      isShrinking,
      isGrowing,
      isFlat,
      chartWithdrawal: (d.nominalWithdrawal || 0) / divisor,
      chartStartAssets: startAssets / divisor,
      giftAmountUsed: (d.giftAmountUsed || 0) / divisor,
      pensionIncome: (d.pensionIncome || 0) / divisor,
      rrbIncome: (d.rrbIncome || 0) / divisor,
      withdrawnDividends: (d.withdrawnDividends || 0) / divisor,
      withdrawnTaxable: (d.withdrawnTaxable || 0) / divisor,
      withdrawnTaxAdvantaged: (d.withdrawnTaxAdvantaged || 0) / divisor,
      withdrawalRate: Math.max(0, Math.min(100, withdrawalRate)),
    };
  });

  const chartData = rawChartData.map((d, idx) => {
    const prev = idx > 0 ? rawChartData[idx - 1] : null;
    const next = idx < rawChartData.length - 1 ? rawChartData[idx + 1] : null;

    // Overlap transitional boundary points by 1 year to connect stepped lines flawlessly
    const showGrowing = d.isGrowing || (prev && prev.isGrowing) || (next && next.isGrowing);
    const showShrinking = d.isShrinking || (prev && prev.isShrinking) || (next && next.isShrinking);
    const showFlat = d.isFlat || (prev && prev.isFlat) || (next && next.isFlat);

    return {
      ...d,
      targetBudgetGrowing: showGrowing ? d.budgetVal : null,
      targetBudgetShrinking: showShrinking ? d.budgetVal : null,
      targetBudgetFlat: showFlat ? d.budgetVal : null,
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
      <ResponsiveContainer initialDimension={{ width: 800, height: 400 }} width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: -10, bottom: 5 }}>
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
             wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
             content={({ active, payload, label }: any) => {
               if (active && payload && payload.length) {
                 const step = payload[0]?.payload;
                 const activeStg = stages.find(s => s.id === step?.activeStageId);
                 const suffix = isCurrent ? ' (Today\'s Value)' : ' (Nominal Future)';
                 const title = `Year: ${label} (Age ${step?.age}) - ${activeStg?.name || 'Default Stage'}${suffix}`;

                 // Format utility
                 const formatValue = (value: any, name: any) => {
                   if (name && name.toLowerCase().includes('rate')) {
                     return `${Number(value).toFixed(2)}%`;
                   }
                   return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
                 };

                 // Filter and sort items so "Portfolio Withdrawal Rate" is at the top
                 const validPayload = payload.filter((p: any) => p.value !== null && p.value !== undefined);
                 const sortedPayload = [...validPayload].sort((a, b) => {
                   if (a.name === "Portfolio Withdrawal Rate") return -1;
                   if (b.name === "Portfolio Withdrawal Rate") return 1;
                   return 0;
                 });

                 return (
                   <div 
                     className="p-3.5 rounded-2xl border shadow-xl transition-colors"
                     style={{
                       borderColor: tooltipBorder,
                       backgroundColor: tooltipBg,
                       color: tooltipTextColor,
                       fontSize: '12px',
                     }}
                   >
                     <p className="font-semibold mb-2.5" style={{ color: textFill }}>{title}</p>
                     <ul className="space-y-1.5">
                       {sortedPayload.map((entry, index) => {
                         const isPWR = entry.name === "Portfolio Withdrawal Rate";
                         return (
                           <li 
                             key={`item-${index}`} 
                             className={`flex flex-col ${isPWR ? 'pb-2.5 mb-2.5 border-b' : ''}`}
                             style={{ 
                               borderColor: isPWR ? tooltipBorder : 'transparent'
                             }}
                           >
                             <div className="flex items-center justify-between gap-6 w-full">
                               <div className="flex items-center gap-2">
                                 <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                 <span className={isPWR ? 'font-bold' : ''}>{entry.name}</span>
                               </div>
                               <span className="font-mono">
                                 {formatValue(entry.value, entry.name)}
                                </span>
                             </div>
                             {isPWR && step && (
                               <div className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal font-normal">
                                 <div className="font-mono bg-zinc-50/50 dark:bg-zinc-950/40 p-2 rounded-lg border border-zinc-150 dark:border-zinc-850/60 space-y-1">
                                   <div className="flex justify-between gap-4">
                                     <span>Portfolio Withdrawal:</span>
                                     <span className="text-zinc-850 dark:text-zinc-350 font-bold">
                                       {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(step.chartWithdrawal || 0)}
                                     </span>
                                   </div>
                                   <div className="flex justify-between gap-4 pb-1 border-b border-dashed border-zinc-200 dark:border-zinc-800">
                                     <span>Starting Portfolio Assets:</span>
                                     <span className="text-zinc-850 dark:text-zinc-350 font-bold">
                                       {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(step.chartStartAssets || 0)}
                                     </span>
                                   </div>
                                   <div className="pt-1">
                                     <div className="text-[9px] text-zinc-455 dark:text-zinc-500">
                                       Formula: (Withdrawal / Starting Assets) × 100
                                     </div>
                                     <div className="text-pink-600 dark:text-pink-400 font-bold text-right mt-0.5">
                                       ({new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(step.chartWithdrawal || 0)} / {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(step.chartStartAssets || 0)}) × 100 = {Number(entry.value).toFixed(2)}%
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             )}
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
          
          {transitionYears.map((t, idx) => (
            <ReferenceLine key={idx} x={t.year} stroke="#ef4444" strokeDasharray="3 3" opacity={0.8} label={{ position: 'insideTopLeft', value: 'Shift', fill: '#ef4444', fontSize: 10 }} />
          ))}

          <Area yAxisId="left" type="monotone" dataKey="giftAmountUsed" name="Non-Taxable Gift" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="pensionIncome" name="Pension" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="rrbIncome" name="RRB Income" stackId="1" stroke="#d946ef" fill="#d946ef" fillOpacity={0.8} />
          
          <Area yAxisId="left" type="monotone" dataKey="withdrawnDividends" name="Dividends" stackId="1" stroke="#34d399" fill="#34d399" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="withdrawnTaxable" name="Taxable Principal" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
          <Area yAxisId="left" type="monotone" dataKey="withdrawnTaxAdvantaged" name="401k/IRA" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
          
          {/* Target Budget Lines with high-contrast outline borders */}
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetGrowing" 
            legendType="none"
            stroke={isDark ? '#09090b' : '#ffffff'} 
            strokeWidth={7.5}
            dot={false}
            connectNulls={false}
          />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetGrowing" 
            name={`Target Budget (Increasing)${isCurrent ? ' - Real' : ' - Nominal'}`} 
            stroke="#14532d" 
            strokeWidth={4.5}
            dot={false}
            connectNulls={false}
          />
          
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetFlat" 
            legendType="none"
            stroke={isDark ? '#09090b' : '#ffffff'} 
            strokeWidth={7.5}
            dot={false}
            connectNulls={false}
          />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetFlat" 
            name={`Target Budget (Flat)${isCurrent ? ' - Real' : ' - Nominal'}`} 
            stroke={isDark ? '#f1f5f9' : '#334155'} 
            strokeWidth={4.5}
            dot={false}
            connectNulls={false}
          />
          
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetShrinking" 
            legendType="none"
            stroke={isDark ? '#09090b' : '#ffffff'} 
            strokeWidth={7.5}
            dot={false}
            connectNulls={false}
          />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="targetBudgetShrinking" 
            name={`Target Budget (Decreasing)${isCurrent ? ' - Real' : ' - Nominal'}`} 
            stroke="#f87171" 
            strokeWidth={4.5}
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
