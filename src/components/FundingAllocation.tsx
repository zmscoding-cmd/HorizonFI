import React, { useMemo, useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Plus, Copy, Trash2, X, Sliders, AlertTriangle, Percent, DollarSign, Lock } from 'lucide-react';
import TaxDashboardView from './TaxDashboardView';

export default function FundingAllocation({ plan, db, userId, handleRunSimulation }: any) {
  const { theme } = useTheme();
  
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const [assets, setAssets] = useState<any[]>([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Modal State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioBudget, setNewScenarioBudget] = useState<number>(80000);
  const [newScenarioRoth, setNewScenarioRoth] = useState<number>(0);
  const [newScenarioCapGains, setNewScenarioCapGains] = useState<number>(0);
  const [newScenarioFunding, setNewScenarioFunding] = useState<{ accountId: string; amount: number; taxType: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<string>('');

  useEffect(() => {
    if (!db || !userId) return;
    const sub = db.tax_planning_scenarios.find({ selector: { userId } }).$.subscribe((list: any[]) => {
      setScenarios(list || []);
      if (!activeScenarioId && list && list.length > 0) {
        const baseline = list.find((s: any) => s.isLocked) || list[0];
        setActiveScenarioId(baseline.id);
      }
    });
    return () => sub.unsubscribe();
  }, [db, userId, activeScenarioId]);

  useEffect(() => {
    if (!db || !userId) return;
    const sub = db.assets.find({ selector: { userId } }).$.subscribe((list: any[]) => setAssets(list || []));
    return () => sub.unsubscribe();
  }, [db, userId]);

  const activeScenario = useMemo(() => {
    return scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  const isBaseline = activeScenario?.isLocked;

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

      setIsCreating(false);
      setNewScenarioName('');
      setNewScenarioBudget(80000);
      setNewScenarioRoth(0);
      setNewScenarioCapGains(0);
      setNewScenarioFunding([]);
      setActiveScenarioId(newId);
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
      setActiveScenarioId(newId);
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
        if (activeScenarioId === id) {
          const baseline = scenarios.find(s => s.isLocked) || scenarios[0];
          setActiveScenarioId(baseline?.id || '');
        }
      }
    } catch (err) {
      console.error('Error deleting scenario:', err);
    }
  };

  const addFundingSourceModal = () => {
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

  // Live Scenario Edit Handlers
  const handleUpdateActiveScenario = async (updates: any) => {
    if (!db || !activeScenario || activeScenario.isLocked) return;
    try {
      const doc = await db.tax_planning_scenarios.findOne(activeScenario.id).exec();
      if (doc) {
        await doc.patch({
          ...updates,
          updatedAt: Date.now()
        });
      }
    } catch(err) {
      console.error("Failed to update scenario", err);
    }
  };

  const handleLiveAddFundingSource = async () => {
    if (isBaseline || !selectedAccountId || !fundingAmount || Number(fundingAmount) <= 0) return;
    const currentSources = activeScenario?.fundingSources || [];
    if (currentSources.some((f: any) => f.accountId === selectedAccountId)) return;
    const selectedAsset = assets.find(a => a.id === selectedAccountId);
    
    await handleUpdateActiveScenario({
      fundingSources: [
        ...currentSources,
        { accountId: selectedAccountId, amount: Number(fundingAmount), taxType: selectedAsset?.assetType || 'Unknown' }
      ]
    });
    setSelectedAccountId('');
    setFundingAmount('');
  };

  const handleLiveRemoveFundingSource = async (accountId: string) => {
    if (isBaseline) return;
    const currentSources = activeScenario?.fundingSources || [];
    await handleUpdateActiveScenario({
      fundingSources: currentSources.filter((f: any) => f.accountId !== accountId)
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. SCENARIO MANAGEMENT HEADER */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-2xl p-4 shadow-sm transition-colors ${isBaseline ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/40' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Active Planning Scenario
          </label>
          <div className="flex items-center gap-3">
            <select
              value={activeScenarioId}
              onChange={(e) => setActiveScenarioId(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-sm rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-100 font-medium focus:outline-none focus:border-blue-500 transition-colors min-h-[44px] min-w-[200px] cursor-pointer"
            >
              {scenarios.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} {sc.isLocked ? '(Baseline)' : ''}
                </option>
              ))}
            </select>
            {isBaseline && (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800">
                <Lock size={12} /> Baseline (Read-Only)
              </span>
            )}
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

      {/* 2. LIVE SCENARIO INPUTS */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 rounded-2xl border transition-colors ${isBaseline ? 'bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 opacity-70' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm'}`}>
        {/* Left Column: Strategic Tax Events */}
        <div className="space-y-4 relative">
          {isBaseline && <div className="absolute inset-0 z-10 cursor-not-allowed"></div>}
          
          <div>
             <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Strategic Tax Events</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure hypothetical tax events for this scenario.</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Target Budget Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-3 text-sm text-zinc-400 font-bold">$</span>
                <input 
                  type="number" min="0"
                  value={activeScenario?.targetBudgetAmount || 0}
                  onChange={e => handleUpdateActiveScenario({ targetBudgetAmount: Math.max(0, Number(e.target.value)) })}
                  disabled={isBaseline}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-blue-500 transition-colors min-h-[44px] disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Roth Conversion Amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-3 text-sm text-zinc-400 font-bold">$</span>
                <input 
                  type="number" min="0"
                  value={activeScenario?.strategicEvents?.rothConversionAmount || 0}
                  onChange={e => handleUpdateActiveScenario({ 
                    strategicEvents: { 
                      ...(activeScenario?.strategicEvents || {}), 
                      rothConversionAmount: Math.max(0, Number(e.target.value)) 
                    } 
                  })}
                  disabled={isBaseline}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-blue-500 transition-colors min-h-[44px] disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Targeted Cap Gains Sale</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-3 text-sm text-zinc-400 font-bold">$</span>
                <input 
                  type="number" min="0"
                  value={activeScenario?.strategicEvents?.targetedCapitalGainsSale || 0}
                  onChange={e => handleUpdateActiveScenario({ 
                    strategicEvents: { 
                      ...(activeScenario?.strategicEvents || {}), 
                      targetedCapitalGainsSale: Math.max(0, Number(e.target.value)) 
                    } 
                  })}
                  disabled={isBaseline}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-blue-500 transition-colors min-h-[44px] disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Funding Sources */}
        <div className="space-y-4 relative">
          {isBaseline && <div className="absolute inset-0 z-10 cursor-not-allowed"></div>}
          
          <div>
             <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Funding Source Allocation</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Specify asset liquidations for this budget.</p>
          </div>

          <div className="space-y-3">
             {activeScenario?.fundingSources && activeScenario.fundingSources.length > 0 ? (
               <div className="flex flex-col gap-2">
                 {activeScenario.fundingSources.map((fs: any) => {
                   const asset = assets.find(a => a.id === fs.accountId);
                   return (
                     <div key={fs.accountId} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl">
                       <div>
                         <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{asset?.name || 'Unknown Asset'}</div>
                         <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{fs.taxType}</div>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">${(fs.amount || 0).toLocaleString()}</span>
                         <button
                           disabled={isBaseline}
                           onClick={() => handleLiveRemoveFundingSource(fs.accountId)}
                           className="text-zinc-400 hover:text-red-500 transition p-1 cursor-pointer disabled:opacity-50"
                         >
                           <X size={16} />
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                 <p className="text-xs text-zinc-500 dark:text-zinc-400">No specific funding sources allocated.</p>
                 <p className="text-[10px] text-zinc-400 mt-1">Proportional baseline rates will be used.</p>
               </div>
             )}

             <div className="flex flex-col sm:flex-row items-end gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-sm">
               <div className="w-full space-y-1">
                 <label className="text-[9px] font-black uppercase text-zinc-400">Asset Source</label>
                 <select
                   value={selectedAccountId}
                   onChange={e => setSelectedAccountId(e.target.value)}
                   disabled={isBaseline}
                   className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 min-h-[44px] cursor-pointer disabled:opacity-50"
                 >
                   <option value="">Select Asset...</option>
                   {assets.map(a => (
                     <option key={a.id} value={a.id} disabled={activeScenario?.fundingSources?.some((f:any) => f.accountId === a.id)}>
                       {a.name} ({a.assetType || 'Asset'})
                     </option>
                   ))}
                 </select>
               </div>
               <div className="w-full space-y-1">
                 <label className="text-[9px] font-black uppercase text-zinc-400">Amount</label>
                 <div className="relative">
                   <span className="absolute left-2.5 top-2.5 text-zinc-400 text-xs">$</span>
                   <input
                     type="number"
                     placeholder="20000"
                     value={fundingAmount}
                     onChange={e => setFundingAmount(e.target.value)}
                     disabled={isBaseline}
                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 pl-6 text-xs text-zinc-800 dark:text-zinc-100 font-mono min-h-[44px] disabled:opacity-50"
                   />
                 </div>
               </div>
               <button
                 type="button"
                 onClick={handleLiveAddFundingSource}
                 disabled={isBaseline}
                 className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer min-h-[44px] shrink-0 disabled:opacity-50"
               >
                 Add
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* 3. VISUALIZATION DASHBOARD */}
      <TaxDashboardView 
        db={db}
        userId={userId}
        plan={plan}
        activeScenarioId={activeScenarioId}
      />

      {/* SCENARIO MANAGER MODAL */}
      {isManagerOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Scenario Manager</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Create and compare tax laboratory stress-tests.</p>
              </div>
              <button 
                onClick={() => { setIsManagerOpen(false); setIsCreating(false); }}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[40px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!isCreating ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                      Saved Scenarios ({scenarios.length})
                    </h4>
                    <button
                      onClick={() => setIsCreating(true)}
                      className="flex items-center gap-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Plus size={14} /> New Scenario
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {scenarios.map(sc => (
                      <div key={sc.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${activeScenarioId === sc.id ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {sc.isLocked && <Lock size={12} className="text-zinc-400" />}
                            <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{sc.name}</h5>
                            {activeScenarioId === sc.id && (
                              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            Budget: ${(sc.targetBudgetAmount || 0).toLocaleString()} | Roth: ${(sc.strategicEvents?.rothConversionAmount || 0).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setActiveScenarioId(sc.id); setIsManagerOpen(false); }}
                            className="text-[10px] font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors cursor-pointer min-h-[44px]"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => handleDuplicateScenario(sc)}
                            className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[40px] flex items-center justify-center"
                            title="Duplicate Scenario"
                          >
                            <Copy size={14} />
                          </button>
                          {!sc.isLocked && (
                            <button
                              onClick={() => handleDeleteScenario(sc.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[40px] flex items-center justify-center"
                              title="Delete Scenario"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateScenario} className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                      Create Laboratory Scenario
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Define a hypothetical test environment. You can add specific funding sources later in the main view.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">Scenario Name</label>
                      <input type="text" required value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} placeholder="e.g. 2029 Yacht Refit" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition min-h-[44px]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Budget Target</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                          <input type="number" min="0" required value={newScenarioBudget} onChange={e => setNewScenarioBudget(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Roth Conversion</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                          <input type="number" min="0" required value={newScenarioRoth} onChange={e => setNewScenarioRoth(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Cap Gains Sale</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3.5 text-zinc-400">$</span>
                          <input type="number" min="0" required value={newScenarioCapGains} onChange={e => setNewScenarioCapGains(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-7 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 transition min-h-[44px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:divide-zinc-800">
                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer min-h-[44px]">Cancel</button>
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer min-h-[44px]">Save Scenario</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
