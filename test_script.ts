import fs from 'fs';
const content = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');
const handleMatch = content.match(/const handleRunSimulation = \(\) => \{[\s\S]*?workerRef\.current\.postMessage\(\{[\s\S]*?\}\);\s*\}\s*\}\);\s*\};/);
console.log(handleMatch ? 'Found handleRunSimulation' : 'Not found');
