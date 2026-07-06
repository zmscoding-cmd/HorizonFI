const fs = require('fs');
const content = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');
const match = content.match(/const handleRunSimulation = \(\) => \{[\s\S]*?workerRef\.current\.postMessage\(\{[\s\S]*?\}\);\s*\}\s*\}\);\s*\};/);
if (match) {
  fs.writeFileSync('handleRunSimulation.txt', match[0]);
}
