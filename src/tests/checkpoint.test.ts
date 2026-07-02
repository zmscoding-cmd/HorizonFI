import { describe, it, expect } from 'vitest';
import { filterSimulationDataForView } from '../lib/chart-utils';

describe('HorizonFI Checkpoint Tests', () => {
  it('passes base assertions', () => {
    expect(true).toBe(true);
  });

  it('validates that adjusting displayStartYear and displayEndYear changes array length but does not alter underlying data values', () => {
    const mockLedger = [
      { year: 2026, totalNetWorth: 100000 },
      { year: 2027, totalNetWorth: 105000 },
      { year: 2028, totalNetWorth: 110250 },
      { year: 2029, totalNetWorth: 115762 },
      { year: 2030, totalNetWorth: 121550 },
    ];

    // Original final Net Worth value (before filtering)
    const originalFinalNetWorth = mockLedger[mockLedger.length - 1].totalNetWorth;

    // Filter with custom display boundaries
    const startYear = 2027;
    const endYear = 2029;
    const filteredLedger = filterSimulationDataForView(mockLedger, startYear, endYear);

    // Verify length of the array has changed for Recharts consumption
    expect(filteredLedger.length).toBe(3);
    expect(filteredLedger[0].year).toBe(2027);
    expect(filteredLedger[filteredLedger.length - 1].year).toBe(2029);

    // Verify the filtering process did not corrupt or alter the values of the underlying objects
    expect(filteredLedger[0].totalNetWorth).toBe(105000);
    expect(filteredLedger[filteredLedger.length - 1].totalNetWorth).toBe(115762);

    // Verify the original source array remains uncorrupted and retains original calculations
    expect(mockLedger.length).toBe(5);
    expect(mockLedger[mockLedger.length - 1].totalNetWorth).toBe(originalFinalNetWorth);
  });
});
