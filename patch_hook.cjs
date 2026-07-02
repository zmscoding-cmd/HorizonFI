const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBridgeOptimization.ts', 'utf8');

const updatedParams = `
        const currentYear = new Date().getFullYear();
        const startAge = scenario.currentAge || 55;
        const stockLiquidationStartAge = scenario.bridgeStockLiquidationStartYear ? startAge + (scenario.bridgeStockLiquidationStartYear - currentYear) : startAge;
        const rothConversionStartAge = scenario.bridgeRothConversionStartYear ? startAge + (scenario.bridgeRothConversionStartYear - currentYear) : startAge;

        const params = {
          startAge,
          endAge: scenario.bridgeOptimizationEndAge || 65,
          baseOrdinaryIncome: scenario.baseOrdinaryIncome || 50000,
          guytonKlingerTarget: scenario.guytonKlingerTarget || 50000,
          rrbTier1Benefits: 0,
          discountRate: 0.05,
          stockLiquidationStartAge,
          rothConversionStartAge
        };
`;

code = code.replace(/const params = \{[\s\S]+?discountRate: 0\.05\n\s+\};/, updatedParams.trim());

fs.writeFileSync('src/hooks/useBridgeOptimization.ts', code);
