import { useScenarioManager } from '../contexts/ScenarioContext';
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { filterSimulationDataForView } from '../lib/chart-utils';
import { Info } from 'lucide-react';

export function FundedRatioTracker({ data, stages, activeScenario, handleUpdateDiscountRate, displayStartYear, displayEndYear }: { data: any[], stages: any[], activeScenario: any, handleUpdateDiscountRate: (rate: number) => void, displayStartYear?: number, displayEndYear?: number }) {
  const { currentlyViewingScenarioId } = useScenarioManager();
  const filteredData = useMemo(() => {
    return filterSimulationDataForView(data, displayStartYear, displayEndYear);
  }, [data, displayStartYear, displayEndYear]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500 font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        No simulation data in selected time horizon.
      </div>
    );
  }

  const currentRate = activeScenario?.budget?.globalDiscountRate ?? 2.0;

  const getStageAreas = () => {
    const areas = [];
    let currentStageId = filteredData[0]?.activeStageId;
    let startYear = filteredData[0]?.year;

    for (let i = 1; i < filteredData.length; i++) {
        const point = filteredData[i];
        if (point.activeStageId !== currentStageId || i === filteredData.length - 1) {
            const stage = stages.find((s: any) => s.id === currentStageId);
            const endYear = i === filteredData.length - 1 ? point.year : point.year - 1;
            areas.push({
                startYear,
                endYear,
                stageName: stage?.name || 'Default Stage',
                stageId: currentStageId
            });
            currentStageId = point.activeStageId;
            startYear = point.year;
        }
    }
    return areas;
  };

  const areas = getStageAreas();
  const themeColors = ['#94a3b8', '#64748b', '#475569', '#334155'];

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
           <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Funded Ratio Tracker</h3>
           <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Monitoring the fractional safety of your multi-stage retirement.</p>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl shrink-0">
           <button 
             onClick={() => handleUpdateDiscountRate(2.0)}
             className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${currentRate === 2.0 ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
           >
             Conservative (2.0%)
           </button>
           <button 
             onClick={() => handleUpdateDiscountRate(5.0)}
             className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${currentRate === 5.0 ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
           >
             Moderate (5.0%)
           </button>
        </div>
      </div>

      <div className="w-full flex-1">
        <ResponsiveContainer key={currentlyViewingScenarioId || 'default'} initialDimension={{ width: 800, height: 400 }} width="100%" height={400}>
          <LineChart data={filteredData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.2} />
            <XAxis 
              dataKey="year" 
              type="number"
              domain={['dataMin', 'dataMax']}
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              stroke="#a1a1aa"
              tickFormatter={(val) => `'${val.toString().slice(2)}`} 
            />
            <YAxis 
              domain={[0, (dataMax: number) => Math.max(2, Math.ceil(dataMax * 10) / 10)]}
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              stroke="#a1a1aa" 
              tickFormatter={(val) => `${val.toFixed(1)}x`} 
            />
            <Tooltip 
               contentStyle={{ 
                 borderRadius: '12px', 
                 border: `1px solid #e5e5e5`, 
                 backgroundColor: 'white',
                 color: '#18181b',
                 fontSize: '13px',
                 fontWeight: 500,
                 boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
               }}
               formatter={(value: number) => [`${(value * 100).toFixed(0)}%`, 'Funded Ratio']}
               labelFormatter={(label, payload) => {
                  const step = payload?.[0]?.payload;
                  const activeStg = stages.find((s: any) => s.id === step?.activeStageId);
                  return `Year: ${label} (Age ${step?.age}) - ${activeStg?.name || 'Default Stage'}`;
               }}
            />
            
            {/* Draw Stage boundaries */}
            {areas.map((area, idx) => (
                <ReferenceArea 
                    {...({
                      key: idx,
                      x1: area.startYear,
                      x2: area.endYear,
                      fill: themeColors[idx % themeColors.length],
                      fillOpacity: 0.06,
                      strokeOpacity: 0
                    } as any)}
                />
            ))}
            
            {/* Stage labels */}
            {areas.map((area, idx) => (
              <ReferenceLine 
                key={`label-${idx}`} 
                x={area.startYear + Math.floor((area.endYear - area.startYear) / 2)} 
                stroke="none" 
                label={{ 
                  position: 'center', 
                  value: `Stage ${idx + 1}: ${area.stageName}`, 
                  fill: '#94a3b8', 
                  fontSize: 14, 
                  fontWeight: 600,
                  opacity: 0.5 
                }} 
              />
            ))}

            <ReferenceLine y={1.0} stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" label={{ position: 'insideBottomLeft', value: 'Safe Zone (100%)', fill: '#10b981', fontSize: 13, fontWeight: 700, offset: 10 }} />
            
            <Line 
              type="monotone" 
              dataKey="fundedRatio" 
              name="Funded Ratio" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={false} 
              activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              How to Interpret the Funded Ratio
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              The **Funded Ratio** measures your long-term retirement safety as a continuous metric. It divides your total pre-funded capital (current portfolio balances) plus the present value of all expected future cash flows (pensions, social security, real estate income, auxiliary gifts) by the present value of your future liabilities (living expenses and tax drag) across the remaining timeline, discounted by the selected rate.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Safe Zone (&gt; 1.0x / 100%+)
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Your current assets and future cash streams are more than sufficient to cover all planned spending. Your retirement is fully pre-funded.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Balanced Zone (1.0x / 100%)
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Assets and planned outflows are perfectly matched. Your timeline is fully funded, but has minimal margin for unexpected costs or extended down markets.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Funding Gap (&lt; 1.0x / &lt; 100%)
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  A potential shortfall exists over your remaining timeline. Consider adjusting your multi-stage budget targets, deferring retirement stages, or increasing savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
