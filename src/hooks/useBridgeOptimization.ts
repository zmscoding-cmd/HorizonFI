import { useState, useEffect, useRef } from 'react';

export function useBridgeOptimization(scenarioId: string | undefined, db: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!scenarioId || !db) return;

    // Listen to scenario changes
    const subscription = db.scenarios
      .findOne(scenarioId)
      .$.subscribe((scenario: any) => {
        if (!scenario) return;

        // Extract optimization params from scenario if they exist, or use defaults
        const bridgeEnabled = scenario.bridgeOptimizationEnabled;
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
        const preTaxAsset = scenario.assets?.find((a: any) => a.assetType === 'PRE_TAX') || { currentBalance: 0 };
        const rothAsset = scenario.assets?.find((a: any) => a.assetType === 'ROTH') || { currentBalance: 0 };
        const taxableLots = scenario.taxLots || [];

        const state = {
          age: scenario.currentAge || 55,
          preTaxBalance: preTaxAsset.currentBalance,
          rothBalance: rothAsset.currentBalance,
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
        const stockLiquidationStartAge = scenario.bridgeStockLiquidationStartYear ? startAge + (scenario.bridgeStockLiquidationStartYear - currentYear) : startAge;
        const rothConversionStartAge = scenario.bridgeRothConversionStartYear ? startAge + (scenario.bridgeRothConversionStartYear - currentYear) : startAge;

        const params = {
          startAge,
          endAge: scenario.bridgeOptimizationEndAge || 65,
          baseOrdinaryIncome: scenario.baseOrdinaryIncome || 50000,
          guytonKlingerTarget: scenario.guytonKlingerTarget || 50000,
          rrbTier1Benefits: 0,
          discountRate: 0.05,
          stockLiquidationStartAge,
          rothConversionStartAge
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
  }, [scenarioId, db]);

  return { data, loading };
}
