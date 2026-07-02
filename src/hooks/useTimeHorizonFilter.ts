import { useState, useEffect, useCallback } from 'react';

export function useTimeHorizonFilter(db: any, planId: string, scenarioId: string) {
  const [displayStartYear, setDisplayStartYearState] = useState<number>(new Date().getFullYear());
  const [displayEndYear, setDisplayEndYearState] = useState<number>(new Date().getFullYear() + 40);
  const [loading, setLoading] = useState(true);

  // Keep track of the absolute simulation bounds from the active scenario document
  const [absoluteStartYear, setAbsoluteStartYear] = useState<number>(new Date().getFullYear());
  const [absoluteEndYear, setAbsoluteEndYear] = useState<number>(new Date().getFullYear() + 40);

  useEffect(() => {
    if (!db || !planId || !scenarioId) return;

    let sub: any;
    
    // Subscribe to the plan document to reactively update state
    const docQuery = db.plans.findOne(planId);
    sub = docQuery.$.subscribe((doc: any) => {
      if (!doc) return;
      const scenario = doc.scenarios?.find((s: any) => s.id === scenarioId);
      if (scenario) {
        const absStart = new Date().getFullYear();
        const absEnd = scenario.targetEndYear ?? (absStart + 40);
        
        setAbsoluteStartYear(absStart);
        setAbsoluteEndYear(absEnd);

        // Default Logic: fall back to current calendar year and target end year if null or undefined
        setDisplayStartYearState(scenario.displayStartYear ?? absStart);
        setDisplayEndYearState(scenario.displayEndYear ?? absEnd);
        setLoading(false);
      }
    });

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [db, planId, scenarioId]);

  // Combined setter with validation
  const updateTimeHorizon = useCallback(async (startYear: number, endYear: number) => {
    if (!db || !planId || !scenarioId) return;

    // Validation: Ensure displayStartYear <= displayEndYear
    if (startYear > endYear) {
      throw new Error(`Validation Error: displayStartYear (${startYear}) cannot be greater than displayEndYear (${endYear}).`);
    }

    // Validation: Ensure bounds do not exceed absolute limits of the simulation plan
    if (startYear < absoluteStartYear || startYear > absoluteEndYear) {
      throw new Error(`Validation Error: displayStartYear (${startYear}) is outside simulation bounds [${absoluteStartYear}, ${absoluteEndYear}].`);
    }

    if (endYear < absoluteStartYear || endYear > absoluteEndYear) {
      throw new Error(`Validation Error: displayEndYear (${endYear}) is outside simulation bounds [${absoluteStartYear}, ${absoluteEndYear}].`);
    }

    const doc = await db.plans.findOne(planId).exec();
    if (!doc) return;

    const updatedScenarios = doc.scenarios.map((sc: any) => {
      if (sc.id === scenarioId) {
        return {
          ...sc,
          displayStartYear: startYear,
          displayEndYear: endYear
        };
      }
      return sc;
    });

    await doc.patch({
      scenarios: updatedScenarios,
      updatedAt: Date.now()
    });
  }, [db, planId, scenarioId, absoluteStartYear, absoluteEndYear]);

  // Individual setter helper for start year
  const setDisplayStartYear = useCallback(async (year: number) => {
    await updateTimeHorizon(year, displayEndYear);
  }, [updateTimeHorizon, displayEndYear]);

  // Individual setter helper for end year
  const setDisplayEndYear = useCallback(async (year: number) => {
    await updateTimeHorizon(displayStartYear, year);
  }, [updateTimeHorizon, displayStartYear]);

  return {
    displayStartYear,
    displayEndYear,
    absoluteStartYear,
    absoluteEndYear,
    updateTimeHorizon,
    setDisplayStartYear,
    setDisplayEndYear,
    loading
  };
}
