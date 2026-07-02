import React, { useState } from 'react';
import { PlanType } from '../lib/db';
import { MultistageModelingConfig } from './MultistageModelingConfig';
import { TimeHorizonControls } from './TimeHorizonControls';
import { NetWorthProjectionChart } from './NetWorthProjectionChart';
import { BucketWaterfallChart } from './BucketWaterfallChart';
import { MultiStageChart } from './MultiStageChart';
import { FundedRatioTracker } from './FundedRatioTracker';
import { CurrencyToggle } from './CurrencyToggle';
import { BridgeOptimizationChart, BridgeOptimizationData } from './BridgeOptimizationChart';
import { BridgeStrategyTable } from './BridgeStrategyTable';

interface MultistageModelingViewProps {
  plan: PlanType;
  activeScenario: any;
  activeScenarioId: string | null;
  db: any;
  handleRunSimulation: () => void;
  multiStageResults: any;
  displayStartYear?: number;
  displayEndYear?: number;
  bridgeData: BridgeOptimizationData[];
  bridgeLoading?: boolean;
}

export const MultistageModelingView: React.FC<MultistageModelingViewProps> = ({
  plan,
  activeScenario,
  activeScenarioId,
  db,
  handleRunSimulation,
  multiStageResults,
  displayStartYear,
  displayEndYear,
  bridgeData,
  bridgeLoading = false,
}) => {
  const currentResults = multiStageResults[activeScenarioId || ""] || [];
  const [notification, setNotification] = useState<string | null>(null);

  return (
    <div id="multistage-modeling-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:overflow-hidden pb-8 lg:pb-0">
      {/* Left Sidebar - Configuration */}
      <div className="col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-5 lg:overflow-y-auto shadow-sm transition-colors">
        <h3 className="font-bold text-sm tracking-tight uppercase text-zinc-500 dark:text-zinc-400">
          Multi-Stage Configuration
        </h3>
        {activeScenario && (
          <MultistageModelingConfig
            activeScenario={activeScenario}
            plan={plan}
            db={db}
            handleRunSimulation={handleRunSimulation}
          />
        )}
      </div>

      {/* Right Area - Visualizations and Analytics */}
      <div className="lg:col-span-2 flex flex-col gap-6 lg:overflow-y-auto pb-6">
        {/* Controls */}
        <TimeHorizonControls db={db} planId={plan.id} scenarioId={activeScenarioId || ""} />

        {/* 1. Long-Term Portfolio Projection */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-6 shadow-sm transition-colors shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
                Long-Term Portfolio Projection
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Tracking projected net worth based on tax bucket and availability.
              </p>
            </div>
            <div className="flex justify-start sm:justify-end">
              <CurrencyToggle />
            </div>
          </div>
          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 flex-1 min-h-[400px] flex flex-col transition-colors">
            <NetWorthProjectionChart
              data={currentResults}
              assets={activeScenario?.assets || []}
              displayStartYear={displayStartYear}
              displayEndYear={displayEndYear}
            />
          </div>
        </div>

        {/* 2. Three Buckets (Optional) */}
        {(activeScenario?.threeBuckets || plan.threeBuckets || activeScenario?.budget?.budgetPhases?.some((p: any) => p.cashBufferMultiplier !== undefined)) && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-6 shadow-sm transition-colors shrink-0">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
                Phase Cash Strategy Visualization (Three Buckets)
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Tracking dynamic allocation across Liquid Cash Buffer, Income, and Growth Assets.
              </p>
            </div>
            <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 flex-1 min-h-[400px] flex flex-col transition-colors">
              <BucketWaterfallChart
                data={currentResults}
                displayStartYear={displayStartYear}
                displayEndYear={displayEndYear}
              />
            </div>
          </div>
        )}

        {/* 3. Income Shift Visualization */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-6 shadow-sm transition-colors shrink-0">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
              Income Shift Visualization
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Tracking UPRR divestments and dynamic funding priority shifts.
            </p>
          </div>
          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 flex-1 min-h-[400px] flex flex-col transition-colors">
            <MultiStageChart
              data={currentResults}
              stages={activeScenario?.stages || []}
              displayStartYear={displayStartYear}
              displayEndYear={displayEndYear}
            />
          </div>
        </div>

        {/* 4. Bridge Period Optimization (Rendered directly under Income Shift) */}
        {activeScenario?.bridgeOptimizationEnabled !== false && (
          <div id="bridge-optimization-view-wrapper" className="flex flex-col gap-6 shrink-0">
            {bridgeLoading ? (
              <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 min-h-[300px] transition-colors">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
                <p className="text-sm font-semibold">Running dynamic-programming tax simulation...</p>
              </div>
            ) : (
              <>
                <BridgeOptimizationChart data={bridgeData} />
                {notification && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in transition-all">
                    <span>{notification}</span>
                    <button 
                      onClick={() => setNotification(null)} 
                      className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 font-bold px-1.5 py-0.5"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <BridgeStrategyTable 
                  data={bridgeData} 
                  onApplyYearlyStrategy={(year, stockLiquidation, rothConversion) => {
                    setNotification(`Year ${year} strategy integrated! Recommended stock liquidation ($${stockLiquidation.toLocaleString()}) and Roth conversion ($${rothConversion.toLocaleString()}) targets locked into active projection.`);
                    setTimeout(() => setNotification(null), 5000);
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* 5. Funded Ratio Tracker */}
        <FundedRatioTracker
          data={currentResults}
          stages={activeScenario?.stages || []}
          activeScenario={activeScenario}
          displayStartYear={displayStartYear}
          displayEndYear={displayEndYear}
          handleUpdateDiscountRate={async (rate) => {
            if (!activeScenario) return;
            const doc = await db.plans.findOne(plan.id).exec();
            const updatedScenarios = plan.scenarios.map((s: any) =>
              s.id === activeScenario.id
                ? {
                    ...s,
                    budget: { ...s.budget, globalDiscountRate: rate },
                  }
                : s
            );
            await doc.patch({
              scenarios: updatedScenarios,
              updatedAt: Date.now(),
            });
            handleRunSimulation();
          }}
        />
      </div>
    </div>
  );
};

export default MultistageModelingView;
