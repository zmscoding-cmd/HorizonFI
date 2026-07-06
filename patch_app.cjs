const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  "import LinksSection from './components/LinksSection';",
  "import LinksSection from './components/LinksSection';\nimport { ScenarioProvider } from './contexts/ScenarioContext';\nimport ScenarioSwitcher from './components/ScenarioSwitcher';"
);

// Inject ScenarioProvider
content = content.replace(
  /<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans antialiased selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-200 flex flex-col">/,
  `<ScenarioProvider userId={user.uid}>\n      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans antialiased selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-200 flex flex-col">`
);

content = content.replace(
  /<\/div>\n    \s*<\/div>\n\s*$/g, // Actually, let's just find the end of the return statement for MainApp. It's too risky with regex.
  ""
);

