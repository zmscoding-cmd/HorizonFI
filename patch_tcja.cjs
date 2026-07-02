const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const tcjaReplacement = `const STANDARD_DEDUCTION_2026_EST = 30000;
const TCJA_BRACKETS_2026 = [
  { rate: 0.10, limit: 23200 },
  { rate: 0.12, limit: 94300 },
  { rate: 0.22, limit: 201050 },
  { rate: 0.24, limit: 383900 },
  { rate: 0.32, limit: 487450 },
  { rate: 0.35, limit: 731200 },
  { rate: 0.37, limit: Infinity },
];`;

code = code.replace(/const STANDARD_DEDUCTION_2026_EST = 15000;\nconst TCJA_BRACKETS_2026 = \[[\s\S]+?\];/, tcjaReplacement);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
