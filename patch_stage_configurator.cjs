const fs = require('fs');
let code = fs.readFileSync('src/components/StageConfigurator.tsx', 'utf8');

const bridgeConfigBlock = `
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
            checked={activeScenario.bridgeOptimizationEnabled ?? false}
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

          {activeScenario.bridgeOptimizationEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Stock Liquidation Start Year</label>
                <input 
                  type="number" 
                  value={activeScenario.bridgeStockLiquidationStartYear ?? new Date().getFullYear()}
                  onChange={async (e) => {
                    const doc = await db.plans.findOne(plan.id).exec();
                    const updatedScenarios = plan.scenarios.map((s) =>
                      s.id === activeScenario.id ? { ...s, bridgeStockLiquidationStartYear: Number(e.target.value) } : s
                    );
                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                  }}
                  onBlur={handleRunSimulation}
                  className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Roth Conversion Start Year</label>
                <input 
                  type="number" 
                  value={activeScenario.bridgeRothConversionStartYear ?? new Date().getFullYear()}
                  onChange={async (e) => {
                    const doc = await db.plans.findOne(plan.id).exec();
                    const updatedScenarios = plan.scenarios.map((s) =>
                      s.id === activeScenario.id ? { ...s, bridgeRothConversionStartYear: Number(e.target.value) } : s
                    );
                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                  }}
                  onBlur={handleRunSimulation}
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
`;

code = code.replace(`
        {stages.length === 0 && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No stages configured. Default sequential drawdown algorithms will apply.
          </div>
        )}
      </div>
    </div>
  );
}
`, bridgeConfigBlock);

fs.writeFileSync('src/components/StageConfigurator.tsx', code);
