import { generateUUID } from './db';

/**
 * Clones all budget and scenario-level RxDB records (planned_expenses, funding_allocations, tax_events, budgets)
 * associated with oldScenarioId over to newScenarioId.
 */
export async function duplicateScenarioCollections(
  db: any,
  oldScenarioId: string,
  newScenarioId: string,
  userId?: string
): Promise<void> {
  if (!db) return;

  const collectionsToClone = [
    db.planned_expenses,
    db.funding_allocations,
    db.tax_events,
    db.budgets,
  ];

  for (const col of collectionsToClone) {
    if (!col) continue;
    try {
      const selector: any = { scenarioId: oldScenarioId };
      if (userId) {
        selector.userId = userId;
      }

      let itemsToClone = await col.find({ selector }).exec();

      // Fallback: If no items found for oldScenarioId and oldScenarioId !== 'Baseline',
      // check if items exist under 'Baseline' scenario ID
      if (itemsToClone.length === 0 && oldScenarioId !== 'Baseline') {
        const fallbackSelector: any = { scenarioId: 'Baseline' };
        if (userId) fallbackSelector.userId = userId;
        itemsToClone = await col.find({ selector: fallbackSelector }).exec();
      }

      const newItems = itemsToClone.map((item: any) => {
        const itemJson = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
        itemJson.id = generateUUID();
        itemJson.scenarioId = newScenarioId;
        itemJson.updatedAt = Date.now();
        itemJson.createdAt = Date.now();
        if (itemJson._rev) delete itemJson._rev;
        return itemJson;
      });

      if (newItems.length > 0) {
        await col.bulkInsert(newItems);
      }
    } catch (err) {
      console.error(`Error duplicating scenario collection data:`, err);
    }
  }
}

/**
 * Duplicates an entire Plan document and clones all scenario-linked budget data (planned_expenses, etc.)
 * for every scenario in the plan.
 */
export async function duplicatePlanWithData(
  db: any,
  plan: any,
  userId: string,
  copyName?: string
): Promise<any> {
  if (!db) return null;
  const name = copyName || `${plan.name} (Copy)`;
  const newPlanId = generateUUID();

  // Create scenario ID map and new scenario objects
  const scenarioIdMap = new Map<string, string>();
  const newScenarios = (plan.scenarios || []).map((scenario: any) => {
    const newScenarioId = generateUUID();
    scenarioIdMap.set(scenario.id, newScenarioId);
    return {
      ...JSON.parse(JSON.stringify(scenario)),
      id: newScenarioId,
    };
  });

  const newPlan = {
    id: newPlanId,
    name,
    members: [userId],
    scenarios: newScenarios,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.plans.insert(newPlan);

  // Duplicate planned expenses, budgets, funding allocations, tax events for each scenario
  for (const [oldScenarioId, newScenarioId] of scenarioIdMap.entries()) {
    await duplicateScenarioCollections(db, oldScenarioId, newScenarioId, userId);
  }

  return newPlan;
}
