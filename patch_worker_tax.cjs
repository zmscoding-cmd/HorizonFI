const fs = require('fs');

let content = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const typesToAdd = `
export type TaxOptimizationRequest = {
  type: "TAX_OPTIMIZATION_REQUEST";
  scenarioId: string;
  scenario: {
    targetBudgetAmount: number;
    fundingSources: { assetId: string; amount: number; assetType?: string }[];
    strategicRothConversionAmount: number;
  };
  assets: any[]; 
  preExistingOrdinaryIncome: number;
  blendedCostBasisPercentage?: number;
};

export type TaxOptimizationResponse = {
  success: boolean;
  type: "TAX_OPTIMIZATION_RESPONSE";
  scenarioId?: string;
  data?: TaxEngineOutput;
  error?: string;
};
`;

if (!content.includes('export type TaxOptimizationRequest')) {
    content = content.replace('export type SimulationRequest', typesToAdd + '\nexport type SimulationRequest');
}

const onMessageBlock = `    } else if (e.data.type === "TAX_OPTIMIZATION_REQUEST") {
      const payload = e.data as TaxOptimizationRequest;
      const buckets: AllocationBuckets = {
        qualifiedDividends: 0,
        taxableBrokerage: 0,
        traditional401kIra: 0,
        rothIra: 0,
        nonTaxableGift: 0
      };

      for (const fs of payload.scenario.fundingSources) {
        let aType = fs.assetType;
        if (!aType && payload.assets) {
          const asset = payload.assets.find(a => a.id === fs.assetId);
          aType = asset?.assetType;
        }

        if (aType === "TAXABLE") {
          buckets.taxableBrokerage += fs.amount;
        } else if (aType === "PRE_TAX") {
          buckets.traditional401kIra += fs.amount;
        } else if (aType === "ROTH") {
          buckets.rothIra += fs.amount;
        } else if (aType === "CASH") {
          buckets.nonTaxableGift += fs.amount;
        } else if (aType === "DIVIDENDS") {
          buckets.qualifiedDividends += fs.amount;
        }
      }

      const input: TaxEngineInput = {
        targetNetExpense: payload.scenario.targetBudgetAmount,
        allocationMode: "DOLLARS",
        buckets,
        blendedCostBasisPercentage: payload.blendedCostBasisPercentage || 80,
        preExistingOrdinaryIncome: payload.preExistingOrdinaryIncome || 0,
        targetRothConversionAmount: payload.scenario.strategicRothConversionAmount || 0,
      };

      const result = evaluateMultiBucketTax(input);

      self.postMessage({
        success: true,
        type: "TAX_OPTIMIZATION_RESPONSE",
        scenarioId: payload.scenarioId,
        data: result
      });`;

if (!content.includes('e.data.type === "TAX_OPTIMIZATION_REQUEST"')) {
    content = content.replace('} else if (e.data.type === "BRIDGE_OPTIMIZATION") {', onMessageBlock + '\n    } else if (e.data.type === "BRIDGE_OPTIMIZATION") {');
}

fs.writeFileSync('src/workers/simulation.worker.ts', content);
