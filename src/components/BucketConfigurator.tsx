import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Layers, ShieldCheck, TrendingUp } from 'lucide-react';
import { ThreeBucketConfig } from '../lib/db';

export interface BucketConfiguratorProps {
  config?: ThreeBucketConfig;
  onChange: (newConfig: ThreeBucketConfig) => void;
  targetBudget?: number;
}

export const BucketConfigurator: React.FC<BucketConfiguratorProps> = ({ 
  config, 
  onChange,
  targetBudget = 0
}) => {
  const { theme } = useTheme();
  
  const [localConfig, setLocalConfig] = useState<ThreeBucketConfig>(config || {
    bucket1LiquiditySecuredYears: 2,
    bucket2IncomeSecuredYears: 5,
    bucket3GrowthRemainingYears: 23,
    rebalancingTriggerType: 'Chronological',
    rebalancingThresholdPercent: 10
  });

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const updateField = (field: keyof ThreeBucketConfig, value: any) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
  };

  const handleBlur = () => {
    onChange(localConfig);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-5 shadow-sm space-y-6 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers size={18} className="text-blue-500 night-watch:text-red-500" />
            3-Bucket Strategy Engine
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg night-watch:text-red-300">
            Configure temporal asset-liability matching. Define how many years of your target budget are secured in liquidity (Bucket 1) and income generation (Bucket 2) to protect Bucket 3 (Growth) during negative sequence-of-returns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bucket 1 */}
        <div className="border border-emerald-100 dark:border-emerald-900/30 night-watch:border-red-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 night-watch:bg-red-950/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 night-watch:text-red-400 flex items-center gap-1.5">
              <ShieldCheck size={16} /> Bucket 1: Liquidity
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50 night-watch:bg-red-900/50 text-emerald-800 dark:text-emerald-300 night-watch:text-red-300">
              Low Risk
            </span>
          </div>
          
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 night-watch:text-red-400 uppercase tracking-wider block mb-1">Target Duration (Years)</label>
            <div className="relative">
              <input 
                type="number"
                min={0}
                step={0.5}
                value={localConfig.bucket1LiquiditySecuredYears}
                onChange={(e) => updateField('bucket1LiquiditySecuredYears', Number(e.target.value))}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-white dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 night-watch:text-red-300 min-h-[44px] focus:ring-2 focus:ring-emerald-500/50 night-watch:focus:ring-red-700/50 outline-none transition-all"
              />
            </div>
            {targetBudget > 0 && (
              <p className="text-[10px] font-mono mt-1.5 text-emerald-700 dark:text-emerald-400 night-watch:text-red-500">
                Target: {formatCurrency(targetBudget * localConfig.bucket1LiquiditySecuredYears)}
              </p>
            )}
          </div>
        </div>

        {/* Bucket 2 */}
        <div className="border border-blue-100 dark:border-blue-900/30 night-watch:border-red-900/40 bg-blue-50/50 dark:bg-blue-950/20 night-watch:bg-red-950/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 night-watch:text-red-400 flex items-center gap-1.5">
              <TrendingUp size={16} /> Bucket 2: Income
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/50 dark:bg-blue-900/50 night-watch:bg-red-900/50 text-blue-800 dark:text-blue-300 night-watch:text-red-300">
              Yield Generating
            </span>
          </div>
          
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 night-watch:text-red-400 uppercase tracking-wider block mb-1">Target Duration (Years)</label>
            <div className="relative">
              <input 
                type="number"
                min={0}
                step={0.5}
                value={localConfig.bucket2IncomeSecuredYears}
                onChange={(e) => updateField('bucket2IncomeSecuredYears', Number(e.target.value))}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-white dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 night-watch:text-red-300 min-h-[44px] focus:ring-2 focus:ring-blue-500/50 night-watch:focus:ring-red-700/50 outline-none transition-all"
              />
            </div>
            {targetBudget > 0 && (
              <p className="text-[10px] font-mono mt-1.5 text-blue-700 dark:text-blue-400 night-watch:text-red-500">
                Target: {formatCurrency(targetBudget * localConfig.bucket2IncomeSecuredYears)}
              </p>
            )}
          </div>
        </div>

        {/* Bucket 3 */}
        <div className="border border-purple-100 dark:border-purple-900/30 night-watch:border-red-900/40 bg-purple-50/50 dark:bg-purple-950/20 night-watch:bg-red-950/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300 night-watch:text-red-400 flex items-center gap-1.5">
              <Layers size={16} /> Bucket 3: Growth
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/50 dark:bg-purple-900/50 night-watch:bg-red-900/50 text-purple-800 dark:text-purple-300 night-watch:text-red-300">
              Equities/Long-term
            </span>
          </div>
          
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 night-watch:text-red-400 uppercase tracking-wider block mb-1">Long-term (Years)</label>
            <div className="relative">
              <input 
                type="number"
                min={0}
                step={1}
                value={localConfig.bucket3GrowthRemainingYears}
                onChange={(e) => updateField('bucket3GrowthRemainingYears', Number(e.target.value))}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-white dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 night-watch:text-red-300 min-h-[44px] focus:ring-2 focus:ring-purple-500/50 night-watch:focus:ring-red-700/50 outline-none transition-all"
              />
            </div>
            {targetBudget > 0 && (
              <p className="text-[10px] font-mono mt-1.5 text-purple-700 dark:text-purple-400 night-watch:text-red-500">
                Target: Residual Capital
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 night-watch:border-red-950 flex flex-col sm:flex-row sm:items-center gap-4">
         <div className="flex-1">
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 night-watch:text-red-400 uppercase tracking-wider block mb-1">Refill Trigger Strategy</label>
            <select
                value={localConfig.rebalancingTriggerType}
                onChange={(e) => {
                  updateField('rebalancingTriggerType', e.target.value);
                  setTimeout(handleBlur, 50); // Small delay to let state settle
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 night-watch:text-red-300 min-h-[44px] outline-none"
            >
              <option value="Chronological">Chronological (Annual Refill)</option>
              <option value="Threshold">Threshold (Tolerance Band)</option>
              <option value="Opportunistic">Opportunistic (Market-Triggered)</option>
            </select>
         </div>
         {localConfig.rebalancingTriggerType === 'Threshold' && (
           <div className="flex-1">
             <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 night-watch:text-red-400 uppercase tracking-wider block mb-1">Threshold (%)</label>
             <input 
                type="number"
                min={0}
                max={100}
                value={localConfig.rebalancingThresholdPercent || 10}
                onChange={(e) => updateField('rebalancingThresholdPercent', Number(e.target.value))}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-zinc-50 dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 night-watch:text-red-300 min-h-[44px] outline-none"
             />
           </div>
         )}
      </div>

    </div>
  );
};

export default BucketConfigurator;
