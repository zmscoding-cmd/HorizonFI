const fs = require('fs');

let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');
const start = code.indexOf('import {');
const end = code.indexOf('} from "../lib/temporal-engine";');
if (start !== -1 && end !== -1) {
  // wait, is it the FIRST import?
  // Let's just use a string replacement for the exact block
}
