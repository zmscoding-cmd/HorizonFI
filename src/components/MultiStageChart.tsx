import React, { useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export function MultiStageChart({ data, stages }: { data: any[], stages: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        Run simulation to view income sources.
      </div>
    );
  }

  const transitionYears = [];
  let currentStageId = data[0]?.activeStageId;
  
  const chartData = data.map((d) => ({
    ...d,
    targetBudgetGrowing: d.lifestyleShrinking ? null : d.targetBudgetNominal,
    targetBudgetShrinking: d.lifestyleShrinking ? d.targetBudgetNominal : null,
  }));

  for (let i = 1; i < chartData.length; i++) {
    if (chartData[i].activeStageId !== currentStageId) {
      transitionYears.push({ year: chartData[i].year, stageId: chartData[i].activeStageId });
      currentStageId = chartData[i].activeStageId;
    }
  }

  return (
    <div className="flex-1 w-full pt-2">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.2} />
          <XAxis 
            dataKey="year" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke="#a1a1aa"
            tickFormatter={(val) => `'${val.toString().slice(2)}`} 
          />
          <YAxis 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            stroke="#a1a1aa" 
            tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
          />
          <Tooltip 
             contentStyle={{ 
               borderRadius: '12px', 
               border: `1px solid #e5e5e5`, 
               backgroundColor: 'white',
               color: '#18181b',
               fontSize: '12px' 
             }}
             formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
             labelFormatter={(label, payload) => {
                const step = payload?.[0]?.payload;
                const activeStg = stages.find(s => s.id === step?.activeStageId);
                return `Year: ${label} (Age ${step?.age}) - ${activeStg?.name || 'Default Stage'}`;
             }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          
          {transitionYears.map((t, idx) => (
            <ReferenceLine key={idx} x={t.year} stroke="#ef4444" strokeDasharray="3 3" opacity={0.8} label={{ position: 'insideTopLeft', value: 'Shift', fill: '#ef4444', fontSize: 10 }} />
          ))}

          <Area type="monotone" dataKey="giftAmountUsed" name="Non-Taxable Gift" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.8} />
          <Area type="monotone" dataKey="pensionIncome" name="Pension" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.8} />
          <Area type="monotone" dataKey="rrbIncome" name="RRB Income" stackId="1" stroke="#d946ef" fill="#d946ef" fillOpacity={0.8} />
          
          <Area type="monotone" dataKey="withdrawnDividends" name="Dividends" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
          <Area type="monotone" dataKey="withdrawnTaxable" name="Taxable Principal" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
          <Area type="monotone" dataKey="withdrawnTaxAdvantaged" name="401k/IRA" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
          
          <Line 
            type="stepAfter" 
            dataKey="targetBudgetGrowing" 
            name="Target Budget (Growing/Flat)" 
            stroke="#10b981" 
            strokeWidth={3}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />
          <Line 
            type="stepAfter" 
            dataKey="targetBudgetShrinking" 
            name="Target Budget (Shrinking)" 
            stroke="#ef4444" 
            strokeWidth={3}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
