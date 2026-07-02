import { describe, it, expect } from 'vitest';
import { filterSimulationDataForView } from '../lib/chart-utils';

describe('Time Horizon Chart Filtering Engine', () => {
  // Generate mock simulation results representing a 40-year multi-decade output from the Web Worker
  const mockSimulationData = Array.from({ length: 41 }, (_, i) => {
    const year = 2026 + i;
    return {
      year,
      netWorth: 1000000 * Math.pow(1.07, i) - (i * 20000), // compound growth model
      cashAndOther: 50000 + i * 2000,
      preTax: 400000 * Math.pow(1.05, i),
      taxable: 550000 * Math.pow(1.06, i)
    };
  });

  it('should successfully slice data to specific year range and not mutate underlying elements', () => {
    const startYear = 2030;
    const endYear = 2045;

    // Deep copy of original data to assert no mutations
    const originalDataSnapshot = JSON.parse(JSON.stringify(mockSimulationData));

    // Execute filter
    const filtered = filterSimulationDataForView(mockSimulationData, startYear, endYear);

    // 1. Length Assertion
    const expectedLength = endYear - startYear + 1; // 2045 - 2030 + 1 = 16 years
    expect(filtered.length).toBe(expectedLength);

    // 2. Bound Range Assertion
    expect(filtered[0].year).toBe(startYear);
    expect(filtered[filtered.length - 1].year).toBe(endYear);

    // 3. Mathematical Value Integrity Assertion (Values are preserved exactly, no truncation/math corruption)
    const year2030Orig = mockSimulationData.find(d => d.year === 2030)!;
    const year2030Filtered = filtered.find(d => d.year === 2030)!;
    expect(year2030Filtered.netWorth).toBe(year2030Orig.netWorth);
    expect(year2030Filtered.preTax).toBe(year2030Orig.preTax);

    // 4. Zero-Mutation Verification
    expect(mockSimulationData).toEqual(originalDataSnapshot);
  });

  it('should fall back gracefully to original simulation bounds when start or end is undefined', () => {
    const filteredNoStart = filterSimulationDataForView(mockSimulationData, undefined, 2040);
    expect(filteredNoStart.length).toBe(2040 - 2026 + 1);
    expect(filteredNoStart[filteredNoStart.length - 1].year).toBe(2040);

    const filteredNoEnd = filterSimulationDataForView(mockSimulationData, 2035, undefined);
    expect(filteredNoEnd.length).toBe(2066 - 2035 + 1);
    expect(filteredNoEnd[0].year).toBe(2035);

    const filteredAllUndefined = filterSimulationDataForView(mockSimulationData, undefined, undefined);
    expect(filteredAllUndefined.length).toBe(mockSimulationData.length);
    expect(filteredAllUndefined).toEqual(mockSimulationData);
  });

  it('should handle timestamp fallback structures gracefully for historical datapoints', () => {
    const historicalData = [
      { date: '2026-01-15', netWorth: 100000 },
      { date: '2027-02-20', netWorth: 120000 },
      { date: '2028-03-25', netWorth: 150000 },
    ];

    const filteredHistorical = filterSimulationDataForView(historicalData, 2027, 2028);
    expect(filteredHistorical.length).toBe(2);
    expect(new Date(filteredHistorical[0].date).getFullYear()).toBe(2027);
    expect(new Date(filteredHistorical[1].date).getFullYear()).toBe(2028);
  });
});
