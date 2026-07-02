const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const taxLotValidation = `
    function isValidTaxLot(data) {
      return data.id is string &&
             data.accountId is string &&
             data.ticker is string &&
             isNumeric(data.shares) &&
             isNumeric(data.costBasisPerShare) &&
             data.acquisitionDate is string &&
             data.isTargetConcentratedPosition is bool;
    }
`;

rules = rules.replace('function isValidCategory(data) {', taxLotValidation + '\n    function isValidCategory(data) {');

const collectionRule = `      allow create, update: if isSignedIn() && request.auth.uid == userId && 
        (
          (collectionName != 'assets' && collectionName != 'tax_lots' && collectionName != 'bridge_optimizations') || 
          (collectionName == 'assets' && isValidAsset(request.resource.data)) ||
          (collectionName == 'tax_lots' && isValidTaxLot(request.resource.data)) ||
          (collectionName == 'bridge_optimizations')
        );`;

rules = rules.replace(/allow create, update: if isSignedIn\(\) && request\.auth\.uid == userId &&\s*\(collectionName != 'assets' \|\| isValidAsset\(request\.resource\.data\)\);/, collectionRule);

fs.writeFileSync('firestore.rules', rules);
