const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

// The current code has the 22% bracket since my last test. I'll replace it to only keep up to 12%.
const target = `    // Added 22% bracket back but kept 24% bracket out to spread out conversions
    const fill22PercentBracket = Math.max(0, 201050 + STANDARD_DEDUCTION - baseOrdinary);
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket, fill22PercentBracket]`;

const replacement = `    // Cap Roth conversions at the 12% bracket to spread them out over the bridge period 
    // and prevent large single-year tax spikes, while ensuring stock liquidation 
    // (single-stock risk mitigation) is prioritized first in the 0% LTCG space.
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket]`;

code = code.replace(target, replacement);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
