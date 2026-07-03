const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

code = code.replace(`  threeBuckets?: ThreeBucketConfig;
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;`, `  threeBuckets?: ThreeBucketConfig;
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;
  appliedBridgeStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];`);

code = code.replace(`export type MultiStageSimPayload = {`, `export type AppliedBridgeStrategy = { year: number; stockLiquidation: number; rothConversion: number; };\n\nexport type MultiStageSimPayload = {`);

fs.writeFileSync('src/workers/simulation.worker.ts', code);
