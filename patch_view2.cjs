const fs = require('fs');
let code = fs.readFileSync('src/components/MultistageModelingView.tsx', 'utf8');

const originalOnApply = `                  onApplyYearlyStrategy={(year, stockLiquidation, rothConversion) => {
                    setNotification(\`Year \${year} strategy integrated! Recommended stock liquidation ($\${stockLiquidation.toLocaleString()}) and Roth conversion ($\${rothConversion.toLocaleString()}) targets locked into active projection.\`);
                    setTimeout(() => setNotification(null), 5000);
                  }}`;

const newOnApply = `                  onApplyYearlyStrategy={async (year, stockLiquidation, rothConversion) => {
                    if (!db || !plan || !activeScenario) return;
                    
                    try {
                      const doc = await db.plans.findOne(plan.id).exec();
                      if (!doc) return;
                      
                      const applied = activeScenario.appliedBridgeStrategies || [];
                      const existingIndex = applied.findIndex((a: any) => a.year === year);
                      
                      let newApplied = [...applied];
                      if (existingIndex >= 0) {
                        newApplied[existingIndex] = { year, stockLiquidation, rothConversion };
                      } else {
                        newApplied.push({ year, stockLiquidation, rothConversion });
                      }
                      
                      const updatedScenarios = plan.scenarios.map((s: any) => 
                        s.id === activeScenario.id ? { ...s, appliedBridgeStrategies: newApplied } : s
                      );
                      
                      await doc.patch({ scenarios: updatedScenarios });
                      
                      setNotification(\`Year \${year} strategy integrated! Recommended stock liquidation ($\${stockLiquidation.toLocaleString()}) and Roth conversion ($\${rothConversion.toLocaleString()}) targets locked into active projection.\`);
                      setTimeout(() => setNotification(null), 5000);
                      
                      if (handleRunSimulation) handleRunSimulation();
                    } catch (err) {
                      console.error("Failed to apply bridge strategy", err);
                    }
                  }}`;

if (code.includes(originalOnApply)) {
  code = code.replace(originalOnApply, newOnApply);
  fs.writeFileSync('src/components/MultistageModelingView.tsx', code);
  console.log("Patched View");
} else {
  console.log("Could not find onApplyYearlyStrategy");
}
