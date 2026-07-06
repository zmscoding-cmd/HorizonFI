const fs = require('fs');
const files = [
  'src/components/BudgetDashboard.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Add import if not present
    if (!content.includes('useScenarioManager')) {
      content = content.replace(
        "import React",
        "import { useScenarioManager } from '../contexts/ScenarioContext';\nimport React"
      );
    }
    
    // Inject hook
    if (!content.includes('currentlyViewingScenarioId')) {
      content = content.replace(
        /export default function [A-Za-z]+\([^)]*\) \{/,
        "$& \n  const { currentlyViewingScenarioId } = useScenarioManager();\n"
      );
    }

    // Replace ResponsiveContainer
    content = content.replace(/<ResponsiveContainer /g, "<ResponsiveContainer key={currentlyViewingScenarioId || 'default'} ");

    fs.writeFileSync(file, content);
  }
});

console.log('Patched BudgetDashboard.');
