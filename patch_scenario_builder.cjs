const fs = require('fs');
let content = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');

const oldDuplicate = `  const duplicateScenario = async (scenarioToDup: any) => {
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      const currentScenarios = doc.scenarios || [];
      const newId = generateUUID();
      const duplicated = {
        ...scenarioToDup,
        id: newId,
        name: \`\${scenarioToDup.name} (Copy)\`,
      };
      await doc.patch({
        scenarios: [...currentScenarios, duplicated],
        updatedAt: Date.now(),
      });
      setActiveScenarioId(newId);
    } catch (err) {
      console.error("Error duplicating scenario:", err);
    }
  };`;

const newDuplicate = `  const duplicateScenario = async (scenarioToDup: any) => {
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      const currentScenarios = doc.scenarios || [];
      const newId = generateUUID();
      const duplicated = {
        ...JSON.parse(JSON.stringify(scenarioToDup)),
        id: newId,
        name: \`\${scenarioToDup.name} (Copy)\`,
      };
      await doc.patch({
        scenarios: [...currentScenarios, duplicated],
        updatedAt: Date.now(),
      });

      // Deep clone planned_expenses, funding_allocations, and tax_events
      const collectionsToClone = [
        { col: db.planned_expenses, schema: 'planned_expenses' },
        { col: db.funding_allocations, schema: 'funding_allocations' },
        { col: db.tax_events, schema: 'tax_events' }
      ];

      for (const { col } of collectionsToClone) {
        if (!col) continue;
        const itemsToClone = await col.find({
          selector: { scenarioId: scenarioToDup.id, userId }
        }).exec();

        const newItems = itemsToClone.map((item: any) => {
          const itemJson = item.toJSON();
          itemJson.id = generateUUID();
          itemJson.scenarioId = newId;
          itemJson.updatedAt = Date.now();
          itemJson.createdAt = Date.now();
          if (itemJson._rev) delete itemJson._rev;
          return itemJson;
        });

        if (newItems.length > 0) {
          await col.bulkInsert(newItems);
        }
      }

      setActiveScenarioId(newId);
    } catch (err) {
      console.error("Error duplicating scenario:", err);
    }
  };`;

content = content.replace(oldDuplicate, newDuplicate);
fs.writeFileSync('src/components/ScenarioBuilder.tsx', content);
