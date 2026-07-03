import React from 'react';
import { Plus, Trash2, Calendar, Link as LinkIcon } from 'lucide-react';
import { generateUUID } from '../lib/db';

function ToggleSwitch({ checked, onChange, label, description }: any) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group min-h-[44px] py-2">
      <div className="relative flex items-center shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-500 dark:bg-blue-600 night-watch:bg-red-700' : 'bg-zinc-300 dark:bg-zinc-700 night-watch:bg-red-950/50'}`}></div>
        <div className={`absolute left-1 top-1 bg-white night-watch:bg-red-200 w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 night-watch:text-red-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400 night-watch:text-red-500/70 leading-tight mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export function MultistageModelingConfig({ activeScenario, plan, db, handleRunSimulation }: any) {
  const stages = activeScenario.stages || [];
  const milestones = activeScenario.milestones || [];

  const [stockLiquidationYear, setStockLiquidationYear] = React.useState<string>(
    String(activeScenario.bridgeStockLiquidationStartYear ?? 2030)
  );
  const [rothConversionYear, setRothConversionYear] = React.useState<string>(
    String(activeScenario.bridgeRothConversionStartYear ?? 2030)
  );

  const [rothMarginalBrackets, setRothMarginalBrackets] = React.useState<{startYear: number; endYear: number; bracket: number;}[]>(
    activeScenario.bridgeRothMarginalBrackets || []
  );

  React.useEffect(() => {
    setRothMarginalBrackets(activeScenario.bridgeRothMarginalBrackets || []);
  }, [activeScenario.bridgeRothMarginalBrackets, activeScenario.id]);

  const addRothBracket = () => {
    const newBrackets = [...rothMarginalBrackets, { startYear: 2030, endYear: 2035, bracket: 0.12 }];
    setRothMarginalBrackets(newBrackets);
    saveRothBrackets(newBrackets);
  };

  const removeRothBracket = (index: number) => {
    const newBrackets = rothMarginalBrackets.filter((_, i) => i !== index);
    setRothMarginalBrackets(newBrackets);
    saveRothBrackets(newBrackets);
  };

  const updateRothBracket = (index: number, field: string, value: number) => {
    const newBrackets = [...rothMarginalBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setRothMarginalBrackets(newBrackets);
    saveRothBrackets(newBrackets);
  };

  const saveRothBrackets = async (brackets: any[]) => {
    const doc = await db.plans.findOne(plan.id).exec();
    const updatedScenarios = plan.scenarios.map((s: any) =>
      s.id === activeScenario.id ? { ...s, bridgeRothMarginalBrackets: brackets } : s
    );
    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
    handleRunSimulation();
  };


  React.useEffect(() => {
    setStockLiquidationYear(String(activeScenario.bridgeStockLiquidationStartYear ?? 2030));
  }, [activeScenario.bridgeStockLiquidationStartYear, activeScenario.id]);

  React.useEffect(() => {
    setRothConversionYear(String(activeScenario.bridgeRothConversionStartYear ?? 2030));
  }, [activeScenario.bridgeRothConversionStartYear, activeScenario.id]);
  
  const saveStages = async (newStages: any[]) => {
    const doc = await db.plans.findOne(plan.id).exec();
    const updatedScenarios = plan.scenarios.map((s: any) =>
      s.id === activeScenario.id ? { ...s, stages: newStages } : s
    );
    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
    handleRunSimulation();
  };

  const addStage = () => {
    saveStages([...stages, {
      id: generateUUID(),
      name: `Stage ${stages.length + 1}`,
      fundingPriorities: ['taxable_brokerage'],
      startYearType: 'absolute',
      startAbsoluteYear: new Date().getFullYear(),
      includeGlobalIncomeStreams: false,
      includeAuxiliaryTaxFreeIncome: false
    }]);
  };

  const removeStage = (id: string) => {
    saveStages(stages.filter((s: any) => s.id !== id));
  };

  const updateStage = (id: string, field: string, value: any) => {
    saveStages(stages.map((s: any) => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const updatePriorities = (id: string, idx: number, value: string) => {
    saveStages(stages.map((s: any) => {
      if (s.id !== id) return s;
      const newP = [...(s.fundingPriorities || [])];
      newP[idx] = value;
      return { ...s, fundingPriorities: newP };
    }));
  };

  const addPriority = (id: string) => {
    saveStages(stages.map((s: any) => {
      if (s.id !== id) return s;
      return { ...s, fundingPriorities: [...(s.fundingPriorities || []), 'taxable_brokerage'] };
    }));
  };

  const removePriority = (id: string, idx: number) => {
    saveStages(stages.map((s: any) => {
      if (s.id !== id) return s;
      const newP = [...(s.fundingPriorities || [])];
      newP.splice(idx, 1);
      return { ...s, fundingPriorities: newP };
    }));
  };

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800">
      <div className="flex justify-between items-center min-h-[44px]">
        <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Retirement Stages</h5>
        <button
          onClick={addStage}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline focus:outline-none min-h-[44px] px-2"
        >
          <Plus size={16} /> Add Stage
        </button>
      </div>
      
      <div className="space-y-4">
        {stages.map((stage: any, sIdx: number) => {
          const type = stage.startYearType || 'absolute';
          return (
            <div key={stage.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative space-y-4">
              <div className="flex justify-between items-center mb-1">
                <input 
                  type="text" 
                  value={stage.name} 
                  onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                  className="font-bold text-lg text-zinc-900 dark:text-zinc-100 bg-transparent outline-none border-b-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 py-1 min-h-[44px] flex-1 mr-4"
                  placeholder="Stage Name"
                />
                <button 
                  onClick={() => removeStage(stage.id)} 
                  className="text-zinc-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  aria-label="Remove Stage"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 night-watch:text-red-400 block">Start Boundary</label>
                  
                  {/* Segmented Control for Boundary Type */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-900 night-watch:bg-red-950/50 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateStage(stage.id, 'startYearType', 'absolute')}
                      className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-md transition-all ${type === 'absolute' ? 'bg-white dark:bg-zinc-800 night-watch:bg-red-900 shadow text-zinc-900 dark:text-white night-watch:text-red-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 night-watch:text-red-400 night-watch:hover:text-red-300'}`}
                    >
                      <Calendar size={14} /> Absolute
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStage(stage.id, 'startYearType', 'milestone')}
                      className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-md transition-all ${type === 'milestone' ? 'bg-white dark:bg-zinc-800 night-watch:bg-red-900 shadow text-zinc-900 dark:text-white night-watch:text-red-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 night-watch:text-red-400 night-watch:hover:text-red-300'}`}
                    >
                      <LinkIcon size={14} /> Milestone
                    </button>
                  </div>
                  
                  {/* Boundary Input */}
                  {type === 'milestone' ? (
                    <select 
                      value={stage.startMilestoneId || stage.triggerMilestoneId || ''} 
                      onChange={(e) => updateStage(stage.id, 'startMilestoneId', e.target.value)}
                      className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 night-watch:text-red-100 outline-none focus:ring-2 focus:ring-blue-500 night-watch:focus:ring-red-700"
                    >
                      <option value="">Start (Stage 1 Default)</option>
                      {milestones.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.isTriggerByAge ? `Age ${m.triggerAge}` : `Year ${m.triggerYear}`})</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="number" 
                      value={stage.startAbsoluteYear ?? new Date().getFullYear()} 
                      onChange={(e) => updateStage(stage.id, 'startAbsoluteYear', Number(e.target.value))}
                      className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 night-watch:text-red-100 outline-none focus:ring-2 focus:ring-blue-500 night-watch:focus:ring-red-700"
                      placeholder="e.g. 2030"
                    />
                  )}
                </div>

                <div className="space-y-2 flex flex-col justify-end">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 night-watch:text-red-400 block">Target Annual Budget</label>
                  <div className="bg-blue-50 dark:bg-blue-900/20 night-watch:bg-red-950/20 border border-blue-100 dark:border-blue-900/40 night-watch:border-red-900/40 rounded-lg p-3 min-h-[44px] flex items-center">
                    <p className="text-xs text-blue-700 dark:text-blue-300 night-watch:text-red-300 leading-snug">
                      Target budget is dynamically inherited from the active Phased Budget configuration.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 night-watch:border-red-950/50">
                <label className="text-[10px] uppercase font-bold text-zinc-500 night-watch:text-red-400 block mb-2">Funding Priorities (Sequential Pull)</label>
                <div className="space-y-2">
                  {(stage.fundingPriorities || []).map((priority: string, pIdx: number) => (
                    <div key={pIdx} className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-zinc-400 night-watch:text-red-500 font-bold w-5">{pIdx + 1}.</span>
                      <select 
                        value={priority}
                        onChange={(e) => updatePriorities(stage.id, pIdx, e.target.value)}
                        className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-900 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900 rounded-lg px-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 night-watch:text-red-100 outline-none focus:ring-2 focus:ring-blue-500 night-watch:focus:ring-red-700"
                      >
                        <option value="taxable_brokerage">Taxable Brokerage</option>
                        <option value="tax_advantaged_401k">Tax-Advantaged (401k/IRA)</option>
                        <option value="roth_ira">Roth IRA</option>
                      </select>
                      <button 
                        onClick={() => removePriority(stage.id, pIdx)} 
                        className="text-zinc-400 night-watch:text-red-500/70 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 night-watch:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => addPriority(stage.id)}
                  className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 night-watch:text-red-400 min-h-[44px] px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 night-watch:hover:bg-red-950/30 transition-colors border border-transparent border-dashed hover:border-blue-200 dark:hover:border-blue-800 night-watch:hover:border-red-800"
                >
                  + Add Source
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 night-watch:border-red-950/50 space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 night-watch:text-red-400 block mb-2">Income Stream Inclusions</label>
                <ToggleSwitch
                  checked={stage.includeGlobalIncomeStreams ?? false}
                  onChange={(val: boolean) => updateStage(stage.id, 'includeGlobalIncomeStreams', val)}
                  label="Include Global Income Streams"
                  description="Apply Social Security, Pensions, and other fixed income to reduce portfolio drawdown demand."
                />
                <ToggleSwitch
                  checked={stage.includeAuxiliaryTaxFreeIncome ?? false}
                  onChange={(val: boolean) => updateStage(stage.id, 'includeAuxiliaryTaxFreeIncome', val)}
                  label="Include Auxiliary Tax-Free Income"
                  description="Apply scheduled tax-free gifts or one-time windfalls to reduce portfolio drawdown."
                />
              </div>
            </div>
          );
        })}
        {stages.length === 0 && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No stages configured. Default sequential drawdown algorithms will apply.
          </div>
        )}
      </div>

      {/* Bridge Period Optimization Module Configuration */}
      <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs">Bridge Period Optimization</h4>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-5">
          <ToggleSwitch
            checked={activeScenario.bridgeOptimizationEnabled !== false}
            onChange={async (val) => {
              const doc = await db.plans.findOne(plan.id).exec();
              const updatedScenarios = plan.scenarios.map((s) =>
                s.id === activeScenario.id ? { ...s, bridgeOptimizationEnabled: val } : s
              );
              await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
              handleRunSimulation();
            }}
            label="Enable Bridge Period Optimization"
            description="Use DP Web Worker to optimize Roth conversions and stock liquidations."
          />

          {activeScenario.bridgeOptimizationEnabled !== false && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Stock Liquidation Start Year</label>
                <input 
                  type="number" 
                  value={stockLiquidationYear}
                  onChange={(e) => setStockLiquidationYear(e.target.value)}
                  onBlur={async () => {
                    const yearVal = Number(stockLiquidationYear) || 2030;
                    const doc = await db.plans.findOne(plan.id).exec();
                    const updatedScenarios = plan.scenarios.map((s: any) =>
                      s.id === activeScenario.id ? { ...s, bridgeStockLiquidationStartYear: yearVal } : s
                    );
                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                    handleRunSimulation();
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

            {/* Custom Roth Marginal Tax Brackets */}
            <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Roth Marginal Tax Brackets</label>
                <button 
                  onClick={addRothBracket}
                  className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Plus size={14} /> Add Range
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Specify different marginal tax bracket limits for Roth conversions over specific year ranges. If left empty, or outside these ranges, the simulation will optimize up to the standard 12% bracket.
              </p>
              
              <div className="space-y-3">
                {rothMarginalBrackets.map((bracket, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input 
                      type="number"
                      value={bracket.startYear}
                      onChange={(e) => updateRothBracket(i, 'startYear', Number(e.target.value))}
                      className="w-24 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 min-h-[40px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Start"
                    />
                    <span className="text-zinc-400">-</span>
                    <input 
                      type="number"
                      value={bracket.endYear}
                      onChange={(e) => updateRothBracket(i, 'endYear', Number(e.target.value))}
                      className="w-24 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 min-h-[40px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="End"
                    />
                    <select 
                      value={bracket.bracket}
                      onChange={(e) => updateRothBracket(i, 'bracket', Number(e.target.value))}
                      className="flex-1 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 min-h-[40px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0.10}>10% Bracket</option>
                      <option value={0.12}>12% Bracket</option>
                      <option value={0.22}>22% Bracket</option>
                      <option value={0.24}>24% Bracket</option>
                      <option value={0.32}>32% Bracket</option>
                    </select>
                    <button 
                      onClick={() => removeRothBracket(i)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {rothMarginalBrackets.length === 0 && (
                  <div className="text-center p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500">
                    No custom tax bracket ranges defined.
                  </div>
                )}
              </div>
            </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Roth Conversion Start Year</label>
                <input 
                  type="number" 
                  value={rothConversionYear}
                  onChange={(e) => setRothConversionYear(e.target.value)}
                  onBlur={async () => {
                    const yearVal = Number(rothConversionYear) || 2030;
                    const doc = await db.plans.findOne(plan.id).exec();
                    const updatedScenarios = plan.scenarios.map((s: any) =>
                      s.id === activeScenario.id ? { ...s, bridgeRothConversionStartYear: yearVal } : s
                    );
                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                    handleRunSimulation();
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
