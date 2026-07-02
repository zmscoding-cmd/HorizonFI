const fs = require('fs');
let code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf8');
const originalFunc = fs.readFileSync('target_func.txt', 'utf8');
const replacementFunc = fs.readFileSync('replacement_func.txt', 'utf8');

if (code.includes(originalFunc)) {
    code = code.replace(originalFunc, replacementFunc);
    fs.writeFileSync('src/workers/simulation.worker.ts', code);
    console.log("Successfully applied the patched function to source.");
} else {
    console.log("Error: could not find originalFunc in simulation.worker.ts");
}
