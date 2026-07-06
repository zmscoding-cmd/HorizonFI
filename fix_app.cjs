const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove the hanging </ScenarioProvider>
content = content.replace(/<\/ScenarioProvider>/g, '');

// Wrap the main return
content = content.replace(
  /<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">/,
  `<ScenarioProvider userId={user?.uid || null}>\n    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">`
);

// Append at the end of the App component return
content = content.replace(
  /<\/div>\n  \);\n}/,
  `</div>\n    </ScenarioProvider>\n  );\n}`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed App.tsx');
