const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const bridgeVal = `
    function isValidBridgeOptimization(data) {
      return data.id is string &&
             data.scenarioId is string &&
             isNumeric(data.optimalRothConversion) &&
             isNumeric(data.optimalLiquidation);
    }
`;

rules = rules.replace('function isValidCategory(data) {', bridgeVal + '\n    function isValidCategory(data) {');

// Update the block to include isValidBridgeOptimization
rules = rules.replace(`(collectionName == 'bridge_optimizations')`, `(collectionName == 'bridge_optimizations' && isValidBridgeOptimization(request.resource.data))`);

fs.writeFileSync('firestore.rules', rules);
