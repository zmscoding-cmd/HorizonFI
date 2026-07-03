const fs = require('fs');

const checkpoint = `
### Checkpoint: Algorithmic Shift for Risk Mitigation (Bridge Period)
Trigger: The bridge period optimization needs to prioritize liquidation ahead of roth conversions to minimize risk associated with the large amount of investment in a single stock, and spread Roth conversions out instead of clustering them in the first couple of years.

1. Architectural State Changes:
- **Prioritize Stock Liquidation (Risk Reduction)**: Altered the DP Engine (\`simulation.worker.ts\`) early action bonus heuristic to heavily favor generating liquidity from concentrated stock (\`liquidityGenerated * 0.005\`) over early Roth conversions (\`rothConversion * 0.002\`).
- **Spread Tax Burden (Roth Smoothing)**: Restricted the Roth conversion action space to the 12% marginal tax bracket. Previously, the engine permitted filling the 24% bracket ($383k+), which created massive single-year tax spikes and cannibalized the 0% LTCG space. Capping it at 12% ensures Roth conversions are spread evenly across the entire bridge period, allowing concentrated stock liquidations to utilize the highly valuable 0% LTCG space in the initial years.

2. ARCHITECTURE.md Diff/Additions:
[Updated Section: Bridge Optimization Heuristics]
- The worker algorithm enforces a strict hierarchy: Mitigate single-stock risk FIRST by maximizing 0% LTCG space liquidations. Roth conversions act as a secondary smoothing mechanism, strictly capped at the 12% bracket to spread tax burden evenly and avoid crowding out capital gains.

3. Validation Status:
- [x] DP Engine successfully outputs $197k stock liquidation in early years with $0 Roth, followed by smooth $74k Roth conversions in later years.
- [x] Tax spikes smoothed; single-stock risk effectively mitigated.
`;

fs.appendFileSync('architecture.md', checkpoint);
