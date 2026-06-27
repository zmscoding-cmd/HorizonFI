import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useTheme } from './ThemeProvider';
import { AlertTriangle, Percent, DollarSign } from 'lucide-react';

export default function FundingAllocation({ plan, activeScenario, db, handleRunSimulation }: any) {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  const budget = activeScenario?.budget || {};
  const allocationMode = budget.allocationMode || 'PERCENTAGE';
  const buckets = budget.buckets || {
    traditional401kIra: 0,
    taxableBrokerage: 0,
    qualifiedDividends: 0,
    rothIra: 0,
    nonTaxableGift: 0
  };
  const basis = budget.blendedCostBasisPercentage ?? 60.0;
  
  // Example net target based on scenario (for absolute dollar comparison if Dollar Mode)
  // Or maybe just sum the bucket inputs
  const currentYear = new Date().getFullYear();
  const currentPhase = budget.budgetPhases?.find((p: any) => currentYear >= p.startYear && currentYear <= p.endYear) || budget.budgetPhases?.[0];
  const targetNetExpense = currentPhase?.baselineAmount || 0;

  const handleUpdate = async (field: string, value: any, isBucket = false) => {
    if (!plan || !activeScenario || !db) return;
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      if (!doc) return;

      const updatedScenarios = plan.scenarios.map((s: any) => {
        if (s.id === activeScenario.id) {
          const newBudget = { ...s.budget };
          if (!newBudget.buckets) newBudget.buckets = { ...buckets };
          
          if (isBucket) {
            newBudget.buckets = { ...newBudget.buckets, [field]: value };
          } else {
            newBudget[field] = value;
          }
          return { ...s, budget: newBudget };
        }
        return s;
      });

      await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
      handleRunSimulation();
    } catch (err) {
      console.error("Failed to update funding allocation", err);
    }
  };

  const currentTotal = useMemo(() => {
    return Object.values(buckets).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
  }, [buckets]);

  const isValid = allocationMode === 'PERCENTAGE' ? currentTotal === 100 : currentTotal >= 0;

  const chartData = useMemo(() => {
    return [
      { name: 'Traditional 401k/IRA', value: Number(buckets.traditional401kIra || 0), color: '#3b82f6' },
      { name: 'Taxable Brokerage', value: Number(buckets.taxableBrokerage || 0), color: '#8b5cf6' },
      { name: 'Qualified Dividends', value: Number(buckets.qualifiedDividends || 0), color: '#f59e0b' },
      { name: 'Roth IRA', value: Number(buckets.rothIra || 0), color: '#10b981' },
      { name: 'Gifts/Cash', value: Number(buckets.nonTaxableGift || 0), color: '#6b7280' }
    ].filter(d => d.value > 0);
  }, [buckets]);

  // Custom label rendering for persistent slices without hover
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Offset the label slightly outside the pie
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    const displayValue = allocationMode === 'PERCENTAGE'
      ? `${value}%`
      : `$${value.toLocaleString()}`;

    // Elegant short alias labels
    let shortName = name;
    if (shortName === 'Traditional 401k/IRA') shortName = '401k';
    if (shortName === 'Taxable Brokerage') shortName = 'Brokerage';
    if (shortName === 'Qualified Dividends') shortName = 'Dividends';
    if (shortName === 'Gifts/Cash') shortName = 'Gifts';

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#e4e4e7' : '#18181b'}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="text-[10px] font-bold"
      >
        {`${displayValue} ${shortName}`}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm mt-6 mb-6">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Funding Source Allocation Engine
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Simulate post-tax drawdown distributions based on preferred account drawdown targets.</p>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => handleUpdate('allocationMode', 'PERCENTAGE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${allocationMode === 'PERCENTAGE' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            <Percent size={12} /> Percentages
          </button>
          <button
            onClick={() => handleUpdate('allocationMode', 'DOLLARS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${allocationMode === 'DOLLARS' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            <DollarSign size={12} /> Absolute Dollars
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BucketInput 
              label="Traditional 401k/IRA"
              field="traditional401kIra"
              value={buckets.traditional401kIra}
              mode={allocationMode}
              onChange={(val: number) => handleUpdate('traditional401kIra', val, true)}
            />
            <BucketInput 
              label="Taxable Brokerage"
              field="taxableBrokerage"
              value={buckets.taxableBrokerage}
              mode={allocationMode}
              onChange={(val: number) => handleUpdate('taxableBrokerage', val, true)}
            />
            <BucketInput 
              label="Qualified Dividends"
              field="qualifiedDividends"
              value={buckets.qualifiedDividends}
              mode={allocationMode}
              onChange={(val: number) => handleUpdate('qualifiedDividends', val, true)}
            />
            <BucketInput 
              label="Roth IRA"
              field="rothIra"
              value={buckets.rothIra}
              mode={allocationMode}
              onChange={(val: number) => handleUpdate('rothIra', val, true)}
            />
            <BucketInput 
              label="Gifts / Liquid Cash"
              field="nonTaxableGift"
              value={buckets.nonTaxableGift}
              mode={allocationMode}
              onChange={(val: number) => handleUpdate('nonTaxableGift', val, true)}
            />
            
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Blended Cost Basis (%)</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="number"
                   min="0"
                   max="100"
                   step="1"
                   value={basis || ''}
                   onChange={e => handleUpdate('blendedCostBasisPercentage', Math.max(0, Math.min(100, Number(e.target.value))))}
                   className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-blue-500 transition-colors min-h-[44px]"
                 />
                 <span className="text-xs text-zinc-400 font-mono">%</span>
               </div>
            </div>
          </div>
          
          {/* Validation Banner */}
          <div className={`p-4 mt-6 rounded-xl flex items-center justify-between border ${!isValid ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/40'}`}>
            <div className="flex items-center gap-3">
              {!isValid ? (
                <AlertTriangle className="text-red-500" size={20} />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                </div>
              )}
              <div>
                <p className={`text-xs font-bold ${!isValid ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                  {allocationMode === 'PERCENTAGE' ? 'Verification Target: 100%' : `Verification Target: $${targetNetExpense.toLocaleString()} Net`}
                </p>
                <p className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 ${!isValid ? 'text-red-500 dark:text-red-500/70' : 'text-blue-500 dark:text-blue-500/70'}`}>
                  {allocationMode === 'PERCENTAGE' 
                    ? `Current Total: ${currentTotal}%` 
                    : `Current Assigned Targets: $${currentTotal.toLocaleString()}`}
                </p>
              </div>
            </div>
            {!isValid && allocationMode === 'PERCENTAGE' && (
               <span className="text-xs font-semibold text-red-600 dark:text-red-400">Fix required</span>
            )}
          </div>

        </div>

        {/* Donut Chart */}
        <div className="w-full lg:w-[320px] h-[280px] shrink-0 mx-auto lg:mx-0 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-6 lg:pt-0 lg:pl-6">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  stroke="none"
                  label={renderCustomLabel}
                  labelLine={{
                    stroke: isDark ? '#52525b' : '#d4d4d8',
                    strokeWidth: 1,
                    strokeDasharray: '2 2'
                  }}
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => allocationMode === 'PERCENTAGE' ? `${value}%` : `$${value.toLocaleString()}`}
                  contentStyle={{
                    borderRadius: '12px',
                    border: `1px solid ${tooltipBorder}`,
                    backgroundColor: tooltipBg,
                    color: tooltipTexColor,
                    fontSize: '12px',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  itemStyle={{ color: tooltipTexColor, fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-xs text-zinc-400">Awaiting funding inputs...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BucketInput({ label, field, value, mode, onChange }: any) {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1">
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{label}</label>
      <div className="relative">
        {mode === 'DOLLARS' && <span className="absolute left-3 top-3 text-sm text-zinc-400 font-bold">$</span>}
        <input 
          type="number"
          min="0"
          value={value || ''}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          className={`w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-blue-500 transition-colors min-h-[44px] ${mode === 'DOLLARS' ? 'pl-7' : 'pr-7 text-right'}`}
        />
        {mode === 'PERCENTAGE' && <span className="absolute right-3 top-3 text-sm text-zinc-400 font-bold">%</span>}
      </div>
    </div>
  );
}
