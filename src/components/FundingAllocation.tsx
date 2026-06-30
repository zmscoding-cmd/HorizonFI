import React, { useMemo, useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useTheme } from './ThemeProvider';
import { AlertTriangle, Percent, DollarSign } from 'lucide-react';
import { evaluateMultiBucketTax } from '../workers/simulation.worker';

export default function FundingAllocation({ plan, activeScenario, db, userId, handleRunSimulation }: any) {
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
  
  const [targetNetExpense, setTargetNetExpense] = useState(0);

  // Retrieve Strategic Tax Events
  const [taxEvents, setTaxEvents] = useState({
    targetRothConversionAmount: 0,
    taxableRebalancingSaleAmount: 0,
    rebalancingCapitalGainPercentage: 0
  });

  useEffect(() => {
    if (!db || !userId) return;

    // Subscribe to budget document to get tax events
    const query = db.budgets.findOne({ selector: { userId } });
    const subscription = query.$.subscribe((budgetDoc: any) => {
      if (budgetDoc) {
        setTargetNetExpense(budgetDoc.totalPlaintextAnnual || 0);
        setTaxEvents({
          targetRothConversionAmount: budgetDoc.targetRothConversionAmount || 0,
          taxableRebalancingSaleAmount: budgetDoc.taxableRebalancingSaleAmount || 0,
          rebalancingCapitalGainPercentage: budgetDoc.rebalancingCapitalGainPercentage || 0
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [db, userId]);

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

  const taxOutput = useMemo(() => {
    if (!buckets) return null;
    return evaluateMultiBucketTax({
      targetNetExpense,
      allocationMode,
      buckets,
      blendedCostBasisPercentage: basis || 60.0,
      preExistingOrdinaryIncome: 0,
      targetRothConversionAmount: taxEvents.targetRothConversionAmount,
      taxableRebalancingSaleAmount: taxEvents.taxableRebalancingSaleAmount,
      rebalancingCapitalGainPercentage: taxEvents.rebalancingCapitalGainPercentage
    });
  }, [targetNetExpense, allocationMode, buckets, basis, taxEvents]);

  const baselineTaxOutput = useMemo(() => {
    if (!buckets) return null;
    return evaluateMultiBucketTax({
      targetNetExpense,
      allocationMode,
      buckets,
      blendedCostBasisPercentage: basis || 60.0,
      preExistingOrdinaryIncome: 0,
      targetRothConversionAmount: 0,
      taxableRebalancingSaleAmount: 0,
      rebalancingCapitalGainPercentage: 0
    });
  }, [targetNetExpense, allocationMode, buckets, basis]);

  const rothConversionOnlyTaxOutput = useMemo(() => {
    if (!buckets) return null;
    return evaluateMultiBucketTax({
      targetNetExpense,
      allocationMode,
      buckets,
      blendedCostBasisPercentage: basis || 60.0,
      preExistingOrdinaryIncome: 0,
      targetRothConversionAmount: taxEvents.targetRothConversionAmount,
      taxableRebalancingSaleAmount: 0,
      rebalancingCapitalGainPercentage: 0
    });
  }, [targetNetExpense, allocationMode, buckets, basis, taxEvents.targetRothConversionAmount]);

  const rebalancingOnlyTaxOutput = useMemo(() => {
    if (!buckets) return null;
    return evaluateMultiBucketTax({
      targetNetExpense,
      allocationMode,
      buckets,
      blendedCostBasisPercentage: basis || 60.0,
      preExistingOrdinaryIncome: 0,
      targetRothConversionAmount: 0,
      taxableRebalancingSaleAmount: taxEvents.taxableRebalancingSaleAmount,
      rebalancingCapitalGainPercentage: taxEvents.rebalancingCapitalGainPercentage
    });
  }, [targetNetExpense, allocationMode, buckets, basis, taxEvents.taxableRebalancingSaleAmount, taxEvents.rebalancingCapitalGainPercentage]);

  const strategicTaxImpacts = useMemo(() => {
    if (!taxOutput || !baselineTaxOutput || !rothConversionOnlyTaxOutput || !rebalancingOnlyTaxOutput) {
      return { rothTaxImpact: 0, rebalancingTaxImpact: 0, synergisticImpact: 0, totalStrategicTaxImpact: 0, hasEvents: false };
    }
    const hasRoth = taxEvents.targetRothConversionAmount > 0;
    const hasRebalance = taxEvents.taxableRebalancingSaleAmount > 0;
    const hasEvents = hasRoth || hasRebalance;

    const baseTax = baselineTaxOutput.totalTaxOwed;
    const rothTaxImpact = Math.max(0, rothConversionOnlyTaxOutput.totalTaxOwed - baseTax);
    const rebalancingTaxImpact = Math.max(0, rebalancingOnlyTaxOutput.totalTaxOwed - baseTax);
    
    // Total added tax due to both events
    const totalStrategicTaxImpact = Math.max(0, taxOutput.totalTaxOwed - baseTax);
    
    // Any tax increase beyond the sum of individual impacts (bracket stacking effect)
    const synergisticImpact = Math.max(0, totalStrategicTaxImpact - rothTaxImpact - rebalancingTaxImpact);

    return {
      rothTaxImpact,
      rebalancingTaxImpact,
      synergisticImpact,
      totalStrategicTaxImpact,
      hasEvents
    };
  }, [taxOutput, baselineTaxOutput, rothConversionOnlyTaxOutput, rebalancingOnlyTaxOutput, taxEvents]);

  const chartData = useMemo(() => {
    if (!taxOutput) return [];
    return [
      { name: 'Traditional 401k/IRA', value: Number(taxOutput.netBreakdown.traditional401kIraNet || 0), color: '#3b82f6' },
      { name: 'Taxable Brokerage', value: Number(taxOutput.netBreakdown.taxableBrokerageNet || 0), color: '#8b5cf6' },
      { name: 'Qualified Dividends', value: Number(taxOutput.netBreakdown.qualifiedDividendsNet || 0), color: '#f59e0b' },
      { name: 'Roth IRA', value: Number(taxOutput.netBreakdown.rothIraNet || 0), color: '#10b981' },
      { name: 'Gifts/Cash', value: Number(taxOutput.netBreakdown.nonTaxableGiftNet || 0), color: '#6b7280' },
      { name: 'Est. Taxes', value: Number(taxOutput.totalTaxOwed || 0), color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [taxOutput]);

  const grossOrdinaryIncome = useMemo(() => {
    if (!taxOutput) return 0;
    return Number(taxOutput.bucketBreakdown.traditional401kIraGross || 0) + Number(taxEvents.targetRothConversionAmount || 0);
  }, [taxOutput, taxEvents.targetRothConversionAmount]);

  const ordinaryBracketInfo = useMemo(() => {
    const STANDARD_DEDUCTION_LIMIT = 30000;
    const TEN_PERCENT_LIMIT = 53200;
    const TWELVE_PERCENT_LIMIT = 124300;
    const TWENTY_TWO_PERCENT_LIMIT = 231050;

    return [
      {
        name: 'Standard Deduction (0%)',
        limit: STANDARD_DEDUCTION_LIMIT,
        rate: '0%',
        current: grossOrdinaryIncome,
        room: Math.max(0, STANDARD_DEDUCTION_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / STANDARD_DEDUCTION_LIMIT) * 100),
        color: 'bg-zinc-500/30',
        progressBarColor: 'bg-zinc-400 dark:bg-zinc-500',
        badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
      },
      {
        name: '10% Bracket',
        limit: TEN_PERCENT_LIMIT,
        rate: '10%',
        current: grossOrdinaryIncome,
        room: Math.max(0, TEN_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TEN_PERCENT_LIMIT) * 100),
        color: 'bg-blue-500/40',
        progressBarColor: 'bg-blue-500',
        badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
      },
      {
        name: '12% Bracket',
        limit: TWELVE_PERCENT_LIMIT,
        rate: '12%',
        current: grossOrdinaryIncome,
        room: Math.max(0, TWELVE_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TWELVE_PERCENT_LIMIT) * 100),
        color: 'bg-indigo-500/40',
        progressBarColor: 'bg-indigo-500',
        badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
      },
      {
        name: '22% Bracket',
        limit: TWENTY_TWO_PERCENT_LIMIT,
        rate: '22%',
        current: grossOrdinaryIncome,
        room: Math.max(0, TWENTY_TWO_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TWENTY_TWO_PERCENT_LIMIT) * 100),
        color: 'bg-violet-500/40',
        progressBarColor: 'bg-violet-500',
        badgeColor: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
      }
    ];
  }, [grossOrdinaryIncome]);

  const ltcgBracketInfo = useMemo(() => {
    const STANDARD_DEDUCTION_LIMIT = 30000;
    const taxableOrdinary = Math.max(0, grossOrdinaryIncome - STANDARD_DEDUCTION_LIMIT);
    const gainsRatio = Math.max(0, Math.min(1, 1.0 - (basis / 100)));
    const brokerageGains = Number(taxOutput?.bucketBreakdown?.taxableBrokerageGross || 0) * gainsRatio;
    const dividendGains = Number(taxOutput?.bucketBreakdown?.qualifiedDividendsGross || 0);
    const rebalancingGains = Number(taxEvents.taxableRebalancingSaleAmount || 0) * (Number(taxEvents.rebalancingCapitalGainPercentage || 0) / 100);
    const totalLtcgGains = brokerageGains + dividendGains + rebalancingGains;
    
    const combinedTaxableIncome = taxableOrdinary + totalLtcgGains;
    const ltcgLimit = 98900;
    const ltcgRoom = Math.max(0, ltcgLimit - combinedTaxableIncome);
    const ltcgPercentUsed = Math.min(100, (combinedTaxableIncome / ltcgLimit) * 100);

    return {
      taxableOrdinary,
      totalLtcgGains,
      combinedTaxableIncome,
      limit: ltcgLimit,
      room: ltcgRoom,
      percentUsed: ltcgPercentUsed,
      isExceeded: combinedTaxableIncome >= ltcgLimit
    };
  }, [grossOrdinaryIncome, taxOutput, basis, taxEvents]);

  // Custom label rendering for persistent slices without hover
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Offset the label slightly outside the pie
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    let displayValue = '';
    const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);
    const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
    displayValue = `${percentage}% ($${Math.round(value).toLocaleString()})`;

    // Elegant short alias labels
    let shortName = name;
    if (shortName === 'Traditional 401k/IRA') shortName = '401k';
    if (shortName === 'Taxable Brokerage') shortName = 'Brokerage';
    if (shortName === 'Qualified Dividends') shortName = 'Dividends';
    if (shortName === 'Gifts/Cash') shortName = 'Gifts';
    if (shortName === 'Est. Taxes') shortName = 'Taxes';

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? '#e4e4e7' : '#18181b'}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="text-[9px] sm:text-[10px] font-semibold"
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
              targetNetExpense={targetNetExpense}
              onChange={(val: number) => handleUpdate('traditional401kIra', val, true)}
            />
            <BucketInput 
              label="Taxable Brokerage"
              field="taxableBrokerage"
              value={buckets.taxableBrokerage}
              mode={allocationMode}
              targetNetExpense={targetNetExpense}
              onChange={(val: number) => handleUpdate('taxableBrokerage', val, true)}
            />
            <BucketInput 
              label="Qualified Dividends"
              field="qualifiedDividends"
              value={buckets.qualifiedDividends}
              mode={allocationMode}
              targetNetExpense={targetNetExpense}
              onChange={(val: number) => handleUpdate('qualifiedDividends', val, true)}
            />
            <BucketInput 
              label="Roth IRA"
              field="rothIra"
              value={buckets.rothIra}
              mode={allocationMode}
              targetNetExpense={targetNetExpense}
              onChange={(val: number) => handleUpdate('rothIra', val, true)}
            />
            <BucketInput 
              label="Gifts / Liquid Cash"
              field="nonTaxableGift"
              value={buckets.nonTaxableGift}
              mode={allocationMode}
              targetNetExpense={targetNetExpense}
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
          {targetNetExpense > 0 && allocationMode === 'PERCENTAGE' && (
            <div className="text-center mb-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Extrapolating Budget</span>
              <div className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                ${targetNetExpense.toLocaleString()} Net / Yr
              </div>
            </div>
          )}
          {chartData.length > 0 ? (
            <div className="flex-1 w-full min-h-0 min-w-0">
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
                    formatter={(value: number) => {
                      if (allocationMode === 'PERCENTAGE') {
                        if (targetNetExpense > 0) {
                          const extrapolatedDollars = (value / 100) * targetNetExpense;
                          return `${value}% ($${Math.round(extrapolatedDollars).toLocaleString()})`;
                        }
                        return `${value}%`;
                      }
                      return `$${value.toLocaleString()}`;
                    }}
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
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-xs text-zinc-400">Awaiting funding inputs...</p>
            </div>
          )}
        </div>
      </div>

      {/* Gross-Up Projection Section */}
      {taxOutput && (
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 p-5 bg-zinc-50/30 dark:bg-zinc-950/20 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
            <div>
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                Calculated Pre-Tax Gross-Up & Tax Projections (Current Year)
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Solves the multi-variable convergence loop to cover tax drag on Traditional & Brokerage pools.
              </p>
            </div>
            <div className="flex items-center gap-3 self-stretch md:self-auto">
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-4 py-2 text-center shadow-sm">
                <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">Effective Rate</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                  {taxOutput.grossWithdrawalTotal > 0 ? ((taxOutput.totalTaxOwed / taxOutput.grossWithdrawalTotal) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-4 py-2 text-center shadow-sm">
                <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-tight">Total Taxes Owed</span>
                <span className="text-sm font-black text-red-600 dark:text-red-400 font-mono">
                  ${taxOutput.totalTaxOwed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex-1 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-900/30 rounded-xl px-4 py-2 text-center">
                <span className="block text-[10px] font-bold text-blue-500 dark:text-blue-450 uppercase tracking-widest leading-tight">Gross Withdrawal</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                  ${taxOutput.grossWithdrawalTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-5">
            <GrossUpBucketCard
              name="Traditional 401k/IRA"
              badge="Ordinary Income (10-12% Bracket)"
              net={taxOutput.netBreakdown.traditional401kIraNet}
              gross={taxOutput.bucketBreakdown.traditional401kIraGross}
              tax={Math.max(0, taxOutput.bucketBreakdown.traditional401kIraGross - taxOutput.netBreakdown.traditional401kIraNet)}
              color="border-blue-500/25 dark:border-blue-500/15"
              textColor="text-blue-600 dark:text-blue-400"
            />
            <GrossUpBucketCard
              name="Taxable Brokerage"
              badge={`Capital Gains (${100 - (basis || 60)}% gains ratio)`}
              net={taxOutput.netBreakdown.taxableBrokerageNet}
              gross={taxOutput.bucketBreakdown.taxableBrokerageGross}
              tax={Math.max(0, taxOutput.bucketBreakdown.taxableBrokerageGross - taxOutput.netBreakdown.taxableBrokerageNet)}
              color="border-violet-500/25 dark:border-violet-500/15"
              textColor="text-violet-600 dark:text-violet-400"
            />
            <GrossUpBucketCard
              name="Qualified Dividends"
              badge="Tax-Stacked 0% Bracket"
              net={taxOutput.netBreakdown.qualifiedDividendsNet}
              gross={taxOutput.bucketBreakdown.qualifiedDividendsGross}
              tax={Math.max(0, taxOutput.bucketBreakdown.qualifiedDividendsGross - taxOutput.netBreakdown.qualifiedDividendsNet)}
              color="border-amber-500/25 dark:border-amber-500/15"
              textColor="text-amber-600 dark:text-amber-400"
            />
            <GrossUpBucketCard
              name="Roth IRA"
              badge="Tax-Free Source"
              net={taxOutput.netBreakdown.rothIraNet}
              gross={taxOutput.bucketBreakdown.rothIraGross}
              tax={0}
              color="border-emerald-500/25 dark:border-emerald-500/15"
              textColor="text-emerald-600 dark:text-emerald-400"
              isTaxFree
            />
            <GrossUpBucketCard
              name="Gifts / Liquid Cash"
              badge="Non-Taxable Source"
              net={taxOutput.netBreakdown.nonTaxableGiftNet}
              gross={taxOutput.bucketBreakdown.nonTaxableGiftGross}
              tax={0}
              color="border-zinc-500/25 dark:border-zinc-500/15"
              textColor="text-zinc-600 dark:text-zinc-400"
              isTaxFree
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Column 1: Strategic Tax Events Impact */}
            <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 text-sm flex flex-col justify-between">
              <div>
                <h5 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-zinc-700 dark:text-zinc-300">Strategic Tax Events Marginal Impact</h5>
                {strategicTaxImpacts.hasEvents ? (
                  <div className="space-y-2.5">
                    {taxEvents.targetRothConversionAmount > 0 && (
                      <div className="p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 dark:border-blue-500/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">Roth Conversion Target</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 font-bold">${taxEvents.targetRothConversionAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800/40">
                          <span className="text-zinc-500 dark:text-zinc-400">Marginal Tax Owed</span>
                          <span className="font-mono font-black text-red-600 dark:text-red-400">+${Math.round(strategicTaxImpacts.rothTaxImpact).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {taxEvents.taxableRebalancingSaleAmount > 0 && (
                      <div className="p-3 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/15 dark:border-violet-500/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">Taxable Rebalancing Sale</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 font-bold">${taxEvents.taxableRebalancingSaleAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-zinc-400 dark:text-zinc-500">Modeled Capital Gain (%)</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400">{taxEvents.rebalancingCapitalGainPercentage}%</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800/40">
                          <span className="text-zinc-500 dark:text-zinc-400">Marginal Tax Owed</span>
                          <span className="font-mono font-black text-red-600 dark:text-red-400">+${Math.round(strategicTaxImpacts.rebalancingTaxImpact).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {taxEvents.targetRothConversionAmount > 0 && taxEvents.taxableRebalancingSaleAmount > 0 && strategicTaxImpacts.synergisticImpact > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px] text-zinc-600 dark:text-zinc-400 flex justify-between items-center">
                        <span className="italic">Bracket Creep Interaction:</span>
                        <span className="font-mono font-black text-red-500">+${Math.round(strategicTaxImpacts.synergisticImpact).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center px-4 py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/10">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No active Strategic Tax Events found</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px] leading-relaxed">
                      Add Roth Conversions or Taxable Rebalancing Sales in Planned Expenses to isolate and project their marginal tax impact.
                    </p>
                  </div>
                )}
              </div>

              {strategicTaxImpacts.hasEvents && (
                <div className="mt-4 pt-3 border-t border-zinc-250 dark:border-zinc-800 flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Total Strategic Marginal Tax Drag:</span>
                  <span className="font-mono text-sm font-black text-red-600 dark:text-red-400">
                    ${Math.round(strategicTaxImpacts.totalStrategicTaxImpact).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Column 2: How the Tax Engine works */}
            <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 text-sm">
              <h5 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-zinc-700 dark:text-zinc-300">How the Tax Engine works</h5>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <li className="flex gap-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                  <span><strong>Ordinary Income:</strong> Traditional 401k/IRA distributions (and strategic Roth Conversions) are stacked first, filling the standard deduction ($29,200 MFJ) and lower tax brackets sequentially.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                  <span><strong>Capital Gains:</strong> Taxable Brokerage sales are split into cost basis and capital gains (currently modeled at a {100 - (basis || 60)}% gains ratio). Only the gains portion is stacked on top of your ordinary income to determine if it falls in the 0% or 15% Long-Term Capital Gains (LTCG) bracket.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500 dark:text-blue-400 font-bold">•</span>
                  <span><strong>Gross-Up Convergence:</strong> If taxes are owed on the net targets you set above, the engine iteratively "grosses-up" your Traditional and Brokerage withdrawals, calculating the recursive tax drag until the exact net target is reached.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Tax Bracket Headroom Section */}
          <div className="mt-5 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30 text-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h5 className="text-[11px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                  Tax Bracket Headroom & Strategic Space (2026 MFJ)
                </h5>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Current Gross Ordinary Income: <strong className="font-mono text-zinc-700 dark:text-zinc-300">${Math.round(grossOrdinaryIncome).toLocaleString()}</strong> (includes Traditional distributions & Roth Conversions)
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                <span>Standard Deduction: $30,000</span>
              </div>
            </div>

            {/* Ordinary Income Brackets Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {ordinaryBracketInfo.map((bracket, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-950/5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{bracket.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${bracket.badgeColor}`}>
                        {bracket.rate}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono flex justify-between">
                      <span>Threshold:</span>
                      <span>${bracket.limit.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${bracket.progressBarColor} transition-all duration-500`}
                        style={{ width: `${bracket.percentUsed}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] mt-1.5">
                      <span className="text-zinc-400 uppercase font-bold">Strategic Room</span>
                      <span className={`font-mono font-bold ${bracket.room > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {bracket.room > 0 ? `$${Math.round(bracket.room).toLocaleString()}` : 'Filled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* LTCG Stacking Room Box */}
            <div className={`p-3.5 rounded-xl border ${ltcgBracketInfo.isExceeded ? 'bg-amber-500/5 border-amber-500/20 dark:border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/10'} text-xs`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ltcgBracketInfo.isExceeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <h6 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      Capital Gains 0% Bracket Stacking Room
                    </h6>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    Long-term capital gains (dividends & brokerage sales) stack on top of taxable ordinary income. If your combined taxable income exceeds <strong>$98,900 (MFJ)</strong>, any additional gains or strategic Roth conversions push your capital gains out of the 0% bracket into the <strong>15% LTCG bracket</strong>.
                  </p>
                </div>
                <div className="text-right self-stretch md:self-auto min-w-[150px] p-2.5 rounded-xl bg-white/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">
                    0% Room Left
                  </span>
                  <span className={`text-base font-black font-mono leading-none ${ltcgBracketInfo.isExceeded ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ${Math.round(ltcgBracketInfo.room).toLocaleString()}
                  </span>
                  <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                    Combined Taxable: ${Math.round(ltcgBracketInfo.combinedTaxableIncome).toLocaleString()} / $98,900
                  </span>
                </div>
              </div>

              {/* Progress bar for Combined Income */}
              <div className="mt-3">
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${ltcgBracketInfo.isExceeded ? 'bg-amber-500' : 'bg-emerald-500'} transition-all duration-500`}
                    style={{ width: `${ltcgBracketInfo.percentUsed}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] mt-1.5 text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>Taxable Ordinary: ${Math.round(ltcgBracketInfo.taxableOrdinary).toLocaleString()}</span>
                  <span>+ Taxable LTCG Gains: ${Math.round(ltcgBracketInfo.totalLtcgGains).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GrossUpBucketCard({ name, badge, net, gross, tax, color, textColor, isTaxFree }: any) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border ${color} rounded-xl p-3 shadow-sm flex flex-col justify-between transition-colors`}>
      <div>
        <h5 className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200 leading-tight">{name}</h5>
        <span className="inline-block text-[8px] font-black tracking-widest uppercase text-zinc-400 dark:text-zinc-500 mt-1 leading-none">
          {badge}
        </span>
      </div>
      
      <div className="mt-4 space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-400 uppercase font-bold">Net Outflow</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">${Math.round(net).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-400 uppercase font-bold">Gross Outflow</span>
          <span className={`${textColor} font-bold font-mono`}>${Math.round(gross).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] border-t border-zinc-100 dark:border-zinc-800/80 pt-1 mt-1">
          <span className="text-zinc-400 uppercase font-bold">Tax Charge</span>
          <span className={`font-mono font-black ${isTaxFree ? 'text-emerald-500' : 'text-red-500'}`}>
            {isTaxFree ? 'Tax-Free' : `$${Math.round(tax).toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function BucketInput({ label, field, value, mode, targetNetExpense, onChange }: any) {
  const extrapolatedDollars = useMemo(() => {
    if (mode === 'PERCENTAGE' && targetNetExpense > 0) {
      return (Number(value || 0) / 100) * targetNetExpense;
    }
    return null;
  }, [value, mode, targetNetExpense]);

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{label}</label>
        {extrapolatedDollars !== null && (
          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
            ≈ ${Math.round(extrapolatedDollars).toLocaleString()}
          </span>
        )}
      </div>
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

