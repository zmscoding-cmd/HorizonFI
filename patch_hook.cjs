const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBridgeOptimization.ts', 'utf8');

code = code.replace(
`          stockLiquidationStartAge,
          rothConversionStartAge
        };`,
`          stockLiquidationStartAge,
          rothConversionStartAge,
          rothMarginalBrackets: scenario.bridgeRothMarginalBrackets || []
        };`
);

fs.writeFileSync('src/hooks/useBridgeOptimization.ts', code);
