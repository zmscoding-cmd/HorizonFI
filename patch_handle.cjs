const fs = require('fs');
let content = fs.readFileSync('src/components/ScenarioBuilder.tsx', 'utf-8');

// Add evaluateMultiBucketTax import if not exists
if (!content.includes('evaluateMultiBucketTax')) {
  content = content.replace(
    "import { Worker } from 'worker_threads';", // just a guess, I'll put it at the top
    "import { Worker } from 'worker_threads';"
  ); // Wait, I'll just use a safer replace
  content = content.replace(
    "import React,",
    "import { evaluateMultiBucketTax } from '../workers/simulation.worker';\nimport React,"
  );
}

const oldHandleStr = fs.readFileSync('handleRunSimulation.txt', 'utf-8');

const newHandleStr = `  const handleRunSimulation = async () => {
    if (!plan.scenarios || !db || !auth.currentUser?.uid) return;
    const userId = auth.currentUser.uid;

    for (const scenario of plan.scenarios) {
      if (scenario.id !== activeScenario?.id) continue; // Only process active scenario to prevent data bleed

      const budget: any = scenario.budget || {};
      const currentAge = budget.currentAge !== undefined ? Number(budget.currentAge) : 48;
      const targetEndYear = scenario.targetEndYear !== undefined ? Number(scenario.targetEndYear) : new Date().getFullYear() + 40;
      
      // Query scenario-specific data
      let taxEventsDoc = null;
      if (db.tax_events) {
        taxEventsDoc = await db.tax_events.findOne({ selector: { userId, scenarioId: scenario.id } }).exec();
      }
      
      let expenses = [];
      if (db.planned_expenses) {
        expenses = await db.planned_expenses.find({ selector: { userId, scenarioId: scenario.id } }).exec();
      }

      let fundingAllocationsDoc = null;
      if (db.funding_allocations) {
        fundingAllocationsDoc = await db.funding_allocations.findOne({ selector: { userId, scenarioId: scenario.id } }).exec();
      }

      // Calculate totals
      let totalAnnual = 0;
      expenses.forEach((e: any) => {
        if (e.excluded) return;
        const amt = e.valuationType === 'Static' ? Number(e.staticAmount || 0) : 0; // simplistic fallback
        // The real total comes from planned_expenses, but they are stored as static/relational.
        // Actually BudgetDashboard stores totalPlaintextAnnual on db.budgets.
        // Let's just calculate from plain expenses or fallback to budgetDoc
        totalAnnual += Number(e.totalPlaintextAnnual || amt * (e.frequency === 'Monthly' ? 12 : 1) || 0);
      });
      // Fallback to budgetDoc if expenses are 0 (e.g., legacy data)
      if (totalAnnual === 0) {
        totalAnnual = budgetDoc?.totalPlaintextAnnual || 5000 * 12;
      }

      const targetRoth = taxEventsDoc?.targetRothConversionAmount || 0;
      const taxableSale = taxEventsDoc?.taxableRebalancingSaleAmount || 0;
      const rebalancingCapGain = taxEventsDoc?.rebalancingCapitalGainPercentage || 0;

      let calculatedGross = totalAnnual;
      const buckets = fundingAllocationsDoc || budget.buckets;
      if (buckets) {
        const taxOutput = evaluateMultiBucketTax({
          targetNetExpense: totalAnnual,
          allocationMode: fundingAllocationsDoc?.allocationMode || budget.allocationMode || 'PERCENTAGE',
          buckets: {
            traditional401kIra: Number(buckets.traditional401kIra || 0),
            taxableBrokerage: Number(buckets.taxableBrokerage || 0),
            qualifiedDividends: Number(buckets.qualifiedDividends || 0),
            rothIra: Number(buckets.rothIra || 0),
            nonTaxableGift: Number(buckets.nonTaxableGift || 0)
          },
          blendedCostBasisPercentage: 60.0,
          preExistingOrdinaryIncome: 0,
          targetRothConversionAmount: targetRoth,
          taxableRebalancingSaleAmount: taxableSale,
          rebalancingCapitalGainPercentage: rebalancingCapGain
        });
        calculatedGross = taxOutput.grossWithdrawalTotal;
      } else {
        calculatedGross = budgetDoc?.calculatedGrossWithdrawalAnnual || totalAnnual;
      }

      const assetsList = scenario.assets || [];
      const totalPortfolioValue = assetsList.reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);
      const targetConstantMarketReturn = totalPortfolioValue > 0
        ? assetsList.reduce((sum: number, a: any) => {
            const growth = Number(a.expectedGrowthRate ?? a.growthRate ?? 0.05);
            const div = Number(a.expectedDividendYield ?? a.dividendYield ?? 0.0);
            return sum + (Number(a.value || 0) * (growth + div));
          }, 0) / totalPortfolioValue
        : 0.06;
      
      const maxRealWithdrawal = budget.maxRealWithdrawal !== undefined ? Number(budget.maxRealWithdrawal) : 150000;
      const liquidBufferYears = budget.liquidBufferYears !== undefined ? Number(budget.liquidBufferYears) : 3;

      const upperGuardrailMultiplier = budget.upperGuardrailMultiplier !== undefined ? Number(budget.upperGuardrailMultiplier) : 0.8;
      const lowerGuardrailMultiplier = budget.lowerGuardrailMultiplier !== undefined ? Number(budget.lowerGuardrailMultiplier) : 1.2;
      const guardrailUpwardFactor = budget.guardrailUpwardFactor !== undefined ? Number(budget.guardrailUpwardFactor) : 1.1;
      const guardrailDownwardFactor = budget.guardrailDownwardFactor !== undefined ? Number(budget.guardrailDownwardFactor) : 0.9;

      const config: any = {
        currentAge,
        startYear: new Date().getFullYear(),
        endYear: targetEndYear,
        initialPortfolioValue: scenario.assets?.reduce((a: any, b: any) => a + Number(b.value || 0), 0) || 1200000,
        targetConstantMarketReturn,
        inflationRate: (scenario.budget?.inflationRate || 3.0) / 100,
        budgetPhases: scenario.budget?.budgetPhases
          ? scenario.budget.budgetPhases.map((p: any, i: number) =>
              i === 0 && !p.isUnlinked
                ? { ...p, baselineAmount: calculatedGross }
                : p,
            )
          : [
              {
                phaseId: "default",
                startYear: new Date().getFullYear(),
                endYear: 2100,
                baselineAmount: calculatedGross,
                applyLifestyleAdjustment: true,
                lifestyleAdjustmentRate: 0.02,
                cashBufferMultiplier: 2.0,
              },
            ],
        maxRealWithdrawal,
        privatePensionAmountAt65: 20000,
        rrTier1AmountAt67: 35000,
        rrTier2AmountAt67: 15000,
        oneOffCapEx:
          scenario.milestones?.map((m: any) => ({
            year: Number(m.triggerYear !== undefined ? m.triggerYear : m.targetYear || 2030),
            amount: Number(m.amount !== undefined ? m.amount : m.targetAmount || 0),
            description: m.name,
          })) || [],
        milestones:
          scenario.milestones?.map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            name: m.name || "Milestone",
            type: m.type || "capex",
            amount: Number(m.amount !== undefined ? m.amount : m.targetAmount || 0),
            isTriggerByAge: m.isTriggerByAge !== undefined ? !!m.isTriggerByAge : false,
            triggerAge: Number(m.triggerAge !== undefined ? m.triggerAge : 65),
            triggerYear: Number(m.triggerYear !== undefined ? m.triggerYear : m.targetYear || 2030),
          })) || [],
        assets:
          scenario.assets?.map((ast: any) => ({
            id: ast.id,
            name: ast.name,
            value: Number(ast.value || 0),
            type: ast.type || "investment",
            assetType: ast.assetType || "TAXABLE",
            isLiquidationTarget: !!ast.isLiquidationTarget,
            isDividendDestination: !!ast.isDividendDestination,
            availableDate: ast.availableDate,
            growthRate: Number(ast.growthRate !== undefined ? ast.growthRate : 6.0) / 100,
            dividendYield: Number(ast.dividendYield !== undefined ? ast.dividendYield : 0.0) / 100,
            dividendReinvestment: ast.dividendReinvestment || "reinvest",
          })) || [],
        liquidBufferYears,
        upperGuardrailMultiplier,
        lowerGuardrailMultiplier,
        guardrailUpwardFactor,
        guardrailDownwardFactor,
        targetRothConversionAmount: targetRoth,
        taxableRebalancingSaleAmount: taxableSale,
        rebalancingCapitalGainPercentage: rebalancingCapGain,
      };

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "MULTI_STAGE_DRAWDOWN",
          scenarioId: scenario.id,
          startYear: config.startYear,
          endYear: config.endYear,
          targetEndYear: config.endYear,
          currentAge: config.currentAge,
          assets: config.assets,
          stages: scenario.stages || [],
          milestones: config.milestones,
          uprrDivestmentAnnualAmount: 120000,
          dividendEtfId: scenario.assets?.find((a: any) => a.name?.toLowerCase().includes("schd"))?.id || "",
          uprrId: scenario.assets?.find((a: any) => a.name?.toLowerCase().includes("uprr"))?.id || "",
          targetConstantMarketReturn,
          inflationRate: config.inflationRate,
          budgetPhases: config.budgetPhases,
          maxRealWithdrawal: config.maxRealWithdrawal,
          liquidBufferYears: config.liquidBufferYears,
          nonTaxableGifts: scenario.nonTaxableGifts || [],
          targetRothConversionAmount: config.targetRothConversionAmount,
          taxableRebalancingSaleAmount: config.taxableRebalancingSaleAmount,
          rebalancingCapitalGainPercentage: config.rebalancingCapitalGainPercentage,
          threeBuckets: config.threeBuckets || plan.threeBuckets,
          appliedBridgeStrategies: scenario.appliedBridgeStrategies || [],
          primaryBirthYear: plan.primaryBirthYear,
          spouseBirthYear: plan.spouseBirthYear,
          isSpouseSoleBeneficiary: plan.isSpouseSoleBeneficiary,
          rmdReinvestmentAssetId: scenario.rmdReinvestmentAssetId,
          delayInitialRMD: !!scenario.delayInitialRMD,
        });
      }
    }
  };`;

content = content.replace(oldHandleStr, newHandleStr);

// Now change the useEffect dependencies so it runs when activeScenario changes
content = content.replace(
  "  useEffect(() => {\n    handleRunSimulation();\n  }, [plan.scenarios, budgetDoc]);",
  "  useEffect(() => {\n    handleRunSimulation();\n  }, [plan.scenarios, budgetDoc, activeScenario]);"
);

fs.writeFileSync('src/components/ScenarioBuilder.tsx', content);
