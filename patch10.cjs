const fs = require('fs');

let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');

code = code.replace(/import \{\s*runMultiDecadeSimulation,\s*Line,\s*XAxis,/g, 'import { LineChart, Line, XAxis,');

fs.writeFileSync('src/components/ScenarioBuilder.tsx', code);
