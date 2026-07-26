import { describe, it, expect } from 'vitest';
import { duplicatePlanWithData, duplicateScenarioCollections } from '../lib/scenarioUtils';

describe('Plan and Scenario Budget Copying Unit Tests', () => {
  it('duplicates all planned expenses and scenario collections when copying a plan', async () => {
    const insertedPlans: any[] = [];
    const mockExpenses: any[] = [
      { id: 'exp-1', userId: 'user-123', scenarioId: 'sc-1', name: 'Housing', staticAmount: '2000', frequency: 'Monthly', valuationType: 'Static' },
      { id: 'exp-2', userId: 'user-123', scenarioId: 'sc-1', name: 'Utilities', staticAmount: '300', frequency: 'Monthly', valuationType: 'Static' },
      { id: 'exp-3', userId: 'user-123', scenarioId: 'sc-2', name: 'Travel', staticAmount: '5000', frequency: 'Annual', valuationType: 'Static' },
    ];
    const insertedExpenses: any[] = [];

    const mockDb = {
      plans: {
        insert: async (plan: any) => {
          insertedPlans.push(plan);
          return plan;
        },
      },
      planned_expenses: {
        find: ({ selector }: any) => ({
          exec: async () => mockExpenses.filter((item) => item.scenarioId === selector.scenarioId),
        }),
        bulkInsert: async (items: any[]) => {
          insertedExpenses.push(...items);
        },
      },
      funding_allocations: {
        find: () => ({ exec: async () => [] }),
        bulkInsert: async () => {},
      },
      tax_events: {
        find: () => ({ exec: async () => [] }),
        bulkInsert: async () => {},
      },
      budgets: {
        find: () => ({ exec: async () => [] }),
        bulkInsert: async () => {},
      },
    };

    const originalPlan = {
      id: 'plan-1',
      name: 'Retirement Master Plan',
      members: ['user-123'],
      scenarios: [
        { id: 'sc-1', name: 'Baseline Scenario', budget: { monthlyIncome: 8000 } },
        { id: 'sc-2', name: 'Early FIRE Scenario', budget: { monthlyIncome: 6000 } },
      ],
    };

    const duplicatedPlan = await duplicatePlanWithData(mockDb, originalPlan, 'user-123');

    // 1. Assert plan was inserted with new ID and (Copy) name
    expect(insertedPlans.length).toBe(1);
    expect(duplicatedPlan.name).toBe('Retirement Master Plan (Copy)');
    expect(duplicatedPlan.scenarios.length).toBe(2);

    // 2. Assert scenario IDs in new plan are distinct from original
    const newSc1Id = duplicatedPlan.scenarios[0].id;
    const newSc2Id = duplicatedPlan.scenarios[1].id;
    expect(newSc1Id).not.toBe('sc-1');
    expect(newSc2Id).not.toBe('sc-2');

    // 3. Assert all planned expenses were duplicated to the new scenario IDs
    expect(insertedExpenses.length).toBe(3);
    const sc1CopiedExpenses = insertedExpenses.filter((e) => e.scenarioId === newSc1Id);
    const sc2CopiedExpenses = insertedExpenses.filter((e) => e.scenarioId === newSc2Id);

    expect(sc1CopiedExpenses.length).toBe(2);
    expect(sc1CopiedExpenses.map((e) => e.name)).toContain('Housing');
    expect(sc1CopiedExpenses.map((e) => e.name)).toContain('Utilities');

    expect(sc2CopiedExpenses.length).toBe(1);
    expect(sc2CopiedExpenses[0].name).toBe('Travel');
  });

  it('falls back to Baseline planned expenses if specific scenario ID has no records', async () => {
    const mockExpenses: any[] = [
      { id: 'exp-base-1', userId: 'user-123', scenarioId: 'Baseline', name: 'Groceries', staticAmount: '600' }
    ];
    const insertedExpenses: any[] = [];

    const mockDb = {
      planned_expenses: {
        find: ({ selector }: any) => ({
          exec: async () => mockExpenses.filter((item) => item.scenarioId === selector.scenarioId),
        }),
        bulkInsert: async (items: any[]) => {
          insertedExpenses.push(...items);
        },
      },
    };

    await duplicateScenarioCollections(mockDb, 'sc-custom', 'sc-new', 'user-123');

    expect(insertedExpenses.length).toBe(1);
    expect(insertedExpenses[0].scenarioId).toBe('sc-new');
    expect(insertedExpenses[0].name).toBe('Groceries');
  });
});
