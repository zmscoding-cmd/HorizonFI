import React from 'react';
import { Plus, Trash2, Calendar, Link as LinkIcon } from 'lucide-react';
import { generateUUID } from '../lib/db';

function ToggleSwitch({ checked, onChange, label, description }: any) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group min-h-[44px] py-2">
      <div className="relative flex items-center shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-500 dark:bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export function StageConfigurator({ activeScenario, plan, db, handleRunSimulation }: any) {
  const stages = activeScenario.stages || [];
  const milestones = activeScenario.milestones || [];
  
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
      targetAnnualBudget: 90000,
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
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block">Start Boundary</label>
                  
                  {/* Segmented Control for Boundary Type */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateStage(stage.id, 'startYearType', 'absolute')}
                      className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-md transition-all ${type === 'absolute' ? 'bg-white dark:bg-zinc-800 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                      <Calendar size={14} /> Absolute
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStage(stage.id, 'startYearType', 'milestone')}
                      className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-md transition-all ${type === 'milestone' ? 'bg-white dark:bg-zinc-800 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                      <LinkIcon size={14} /> Milestone
                    </button>
                  </div>
                  
                  {/* Boundary Input */}
                  {type === 'milestone' ? (
                    <select 
                      value={stage.startMilestoneId || stage.triggerMilestoneId || ''} 
                      onChange={(e) => updateStage(stage.id, 'startMilestoneId', e.target.value)}
                      className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 2030"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block">Target Annual Budget</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                    <input 
                      type="number" 
                      value={stage.targetAnnualBudget} 
                      onChange={(e) => updateStage(stage.id, 'targetAnnualBudget', Number(e.target.value))}
                      className="w-full text-sm text-right bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 pl-8 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Funding Priorities (Sequential Pull)</label>
                <div className="space-y-2">
                  {(stage.fundingPriorities || []).map((priority: string, pIdx: number) => (
                    <div key={pIdx} className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-zinc-400 font-bold w-5">{pIdx + 1}.</span>
                      <select 
                        value={priority}
                        onChange={(e) => updatePriorities(stage.id, pIdx, e.target.value)}
                        className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="taxable_brokerage">Taxable Brokerage</option>
                        <option value="tax_advantaged_401k">Tax-Advantaged (401k/IRA)</option>
                        <option value="roth_ira">Roth IRA</option>
                      </select>
                      <button 
                        onClick={() => removePriority(stage.id, pIdx)} 
                        className="text-zinc-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => addPriority(stage.id)}
                  className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 min-h-[44px] px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent border-dashed hover:border-blue-200 dark:hover:border-blue-800"
                >
                  + Add Source
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Income Stream Inclusions</label>
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
    </div>
  );
}
