const fs = require('fs');
const files = [
  'src/components/MultiStageChart.tsx', 
  'src/components/FundedRatioTracker.tsx',
  'src/components/ScenarioBuilder.tsx'
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
    // Only replacing the first occurrence or all that don't have a key
    content = content.replace(/<ResponsiveContainer /g, "<ResponsiveContainer key={currentlyViewingScenarioId || 'default'} ");

    fs.writeFileSync(file, content);
  }
});

console.log('Patched Recharts to bind scenario ID.');
