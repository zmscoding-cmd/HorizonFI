import fs from 'fs';
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

const target = `    const includeAuxiliary = activeStage?.includeAuxiliaryTaxFreeIncome ?? false;
    const giftAmountUsed = includeAuxiliary ? Math.min(stageTargetBudgetNominal, activeGiftAmount) : 0;
    const remainingFundingNeed = Math.max(0, stageTargetBudgetNominal - giftAmountUsed);

    const includeGlobal = activeStage?.includeGlobalIncomeStreams ?? false;
    const totalGlobalIncome = pensionIncome + rrbIncome + otherIncome + currentFutureIncome;
    const appliedGlobalIncome = includeGlobal ? totalGlobalIncome : 0;

    let remainingBudgetTarget = Math.max(0, remainingFundingNeed - appliedGlobalIncome);
    let actualNominalWithdrawal = remainingBudgetTarget;`;

const replacement = `    const includeAuxiliary = activeStage?.includeAuxiliaryTaxFreeIncome ?? false;
    const includeGlobal = activeStage?.includeGlobalIncomeStreams ?? false;

    let availableAuxiliary = includeAuxiliary ? activeGiftAmount : 0;
    let availableGlobal = includeGlobal ? (pensionIncome + rrbIncome + otherIncome + currentFutureIncome) : 0;

    let excessExternalIncome = 0;
    let giftAmountUsed = 0;
    let remainingBudgetTarget = stageTargetBudgetNominal;

    // Apply auxiliary first (tax free)
    giftAmountUsed = Math.min(remainingBudgetTarget, availableAuxiliary);
    remainingBudgetTarget -= giftAmountUsed;
    let excessAuxiliary = availableAuxiliary - giftAmountUsed;

    // Apply global
    let globalUsed = Math.min(remainingBudgetTarget, availableGlobal);
    remainingBudgetTarget -= globalUsed;
    let excessGlobal = availableGlobal - globalUsed;

    excessExternalIncome = excessAuxiliary + excessGlobal;

    // Add excess to dividend destination or fallback
    if (excessExternalIncome > 0) {
      let destAsset = currentAssets.find(a => a.isDividendDestination);
      if (!destAsset) {
        destAsset = currentAssets.find(a => a.assetType === 'TAXABLE' && !a.isLiquidationTarget);
      }
      if (!destAsset) {
        destAsset = currentAssets.find(a => a.assetType === 'TAXABLE');
      }
      if (!destAsset) {
         destAsset = { id: 'auto-taxable-bucket', name: 'Taxable Fallback Destination', value: 0, assetType: 'TAXABLE', expectedGrowthRate: 0.05, expectedDividendYield: 0 };
         currentAssets.push(destAsset);
      }
      destAsset.value += excessExternalIncome;
    }

    let actualNominalWithdrawal = remainingBudgetTarget;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/workers/simulation.worker.ts', code);
  console.log('Patched worker successfully.');
} else {
  console.log('Target not found in worker.');
}
