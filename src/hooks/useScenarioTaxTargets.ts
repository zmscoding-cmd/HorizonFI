import { useState, useEffect, useCallback } from 'react';

export function useScenarioTaxTargets(db: any, planId: string, scenarioId: string) {
  const [targetOrdinaryBracket, setTargetOrdinaryBracket] = useState<number>(0.12);
  const [targetLTCGBracket, setTargetLTCGBracket] = useState<number>(0.0);
  const [taxableAccountCostBasisPct, setTaxableAccountCostBasisPct] = useState<number>(0.75);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !planId || !scenarioId) return;

    let sub: any;
    
    // Subscribe to the plan document to reactively update state
    const docQuery = db.plans.findOne(planId);
    sub = docQuery.$.subscribe((doc: any) => {
      if (!doc) return;
      const scenario = doc.scenarios?.find((s: any) => s.id === scenarioId);
      if (scenario) {
        setTargetOrdinaryBracket(scenario.targetOrdinaryBracket ?? 0.12);
        setTargetLTCGBracket(scenario.targetLTCGBracket ?? 0.0);
        setTaxableAccountCostBasisPct(scenario.taxableAccountCostBasisPct ?? 0.75);
        setLoading(false);
      }
    });

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [db, planId, scenarioId]);

  const updateTaxTargets = useCallback(async (updates: { targetOrdinaryBracket?: number, targetLTCGBracket?: number, taxableAccountCostBasisPct?: number }) => {
    if (!db || !planId || !scenarioId) return;

    const doc = await db.plans.findOne(planId).exec();
    if (!doc) return;

    const updatedScenarios = doc.scenarios.map((sc: any) => {
      if (sc.id === scenarioId) {
        return {
          ...sc,
          ...updates
        };
      }
      return sc;
    });

    await doc.patch({
      scenarios: updatedScenarios,
      updatedAt: Date.now()
    });
  }, [db, planId, scenarioId]);

  return {
    targetOrdinaryBracket,
    targetLTCGBracket,
    taxableAccountCostBasisPct,
    updateTaxTargets,
    loading
  };
}
