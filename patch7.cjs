const fs = require('fs');
let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');

// Remove newResults initialization
code = code.replace(/const newResults: Record<string, YearlySimResult\[\]> = \{\};\n/g, '');

// Also remove import of YearlySimResult if any
code = code.replace(/import \{.*?YearlySimResult.*?\} from .*?;\n/g, '');
code = code.replace(/YearlySimResult/g, 'any');

fs.writeFileSync('src/components/ScenarioBuilder.tsx', code);
