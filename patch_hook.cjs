const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBridgeOptimization.ts', 'utf8');

if (code.includes('discountRate: -0.02')) {
    code = code.replace('discountRate: -0.02', 'discountRate: 0.0,');
    fs.writeFileSync('src/hooks/useBridgeOptimization.ts', code);
    console.log("Patched hook successfully");
} else {
    console.log("discountRate target not found!");
}
