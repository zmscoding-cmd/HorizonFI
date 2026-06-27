import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { generateUUID } from '../lib/db';

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
      fundingPriorities: ['taxable_brokerage']
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
      <div className="flex justify-between items-center">
        <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Retirement Stages</h5>
        <button
          onClick={addStage}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline focus:outline-none"
        >
          <Plus size={14} /> Add Stage
        </button>
      </div>
      
      <div className="space-y-4">
        {stages.map((stage: any, sIdx: number) => (
          <div key={stage.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm relative">
            <div className="flex justify-between items-center mb-3">
              <input 
                type="text" 
                value={stage.name} 
                onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                className="font-bold text-zinc-900 dark:text-zinc-100 bg-transparent outline-none border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 text-sm py-0.5"
              />
              <button onClick={() => removeStage(stage.id)} className="text-zinc-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Trigger Milestone</label>
                <select 
                  value={stage.triggerMilestoneId || ''} 
                  onChange={(e) => updateStage(stage.id, 'triggerMilestoneId', e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-zinc-700 dark:text-zinc-300 pb-1"
                >
                  <option value="">Start (Stage 1)</option>
                  {milestones.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.isTriggerByAge ? `Age ${m.triggerAge}` : `Year ${m.triggerYear}`})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Target Annual Budget</label>
                <input 
                  type="number" 
                  value={stage.targetAnnualBudget} 
                  onChange={(e) => updateStage(stage.id, 'targetAnnualBudget', Number(e.target.value))}
                  className="w-full text-xs text-right bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-zinc-900 dark:text-zinc-100 pb-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Funding Priorities (Sequential Pull)</label>
              <div className="space-y-1 mt-2">
                {(stage.fundingPriorities || []).map((priority: string, pIdx: number) => (
                  <div key={pIdx} className="flex gap-2 items-center">
                    <span className="text-[10px] font-mono text-zinc-500 w-4">{pIdx + 1}.</span>
                    <select 
                      value={priority}
                      onChange={(e) => updatePriorities(stage.id, pIdx, e.target.value)}
                      className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-1 text-zinc-700 dark:text-zinc-300"
                    >
                      <option value="taxable_brokerage">Taxable Brokerage</option>
                      <option value="tax_advantaged_401k">Tax-Advantaged (401k/IRA)</option>
                      <option value="roth_ira">Roth IRA</option>
                    </select>
                    <button onClick={() => removePriority(stage.id, pIdx)} className="text-zinc-400 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => addPriority(stage.id)}
                className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
              >
                + Add Source
              </button>
            </div>
          </div>
        ))}
        {stages.length === 0 && (
          <div className="text-sm text-zinc-500 dark:text-zinc-500 text-center py-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No stages configured. Default algorithms will apply.
          </div>
        )}
      </div>
    </div>
  );
}
