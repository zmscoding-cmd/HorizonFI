/**
 * Filters standard or simulated multi-decade projection arrays
 * based on the active scenario's customized Time Horizon boundaries.
 */
export function filterSimulationDataForView<T extends { year?: number; timestamp?: number; dateLabel?: string; date?: string }>(
  data: T[],
  startYear?: number,
  endYear?: number
): T[] {
  if (!data || data.length === 0) return [];
  if (startYear === undefined && endYear === undefined) return data;

  const resolvedStart = startYear ?? -Infinity;
  const resolvedEnd = endYear ?? Infinity;

  return data.filter((item) => {
    if (item.year !== undefined) {
      return item.year >= resolvedStart && item.year <= resolvedEnd;
    }
    
    // Fallback path to parse historical statement timestamp or ISO string structures
    let targetYear: number | null = null;
    if (item.timestamp !== undefined) {
      targetYear = new Date(item.timestamp).getFullYear();
    } else if (item.dateLabel !== undefined) {
      targetYear = new Date(item.dateLabel).getFullYear();
    } else if (item.date !== undefined) {
      targetYear = new Date(item.date).getFullYear();
    }

    if (targetYear !== null && !isNaN(targetYear)) {
      return targetYear >= resolvedStart && targetYear <= resolvedEnd;
    }

    return true;
  });
}
