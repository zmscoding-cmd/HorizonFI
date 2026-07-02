const fs = require('fs');
let code = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf8');

const importStatement = `
import { BridgeOptimizationDashboard } from "./BridgeOptimizationDashboard";
import { useBridgeOptimization } from "../hooks/useBridgeOptimization";
`;

code = code.replace('import { CurrencyToggle } from "./CurrencyToggle";', importStatement + 'import { CurrencyToggle } from "./CurrencyToggle";');

const hookCall = `
  const { data: bridgeData, loading: bridgeLoading } = useBridgeOptimization(activeScenarioId, db);
`;

code = code.replace('const [multiStageResults, setMultiStageResults] = useState', hookCall + '\n  const [multiStageResults, setMultiStageResults] = useState');

const renderBlock = `
            {activeScenario?.bridgeOptimizationEnabled && (
              <BridgeOptimizationDashboard data={bridgeData} />
            )}
`;

code = code.replace('              </div>\n            )}\n          </div>\n\n          {/* Right Area - Comparative Analytics */}\n', '              </div>\n            )}\n            ' + renderBlock + '\n          </div>\n\n          {/* Right Area - Comparative Analytics */}\n');

fs.writeFileSync('src/components/ScenarioBuilder.tsx', code);
