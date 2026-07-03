const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(`    // Capped at 12% bracket to spread out Roth conversions over the bridge period
    // instead of doing massive conversions in a couple of years
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket]`, `    // Added 22% bracket back but kept 24% bracket out to spread out conversions
    const fill22PercentBracket = Math.max(0, 201050 + STANDARD_DEDUCTION - baseOrdinary);
    rothOptions = [0, fillStandardDeduction, fill12PercentBracket, fill22PercentBracket]`);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
