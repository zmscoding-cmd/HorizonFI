import { describe, it, expect } from 'vitest';
import { computeBudgetSimulation, PlannedExpenseModel } from '../workers/simulation.worker';

describe('Web Worker Relational Computation Logic - Topological Sort', () => {
  it('should accurately throw an error matching /Cyclic dependency detected/ when fed circular dependency data', () => {
    // Construct a system of planned expenses with recursive relational dependencies (circular reference)
    // Expense A depends on Expense B, and Expense B depends back on Expense A.
    const cyclicExpenses: PlannedExpenseModel[] = [
      {
        id: 'exp-A',
        name: 'Expense A (Relational)',
        frequency: 'Monthly',
        valuationType: 'Relational',
        relationalTargetId: 'exp-B',
        relationalPercent: 50,
        categoryId: 'utilities'
      },
      {
        id: 'exp-B',
        name: 'Expense B (Relational)',
        frequency: 'Monthly',
        valuationType: 'Relational',
        relationalTargetId: 'exp-A',
        relationalPercent: 20,
        categoryId: 'utilities'
      }
    ];

    // Assert that the Topological Sort (Kahn's Algorithm) catches this cyclic loop
    // and throws an error matching the desired regex.
    expect(() => {
      computeBudgetSimulation(cyclicExpenses, []);
    }).toThrow(/Cyclic dependency detected/);
  });
});
