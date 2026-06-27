import { describe, test, expect } from 'vitest';
import { evaluateMultiBucketTax } from '../workers/simulation.worker';

describe('Validation Layer: Multi-Bucket Budget Allocation Math', () => {
 
  test('Pure tax-free allocation pathways generate exactly zero tax drag', () => {
    const payload = {
      targetNetExpense: 60000,
      allocationMode: 'PERCENTAGE' as const,
      blendedCostBasisPercentage: 60,
      preExistingOrdinaryIncome: 0,
      buckets: {
        qualifiedDividends: 0,
        taxableBrokerage: 0,
        traditional401kIra: 0,
        rothIra: 50,
        nonTaxableGift: 50
      }
    };

    const out = evaluateMultiBucketTax(payload);
    expect(out.totalTaxOwed).toBe(0);
    expect(out.grossWithdrawalTotal).toBe(60000);
  });

  test('Dollar allocation targets isolate gross burdens proportionally', () => {
    const payload = {
      targetNetExpense: 50000,
      allocationMode: 'DOLLARS' as const,
      blendedCostBasisPercentage: 50,
      preExistingOrdinaryIncome: 95000, // Explicitly cross standard 0% threshold bounds
      buckets: {
        qualifiedDividends: 0,
        taxableBrokerage: 20000,
        traditional401kIra: 30000,
        rothIra: 0,
        nonTaxableGift: 0
      }
    };

    const out = evaluateMultiBucketTax(payload);
    expect(out.totalTaxOwed).toBeGreaterThan(0);
    expect(out.bucketBreakdown.taxableBrokerageGross).toBeGreaterThan(20000);
    expect(out.bucketBreakdown.traditional401kIraGross).toBeGreaterThan(30000);
  });
});
