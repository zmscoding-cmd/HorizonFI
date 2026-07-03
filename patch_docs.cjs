const fs = require('fs');

let arch = fs.readFileSync('architecture.md', 'utf8');

arch = arch + "\n\n## VI. Configurable Marginal Brackets (Checkpoint 3)\n* **Variable Tax Ceilings**: The Dynamic Programming engine (`calculateOptimalMultiYearTaxPathDP`) inside `simulation.worker.ts` now accepts user-defined variable marginal tax bracket targets bounded by specific year ranges (`bridgeRothMarginalBrackets`). This enforces that Roth conversion optimization respects evolving tax policies across the bridge period, rather than a hard-coded 12% statutory default.\n";

fs.writeFileSync('architecture.md', arch);
