const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove from line 981
content = content.replace(/<\/ScenarioProvider>/g, '');

// Put it back right before the end of App component
// We can use a more precise regex.
content = content.replace(
  /\{showHelpModal && \(\s*<HelpGuideModal isOpen=\{showHelpModal\} onClose=\{\(\) => setShowHelpModal\(false\)\} \/>\s*\)\}\s*<\/div>\s*\);/m,
  `{showHelpModal && (
        <HelpGuideModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      )}
    </div>
    </ScenarioProvider>
  );`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed correctly.');
