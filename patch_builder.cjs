const fs = require('fs');
let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf8');

code = code.replace(
`          threeBuckets: scenario.budget?.buckets,`,
`          threeBuckets: scenario.budget?.buckets,
          appliedBridgeStrategies: scenario.appliedBridgeStrategies || [],`
);

fs.writeFileSync('src/components/ScenarioBuilder.tsx', code);
