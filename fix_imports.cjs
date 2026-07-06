const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  "import LinksSection from './components/LinksSection';",
  "import LinksSection from './components/LinksSection';\nimport { ScenarioProvider } from './contexts/ScenarioContext';\nimport ScenarioSwitcher from './components/ScenarioSwitcher';"
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed imports.');
