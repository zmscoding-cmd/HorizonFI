const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');

// Inside simulateMultiStageDrawdownWorker
code = code.replace(
`    const activeStage = payload.stages?.find(s => currentAge >= s.startAge && currentAge <= s.endAge);
    
    // Pension and RRB Logic`,
`    const activeStage = payload.stages?.find(s => currentAge >= s.startAge && currentAge <= s.endAge);
    
    // Applied Bridge Strategy (Overrides)
    let currentStrategy = payload.appliedBridgeStrategies?.find(s => s.year === currentYear);
    let targetRothConversionAmount = payload.targetRothConversionAmount || 0;
    
    if (currentStrategy && currentStrategy.rothConversion > 0) {
      targetRothConversionAmount += currentStrategy.rothConversion;
      // Physically move the balance from Pre-Tax to Roth
      let remainingToConvert = currentStrategy.rothConversion;
      
      // Sort pre-tax assets (largest first)
      const preTaxAssets = currentAssets.filter(a => a.assetType === 'PRE_TAX').sort((a,b) => b.value - a.value);
      for (const a of preTaxAssets) {
        if (remainingToConvert <= 0) break;
        const take = Math.min(a.value, remainingToConvert);
        a.value -= take;
        remainingToConvert -= take;
      }
      
      // Add to a Roth asset (or create one)
      let rothAsset = currentAssets.find(a => a.assetType === 'ROTH');
      if (!rothAsset) {
        rothAsset = { id: 'roth_converted', name: 'Converted Roth', value: 0, assetType: 'ROTH', expectedGrowth: payload.targetConstantMarketReturn, expectedYield: 0 };
        currentAssets.push(rothAsset);
      }
      rothAsset.value += (currentStrategy.rothConversion - remainingToConvert);
    }

    // Pension and RRB Logic`);

// Now replace the targetRothConversionAmount down the line
code = code.replace(
`      const ordinaryIncomeThisYear = pensionIncome + rrbIncome + otherIncome + currentFutureIncome + (payload.targetRothConversionAmount || 0);`,
`      const ordinaryIncomeThisYear = pensionIncome + rrbIncome + otherIncome + currentFutureIncome + targetRothConversionAmount;`
);

code = code.replace(
`       targetRothConversionAmount: payload.targetRothConversionAmount,`,
`       targetRothConversionAmount: targetRothConversionAmount,`
);

// Stock Liquidation Override
code = code.replace(
`      // 7. Determine final optimal sale amount
      let optimalSaleAmount = Math.max(
        maxSaleFor0PercentLtcg,
        cashFlowRequiredFromTarget
      );
      
      // Cap at actual available shares
      optimalSaleAmount = Math.min(optimalSaleAmount, liqTargetAsset.value);`,
`      // 7. Determine final optimal sale amount
      let optimalSaleAmount = Math.max(
        maxSaleFor0PercentLtcg,
        cashFlowRequiredFromTarget
      );
      
      if (currentStrategy && currentStrategy.stockLiquidation !== undefined) {
         optimalSaleAmount = currentStrategy.stockLiquidation;
      }
      
      // Cap at actual available shares
      optimalSaleAmount = Math.min(optimalSaleAmount, liqTargetAsset.value);`
);


fs.writeFileSync('src/workers/simulation.worker.ts', code);
