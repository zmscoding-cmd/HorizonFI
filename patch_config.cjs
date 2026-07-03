const fs = require('fs');
let code = fs.readFileSync('src/components/MultistageModelingConfig.tsx', 'utf8');

const imports = `import React from 'react';
import { PlanType } from '../lib/db';
import { generateUUID } from '../lib/utils';
import { Plus, Trash2, ArrowRight, Save, Play, CheckCircle2 } from 'lucide-react';`;

if (!code.includes('CheckCircle2')) {
    code = code.replace(`import { Plus, Trash2, ArrowRight, Save, Play } from 'lucide-react';`, imports);
}

const customBracketState = `  const [rothConversionYear, setRothConversionYear] = React.useState<string>(
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
`;

code = code.replace(`  const [rothConversionYear, setRothConversionYear] = React.useState<string>(
    String(activeScenario.bridgeRothConversionStartYear ?? 2030)
  );`, customBracketState);


const rothBracketUI = `                />
              </div>
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
            </div>`;

code = code.replace(`                />
              </div>`, rothBracketUI);


fs.writeFileSync('src/components/MultistageModelingConfig.tsx', code);
