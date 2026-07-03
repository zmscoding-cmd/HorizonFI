import { useState, useEffect, useRef } from 'react';

export function useBridgeOptimization(planId: string | undefined, scenarioId: string | undefined, db: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!planId || !scenarioId || !db) return;

    // Listen to plan changes
    const subscription = db.plans
      .findOne(planId)
      .$.subscribe((plan: any) => {
        if (!plan) return;
        const scenario = plan.scenarios?.find((s: any) => s.id === scenarioId);
        if (!scenario) return;

        // Extract optimization params from scenario if they exist, or use defaults
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
              // Ensure it's for the current scenario
              if (res.scenarioId === scenarioId) {
                setData(res.data);
                setLoading(false);
              }
            }
          };
        }

        // Construct payload from scenario data
        // Find PreTax and taxable lots
        const preTaxAsset = scenario.assets?.find((a: any) => a.assetType === 'PRE_TAX') || { value: 0 };
        const rothAsset = scenario.assets?.find((a: any) => a.assetType === 'ROTH') || { value: 0 };
        
        let taxableLots = scenario.taxLots || [];
        if (taxableLots.length === 0 && scenario.assets) {
          taxableLots = scenario.assets
            .filter((a: any) => a.assetType === 'TAXABLE')
            .map((a: any) => ({
              id: a.id,
              shares: a.value, // $1 per share mock
              currentPrice: 1,
              costBasisPerShare: 0.6, // 60% cost basis mock
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

        const params = {
          startAge,
          endAge: scenario.bridgeOptimizationEndAge || 75,
          baseOrdinaryIncome: scenario.baseOrdinaryIncome || 50000,
          guytonKlingerTarget: scenario.guytonKlingerTarget || 50000,
          rrbTier1Benefits: 0,
          discountRate: 0.0,
          stockLiquidationStartAge,
          rothConversionStartAge,
          rothMarginalBrackets: scenario.bridgeRothMarginalBrackets || []
        };

        workerRef.current.postMessage({
          type: 'BRIDGE_OPTIMIZATION',
          scenarioId,
          state,
          params
        });
      });

    return () => {
      subscription.unsubscribe();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [planId, scenarioId, db]);

  return { data, loading };
}
