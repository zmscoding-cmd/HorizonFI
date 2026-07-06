const fs = require('fs');
let content = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');

content = content.replace(
  /export type MultiStageSimPayload = \{/,
  "export type MultiStageSimPayload = {\n  scenario?: ScenarioPayload;\n  globalNetWorth?: number;"
);

fs.writeFileSync('src/workers/simulation.worker.ts', content);
console.log('Patched MultiStageSimPayload.');
