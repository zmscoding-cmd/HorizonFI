const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(`         stockTargets.push(Math.max(params.guytonKlingerTarget, currentLiquidity));`, `         stockTargets.push(Math.max(params.guytonKlingerTarget, currentLiquidity));
         
         let maxLiquidity = 0;
         for (const lot of sortedLots) {
            if (lot.isTargetConcentratedPosition) {
                maxLiquidity += lot.shares * lot.currentPrice;
            }
         }
         stockTargets.push(maxLiquidity); // Let it pay the 15% tax if it wants`);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
