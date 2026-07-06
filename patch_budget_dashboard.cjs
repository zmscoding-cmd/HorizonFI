const fs = require('fs');
let content = fs.readFileSync('src/components/BudgetDashboard.tsx', 'utf-8');

// Update DB query to include scenarioId
content = content.replace(
  "db.planned_expenses.find({ selector: { userId } }).$.subscribe((data: any[]) => {",
  "db.planned_expenses.find({ selector: { userId, scenarioId: activeScenario?.id || 'Baseline' } }).$.subscribe((data: any[]) => {"
);

// Update insert logic to attach scenarioId
content = content.replace(
  "updatedAt: Date.now()",
  "updatedAt: Date.now(),\n        scenarioId: activeScenario?.id || 'Baseline'"
);

fs.writeFileSync('src/components/BudgetDashboard.tsx', content);
