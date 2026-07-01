import React, { useState, useEffect, useRef } from 'react';
import { PlanType, generateUUID } from '../lib/db';
import { runMultiDecadeSimulation, TemporalConfig, YearlySimResult } from '../lib/temporal-engine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ArrowLeft, Play, Plus, Edit2, Trash2, Check, X, AlertTriangle, Copy } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { auth } from '../lib/firebase';
import BudgetDashboard from './BudgetDashboard';
import FundingAllocation from './FundingAllocation';
import { MultiStageChart } from './MultiStageChart';
import { StageConfigurator } from './StageConfigurator';
import { FundedRatioTracker } from './FundedRatioTracker';
import { WealthVelocityChart } from './WealthVelocityChart';
import { InvestmentForm } from './InvestmentForm';
import { InvestmentList } from './InvestmentList';
import { NetWorthProjectionChart } from './NetWorthProjectionChart';
import { AssetModel } from '../lib/db';
import { CurrencyToggle } from './CurrencyToggle';

export default function ScenarioBuilder({ plan, db, onClose }: { plan: PlanType, db: any, onClose: () => void }) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(plan.scenarios?.[0]?.id || null);
  const [simulationResults, setSimulationResults] = useState<Record<string, YearlySimResult[]>>({});
  const [multiStageResults, setMultiStageResults] = useState<Record<string, any[]>>({});
  const [subModule, setSubModule] = useState<'simulation' | 'budget' | 'stages' | 'velocity'>('simulation');
  
  const [budgetDoc, setBudgetDoc] = useState<any>(null);

  useEffect(() => {
    if (!db || !auth.currentUser?.uid) return;
    const subscription = db.budgets.findOne({ selector: { userId: auth.currentUser.uid } }).$.subscribe((doc: any) => {
      setBudgetDoc(doc);
    });
    return () => subscription.unsubscribe();
  }, [db]);

  const [editingPlanName, setEditingPlanName] = useState(false);
  const [planName, setPlanName] = useState(plan.name);
  const [showDeletePlanConfirm, setShowDeletePlanConfirm] = useState(false);
  const [copiedPlanName, setCopiedPlanName] = useState<string | null>(null);

  const [localScenarioName, setLocalScenarioName] = useState('');
  const [scenarioToDeleteId, setScenarioToDeleteId] = useState<string | null>(null);

  const [showBaselineSettings, setShowBaselineSettings] = useState(false);
  const [showGKSettings, setShowGKSettings] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetModel | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<any>) => {
      const res = event.data;
      if (res.success && res.type === 'MULTI_STAGE_DRAWDOWN') {
        const scenarioId = res.scenarioId;
        setMultiStageResults(prev => ({
          ...prev,
          [scenarioId]: res.data
        }));
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const activeScenario = plan.scenarios?.find(s => s.id === activeScenarioId);

  const duplicatePlan = async () => {
    if (!db || !auth.currentUser) return;
    try {
      const copyName = `${plan.name} (Copy)`;
      const newPlan: PlanType = {
        id: generateUUID(),
        name: copyName,
        members: [auth.currentUser.uid],
        scenarios: (plan.scenarios || []).map(scenario => ({
          ...scenario,
          id: generateUUID()
        })),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.plans.insert(newPlan);
      setCopiedPlanName(copyName);
      setTimeout(() => setCopiedPlanName(null), 3000);
    } catch (err) {
      console.error('Error duplicating plan:', err);
    }
  };

  useEffect(() => {
    if (activeScenario) {
      setLocalScenarioName(activeScenario.name);
    } else {
      setLocalScenarioName('');
    }
  }, [activeScenarioId, activeScenario?.name]);

  const deleteScenario = async (scenarioId: string) => {
    if ((plan.scenarios || []).length <= 1) {
      alert("A plan must contain at least one scenario.");
      setScenarioToDeleteId(null);
      return;
    }
    
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      if (doc) {
        const updatedScenarios = (plan.scenarios || []).filter((s: any) => s.id !== scenarioId);
        await doc.patch({
          scenarios: updatedScenarios,
          updatedAt: Date.now()
        });
        
        // If the active scenario was the deleted one, update the selection
        if (activeScenarioId === scenarioId) {
          setActiveScenarioId(updatedScenarios[0]?.id || null);
        }
      }
    } catch (err) {
      console.error("Error deleting scenario:", err);
    } finally {
      setScenarioToDeleteId(null);
    }
  };

  useEffect(() => {
    setPlanName(plan.name);
  }, [plan.name]);

  const handleSavePlanName = async () => {
    if (!planName.trim()) return;
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      if (doc) {
        await doc.patch({
          name: planName,
          updatedAt: Date.now()
        });
        setEditingPlanName(false);
      }
    } catch (err) {
      console.error("Error patching plan name:", err);
    }
  };

  const handleDeletePlan = async () => {
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      if (doc) {
        await doc.remove();
        onClose();
      }
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // Dynamic theme colors for Recharts core boundaries
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#e4e4e7');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#18181b');

  // Dynamic colors for multiple lines depending on night watch compliance
  const colors = isNightWatch 
    ? ['#ef4444', '#b91c1c', '#dc2626', '#fca5a5', '#991b1b'] 
    : ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea'];

  const handleRunSimulation = () => {
    const newResults: Record<string, YearlySimResult[]> = {};
    plan.scenarios?.forEach(scenario => {
      const budget: any = scenario.budget || {};
      const currentAge = budget.currentAge !== undefined ? Number(budget.currentAge) : 48;
      const timelineDuration = budget.timelineDuration !== undefined ? Number(budget.timelineDuration) : 40;
      const targetConstantMarketReturn = budget.targetConstantMarketReturn !== undefined ? Number(budget.targetConstantMarketReturn) / 100 : 0.06;
      const maxRealWithdrawal = budget.maxRealWithdrawal !== undefined ? Number(budget.maxRealWithdrawal) : 150000;
      const liquidBufferYears = budget.liquidBufferYears !== undefined ? Number(budget.liquidBufferYears) : 3;

      // Custom G-K guardrail variables
      const upperGuardrailMultiplier = budget.upperGuardrailMultiplier !== undefined ? Number(budget.upperGuardrailMultiplier) : 0.80;
      const lowerGuardrailMultiplier = budget.lowerGuardrailMultiplier !== undefined ? Number(budget.lowerGuardrailMultiplier) : 1.20;
      const guardrailUpwardFactor = budget.guardrailUpwardFactor !== undefined ? Number(budget.guardrailUpwardFactor) : 1.10;
      const guardrailDownwardFactor = budget.guardrailDownwardFactor !== undefined ? Number(budget.guardrailDownwardFactor) : 0.90;

      // Create config from scenario
      const config: TemporalConfig = {
        currentAge,
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear() + timelineDuration,
        initialPortfolioValue: scenario.assets?.reduce((a: any, b: any) => a + Number(b.value || 0), 0) || 1200000,
        targetConstantMarketReturn,
        inflationRate: (scenario.budget?.inflationRate || 3.0) / 100,
        budgetPhases: scenario.budget?.budgetPhases ? scenario.budget.budgetPhases.map((p: any, i: number) => i === 0 && !!budgetDoc?.totalPlaintextAnnual ? { ...p, baselineAmount: budgetDoc.totalPlaintextAnnual } : p) : [{ phaseId: 'default', startYear: new Date().getFullYear(), endYear: 2100, baselineAmount: budgetDoc?.totalPlaintextAnnual || 5000 * 12, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 0.02 }],
        maxRealWithdrawal,
        privatePensionAmountAt65: 20000,
        rrTier1AmountAt67: 35000,
        rrTier2AmountAt67: 15000,
        oneOffCapEx: scenario.milestones?.map((m: any) => ({
          year: Number(m.triggerYear !== undefined ? m.triggerYear : (m.targetYear || 2030)),
          amount: Number(m.amount !== undefined ? m.amount : (m.targetAmount || 0)),
          description: m.name
        })) || [],
        milestones: scenario.milestones?.map((m: any) => ({
          id: m.id || generateUUID(),
          name: m.name || 'Milestone',
          type: m.type || 'capex',
          amount: Number(m.amount !== undefined ? m.amount : (m.targetAmount || 0)),
          isTriggerByAge: m.isTriggerByAge !== undefined ? !!m.isTriggerByAge : false,
          triggerAge: Number(m.triggerAge !== undefined ? m.triggerAge : 65),
          triggerYear: Number(m.triggerYear !== undefined ? m.triggerYear : (m.targetYear || 2030))
        })) || [],
        assets: scenario.assets?.map((ast: any) => ({
          id: ast.id,
          name: ast.name,
          value: Number(ast.value || 0),
          type: ast.type || 'investment',
          growthRate: Number(ast.growthRate !== undefined ? ast.growthRate : 6.0) / 100,
          dividendYield: Number(ast.dividendYield !== undefined ? ast.dividendYield : 0.0) / 100,
          dividendReinvestment: ast.dividendReinvestment || 'reinvest'
        })) || [],
        liquidBufferYears,
        upperGuardrailMultiplier,
        lowerGuardrailMultiplier,
        guardrailUpwardFactor,
        guardrailDownwardFactor,
        targetRothConversionAmount: budgetDoc?.targetRothConversionAmount || 0,
        taxableRebalancingSaleAmount: budgetDoc?.taxableRebalancingSaleAmount || 0,
        rebalancingCapitalGainPercentage: budgetDoc?.rebalancingCapitalGainPercentage || 0
      };

      const results = runMultiDecadeSimulation(config);
      newResults[scenario.id] = results;

      // Dispatch to Web Worker for Multi-Stage specific rendering
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'MULTI_STAGE_DRAWDOWN',
          scenarioId: scenario.id,
          startYear: config.startYear,
          endYear: config.endYear,
          currentAge: config.currentAge,
          assets: config.assets,
          stages: scenario.stages || [],
          milestones: scenario.milestones || [],
          uprrDivestmentAnnualAmount: 120000, // Example safe fallback
          dividendEtfId: scenario.assets?.find((a: any) => a.name?.toLowerCase().includes('schd'))?.id || '',
          uprrId: scenario.assets?.find((a: any) => a.name?.toLowerCase().includes('uprr'))?.id || '',
          targetConstantMarketReturn,
          inflationRate: config.inflationRate,
          budgetPhases: config.budgetPhases,
          maxRealWithdrawal: config.maxRealWithdrawal,
          liquidBufferYears: config.liquidBufferYears,
          nonTaxableGifts: scenario.nonTaxableGifts || [],
          targetRothConversionAmount: budgetDoc?.targetRothConversionAmount || 0,
          taxableRebalancingSaleAmount: budgetDoc?.taxableRebalancingSaleAmount || 0,
          rebalancingCapitalGainPercentage: budgetDoc?.rebalancingCapitalGainPercentage || 0
        });
      }
    });
    setSimulationResults(newResults);
  };

  useEffect(() => {
    handleRunSimulation();
  }, [plan.scenarios, budgetDoc]);

  const addScenario = async () => {
    const doc = await db.plans.findOne(plan.id).exec();
    const currentScenarios = doc.scenarios || [];
    const newId = generateUUID();
    const newScenario = {
      id: newId,
      name: `Scenario ${currentScenarios.length + 1}`,
      budget: { monthlyIncome: 10000, budgetPhases: [{ phaseId: generateUUID(), startYear: new Date().getFullYear(), endYear: 2100, baselineAmount: 4500 * 12, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 2.0 }], inflationRate: 3.0, residencyState: 'FL' },
      milestones: [{ id: generateUUID(), name: 'Boat Refit', targetAmount: 50000, targetYear: 2028 }],
      assets: [{ id: generateUUID(), name: 'Portfolio', type: 'investment', value: 1200000, growthRate: 6.0 }]
    };
    await doc.patch({
      scenarios: [...currentScenarios, newScenario],
      updatedAt: Date.now()
    });
    setActiveScenarioId(newId);
  };

  const duplicateScenario = async (scenarioToDup: any) => {
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      const currentScenarios = doc.scenarios || [];
      const newId = generateUUID();
      const duplicated = {
        ...scenarioToDup,
        id: newId,
        name: `${scenarioToDup.name} (Copy)`
      };
      await doc.patch({
        scenarios: [...currentScenarios, duplicated],
        updatedAt: Date.now()
      });
      setActiveScenarioId(newId);
    } catch (err) {
      console.error("Error duplicating scenario:", err);
    }
  };

  // Combine data for comparative charts
  const combinedChartData = [];
  if (Object.keys(simulationResults).length > 0) {
    const firstScenarioId = Object.keys(simulationResults)[0];
    const len = simulationResults[firstScenarioId]?.length || 0;
    for (let i = 0; i < len; i++) {
        const dataPoint: any = { 
            year: simulationResults[firstScenarioId][i].calendarYear, 
            age: simulationResults[firstScenarioId][i].age 
        };
        Object.entries(simulationResults).forEach(([id, res]) => {
            const scenarioName = plan.scenarios?.find(s => s.id === id)?.name || id;
            if (res[i]) {
              dataPoint[`${scenarioName} Balance`] = Math.round(res[i].endingBalance);
              dataPoint[`${scenarioName} Tax Drag`] = Math.round(res[i].taxDrag);
            }
        });
        combinedChartData.push(dataPoint);
    }
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-100px)] lg:overflow-hidden gap-4 sm:gap-6 text-zinc-900 dark:text-zinc-100 transition-colors">
      
      {showDeletePlanConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowDeletePlanConfirm(false)}
          />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 flex flex-col gap-5 transform scale-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Delete this entire plan?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to delete <strong>{plan.name}</strong> along with all of its scenarios, budgets, and data? This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeletePlanConfirm(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-605 hover:bg-red-700 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {scenarioToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setScenarioToDeleteId(null)}
          />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10 flex flex-col gap-5 transform scale-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Delete this scenario?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to delete <strong>{plan.scenarios?.find((s: any) => s.id === scenarioToDeleteId)?.name}</strong>? This will permanently erase its budgets and assets.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setScenarioToDeleteId(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteScenario(scenarioToDeleteId)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={16} />
                Delete Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full cursor-pointer transition focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-red-600 focus:outline-none"
            aria-label="Back to plans"
          >
            <ArrowLeft size={20} />
          </button>
          
          {editingPlanName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSavePlanName();
                  if (e.key === 'Escape') {
                    setPlanName(plan.name);
                    setEditingPlanName(false);
                  }
                }}
                className="text-lg sm:text-xl font-bold border-b border-blue-500 dark:border-red-500 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none py-0.5 max-w-[200px] sm:max-w-[300px]"
                autoFocus
              />
              <button
                onClick={handleSavePlanName}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-green-600 dark:text-green-400 rounded-lg transition-colors cursor-pointer"
                title="Save"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => {
                  setPlanName(plan.name);
                  setEditingPlanName(false);
                }}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-605 dark:hover:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 group/title">
                <h2 
                  className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-red-450"
                  onClick={() => setEditingPlanName(true)}
                  title="Click to rename"
                >
                  {plan.name}
                </h2>
                <button
                  onClick={() => setEditingPlanName(true)}
                  className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-red-450 opacity-0 group-hover/title:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                  title="Rename Plan"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={duplicatePlan}
                  className="p-1 text-zinc-500 hover:text-green-600 dark:hover:text-green-450 opacity-60 group-hover/title:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                  title="Copy/Duplicate Plan"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => setShowDeletePlanConfirm(true)}
                  className="p-1 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 opacity-60 group-hover/title:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                  title="Delete Plan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium font-sans">HorizonFI Premium Control Suite</p>
                {copiedPlanName && (
                  <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-md animate-pulse">
                     Copied plan!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Segmented Controller Tab Selector */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 self-stretch sm:self-center">
          <button
            onClick={() => setSubModule('simulation')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition min-w-[120px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              subModule === 'simulation'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-250/30'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Long-Term Simulation
          </button>
          <button
            onClick={() => setSubModule('budget')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition min-w-[120px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              subModule === 'budget'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-250/30'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Granular Budget & Variance
          </button>
          <button
            onClick={() => setSubModule('stages')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition min-w-[120px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              subModule === 'stages'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-250/30'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Multi-Stage Modeling
          </button>
          <button
            onClick={() => setSubModule('velocity')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition min-w-[120px] min-h-[36px] flex items-center justify-center cursor-pointer ${
              subModule === 'velocity'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-250/30'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Wealth Velocity
          </button>
        </div>
        
        {subModule === 'simulation' ? (
          <button 
            onClick={addScenario}
            className="flex items-center justify-center gap-2 min-h-[44px] bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 px-5 py-2.5 rounded-xl font-semibold transition cursor-pointer text-sm w-full sm:w-auto shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-red-600 focus-visible:ring-offset-2 focus:outline-none"
          >
            <Plus size={18} /> New Scenario
          </button>
        ) : (
          <div className="w-full sm:w-auto" />
        )}
      </div>

      {subModule === 'budget' && (
        <div className="flex-1 overflow-y-auto pb-8 pr-1 font-sans space-y-4">
          {!activeScenario ? (
            <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 mt-6 min-h-[300px]">
               <AlertTriangle className="w-10 h-10 mb-4 text-amber-500 opacity-80" />
               <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No Active Scenario Selected</p>
               <p className="text-xs max-w-sm mt-2 text-center">Please create and select a scenario in the "Long-Term Simulation" tab before managing funding allocations and budgets.</p>
            </div>
          ) : (
            <>
              <FundingAllocation 
                plan={plan} 
                activeScenario={activeScenario} 
                db={db} 
                userId={auth.currentUser?.uid || ''}
                handleRunSimulation={handleRunSimulation} 
              />
              <BudgetDashboard db={db} userId={auth.currentUser?.uid || ''} />
            </>
          )}
        </div>
      )}

      {subModule === 'stages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:overflow-hidden pb-8 lg:pb-0">
          <div className="col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/80 rounded-2xl p-4 flex flex-col gap-5 lg:overflow-y-auto shadow-sm transition-colors">
            <h3 className="font-bold text-sm tracking-tight uppercase text-zinc-500 dark:text-zinc-400">Multi-Stage Configuration</h3>
            {activeScenario && <StageConfigurator activeScenario={activeScenario} plan={plan} db={db} handleRunSimulation={handleRunSimulation} />}
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6 lg:overflow-y-auto pb-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 flex flex-col gap-6 shadow-sm transition-colors shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                   <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Long-Term Portfolio Projection</h3>
                   <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Tracking projected net worth based on tax bucket and availability.</p>
                </div>
                <div className="flex justify-start sm:justify-end">
                   <CurrencyToggle />
                </div>
              </div>
              <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 flex-1 min-h-[400px] flex flex-col">
                <NetWorthProjectionChart 
                  data={multiStageResults[activeScenarioId || ''] || []} 
                  assets={activeScenario?.assets || []} 
                />
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 flex flex-col gap-6 shadow-sm transition-colors shrink-0">
              <div>
                 <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Income Shift Visualization</h3>
                 <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Tracking UPRR divestments and dynamic funding priority shifts.</p>
              </div>
              <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 flex-1 min-h-[400px] flex flex-col">
                <MultiStageChart data={multiStageResults[activeScenarioId || ''] || []} stages={activeScenario?.stages || []} />
              </div>
            </div>

            <FundedRatioTracker 
              data={multiStageResults[activeScenarioId || ''] || []} 
              stages={activeScenario?.stages || []} 
              activeScenario={activeScenario}
              handleUpdateDiscountRate={async (rate) => {
                if (!activeScenario) return;
                const doc = await db.plans.findOne(plan.id).exec();
                const updatedScenarios = plan.scenarios.map((s: any) => 
                  s.id === activeScenario.id ? { ...s, budget: { ...s.budget, globalDiscountRate: rate } } : s
                );
                await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                handleRunSimulation();
              }}
            />
          </div>
        </div>
      )}

      {subModule === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:overflow-hidden pb-8 lg:pb-0">
        {/* Left Sidebar - Scenarios List & Editor */}
        <div className="col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-5 lg:overflow-y-auto shadow-sm transition-colors">
          <div className="space-y-2.5">
            <h3 className="font-bold text-sm tracking-tight mb-2 uppercase text-zinc-500 dark:text-zinc-400">Scenarios</h3>
            <div className="space-y-2">
              {plan.scenarios?.map((scenario: any) => {
                const isSelected = activeScenarioId === scenario.id;
                return (
                  <div 
                    key={scenario.id} 
                    onClick={() => setActiveScenarioId(scenario.id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveScenarioId(scenario.id); } }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group relative focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-red-600 focus:outline-none min-h-[48px] ${
                      isSelected 
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/20 ring-1 ring-blue-600 dark:ring-blue-500 shadow-sm' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{scenario.name}</div>
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                        Starting Balance: ${(scenario.assets?.reduce((a: number, b: any) => a + Number(b.value || 0), 0) || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateScenario(scenario);
                        }}
                        className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Duplicate scenario"
                        title="Duplicate scenario"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScenarioToDeleteId(scenario.id);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Delete scenario"
                        title="Delete scenario"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeScenario && (
            <div key={activeScenario.id} className="mt-2 pt-5 border-t border-zinc-200/60 dark:border-zinc-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Edit Active Scenario</h4>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5 focus:outline-none">Scenario Name</label>
                    <input 
                       type="text" 
                       value={localScenarioName} 
                       onChange={(e) => setLocalScenarioName(e.target.value)}
                       onBlur={async () => {
                          if (!localScenarioName.trim() || localScenarioName === activeScenario.name) return;
                          const doc = await db.plans.findOne(plan.id).exec();
                          const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, name: localScenarioName } : s);
                          await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                       }}
                       onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                             e.currentTarget.blur();
                          }
                       }}
                       className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">Inflation Rate (%)</label>
                    <input 
                       type="number" 
                       step="0.1"
                       defaultValue={activeScenario.budget?.inflationRate} 
                       onBlur={async (e) => {
                          const doc = await db.plans.findOne(plan.id).exec();
                          const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, inflationRate: Number(e.target.value) } } : s);
                          await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                          handleRunSimulation();
                       }} 
                       className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5" title="Used for Present Value & Funded Ratio calculations">Real Discount Rate (%)</label>
                    <input 
                       type="number" 
                       step="0.1"
                       defaultValue={activeScenario.budget?.globalDiscountRate ?? 2.0} 
                       onBlur={async (e) => {
                          const val = Number(e.target.value);
                          const doc = await db.plans.findOne(plan.id).exec();
                          const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, globalDiscountRate: val } } : s);
                          await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                          handleRunSimulation();
                       }} 
                       className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                    />
                 </div>
                 <div className="pt-3 border-t border-zinc-200/50 dark:border-zinc-800/80">
                   <div className="flex justify-between items-center mb-3">
                     <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Target Budget Phases</h5>
                     <button
                       type="button"
                       onClick={async () => {
                          const doc = await db.plans.findOne(plan.id).exec();
                          const updatedScenarios = plan.scenarios.map((s: any) => {
                             if (s.id === activeScenario.id) {
                                const activePhases = s.budget?.budgetPhases && s.budget.budgetPhases.length > 0 ? [...s.budget.budgetPhases] : [{ phaseId: generateUUID(), startYear: new Date().getFullYear(), endYear: 2100, baselineAmount: 54000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 2.0 }];
                                
                                const lastPhase = activePhases[activePhases.length - 1];
                                const startYear = lastPhase ? lastPhase.endYear + 1 : new Date().getFullYear();
                                
                                activePhases.push({
                                   phaseId: generateUUID(),
                                   startYear,
                                   endYear: startYear + 10,
                                   baselineAmount: lastPhase ? lastPhase.baselineAmount : 54000,
                                   applyLifestyleAdjustment: true,
                                   lifestyleAdjustmentRate: 2.0
                                });
                                return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                             }
                             return s;
                          });
                          await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                          handleRunSimulation();
                       }}
                       className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 focus:outline-none"
                     >
                       <Plus className="w-3 h-3" /> ADD PHASE
                     </button>
                   </div>
                   <div className="space-y-4">
                     {(activeScenario.budget?.budgetPhases && activeScenario.budget.budgetPhases.length > 0 ? activeScenario.budget.budgetPhases : [{ phaseId: 'default', startYear: new Date().getFullYear(), endYear: 2100, baselineAmount: 54000, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 2.0 }]).map((phase: any, index: number, arr: any[]) => (
                       <div key={phase.phaseId} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 relative space-y-3">
                         {arr.length > 1 && (
                           <button
                             type="button"
                             onClick={async () => {
                                const doc = await db.plans.findOne(plan.id).exec();
                                const updatedScenarios = plan.scenarios.map((s: any) => {
                                   if (s.id === activeScenario.id) {
                                      const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                      return { ...s, budget: { ...s.budget, budgetPhases: activePhases.filter((p: any) => p.phaseId !== phase.phaseId) } };
                                   }
                                   return s;
                                });
                                await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                handleRunSimulation();
                             }}
                             className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 transition-colors focus:outline-none p-1.5"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                         
                         <div className="grid grid-cols-2 gap-3 pr-8">
                           <div>
                             <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Start Year</label>
                             <input
                               type="number"
                               defaultValue={phase.startYear}
                               onBlur={async (e) => {
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedScenarios = plan.scenarios.map((s: any) => {
                                     if (s.id === activeScenario.id) {
                                        const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                        const pIdx = activePhases.findIndex((p: any) => p.phaseId === phase.phaseId);
                                        if (pIdx > -1) activePhases[pIdx].startYear = Number(e.target.value);
                                        return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                                     }
                                     return s;
                                  });
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                               }}
                               className={`w-full text-xs border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-105 rounded-lg p-2 border outline-none min-h-[44px] ${index === 0 && !!budgetDoc?.totalPlaintextAnnual ? "opacity-70 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 transition-all"}`}
                             />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">End Year</label>
                             <input
                               type="number"
                               defaultValue={phase.endYear}
                               onBlur={async (e) => {
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedScenarios = plan.scenarios.map((s: any) => {
                                     if (s.id === activeScenario.id) {
                                        const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                        const pIdx = activePhases.findIndex((p: any) => p.phaseId === phase.phaseId);
                                        if (pIdx > -1) activePhases[pIdx].endYear = Number(e.target.value);
                                        return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                                     }
                                     return s;
                                  });
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                               }}
                               className="w-full text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 outline-none transition-all min-h-[44px]"
                             />
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Baseline Budget ($) {index === 0 && !!budgetDoc?.totalPlaintextAnnual && <span className="text-blue-500 normal-case italic ml-1">(Linked to Planned Expenses)</span>}</label>
                             <input
                               type="number"
                               value={index === 0 && !!budgetDoc?.totalPlaintextAnnual ? budgetDoc.totalPlaintextAnnual : phase.baselineAmount}
                               readOnly={index === 0 && !!budgetDoc?.totalPlaintextAnnual}
                               onChange={() => {}}
                               onBlur={async (e) => {
                                  if (index === 0 && !!budgetDoc?.totalPlaintextAnnual) return;
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedScenarios = plan.scenarios.map((s: any) => {
                                     if (s.id === activeScenario.id) {
                                        const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                        const pIdx = activePhases.findIndex((p: any) => p.phaseId === phase.phaseId);
                                        if (pIdx > -1) activePhases[pIdx].baselineAmount = Number(e.target.value);
                                        return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                                     }
                                     return s;
                                  });
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                               }}
                               className="w-full text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 outline-none transition-all min-h-[44px]"
                             />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Adjustment Rate (%)</label>
                             <input
                               type="number"
                               step="0.1"
                               defaultValue={phase.lifestyleAdjustmentRate}
                               disabled={!phase.applyLifestyleAdjustment}
                               onBlur={async (e) => {
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedScenarios = plan.scenarios.map((s: any) => {
                                     if (s.id === activeScenario.id) {
                                        const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                        const pIdx = activePhases.findIndex((p: any) => p.phaseId === phase.phaseId);
                                        if (pIdx > -1) activePhases[pIdx].lifestyleAdjustmentRate = Number(e.target.value);
                                        return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                                     }
                                     return s;
                                  });
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                               }}
                               className="w-full text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 outline-none transition-all disabled:opacity-50 min-h-[44px]"
                             />
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2 pt-1 h-[44px]">
                           <input 
                             type="checkbox" 
                             id={`applyAdjustment-${phase.phaseId}`}
                             defaultChecked={phase.applyLifestyleAdjustment}
                             onChange={async (e) => {
                               const doc = await db.plans.findOne(plan.id).exec();
                               const updatedScenarios = plan.scenarios.map((s: any) => {
                                  if (s.id === activeScenario.id) {
                                     const activePhases = s.budget?.budgetPhases ? [...s.budget.budgetPhases] : [];
                                     const pIdx = activePhases.findIndex((p: any) => p.phaseId === phase.phaseId);
                                     if (pIdx > -1) activePhases[pIdx].applyLifestyleAdjustment = e.target.checked;
                                     return { ...s, budget: { ...s.budget, budgetPhases: activePhases } };
                                  }
                                  return s;
                               });
                               await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                               handleRunSimulation();
                             }}
                             className="w-5 h-5 text-blue-600 dark:text-red-500 border-zinc-300 dark:border-zinc-700 rounded focus:ring-blue-500 dark:focus:ring-red-500 dark:focus:ring-offset-zinc-950 dark:bg-zinc-900 cursor-pointer" 
                           />
                           <label htmlFor={`applyAdjustment-${phase.phaseId}`} className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                             Apply Lifestyle Adjustment? (Compounds annually)
                           </label>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div>
                  {/* Collapsible Custom Variables & Assumptions */}
                  <div className="border-t border-zinc-200/50 dark:border-zinc-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowBaselineSettings(!showBaselineSettings)}
                      className="w-full flex justify-between items-center py-2 font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none"
                    >
                      <span className="flex items-center gap-1.5">🔄 Timeline Assumptions</span>
                      <span className="text-zinc-400 font-mono text-[10px]">{showBaselineSettings ? 'Collapse [-]' : 'Expand [+]'}</span>
                    </button>
                    {showBaselineSettings && (
                      <div className="space-y-4 pt-2.5">
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Retirement Current Age</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans">Starting age for milestone triggers and Railroad retirement tracking (baseline constant = 48).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.currentAge !== undefined ? activeScenario.budget.currentAge : 48} 
                              onBlur={async (e) => {
                                 const val = Math.max(1, Math.min(120, Number(e.target.value) || 48));
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, currentAge: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Simulation Duration (years)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans">Decades timeline horizon modeling retirement curves (default = 40 years).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.timelineDuration !== undefined ? activeScenario.budget.timelineDuration : 40} 
                              onBlur={async (e) => {
                                 const val = Math.max(1, Math.min(100, Number(e.target.value) || 40));
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, timelineDuration: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Target Annual Return (%)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans">The default benchmark interest or return rate used on standard unweighted asset growth (default = 6.0%).</p>
                           <input 
                              type="number" 
                              step="0.1"
                              defaultValue={activeScenario.budget?.targetConstantMarketReturn !== undefined ? activeScenario.budget.targetConstantMarketReturn : 6.0} 
                              onBlur={async (e) => {
                                 const val = Math.max(-50, Math.min(100, Number(e.target.value) || 6.0));
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, targetConstantMarketReturn: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Guyton-Klinger Settings */}
                  <div className="border-t border-zinc-200/50 dark:border-zinc-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowGKSettings(!showGKSettings)}
                      className="w-full flex justify-between items-center py-2 font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none"
                    >
                      <span className="flex items-center gap-1.5">🛡️ Guyton-Klinger Rules</span>
                      <span className="text-zinc-400 font-mono text-[10px]">{showGKSettings ? 'Collapse [-]' : 'Expand [+]'}</span>
                    </button>
                    {showGKSettings && (
                      <div className="space-y-4 pt-2.5">
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Max Real Withdrawal ($/yr)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans">Hard ceiling cap on inflation-adjusted real withdrawals (default = $150,000).</p>
                           <input 
                              type="number" 
                              step="5000"
                              defaultValue={activeScenario.budget?.maxRealWithdrawal !== undefined ? activeScenario.budget.maxRealWithdrawal : 150000} 
                              onBlur={async (e) => {
                                 const val = Math.max(0, Number(e.target.value) || 150000);
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, maxRealWithdrawal: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Upper Guardrail Multiplier (%)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans font-sans">Triggers Prosperity spending increase if initial withdrawal rate drops by this % due to portfolio expansion (default = 80%).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.upperGuardrailMultiplier !== undefined ? Math.round(activeScenario.budget.upperGuardrailMultiplier * 100) : 80} 
                              onBlur={async (e) => {
                                 const val = Math.max(10, Math.min(200, Number(e.target.value) || 80)) / 100;
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, upperGuardrailMultiplier: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Lower Guardrail Multiplier (%)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans font-sans">Triggers Preservation spending cut if initial withdrawal rate climbs by this % due to portfolio contraction (default = 120%).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.lowerGuardrailMultiplier !== undefined ? Math.round(activeScenario.budget.lowerGuardrailMultiplier * 100) : 120} 
                              onBlur={async (e) => {
                                 const val = Math.max(10, Math.min(300, Number(e.target.value) || 120)) / 100;
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, lowerGuardrailMultiplier: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Prosperity Bump Rate (%)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans font-sans">Baseline spending increase applied once the Upper Guardrail is breached (default = 10%).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.guardrailUpwardFactor !== undefined ? Math.round((activeScenario.budget.guardrailUpwardFactor - 1) * 100) : 10} 
                              onBlur={async (e) => {
                                 const val = 1 + (Math.max(0, Math.min(100, Number(e.target.value) || 10)) / 100);
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, guardrailUpwardFactor: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Preservation Cut Rate (%)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans font-sans">Baseline spending reduction applied once the Lower Guardrail is breached (default = 10%).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.guardrailDownwardFactor !== undefined ? Math.round((1 - activeScenario.budget.guardrailDownwardFactor) * 105) / 105 * 100 : 10} 
                              onBlur={async (e) => {
                                 const val = 1 - (Math.max(0, Math.min(100, Number(e.target.value) || 10)) / 100);
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, guardrailDownwardFactor: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Cash Buffer (years of spending)</label>
                           <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-1.5 leading-tight font-sans font-sans font-sans font-sans">Number of spending years backstopped in Cash buffer to bridge negative returns (default = 3 years).</p>
                           <input 
                              type="number" 
                              defaultValue={activeScenario.budget?.liquidBufferYears !== undefined ? activeScenario.budget.liquidBufferYears : 3} 
                              onBlur={async (e) => {
                                 const val = Math.max(0, Math.min(20, Number(e.target.value) || 3));
                                 const doc = await db.plans.findOne(plan.id).exec();
                                 const updatedScenarios = plan.scenarios.map((s: any) => s.id === activeScenario.id ? { ...s, budget: { ...s.budget, liquidBufferYears: val } } : s);
                                 await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                 handleRunSimulation();
                              }} 
                              className="w-full text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 border font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 focus:border-blue-500 dark:focus:border-red-500 outline-none transition-all min-h-[44px]" 
                           />
                        </div>
                      </div>
                    )}
                  </div>

                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">Temporal Milestones & Income Streams</label>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {!(activeScenario.milestones && activeScenario.milestones.length > 0) ? (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2 text-center">No milestones specified. Default rates will apply.</p>
                      ) : (activeScenario.milestones || []).map((m: any, mIdx: number) => {
                        const milestoneId = m.id || generateUUID();
                        const isTriggerByAgeVal = m.isTriggerByAge !== undefined ? !!m.isTriggerByAge : false;
                        const trigAge = m.triggerAge !== undefined ? m.triggerAge : 65;
                        const trigYear = m.triggerYear !== undefined ? m.triggerYear : (m.targetYear || 2030);
                        const amtVal = m.amount !== undefined ? m.amount : (m.targetAmount || 0);
                        const mType = m.type || 'capex';

                        return (
                          <div key={milestoneId || mIdx} className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/65 dark:border-zinc-800/80 rounded-xl p-3 space-y-2.5">
                            <div className="flex justify-between items-center gap-2">
                              <input
                                type="text"
                                defaultValue={m.name || ''}
                                key={`milestone-name-${milestoneId}`}
                                onBlur={async (e) => {
                                  const newVal = e.target.value;
                                  if (newVal === m.name) return;
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedMilestones = (activeScenario.milestones || []).map((ms: any) =>
                                    (ms.id === m.id || (!ms.id && activeScenario.milestones.indexOf(ms) === mIdx)) ? { ...ms, name: newVal } : ms
                                  );
                                  const updatedScenarios = plan.scenarios.map((s: any) =>
                                    s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                  );
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                                }}
                                className="text-xs font-bold bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-650 text-zinc-850 dark:text-zinc-150 outline-none w-full"
                                placeholder="Milestone Name"
                              />
                              <button
                                onClick={async () => {
                                  const doc = await db.plans.findOne(plan.id).exec();
                                  const updatedMilestones = (activeScenario.milestones || []).filter((ms: any) =>
                                    ms.id !== m.id && activeScenario.milestones.indexOf(ms) !== mIdx
                                  );
                                  const updatedScenarios = plan.scenarios.map((s: any) =>
                                    s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                  );
                                  await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                  handleRunSimulation();
                                }}
                                className="text-zinc-400 hover:text-red-500 p-0.5 rounded transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Type</label>
                                <select
                                  value={mType}
                                  onChange={async (e) => {
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedMilestones = (activeScenario.milestones || []).map((ms: any) =>
                                      (ms.id === m.id || (!ms.id && activeScenario.milestones.indexOf(ms) === mIdx)) ? { ...ms, type: e.target.value } : ms
                                    );
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="w-full text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-700 dark:text-zinc-300 outline-none min-h-[28px]"
                                >
                                  <option value="capex">CapEx / Cost</option>
                                  <option value="pension">Private Pension</option>
                                  <option value="rrt1">Railroad Ret. Tier 1</option>
                                  <option value="rrt2">Railroad Ret. Tier 2</option>
                                  <option value="other_income">Other Taxable Income</option>
                                  <option value="pretax_avail_jesse">Jesse Pre-Tax Availability</option>
                                  <option value="pretax_avail_corrie">Corrie Pre-Tax Availability</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                                  {(mType === 'pretax_avail_jesse' || mType === 'pretax_avail_corrie') ? 'Amount (N/A)' : 'Amount ($ / yr)'}
                                </label>
                                <input
                                  type="number"
                                  defaultValue={amtVal}
                                  disabled={mType === 'pretax_avail_jesse' || mType === 'pretax_avail_corrie'}
                                  key={`milestone-amt-${milestoneId}`}
                                  onBlur={async (e) => {
                                    const val = Number(e.target.value);
                                    if (val === amtVal) return;
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedMilestones = (activeScenario.milestones || []).map((ms: any) =>
                                      (ms.id === m.id || (!ms.id && activeScenario.milestones.indexOf(ms) === mIdx)) ? { ...ms, amount: val, targetAmount: val } : ms
                                    );
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="w-full text-[11px] text-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-900 dark:text-zinc-100 outline-none min-h-[28px] disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-950"
                                  placeholder={(mType === 'pretax_avail_jesse' || mType === 'pretax_avail_corrie') ? 'N/A' : '0'}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Trigger Basis</label>
                                <select
                                  value={isTriggerByAgeVal ? 'age' : 'year'}
                                  onChange={async (e) => {
                                    const isAge = e.target.value === 'age';
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedMilestones = (activeScenario.milestones || []).map((ms: any) =>
                                      (ms.id === m.id || (!ms.id && activeScenario.milestones.indexOf(ms) === mIdx)) ? { ...ms, isTriggerByAge: isAge } : ms
                                    );
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="w-full text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-700 dark:text-zinc-300 outline-none min-h-[28px]"
                                >
                                  <option value="year">Target Year</option>
                                  <option value="age">Retiree Age</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                                  {isTriggerByAgeVal ? 'Age Trigger' : 'Year Trigger'}
                                </label>
                                <input
                                  type="number"
                                  defaultValue={isTriggerByAgeVal ? trigAge : trigYear}
                                  key={`milestone-trigger-${milestoneId}`}
                                  onBlur={async (e) => {
                                    const val = Number(e.target.value);
                                    if (val === (isTriggerByAgeVal ? trigAge : trigYear)) return;
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedMilestones = (activeScenario.milestones || []).map((ms: any) => {
                                      if (ms.id === m.id || (!ms.id && activeScenario.milestones.indexOf(ms) === mIdx)) {
                                        return isTriggerByAgeVal 
                                          ? { ...ms, triggerAge: val } 
                                          : { ...ms, triggerYear: val, targetYear: val };
                                      }
                                      return ms;
                                    });
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, milestones: updatedMilestones } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="w-full text-[11px] text-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-900 dark:text-zinc-100 outline-none min-h-[28px]"
                                  placeholder="2030 / 65"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={async () => {
                        const doc = await db.plans.findOne(plan.id).exec();
                        const currentMilestones = activeScenario.milestones || [];
                        const updatedScenarios = plan.scenarios.map((s: any) => {
                          if (s.id === activeScenario.id) {
                            return {
                              ...s,
                              milestones: [
                                ...currentMilestones,
                                { id: generateUUID(), name: 'New Milestone', type: 'pension', amount: 20000, isTriggerByAge: true, triggerAge: 65, triggerYear: 2045 }
                              ]
                            };
                          }
                          return s;
                        });
                        await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                        handleRunSimulation();
                      }}
                      className="w-full text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 py-1 px-2 border border-dashed border-blue-200 dark:border-blue-900/35 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/10 cursor-pointer focus:outline-none focus:ring-0 min-h-[36px] mt-2 mb-4"
                    >
                      <Plus size={14} /> Add Milestone
                    </button>

                    {/* Auxiliary Income (Tax-Free) */}
                    <div className="pt-4 border-t border-zinc-250 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          Auxiliary Income (Tax-Free)
                        </label>
                        <div className="group relative">
                          <span className="text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 cursor-help text-xs">
                            <span className="inline-flex items-center justify-center border border-zinc-300 dark:border-zinc-700 rounded-full w-3.5 h-3.5 text-[9px] font-bold">?</span>
                          </span>
                          <span className="absolute right-0 bottom-full mb-1.5 w-60 hidden group-hover:block bg-zinc-900 text-white text-[10px] rounded-lg p-2 leading-relaxed shadow-lg z-50 font-normal">
                            This income (gifts, inheritance, tax-free windfalls) completely bypasses the tax engine and directly offsets portfolio withdrawals before tax calculations and pensions.
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-2 leading-tight">Identify non-taxable external capital inflows to directly bridge income gaps without triggering capital gains or income tax drag.</p>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-2">
                        {!(activeScenario.nonTaxableGifts && activeScenario.nonTaxableGifts.length > 0) ? (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2 text-center">No auxiliary tax-free incomes specified.</p>
                        ) : (activeScenario.nonTaxableGifts || []).map((gift: any, gIdx: number) => {
                          const giftId = gift.id || `gift-idx-${gIdx}`;
                          const isTriggerByAge = gift.startAge !== undefined || gift.endAge !== undefined;
                          return (
                            <div key={giftId} className="bg-zinc-50 dark:bg-zinc-950/45 border border-zinc-200 dark:border-zinc-850 rounded-xl p-3 space-y-2.5">
                              <div className="flex justify-between items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={gift.name || ''}
                                  key={`gift-name-${giftId}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onBlur={async (e) => {
                                    const newVal = e.target.value;
                                    if (newVal === gift.name) return;
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) =>
                                      (g.id === gift.id || idx === gIdx) ? { ...g, name: newVal } : g
                                    );
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="text-xs font-bold bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-650 text-zinc-850 dark:text-zinc-150 outline-none w-full"
                                  placeholder="Auxiliary Gift Name"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const doc = await db.plans.findOne(plan.id).exec();
                                    const updatedGifts = (activeScenario.nonTaxableGifts || []).filter((g: any, idx: number) =>
                                      g.id !== gift.id && idx !== gIdx
                                    );
                                    const updatedScenarios = plan.scenarios.map((s: any) =>
                                      s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                    );
                                    await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                    handleRunSimulation();
                                  }}
                                  className="text-zinc-450 hover:text-red-500 p-0.5 rounded transition cursor-pointer bg-transparent border-0"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Annual Amount ($)</label>
                                  <input
                                    type="number"
                                    defaultValue={gift.annualAmount ?? 0}
                                    key={`gift-amount-${giftId}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    onBlur={async (e) => {
                                      const amount = Number(e.target.value);
                                      if (amount === (gift.annualAmount ?? 0)) return;
                                      const doc = await db.plans.findOne(plan.id).exec();
                                      const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) =>
                                        (g.id === gift.id || idx === gIdx) ? { ...g, annualAmount: amount } : g
                                      );
                                      const updatedScenarios = plan.scenarios.map((s: any) =>
                                        s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                      );
                                      await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                      handleRunSimulation();
                                    }}
                                    className="w-full text-[11px] text-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-lg p-1 text-zinc-900 dark:text-zinc-100 outline-none min-h-[28px]"
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Adjust Inflation</span>
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={!!gift.inflationAdjusted}
                                      onChange={async (e) => {
                                        const doc = await db.plans.findOne(plan.id).exec();
                                        const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) =>
                                          (g.id === gift.id || idx === gIdx) ? { ...g, inflationAdjusted: e.target.checked } : g
                                        );
                                        const updatedScenarios = plan.scenarios.map((s: any) =>
                                          s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                        );
                                        await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                        handleRunSimulation();
                                      }}
                                    />
                                    <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-red-600"></div>
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Basis</label>
                                  <select
                                    value={isTriggerByAge ? 'age' : 'year'}
                                    onChange={async (e) => {
                                      const yesAge = e.target.value === 'age';
                                      const doc = await db.plans.findOne(plan.id).exec();
                                      const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) => {
                                        if (g.id === gift.id || idx === gIdx) {
                                          if (yesAge) {
                                            return {
                                              ...g,
                                              startAge: g.startAge ?? 60,
                                              endAge: g.endAge ?? 70,
                                              startYear: undefined,
                                              endYear: undefined
                                            };
                                          } else {
                                            return {
                                              ...g,
                                              startYear: g.startYear ?? 2030,
                                              endYear: g.endYear ?? 2040,
                                              startAge: undefined,
                                              endAge: undefined
                                            };
                                          }
                                        }
                                        return g;
                                      });
                                      const updatedScenarios = plan.scenarios.map((s: any) =>
                                        s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                      );
                                      await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                      handleRunSimulation();
                                    }}
                                    className="w-full text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-700 dark:text-zinc-300 outline-none min-h-[28px]"
                                  >
                                    <option value="year">Target Years</option>
                                    <option value="age">Retiree Ages</option>
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-0.5">Start</label>
                                    <input
                                      type="number"
                                      defaultValue={isTriggerByAge ? (gift.startAge ?? '') : (gift.startYear ?? '')}
                                      key={`gift-start-${giftId}`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const numVal = e.target.value === '' ? undefined : Number(e.target.value);
                                        const currentVal = isTriggerByAge ? gift.startAge : gift.startYear;
                                        if (numVal === currentVal) return;
                                        const doc = await db.plans.findOne(plan.id).exec();
                                        const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) => {
                                          if (g.id === gift.id || idx === gIdx) {
                                            return isTriggerByAge 
                                              ? { ...g, startAge: numVal } 
                                              : { ...g, startYear: numVal };
                                          }
                                          return g;
                                        });
                                        const updatedScenarios = plan.scenarios.map((s: any) =>
                                          s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                        );
                                        await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                        handleRunSimulation();
                                      }}
                                      className="w-full text-[11px] text-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-900 dark:text-zinc-100 outline-none"
                                      placeholder="Start"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-zinc-400 dark:text-zinc-400 uppercase block mb-0.5">End</label>
                                    <input
                                      type="number"
                                      defaultValue={isTriggerByAge ? (gift.endAge ?? '') : (gift.endYear ?? '')}
                                      key={`gift-end-${giftId}`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      onBlur={async (e) => {
                                        const numVal = e.target.value === '' ? undefined : Number(e.target.value);
                                        const currentVal = isTriggerByAge ? gift.endAge : gift.endYear;
                                        if (numVal === currentVal) return;
                                        const doc = await db.plans.findOne(plan.id).exec();
                                        const updatedGifts = (activeScenario.nonTaxableGifts || []).map((g: any, idx: number) => {
                                          if (g.id === gift.id || idx === gIdx) {
                                            return isTriggerByAge 
                                              ? { ...g, endAge: numVal } 
                                              : { ...g, endYear: numVal };
                                          }
                                          return g;
                                        });
                                        const updatedScenarios = plan.scenarios.map((s: any) =>
                                          s.id === activeScenario.id ? { ...s, nonTaxableGifts: updatedGifts } : s
                                        );
                                        await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                                        handleRunSimulation();
                                      }}
                                      className="w-full text-[11px] text-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 text-zinc-900 dark:text-zinc-100 outline-none"
                                      placeholder="End"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const doc = await db.plans.findOne(plan.id).exec();
                          const currentGifts = activeScenario.nonTaxableGifts || [];
                          const updatedScenarios = plan.scenarios.map((s: any) => {
                            if (s.id === activeScenario.id) {
                              return {
                                ...s,
                                nonTaxableGifts: [
                                  ...currentGifts,
                                  { id: generateUUID(), name: 'New Gift Income', annualAmount: 12000, inflationAdjusted: true, startYear: 2030, endYear: 2040 }
                                ]
                              };
                            }
                            return s;
                          });
                          await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                          handleRunSimulation();
                        }}
                        className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 py-1 px-2 border border-dashed border-emerald-200 dark:border-emerald-900/35 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/10 cursor-pointer focus:outline-none focus:ring-0 min-h-[36px] mt-2 mb-4 bg-transparent"
                      >
                        <Plus size={14} /> Add Auxiliary Inflow
                      </button>
                    </div>

                    <button 
                      onClick={handleRunSimulation} 
                      className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-350 py-3 rounded-xl text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/20 transition shadow-sm border border-blue-100 dark:border-blue-900/35 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-red-600 focus:outline-none"
                    >
                       <Play size={16} /> Re-run Simulation
                    </button>
                 </div>
               </div>

              {/* Target Asset Characteristics (Growth/Depreciation) */}
              <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Target Asset Characteristics</h5>
                  <button
                    onClick={() => {
                      setEditingAsset(null);
                      setShowAssetForm(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer focus:outline-none focus:ring-0"
                  >
                    <Plus size={14} /> Add Asset
                  </button>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                  <InvestmentList 
                    assets={activeScenario.assets || []}
                    onEdit={(asset) => {
                      setEditingAsset(asset);
                      setShowAssetForm(true);
                    }}
                    onDelete={async (assetId) => {
                      if ((activeScenario.assets || []).length <= 1) {
                        alert("A scenario must have at least one asset to model trajectories.");
                        return;
                      }
                      const doc = await db.plans.findOne(plan.id).exec();
                      const updatedAssets = (activeScenario.assets || []).filter((a: any) => a.id !== assetId);
                      const updatedScenarios = plan.scenarios.map((s: any) =>
                        s.id === activeScenario.id ? { ...s, assets: updatedAssets } : s
                      );
                      await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                      handleRunSimulation();
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Area - Comparative Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-4 sm:p-6 flex flex-col gap-6 lg:overflow-y-auto shadow-sm transition-colors">
          <div>
             <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Comparative Analytics View</h3>
             <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Longitudinal trajectories simulating Guyton-Klinger, Tax engine matching, and Mid-iteration Temporal Shifts.</p>
          </div>
          
          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 h-[320px] sm:h-[360px] flex flex-col transition-colors">
            <h4 className="font-bold text-sm mb-4 text-zinc-700 dark:text-zinc-300">Portfolio Longevity (Ending Balance across Decades)</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
                      <XAxis 
                        dataKey="year" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={tickStroke}
                        tick={{ fill: textFill }} 
                        tickFormatter={(val) => `'${val.toString().slice(2)}`} 
                      />
                      <YAxis 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={tickStroke} 
                        tick={{ fill: textFill }}
                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} 
                      />
                      <Tooltip 
                         contentStyle={{ 
                           borderRadius: '12px', 
                           border: `1px solid ${tooltipBorder}`, 
                           boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)', 
                           backgroundColor: tooltipBg,
                           color: tooltipTexColor,
                           fontSize: '12px' 
                         }}
                         itemStyle={{ color: tooltipTexColor }}
                         labelStyle={{ color: textFill }}
                         formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                         labelFormatter={(label, payload) => `Year: ${label} (Age ${payload?.[0]?.payload?.age})`}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: textFill }} />
                      {plan.scenarios?.map((s: any, idx: number) => (
                          <Line 
                            key={s.id} 
                            type="monotone" 
                            dataKey={`${s.name} Balance`} 
                            name={s.name} 
                            stroke={colors[idx % colors.length]} 
                            strokeWidth={3} 
                            dot={false} 
                            activeDot={{ r: 6 }} 
                          />
                      ))}
                  </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/50 h-[320px] sm:h-[360px] flex flex-col transition-colors">
            <h4 className="font-bold text-sm mb-4 text-zinc-700 dark:text-zinc-350">Tax Drag Implications</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={combinedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
                      <XAxis 
                        dataKey="year" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={tickStroke}
                        tick={{ fill: textFill }} 
                        tickFormatter={(val) => `'${val.toString().slice(2)}`} 
                      />
                      <YAxis 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={tickStroke}
                        tick={{ fill: textFill }} 
                        tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
                      />
                      <Tooltip 
                         contentStyle={{ 
                           borderRadius: '12px', 
                           border: `1px solid ${tooltipBorder}`, 
                           boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)', 
                           backgroundColor: tooltipBg,
                           color: tooltipTexColor,
                           fontSize: '12px' 
                         }}
                         itemStyle={{ color: tooltipTexColor }}
                         labelStyle={{ color: textFill }}
                         formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                         labelFormatter={(label, payload) => `Year: ${label} (Age ${payload?.[0]?.payload?.age})`}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: textFill }} />
                      {plan.scenarios?.map((s: any, idx: number) => (
                          <Area 
                            key={s.id} 
                            type="step" 
                            dataKey={`${s.name} Tax Drag`} 
                            name={s.name} 
                            fill={colors[idx % colors.length]} 
                            stroke={colors[idx % colors.length]} 
                            fillOpacity={0.2} 
                          />
                      ))}
                  </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      </div>
      )}

      {subModule === 'velocity' && (
        <div className="flex-1 overflow-y-auto pb-8 pr-1 font-sans space-y-4">
          {!activeScenario ? (
            <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 mt-6 min-h-[300px]">
               <AlertTriangle className="w-10 h-10 mb-4 text-amber-500 opacity-80" />
               <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No Active Scenario Selected</p>
               <p className="text-xs max-w-sm mt-2 text-center">Please create and select a scenario in the "Long-Term Simulation" tab before analyzing Wealth Velocity.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805/85 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Active Scenario: {activeScenario.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Sandbox parameters pre-populated from active asset balances and target baseline choices.</p>
                </div>
              </div>
              <WealthVelocityChart 
                initialBalance={activeScenario.assets?.reduce((a: number, b: any) => a + Number(b.value || 0), 0)}
                initialGrowthRate={activeScenario.budget?.targetConstantMarketReturn ?? 6.0}
                initialWithdrawalRate={activeScenario.budget?.maxRealWithdrawal ? parseFloat(((activeScenario.budget.maxRealWithdrawal / (activeScenario.assets?.reduce((a: number, b: any) => a + Number(b.value || 0), 0) || 1200000)) * 100).toFixed(2)) : 4.0}
                initialInflationRate={activeScenario.budget?.inflationRate ?? 3.0}
              />
            </div>
          )}
        </div>
      )}
      {/* Asset Form Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-transparent w-full max-w-lg my-auto relative">
            <InvestmentForm 
              initialAsset={editingAsset}
              onCancel={() => {
                setShowAssetForm(false);
                setEditingAsset(null);
              }}
              onSave={async (asset) => {
                const doc = await db.plans.findOne(plan.id).exec();
                const currentAssets = activeScenario.assets || [];
                let updatedAssets;
                if (editingAsset) {
                  updatedAssets = currentAssets.map((a: any) => a.id === asset.id ? asset : a);
                } else {
                  updatedAssets = [...currentAssets, asset];
                }
                const updatedScenarios = plan.scenarios.map((s: any) =>
                  s.id === activeScenario.id ? { ...s, assets: updatedAssets } : s
                );
                await doc.patch({ scenarios: updatedScenarios, updatedAt: Date.now() });
                setShowAssetForm(false);
                setEditingAsset(null);
                handleRunSimulation();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
