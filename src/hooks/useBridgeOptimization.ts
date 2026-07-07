import { useState, useEffect, useRef, useCallback } from 'react';

export function useBridgeOptimization(planId: string | undefined, scenarioId: string | undefined, db: any, displayEndYear?: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const calculate = useCallback(async (overrides?: any) => {
    if (!planId || !scenarioId || !db) return;

    try {
      const plan = await db.plans.findOne(planId).exec();
      if (!plan) return;
      const scenario = plan.scenarios?.find((s: any) => s.id === scenarioId);
      if (!scenario) return;

      const bridgeEnabled = scenario.bridgeOptimizationEnabled !== false;
      if (!bridgeEnabled) {
        setData([]);
        return;
      }

      setLoading(true);

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../workers/simulation.worker.ts', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.onmessage = (event) => {
          const res = event.data;
          if (res.success && res.type === 'BRIDGE_OPTIMIZATION') {
            if (res.scenarioId === scenarioId) {
              setData(res.data);
              setLoading(false);
            }
          }
        };
      }

      // Fetch latest budget and tax events for accurate simulation
      let budgetDoc = null;
      let taxEventDoc = null;
      if (db.budgets) {
        budgetDoc = await db.budgets.findOne({ selector: { scenarioId } }).exec();
        if (!budgetDoc) {
          budgetDoc = await db.budgets.findOne({ selector: { userId: 'default' } }).exec();
        }
      }
      if (db.tax_events) {
        taxEventDoc = await db.tax_events.findOne({ selector: { scenarioId } }).exec();
      }

      const preTaxAsset = scenario.assets?.find((a: any) => a.assetType === 'PRE_TAX') || { value: 0 };
      const rothAsset = scenario.assets?.find((a: any) => a.assetType === 'ROTH') || { value: 0 };
      
      let taxableLots = scenario.taxLots || [];
      if (taxableLots.length === 0 && scenario.assets) {
        taxableLots = scenario.assets
          .filter((a: any) => a.assetType === 'TAXABLE')
          .map((a: any) => ({
            id: a.id,
            shares: a.value,
            currentPrice: 1,
            costBasisPerShare: 0.6,
            acquisitionDate: a.availableDate || '2020-01-01',
            isTargetConcentratedPosition: !!a.isLiquidationTarget
          }));
      }

      const state = {
        age: scenario.currentAge || 55,
        preTaxBalance: preTaxAsset.value,
        rothBalance: rothAsset.value,
        taxableLots: taxableLots.map((l: any) => ({
          id: l.id || Math.random().toString(),
          shares: l.shares || 100,
          currentPrice: l.currentPrice || 100,
          costBasisPerShare: l.costBasisPerShare || 50,
          acquisitionDate: l.acquisitionDate || '2020-01-01',
          isTargetConcentratedPosition: l.isTargetConcentratedPosition || false
        }))
      };

      const currentYear = new Date().getFullYear();
      const startAge = scenario.currentAge || 55;
      const stockLiquidationStartYear = scenario.bridgeStockLiquidationStartYear ?? 2030;
      const rothConversionStartYear = scenario.bridgeRothConversionStartYear ?? 2030;
      const stockLiquidationStartAge = startAge + (stockLiquidationStartYear - currentYear);
      const rothConversionStartAge = startAge + (rothConversionStartYear - currentYear);
      
      let effectiveEndAge = scenario.bridgeOptimizationEndAge || 75;
      if (displayEndYear) {
        effectiveEndAge = startAge + (displayEndYear - currentYear);
      }

      const baseMonthly = budgetDoc?.monthlyIncome || 0;
      const basePension = budgetDoc?.pensionIncome || 0;
      const calculatedBaseIncome = (baseMonthly * 12) + (basePension * 12);
      const finalBaseIncome = calculatedBaseIncome > 0 ? calculatedBaseIncome : (scenario.baseOrdinaryIncome || 50000);
      
      const finalGuytonTarget = (budgetDoc?.calculatedGrossWithdrawalAnnual > 0) ? budgetDoc.calculatedGrossWithdrawalAnnual : (scenario.guytonKlingerTarget || 50000);

      const params = {
        startAge,
        endAge: effectiveEndAge,
        baseOrdinaryIncome: finalBaseIncome,
        guytonKlingerTarget: finalGuytonTarget,
        rrbTier1Benefits: 0,
        discountRate: 0.0,
        stockLiquidationStartAge,
        rothConversionStartAge,
        rothMarginalBrackets: scenario.bridgeRothMarginalBrackets || [],
        appliedBridgeStrategies: scenario.appliedBridgeStrategies || [],
        overrides: overrides || null
      };

      workerRef.current.postMessage({
        type: 'BRIDGE_OPTIMIZATION',
        scenarioId,
        state,
        params
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [planId, scenarioId, db, displayEndYear]);

  useEffect(() => {
    if (!planId || !scenarioId || !db) return;

    calculate();

    const subscription = db.plans
      .findOne(planId)
      .$.subscribe(() => {
        calculate();
      });

    return () => {
      subscription.unsubscribe();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [planId, scenarioId, db, calculate]);

  return { data, loading, recalculate: calculate };
}

