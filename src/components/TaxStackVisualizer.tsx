import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  Cell 
} from 'recharts';
import { useTheme } from './ThemeProvider';
import { useScenarioTaxTargets } from '../hooks/useScenarioTaxTargets';
import { 
  TrendingUp, 
  Info, 
  HelpCircle, 
  Settings, 
  Sliders, 
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface TaxStackVisualizerProps {
  plan: any;
  activeScenario: any;
  db: any;
  grossOrdinaryIncome: number;
  totalLtcgGains: number;
  blendedCostBasisPercentage: number;
}

export default function TaxStackVisualizer({
  plan,
  activeScenario,
  db,
  grossOrdinaryIncome,
  totalLtcgGains,
  blendedCostBasisPercentage
}: TaxStackVisualizerProps) {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // 1. Get scenario tax targets from IndexedDB via our custom hook
  const {
    targetOrdinaryBracket,
    targetLTCGBracket,
    taxableAccountCostBasisPct,
    updateTaxTargets,
    loading
  } = useScenarioTaxTargets(db, plan?.id, activeScenario?.id);

  // Constants
  const STANDARD_DEDUCTION = 30000;

  // Bracket limits (gross values for easy Y-axis positioning)
  const ordinaryLimits: Record<number, number> = {
    0.00: STANDARD_DEDUCTION,
    0.10: STANDARD_DEDUCTION + 23200,   // $53,200
    0.12: STANDARD_DEDUCTION + 94300,   // $124,300
    0.22: STANDARD_DEDUCTION + 201050,  // $231,050
    0.24: Infinity
  };

  const ordinaryBracketLabels: Record<number, string> = {
    0.00: '0% (Std Deduction)',
    0.10: '10% Bracket',
    0.12: '12% Bracket',
    0.22: '22% Bracket',
    0.24: '24% Bracket'
  };

  const ltcgLimits: Record<number, number> = {
    0.00: STANDARD_DEDUCTION + 98900,   // $128,900
    0.15: STANDARD_DEDUCTION + 613700,  // $643,700
    0.20: Infinity
  };

  const ltcgBracketLabels: Record<number, string> = {
    0.00: '0% LTCG',
    0.15: '15% LTCG',
    0.20: '20% LTCG'
  };

  // 2. Perform bracket optimization (matches simulation.worker.ts)
  const optimization = useMemo(() => {
    const targetOrdinaryGrossLimit = ordinaryLimits[targetOrdinaryBracket] || Infinity;
    const remainingOrdinaryCapacity = Math.max(0, targetOrdinaryGrossLimit - grossOrdinaryIncome);
    const maxRecommendedRothConversion = remainingOrdinaryCapacity;

    // Stack simulated conversion
    const simulatedOrdinaryIncome = grossOrdinaryIncome + maxRecommendedRothConversion;
    const simulatedTaxableOrdinaryIncome = Math.max(0, simulatedOrdinaryIncome - STANDARD_DEDUCTION);

    // LTCG limits (taxable limits)
    const targetLtcgLimitTaxable = targetLTCGBracket === 0.00 ? 98900 : (targetLTCGBracket === 0.15 ? 613700 : Infinity);
    const combinedTaxableIncome = simulatedTaxableOrdinaryIncome + totalLtcgGains;
    const remainingLtcgCapacity = Math.max(0, targetLtcgLimitTaxable - combinedTaxableIncome);

    // Calculate Max Stock Sale using the scenario-specific estimated cost basis pct
    const costBasisDecimal = taxableAccountCostBasisPct; // e.g. 0.75
    const gainsRatio = Math.max(0, Math.min(1, 1.0 - costBasisDecimal));
    const maxRecommendedStockSale = gainsRatio > 0 ? remainingLtcgCapacity / gainsRatio : Infinity;

    return {
      maxRecommendedRothConversion,
      maxRecommendedStockSale,
      remainingOrdinaryCapacity,
      remainingLtcgCapacity,
      simulatedTaxableOrdinaryIncome,
      combinedTaxableIncome,
      targetOrdinaryGrossLimit,
      targetLtcgGrossLimit: STANDARD_DEDUCTION + targetLtcgLimitTaxable,
      gainsRatio
    };
  }, [grossOrdinaryIncome, totalLtcgGains, targetOrdinaryBracket, targetLTCGBracket, taxableAccountCostBasisPct]);

  // 3. Prepare stacked bar chart data
  const chartData = useMemo(() => {
    const stdDeductionLayer = Math.min(STANDARD_DEDUCTION, grossOrdinaryIncome);
    const taxableOrdinaryLayer = Math.max(0, grossOrdinaryIncome - STANDARD_DEDUCTION);
    const capitalGainsLayer = totalLtcgGains;

    return [
      {
        name: 'Current Income Stack',
        'Standard Deduction': stdDeductionLayer,
        'Taxable Ordinary Income': taxableOrdinaryLayer,
        'Capital Gains & Dividends': capitalGainsLayer,
      }
    ];
  }, [grossOrdinaryIncome, totalLtcgGains]);

  // Dynamic theme colors
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#e4e4e7');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');
  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#18181b');

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-zinc-500">Loading tax optimization targets...</p>
      </div>
    );
  }

  // Determine active reference line positions
  const ordinaryRefLimit = ordinaryLimits[targetOrdinaryBracket];
  const ltcgRefLimit = ltcgLimits[targetLTCGBracket];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors mt-6">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm sm:text-base">
            <Sliders size={18} className="text-blue-500" />
            Tax Bracket Optimization Suite
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Stack ordinary and capital gains income sequentially to maximize conversion capacity and rebalancing room.
          </p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Optimization Parameters */}
        <div className="lg:col-span-5 space-y-5 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 pb-5 lg:pb-0 lg:pr-6">
          <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Settings size={13} />
            Optimizer Preferences
          </h4>

          {/* Target Ordinary Bracket Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Target Ordinary Bracket
              </label>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-450 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded font-mono">
                {ordinaryBracketLabels[targetOrdinaryBracket]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.00, 0.10, 0.12, 0.22].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => updateTaxTargets({ targetOrdinaryBracket: rate })}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    targetOrdinaryBracket === rate
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {rate === 0 ? 'Std Ded' : `${(rate * 100).toFixed(0)}%`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
              Limits the maximum gross ordinary income (including traditional distributions and conversions).
            </p>
          </div>

          {/* Target LTCG Bracket Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Target LTCG Bracket
              </label>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-mono">
                {ltcgBracketLabels[targetLTCGBracket]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0.00, 0.15, 0.20].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => updateTaxTargets({ targetLTCGBracket: rate })}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    targetLTCGBracket === rate
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {`${(rate * 100).toFixed(0)}%`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
              LTCG is stacked on top of ordinary income. Keeping ordinary income low preserves 0% capital gains room.
            </p>
          </div>

          {/* Taxable Account Cost Basis Percentage Slider */}
          <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-150 dark:border-zinc-850 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Taxable Cost Basis
              </label>
              <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round(taxableAccountCostBasisPct * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(taxableAccountCostBasisPct * 100)}
              onChange={(e) => updateTaxTargets({ taxableAccountCostBasisPct: Number(e.target.value) / 100 })}
              className="w-full accent-blue-600 dark:accent-red-600 bg-zinc-200 dark:bg-zinc-800 h-1 rounded-lg outline-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-450 dark:text-zinc-500 font-semibold font-mono">
              <span>0% (All Gains)</span>
              <span>100% (Cash/No Gain)</span>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
              Determines the ratio of capital gains generated per stock sale. A cost basis of {Math.round(taxableAccountCostBasisPct * 100)}% means every $1.00 of stock sold triggers ${(1 - taxableAccountCostBasisPct).toFixed(2)} in taxable capital gains.
            </p>
          </div>
        </div>

        {/* Right Column: Visualization & Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-1.5 mb-2">
            <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={13} />
              Sequence-of-Stacking Visualization
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Shows how income stacks sequentially on top of the standard deduction compared to target thresholds.
            </p>
          </div>

          <div className="h-[220px] sm:h-[240px] w-full min-h-0 min-w-0 bg-zinc-50/25 dark:bg-zinc-950/10 rounded-xl p-2 border border-zinc-150 dark:border-zinc-850/40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 15, right: 35, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridKeyline} />
                <XAxis 
                  type="number" 
                  fontSize={10} 
                  stroke={tickStroke} 
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  domain={[0, Math.max(160000, grossOrdinaryIncome + totalLtcgGains + 20000)]}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  hide 
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: `1px solid ${tooltipBorder}`,
                    backgroundColor: tooltipBg,
                    color: tooltipTexColor,
                    fontSize: '11px',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  formatter={(value: number, name: string) => [`$${Math.round(value).toLocaleString()}`, name]}
                />
                
                {/* Reference Lines for selected targets */}
                <ReferenceLine 
                  x={STANDARD_DEDUCTION} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  strokeWidth={1.5}
                  label={{ 
                    value: 'Std Ded ($30k)', 
                    position: 'top', 
                    fill: '#ef4444', 
                    fontSize: 9,
                    fontWeight: 'bold' 
                  }} 
                />

                {ordinaryRefLimit && ordinaryRefLimit !== Infinity && ordinaryRefLimit > STANDARD_DEDUCTION && (
                  <ReferenceLine 
                    x={ordinaryRefLimit} 
                    stroke="#3b82f6" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: `Target Ord Limit (${ordinaryBracketLabels[targetOrdinaryBracket]})`, 
                      position: 'bottom', 
                      fill: '#3b82f6', 
                      fontSize: 9,
                      fontWeight: 'bold' 
                    }} 
                  />
                )}

                {ltcgRefLimit && ltcgRefLimit !== Infinity && ltcgRefLimit > STANDARD_DEDUCTION && (
                  <ReferenceLine 
                    x={ltcgRefLimit} 
                    stroke="#10b981" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: `Target LTCG Limit (${ltcgBracketLabels[targetLTCGBracket]})`, 
                      position: 'top', 
                      fill: '#10b981', 
                      fontSize: 9,
                      fontWeight: 'bold' 
                    }} 
                  />
                )}

                {/* Bottom Segment: Standard Deduction */}
                <Bar dataKey="Standard Deduction" stackId="a" fill="#6b7280" barSize={44} radius={[0, 0, 0, 0]}>
                  <Cell fill={isDark ? '#4b5563' : '#9ca3af'} />
                </Bar>
                {/* Middle Segment: Taxable Ordinary Income */}
                <Bar dataKey="Taxable Ordinary Income" stackId="a" fill="#2563eb" barSize={44} radius={[0, 0, 0, 0]}>
                  <Cell fill="#3b82f6" />
                </Bar>
                {/* Top Segment: Capital Gains & Dividends */}
                <Bar dataKey="Capital Gains & Dividends" stackId="a" fill="#059669" barSize={44} radius={[0, 8, 8, 0]}>
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-zinc-450 dark:bg-zinc-600 rounded" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Standard Deduction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Taxable Ordinary Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Capital Gains & Dividends</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Panel */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50/50 dark:bg-zinc-950/20 transition-colors">
        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
          <ShieldCheck className="text-blue-500 dark:text-red-500" size={16} />
          Dynamic Optimizer Guidance Panel
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Roth Conversion Guidance */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10 space-y-2">
            <div className="flex justify-between items-start">
              <h5 className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                Roth Conversion Capacity
              </h5>
              <span className="text-[9px] uppercase font-mono font-black text-blue-500 bg-blue-100/50 dark:bg-blue-905/30 px-1.5 py-0.5 rounded">
                Ordinary Bracket Target
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                ${Math.round(optimization.maxRecommendedRothConversion).toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Maximum recommended</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              To keep your ordinary income within your preferred <strong>{Math.round(targetOrdinaryBracket * 100)}%</strong> tax bracket (limit of <strong>${Math.round(optimization.targetOrdinaryGrossLimit).toLocaleString()}</strong>), you should execute a maximum Roth conversion of <strong className="font-mono text-blue-650 dark:text-blue-300">${Math.round(optimization.maxRecommendedRothConversion).toLocaleString()}</strong>.
            </p>
          </div>

          {/* Capital Gains Guidance */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
            <div className="flex justify-between items-start">
              <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                Taxable Rebalancing Capacity
              </h5>
              <span className="text-[9px] uppercase font-mono font-black text-emerald-500 bg-emerald-100/50 dark:bg-emerald-905/30 px-1.5 py-0.5 rounded">
                LTCG Bracket Target
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {optimization.maxRecommendedStockSale === Infinity ? 'Unlimited' : `$${Math.round(optimization.maxRecommendedStockSale).toLocaleString()}`}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Max stock sale capacity</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              At an estimated portfolio cost basis of <strong>{Math.round(taxableAccountCostBasisPct * 100)}%</strong>, you may sell up to <strong className="font-mono text-emerald-650 dark:text-emerald-300">{optimization.maxRecommendedStockSale === Infinity ? 'Unlimited' : `$${Math.round(optimization.maxRecommendedStockSale).toLocaleString()}`}</strong> in stock without pushing your capital gains out of the target <strong>{Math.round(targetLTCGBracket * 100)}%</strong> capital gains bracket.
            </p>
          </div>
        </div>

        {/* Informational Warning */}
        <div className="mt-4 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-start gap-2.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-zinc-700 dark:text-zinc-300">Strategy Insight:</span> Ordinary income is stacked first, acting as the bedrock of your tax structure. Because ordinary income fills the lower brackets, every dollar of traditional distribution or Roth conversion directly reduces the remaining 0% LTCG limit room. Prioritize Roth conversions up to the 12% Ordinary limit first, then harvest LTCG gains in the remaining headroom.
          </div>
        </div>
      </div>
    </div>
  );
}
