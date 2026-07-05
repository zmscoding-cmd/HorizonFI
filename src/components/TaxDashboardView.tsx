import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Layers, 
  Plus, 
  Copy, 
  Trash2, 
  X, 
  Lock, 
  Check, 
  Loader2, 
  Sliders, 
  Info,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface TaxDashboardViewProps {
  db: any;
  userId: string;
  plan: any;
}

interface TaxDashboardViewProps {
  db: any;
  userId: string;
  plan: any;
  activeScenarioId?: string;
}

export default function TaxDashboardView({ db, userId, plan, activeScenarioId: propScenarioId }: TaxDashboardViewProps) {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // Theming variables for charts
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#e4e4e7');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');
  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');

  // State
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(propScenarioId || '');
  useEffect(() => { if (propScenarioId) setSelectedScenarioId(propScenarioId); }, [propScenarioId]);
  const [activeScenarioResponse, setActiveScenarioResponse] = useState<any | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);

  // CRUD Modal Form State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioBudget, setNewScenarioBudget] = useState<number>(80000);
  const [newScenarioRoth, setNewScenarioRoth] = useState<number>(0);
  const [newScenarioCapGains, setNewScenarioCapGains] = useState<number>(0);
  const [newScenarioFunding, setNewScenarioFunding] = useState<{ accountId: string; amount: number; taxType: string }[]>([]);
  
  // Funding item input helper state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<string>('');

  // 1. Subscribe to scenarios
  useEffect(() => {
    if (!db || !userId) return;
    const sub = db.tax_planning_scenarios.find({ selector: { userId } }).$.subscribe((list: any[]) => {
      if (list) {
        setScenarios(list);
      }
    });
    return () => sub.unsubscribe();
  }, [db, userId]);

  // 2. Subscribe to assets
  useEffect(() => {
    if (!db || !userId) return;
    const sub = db.assets.find({ selector: { userId } }).$.subscribe((list: any[]) => {
      if (list) {
        setAssets(list);
      }
    });
    return () => sub.unsubscribe();
  }, [db, userId]);

  // 3. Default selection to Baseline
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      const baseline = scenarios.find(s => s.isLocked) || scenarios[0];
      setSelectedScenarioId(baseline.id);
    }
  }, [scenarios, selectedScenarioId]);

  const activeScenario = useMemo(() => {
    return scenarios.find(s => s.id === selectedScenarioId) || scenarios.find(s => s.isLocked) || scenarios[0];
  }, [scenarios, selectedScenarioId]);

  // 4. Hook up to Web Worker
  useEffect(() => {
    if (!activeScenario || !db || !userId) return;

    setIsComputing(true);

    const worker = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<any>) => {
      const res = event.data;
      if (res.success && res.type === 'TAX_OPTIMIZATION_RESPONSE' && res.scenarioId === activeScenario.id) {
        setActiveScenarioResponse(res.data);
        setIsComputing(false);
      } else if (res.error) {
        console.error('Tax engine worker error:', res.error);
        setIsComputing(false);
      }
    };

    // Retrieve fresh assets and post request
    db.assets.find({ selector: { userId } }).exec().then((userAssets: any[]) => {
      worker.postMessage({
        type: 'TAX_OPTIMIZATION_REQUEST',
        scenarioId: activeScenario.id,
        scenario: {
          targetBudgetAmount: Number(activeScenario.targetBudgetAmount) || 0,
          fundingSources: activeScenario.fundingSources || [],
          strategicEvents: activeScenario.strategicEvents || { rothConversionAmount: 0, targetedCapitalGainsSale: 0 }
        },
        assets: userAssets || [],
        preExistingOrdinaryIncome: 0,
        blendedCostBasisPercentage: 60.0
      });
    }).catch((err: any) => {
      console.error('Failed to load assets for worker execution:', err);
      setIsComputing(false);
    });

    return () => {
      worker.terminate();
    };
  }, [activeScenario, db, userId]);

  // CRUD handlers
  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim() || !db || !userId) return;

    try {
      const newId = `scenario-${Math.random().toString(36).substring(2, 11)}`;
      await db.tax_planning_scenarios.insert({
        id: newId,
        userId,
        name: newScenarioName.trim(),
        isLocked: false,
        targetBudgetAmount: Math.max(0, newScenarioBudget),
        fundingSources: newScenarioFunding,
        strategicEvents: {
          rothConversionAmount: Math.max(0, newScenarioRoth),
          targetedCapitalGainsSale: Math.max(0, newScenarioCapGains)
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Reset
      setIsCreating(false);
      setNewScenarioName('');
      setNewScenarioBudget(80000);
      setNewScenarioRoth(0);
      setNewScenarioCapGains(0);
      setNewScenarioFunding([]);
      setSelectedScenarioId(newId);
    } catch (err) {
      console.error('Error creating scenario:', err);
    }
  };

  const handleDuplicateScenario = async (scenario: any) => {
    if (!db || !userId) return;
    try {
      const newId = `scenario-${Math.random().toString(36).substring(2, 11)}`;
      await db.tax_planning_scenarios.insert({
        ...scenario,
        id: newId,
        name: `${scenario.name} (Copy)`,
        isLocked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setSelectedScenarioId(newId);
    } catch (err) {
      console.error('Error duplicating scenario:', err);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!db) return;
    try {
      const doc = await db.tax_planning_scenarios.findOne(id).exec();
      if (doc && !doc.isLocked) {
        await doc.remove();
        if (selectedScenarioId === id) {
          const baseline = scenarios.find(s => s.isLocked) || scenarios[0];
          setSelectedScenarioId(baseline?.id || '');
        }
      }
    } catch (err) {
      console.error('Error deleting scenario:', err);
    }
  };

  const addFundingSource = () => {
    if (!selectedAccountId || !fundingAmount || Number(fundingAmount) <= 0) return;
    if (newScenarioFunding.some(f => f.accountId === selectedAccountId)) return;

    const selectedAsset = assets.find(a => a.id === selectedAccountId);
    
    setNewScenarioFunding([
      ...newScenarioFunding,
      { accountId: selectedAccountId, amount: Number(fundingAmount), taxType: selectedAsset?.assetType || 'Unknown' }
    ]);
    setSelectedAccountId('');
    setFundingAmount('');
  };

  const removeFundingSource = (accountId: string) => {
    setNewScenarioFunding(newScenarioFunding.filter(f => f.accountId !== accountId));
  };

  // Compute Visualization values
  const grossOrdinaryIncome = useMemo(() => {
    if (!activeScenarioResponse) return 0;
    const traditional401kGross = Number(activeScenarioResponse.bucketBreakdown?.traditional401kIraGross || 0);
    const rothConversionAmount = Number(activeScenario?.strategicEvents?.rothConversionAmount || 0);
    return traditional401kGross + rothConversionAmount;
  }, [activeScenarioResponse, activeScenario]);

  const totalLtcgGains = useMemo(() => {
    if (!activeScenarioResponse) return 0;
    const gainsRatio = 1.0 - 0.6; // Assuming 60% blended cost basis
    const brokerageGains = Number(activeScenarioResponse.bucketBreakdown?.taxableBrokerageGross || 0) * gainsRatio;
    const dividendGains = Number(activeScenarioResponse.bucketBreakdown?.qualifiedDividendsGross || 0);
    return brokerageGains + dividendGains;
  }, [activeScenarioResponse]);

  // Chart data
  const chartData = useMemo(() => {
    const STANDARD_DEDUCTION = 30000;
    const stdDeductionLayer = Math.min(STANDARD_DEDUCTION, grossOrdinaryIncome);
    const taxableOrdinaryLayer = Math.max(0, grossOrdinaryIncome - STANDARD_DEDUCTION);
    const capitalGainsLayer = totalLtcgGains;

    return [
      {
        name: 'Income Stack',
        'Standard Deduction': stdDeductionLayer,
        'Taxable Ordinary Income': taxableOrdinaryLayer,
        'Capital Gains & Dividends': capitalGainsLayer
      }
    ];
  }, [grossOrdinaryIncome, totalLtcgGains]);

  // Headroom limits
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
        room: Math.max(0, STANDARD_DEDUCTION_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / STANDARD_DEDUCTION_LIMIT) * 100),
        progressBarColor: 'bg-zinc-400 dark:bg-zinc-500',
        badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
      },
      {
        name: '10% Bracket',
        limit: TEN_PERCENT_LIMIT,
        rate: '10%',
        room: Math.max(0, TEN_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TEN_PERCENT_LIMIT) * 100),
        progressBarColor: 'bg-blue-500',
        badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
      },
      {
        name: '12% Bracket',
        limit: TWELVE_PERCENT_LIMIT,
        rate: '12%',
        room: Math.max(0, TWELVE_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TWELVE_PERCENT_LIMIT) * 100),
        progressBarColor: 'bg-indigo-500',
        badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
      },
      {
        name: '22% Bracket',
        limit: TWENTY_TWO_PERCENT_LIMIT,
        rate: '22%',
        room: Math.max(0, TWENTY_TWO_PERCENT_LIMIT - grossOrdinaryIncome),
        percentUsed: Math.min(100, (grossOrdinaryIncome / TWENTY_TWO_PERCENT_LIMIT) * 100),
        progressBarColor: 'bg-violet-500',
        badgeColor: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
      }
    ];
  }, [grossOrdinaryIncome]);

  const ltcgBracketInfo = useMemo(() => {
    const STANDARD_DEDUCTION_LIMIT = 30000;
    const taxableOrdinary = Math.max(0, grossOrdinaryIncome - STANDARD_DEDUCTION_LIMIT);
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
  }, [grossOrdinaryIncome, totalLtcgGains]);

  return (
    <div id="tax-dashboard-view" className="space-y-6">
      {/* 1. Header controls (Selector & Manager trigger) */}
      {!propScenarioId && (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Tax Scenario Model
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-sm rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 font-medium focus:outline-none focus:border-blue-500 transition-colors min-h-[44px] min-w-[200px] cursor-pointer"
            >
              {scenarios.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} {sc.isLocked ? '(Baseline)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-blue-600 dark:text-zinc-100 border border-blue-200/50 dark:border-zinc-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px]"
        >
          <Sliders size={16} />
          Manage Scenarios
        </button>
      </div>

      )}
      {/* 2. Scenario Detail Cards & Calculations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Target Expense */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
            Scenario Budget
          </span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              ${(activeScenario?.targetBudgetAmount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">/ year</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Target annual net withdrawal to support expenses.
          </p>
        </div>

        {/* Card 2: Simulated Gross Outflow */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          {isComputing && (
            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-blue-500" size={20} />
            </div>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
            Simulated Gross Withdrawal
          </span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              ${Math.round(activeScenarioResponse?.grossWithdrawalTotal || 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">/ year</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Includes ordinary distributions and gross-ups required to pay tax liabilities.
          </p>
        </div>

        {/* Card 3: Est. Tax Liability */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          {isComputing && (
            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-blue-500" size={20} />
            </div>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block">
            Simulated Tax Charge
          </span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              ${Math.round(activeScenarioResponse?.totalTaxOwed || 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">/ year</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-semibold">
            Roth Conversion: <strong className="font-mono text-zinc-800 dark:text-zinc-200">${(activeScenario?.strategicEvents?.rothConversionAmount || 0).toLocaleString()}</strong>
          </p>
        </div>
      </div>

      {/* 3. Recharts - Tax Stack Bar Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
            Sequence-of-Stacking Visualization
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
            Shows how distributions stack sequentially on top of standard deductions compared to IRS tax limits.
          </p>
        </div>

        <div className="h-[200px] w-full min-h-0 min-w-0 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl p-2 border border-zinc-150 dark:border-zinc-850/40 relative">
          {isComputing && (
            <div className="absolute inset-0 bg-white/30 dark:bg-zinc-900/30 flex items-center justify-center z-10">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          )}
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
                domain={[0, Math.max(150000, grossOrdinaryIncome + totalLtcgGains + 50000)]}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                hide 
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-3 border rounded-xl shadow-lg text-xs" style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}>
                        <p className="font-bold mb-1.5 text-zinc-800 dark:text-zinc-200">Income Layering</p>
                        <div className="space-y-1">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between gap-6">
                              <span className="text-zinc-400 uppercase font-semibold text-[10px]">{entry.name}:</span>
                              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                ${Math.round(entry.value).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="Standard Deduction" stackId="a" fill="#6b7280" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Taxable Ordinary Income" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Capital Gains & Dividends" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-zinc-500 rounded" />
            <span>Standard Deduction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Taxable Ordinary Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span>Capital Gains & Dividends</span>
          </div>
        </div>
      </div>

      {/* 4. Headroom Gauges */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
              Tax Bracket Headroom & Strategic Space (2026 MFJ)
            </h5>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Current Gross Ordinary Income: <strong className="font-mono text-zinc-700 dark:text-zinc-300">${Math.round(grossOrdinaryIncome).toLocaleString()}</strong>
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
                Long-term capital gains stack on top of taxable ordinary income. If your combined taxable income exceeds <strong>$98,900 (MFJ)</strong>, any additional gains or strategic Roth conversions push your capital gains out of the 0% bracket into the <strong>15% LTCG bracket</strong>.
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

      {/* 5. ScenarioManager CRUD Modal */}
      {isManagerOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="text-blue-500" size={20} />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                  Scenario Manager
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsManagerOpen(false);
                  setIsCreating(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* List of existing scenarios */}
            {!isCreating ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                    {scenarios.length} SAVED SCENARIOS
                  </span>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px]"
                  >
                    <Plus size={16} />
                    New Scenario
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto pr-1">
                  {scenarios.map(sc => (
                    <div key={sc.id} className="py-3 flex justify-between items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 leading-none">
                            {sc.name}
                          </p>
                          {sc.isLocked && (
                            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 p-1 rounded-md">
                              <Lock size={10} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          Budget: ${sc.targetBudgetAmount?.toLocaleString()} | Roth: ${sc.strategicEvents?.rothConversionAmount?.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicateScenario(sc)}
                          title="Duplicate scenario"
                          className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        >
                          <Copy size={16} />
                        </button>
                        
                        {!sc.isLocked && (
                          <button
                            onClick={() => handleDeleteScenario(sc.id)}
                            title="Delete scenario"
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Create Scenario Form */
              <form onSubmit={handleCreateScenario} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                    Scenario Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newScenarioName}
                    onChange={e => setNewScenarioName(e.target.value)}
                    placeholder="e.g., Aggressive Roth Conversion"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      Target Annual Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newScenarioBudget}
                        onChange={e => setNewScenarioBudget(Number(e.target.value))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      Roth Conversion Target
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newScenarioRoth}
                        onChange={e => setNewScenarioRoth(Number(e.target.value))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      Targeted Cap Gains Sale
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newScenarioCapGains}
                        onChange={e => setNewScenarioCapGains(Number(e.target.value))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Funding Sources configuration */}
                <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                      Funding Allocation Sources
                    </h4>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      (Optional) Specifying assets models the budget allocation. If blank, baseline proportional rates apply.
                    </p>
                  </div>

                  {/* Configured sources */}
                  {newScenarioFunding.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-1">
                      {newScenarioFunding.map(f => {
                        const asset = assets.find(a => a.id === f.accountId);
                        return (
                          <div 
                            key={f.accountId} 
                            className="bg-blue-50/50 dark:bg-zinc-800 border border-blue-200/40 dark:border-zinc-700 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-2"
                          >
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {asset?.name || 'Asset'} ({f.taxType}):
                            </span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              ${f.amount.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFundingSource(f.accountId)}
                              className="text-zinc-400 hover:text-red-500 transition cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add funding form elements */}
                  <div className="flex flex-col sm:flex-row items-end gap-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 p-3 rounded-2xl">
                    <div className="w-full space-y-1">
                      <label className="text-[9px] font-black uppercase text-zinc-400">
                        Asset Source
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 min-h-[40px] cursor-pointer"
                      >
                        <option value="">Select Asset...</option>
                        {assets.map(a => (
                          <option key={a.id} value={a.id} disabled={newScenarioFunding.some(f => f.accountId === a.id)}>
                            {a.name} ({a.assetType || 'Asset'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full space-y-1">
                      <label className="text-[9px] font-black uppercase text-zinc-400">
                        Funding Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-zinc-400 text-xs">$</span>
                        <input
                          type="number"
                          placeholder="e.g. 20000"
                          value={fundingAmount}
                          onChange={e => setFundingAmount(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 pl-6 text-xs text-zinc-800 dark:text-zinc-100 font-mono min-h-[40px]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addFundingSource}
                      className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer min-h-[40px] shrink-0"
                    >
                      Add Source
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:divide-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer min-h-[44px]"
                  >
                    Save Scenario
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
