const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The replacement for ScenarioProvider opening tag
let newContent = content.replace(
  /return \(\s*<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans antialiased selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-200 flex flex-col">/,
  `return (\n    <ScenarioProvider userId={user?.uid || null}>\n      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans antialiased selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-200 flex flex-col">`
);

// Close it at the very bottom
// Finding the last </div>\n  );
newContent = newContent.replace(
  /<\/div>\n\s*\);\n}/,
  `</div>\n    </ScenarioProvider>\n  );\n}`
);

// Inject ScenarioSwitcher
newContent = newContent.replace(
  /<div className="flex items-center gap-3">/,
  `<div className="flex items-center gap-3">\n          <ScenarioSwitcher />`
);

fs.writeFileSync('src/App.tsx', newContent);
console.log('Patched App.tsx');
