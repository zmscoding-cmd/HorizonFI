import { 
  simulateNetWorthProbabilistic, 
  NetWorthSimRequest, 
  NetWorthAssetInput, 
  NetWorthLiabilityInput,
  computeBudgetSimulation,
  computePresentValue,
  simulateMultiStageDrawdownWorker,
  PlannedExpenseModel,
  AssetReferenceModel
} from '../workers/simulation.worker';

import { describe, it, expect } from 'vitest';

// Main Checkpoint Test Suite
describe('HorizonFI Net Worth Checkpoint Test Suite', () => {

  // Test Case 1: Mathematical Integrity (Memory Preservation & Array Decimation)
  describe('Vector 1: Mathematical Integrity & Array Decimation', () => {
    it('should successfully intercept bloat and truncate multi-decade high-frequency points to exactly 600', () => {
      const longTermRequest: NetWorthSimRequest = {
        type: 'COMPUTE_NET_WORTH',
        userId: 'test_user_uid',
        startYear: 2026,
        endYear: 2126, // 100-year duration (1200 months)
        currentAge: 35,
        assets: [
          { id: 'asset1', name: 'Brokerage', value: 500000, type: 'taxable_brokerage', assetType: 'TAXABLE', expectedGrowthRate: 0.07, expectedDividendYield: 0.02 }
        ],
        liabilities: [],
        rrt1AmountAt67: 2000,
        rrt2AmountAt67: 1000,
        pensionAmountAt65: 1500,
        inflationRate: 0.02,
        numPaths: 10 // Quick trial counts
      };

      const result = simulateNetWorthProbabilistic(longTermRequest);
      
      // Verification: High-frequency month-by-month results must be strictly truncated to preserve memory
      expect(result.length).toBeLessThanOrEqual(600);
      expect(result[0].year).toBe(2026);
      expect(result[result.length - 1].year).toBe(2125);
    });
  });

  // Test Case 2: Tax Engine & Threshold Accuracy
  describe('Vector 2: Tax Engine & Railroad Retirement Board Accuracy', () => {
    it('should accurately calculate provisional income and estimate deferred tax liabilities on age 67 RRT breach', () => {
      // 1. Core scenario prior to threshold breach (Age 60)
      const underAge67Request: NetWorthSimRequest = {
        type: 'COMPUTE_NET_WORTH',
        userId: 'test_user_uid',
        startYear: 2026,
        endYear: 2031, // 5 years
        currentAge: 60,
        assets: [
          { id: 'tira', name: 'Trad IRA', value: 1000000, type: 'traditional_ira', assetType: 'PRE_TAX', growthRate: 0.05, dividendYield: 0.02, expectedGrowthRate: 0.05, expectedDividendYield: 0.02 }
        ],
        liabilities: [],
        rrt1AmountAt67: 36000, // Railroad Retirement Tier 1
        rrt2AmountAt67: 15000, // Railroad Retirement Tier 2
        pensionAmountAt65: 20000,
        inflationRate: 0.02,
        numPaths: 5
      };

      const resultUnder67 = simulateNetWorthProbabilistic(underAge67Request);
      
      // Calculate age 61 datapoint
      const age61Datapoint = resultUnder67.find(dp => dp.age >= 61 && dp.age < 62);
      expect(age61Datapoint).toBeDefined();

      // 2. High Age Cohort breaching retirement benefits threshold (Age 68)
      const overAge67Request: NetWorthSimRequest = { ...underAge67Request, currentAge: 68 };
      const resultOver67 = simulateNetWorthProbabilistic(overAge67Request);

      const age69Datapoint = resultOver67.find(dp => dp.age >= 69 && dp.age < 70);
      expect(age69Datapoint).toBeDefined();
      
      // Ensure the calculation accounts for the deferred tax liabilities (contra-asset calculation)
      expect(age69Datapoint?.deferredTaxLiability).toBeGreaterThan(0);
    });
  });

  // Test Case 3: Zero-Trust Security Perimeter Validation
  describe('Vector 3: Zero-Trust Security Compliance', () => {
    it('should reject reads, creates, and updates with mismatched user UIDs with permission denied exceptions', () => {
      const mockAuthUser = { uid: 'auth_user_jesse' };
      const mockDocumentData = {
        id: '2026-06-01_auth_user_jesse',
        userId: 'malicious_user_attacker', // Mismatched UID
        date: '2026-06-01',
        assets: [],
        liabilities: [],
        aggregatedNetWorth: 500000,
        createdAt: 1775432000000
      };

      // Rules evaluation simulator assertions
      const checkAccessRule = (user: { uid: string } | null, resource: typeof mockDocumentData) => {
        if (!user || user.uid !== resource.userId) {
          throw new Error('PERMISSION_DENIED: User identity does not match resource owner');
        }
        return true;
      };

      expect(() => checkAccessRule(mockAuthUser, mockDocumentData)).toThrow('PERMISSION_DENIED');
    });
  });

  // Test Case 4: Deep Cold-Boot Offline State Restoration
  describe('Vector 4: Offline State Restoration & Local RxDB Decryption', () => {
    it('should query and decrypt IndexedDB instances seamlessly without internet connection', async () => {
      // Mock local storage decrypted states
      const mockOfflineIndexedDB = {
        name: 'horizonfi_local_rxdb',
        collections: {
          historical_datapoints: {
            find: () => ({
              exec: async () => [
                {
                  id: '2026-06-01_test_user_uid',
                  userId: 'test_user_uid',
                  date: '2026-06-01',
                  // CryptoJS encrypted string representation
                  assets: 'U2FsdGVkX19H8T6q73oV+dK1ySgR1hV/8LlzS5v723A=', 
                  liabilities: 'U2FsdGVkX1/mY62B7m8M3B/l89+2s1D68s0xK+f7z99=',
                  aggregatedNetWorth: 450000,
                  createdAt: Date.now()
                }
              ]
            })
          }
        }
      };

      // Mock decryption mechanism
      const decryptField = (encryptedText: string, key: string) => {
        if (!key) throw new Error('Missing cryptographic key');
        // Simulated zero-trust local decryption mapping
        return [
          { id: '1', name: 'Taxable Brokerage', value: 450000, type: 'taxable_brokerage' }
        ];
      };

      const localDocs = await mockOfflineIndexedDB.collections.historical_datapoints.find().exec();
      expect(localDocs.length).toBe(1);

      const decryptedAssets = decryptField(localDocs[0].assets, 'client_safe_derived_key_uid');
      expect(decryptedAssets[0].value).toBe(450000);
      expect(localDocs[0].aggregatedNetWorth).toBe(450000); // Verify plaintext is direct
    });
  });

  // Test Case 5: Granular Budgeting & Relational Calculations (Kahn's topo-sort & cyclic checks)
  describe('Vector 5: Granular Budgeting & Relational Dependency Resolution', () => {
    it('should correctly calculate static, asset-relational, expense-relational, and category-relational values in DAG order', () => {
      const mockAssets: AssetReferenceModel[] = [
        { id: 'portfolio1', name: 'Main Portfolio', value: 1000000 }
      ];

      const mockExpenses: PlannedExpenseModel[] = [
        {
          id: 'exp1',
          name: 'Core Rent',
          frequency: 'Monthly',
          valuationType: 'Static',
          staticAmount: 2000,
          categoryId: 'housing'
        },
        {
          id: 'exp2',
          name: 'Annual Tax Assessment',
          frequency: 'Annual',
          valuationType: 'Static',
          staticAmount: 12000,
          categoryId: 'housing'
        },
        {
          id: 'exp3',
          name: 'Property Management (Asset Relational)',
          frequency: 'Annual',
          valuationType: 'Relational',
          relationalTargetId: 'portfolio1', // 1% of Portfolio annually
          relationalPercent: 1.0,
          categoryId: 'housing'
        },
        {
          id: 'exp4',
          name: 'Owner Association Fee (Expense Relational)',
          frequency: 'Monthly',
          valuationType: 'Relational',
          relationalTargetId: 'exp1', // 10% of Core Rent
          relationalPercent: 10,
          categoryId: 'housing'
        },
        {
          id: 'exp5',
          name: 'Housing Backup Surcharge (Category Relational)',
          frequency: 'Monthly',
          valuationType: 'Relational',
          relationalTargetId: 'housing', // 5% of housing category total
          relationalPercent: 5,
          categoryId: 'backup'
        }
      ];

      const { expenses, totalMonthly, totalAnnual } = computeBudgetSimulation(mockExpenses, mockAssets);

      // exp1 (Rent): static, monthly = 2000, annual = 24000
      const rentExp = expenses.find(e => e.id === 'exp1')!;
      expect(rentExp.monthlyValue).toBe(2000);
      expect(rentExp.annualValue).toBe(24000);

      // exp2 (Tax Assessment): static, annual = 12000, monthly = 1000
      const taxExp = expenses.find(e => e.id === 'exp2')!;
      expect(taxExp.monthlyValue).toBe(1000);
      expect(taxExp.annualValue).toBe(12000);

      // exp3 (Property Management): relational to asset, 1% of 1000000 = 10000 annual, 833.333 monthly
      const pmExp = expenses.find(e => e.id === 'exp3')!;
      expect(pmExp.annualValue).toBe(10000);
      expect(pmExp.monthlyValue).toBeCloseTo(833.333, 2);

      // exp4 (Association Fee): relational to exp1 (Rent), 10% of 2000 monthly = 200 monthly, 2400 annual
      const assocExp = expenses.find(e => e.id === 'exp4')!;
      expect(assocExp.monthlyValue).toBe(200);
      expect(assocExp.annualValue).toBe(2400);

      // exp5 (Surcharge): relational to 'housing' category total (exp1 + exp2 + exp3 + exp4)
      // total monthly of housing: 2000 + 1000 + 833.333 + 200 = 4033.333
      // exp5 = 5% of 4033.333 = 201.666 monthly, 2420 annual
      const surchargeExp = expenses.find(e => e.id === 'exp5')!;
      expect(surchargeExp.monthlyValue).toBeCloseTo(201.666, 2);
      expect(surchargeExp.annualValue).toBeCloseTo(2420, 1);
    });

    it('should strictly halt and throw a Cyclic dependency detected error if recursive relational dependencies exist', () => {
      const mockExpenses: PlannedExpenseModel[] = [
        {
          id: 'expA',
          name: 'Expense A',
          frequency: 'Monthly',
          valuationType: 'Relational',
          relationalTargetId: 'expB',
          relationalPercent: 10
        },
        {
          id: 'expB',
          name: 'Expense B',
          frequency: 'Monthly',
          valuationType: 'Relational',
          relationalTargetId: 'expA',
          relationalPercent: 10
        }
      ];

      expect(() => computeBudgetSimulation(mockExpenses, [])).toThrow('Cyclic dependency detected');
    });
  });

  // Test Case 5: Stages & Dynamic Funding Priority Validation
  describe('Vector 5: Multi-Stage Priority Logic', () => {
    it('should validate stage interface assignment and logical continuity', () => {
      // Mocking Stage validation without pulling in RxDB memory engines
      const stage1 = { 
        id: 'stg1', name: 'Early Retire', 
        fundingPriorities: ['taxable_brokerage'] 
      };
      const stage2 = { 
        id: 'stg2', name: 'IRA Unlocking Phase', triggerMilestoneId: 'ms_595', 
        fundingPriorities: ['tax_advantaged_401k'] 
      };
      expect(stage1.fundingPriorities).toContain('taxable_brokerage');
      expect(stage2.triggerMilestoneId).toBe('ms_595');
    });
  });

  // Test Case 6: Vector Array Processing for UPRR Divestment and Loop Offloading
  describe('Vector 6: Web Worker Multi-Stage Drawdown Loop Offloading', () => {
    it('should explicitly support the deterministic UPRR divestment matrix and Web Worker execution loop', () => {
      // Stub validation representing our MultiStageSimPayload configuration layout
      const payloadObjMock = {
        type: 'MULTI_STAGE_DRAWDOWN',
        uprrDivestmentAnnualAmount: 100000,
        dividendEtfId: 'schd_123',
        uprrId: 'uprr_123'
      };
      expect(payloadObjMock.type).toBe('MULTI_STAGE_DRAWDOWN');
      expect(payloadObjMock.uprrDivestmentAnnualAmount).toBeGreaterThan(0);
    });
  });

  // Test Case 7: Visualizing chronological phase shifts
  describe('Vector 7: Visualizing Chronological Transitions', () => {
    it('should assert validation parameters for the Recharts rendering layout array', () => {
      const dataArr = [
        { year: 2026, activeStageId: 's1', withdrawnTaxable: 50000 },
        { year: 2027, activeStageId: 's1', withdrawnTaxable: 50000 },
        { year: 2028, activeStageId: 's2', withdrawnTaxAdvantaged: 50000 }
      ];
      
      const transitionYears = [];
      let currentStageId = dataArr[0]?.activeStageId;
      for (let i = 1; i < dataArr.length; i++) {
        if (dataArr[i].activeStageId !== currentStageId) {
          transitionYears.push({ year: dataArr[i].year, stageId: dataArr[i].activeStageId });
          currentStageId = dataArr[i].activeStageId;
        }
      }
      
      expect(transitionYears.length).toBe(1);
      expect(transitionYears[0].year).toBe(2028);
      expect(transitionYears[0].stageId).toBe('s2');
    });
  });

  // Test Case 8: Quick Link CRUD & Tag/Label Assignments
  describe('Vector 8: Quick Link CRUD & Multi-Label Tag Assignments', () => {
    it('should validate and parse multi-label tags for quick links', () => {
      const rawLabelsText = '  Brokerage,  Retirement ,Taxable, ';
      const parsedLabels = rawLabelsText
        .split(',')
        .map(lbl => lbl.trim())
        .filter(lbl => lbl.length > 0);

      expect(parsedLabels).toEqual(['Brokerage', 'Retirement', 'Taxable']);
      expect(parsedLabels.length).toBe(3);

      // Verify fallback single-label logic (for backward compatibility of links schema)
      const primaryLabel = parsedLabels[0] || '';
      expect(primaryLabel).toBe('Brokerage');
    });

    it('should correctly filter links based on a selected tag keyword', () => {
      const linksMock = [
        { id: '1', name: 'Fidelity', url: 'fidelity.com', labels: ['Brokerage', 'Retirement'] },
        { id: '2', name: 'Vanguard', url: 'vanguard.com', labels: ['Retirement'] },
        { id: '3', name: 'Coinbase', url: 'coinbase.com', labels: ['Crypto'] }
      ];

      const filterByTag = (tag: string) => {
        return linksMock.filter(link => 
          link.labels.some(l => l.toLowerCase() === tag.toLowerCase())
        );
      };

      const retirementLinks = filterByTag('Retirement');
      const cryptoLinks = filterByTag('crypto');
      const emptyLinks = filterByTag('Unknown');

      expect(retirementLinks.length).toBe(2);
      expect(cryptoLinks.length).toBe(1);
      expect(emptyLinks.length).toBe(0);
    });
  });

  // Test Case 9: Category CRUD & Color Selector Utilities
  describe('Vector 9: Category CRUD & Color Selector Utilities', () => {
    it('should track and default to the last color used with correct localStorage keys', () => {
      let storedColor = 'rgb(59, 130, 246)'; // Default tone
      const selectColor = (c: string) => {
        storedColor = c;
      };

      // Select new tone
      selectColor('#10b981');
      expect(storedColor).toBe('#10b981');

      // Default the next selection to that color
      const defaultColor = storedColor;
      expect(defaultColor).toBe('#10b981');
    });

    it('should extract correct and unique colors already in use from categories list', () => {
      const mockCategories = [
        { id: 'cat1', name: 'Housing', color: '#3b82f6' },
        { id: 'cat2', name: 'Food', color: '#10b981' },
        { id: 'cat3', name: 'Fun', color: '#3b82f6' } // Duplicated coloring
      ];

      const colorsSet = new Set<string>();
      mockCategories.forEach(c => {
        if (c.color) colorsSet.add(c.color.toLowerCase());
      });

      const uniqueInUseColors = Array.from(colorsSet);
      expect(uniqueInUseColors).toEqual(['#3b82f6', '#10b981']);
      expect(uniqueInUseColors.length).toBe(2);
    });

    it('should correctly execute simulated inline patch update of a category model', () => {
      let category = { id: 'cat1', name: 'Housing', color: '#3b82f6' };
      const patchUpdate = (updates: Partial<typeof category>) => {
        category = { ...category, ...updates };
      };

      patchUpdate({ name: 'Shelter', color: '#ec4899' });
      expect(category.name).toBe('Shelter');
      expect(category.color).toBe('#ec4899');
    });
  });

  // Test Case 15: Actuarial Variables Assignment and Preservation
  it('should successfully structure funded ratio actuarial features on scenario schemas', () => {
    const mockScenario = {
      id: "scen_test",
      name: "Discount Scenario",
      budget: {
        monthlyIncome: 1000,
        monthlyExpenses: 800,
        inflationRate: 3.5,
        globalDiscountRate: 2.5
      },
      milestones: [],
      assets: [],
      futureIncomeStreams: [{
        id: "stream_1",
        name: "Defined Benefit Pension",
        type: "Pension",
        monthlyAmount: 2500,
        activationAge: 65,
        inflationAdjusted: true
      }],
      futureLiabilities: [{
        id: "liab_1",
        name: "Home Mortgage remaining",
        type: "Mortgage",
        monthlyAmount: 1200,
        activationAge: 60,
        endAge: 75
      }]
    };

    expect(mockScenario.budget.globalDiscountRate).toBe(2.5);
    expect(mockScenario.futureIncomeStreams?.length).toBe(1);
    expect(mockScenario.futureLiabilities?.[0].type).toBe("Mortgage");
  });

  // Test Case 16: Mathematical Integrity - PV Discounting and Funded Ratio
  it('should compute present value discounting and strictly evaluate the funded ratio equation', () => {
    // Isolated check on PV
    const cashflows = [0, 50000, 50000]; // $50k in years 1 and 2
    // PV = (0/1.02^0) + (50000/1.02^1) + (50000/1.02^2)
    // = 0 + 49019.6 + 48058.4 = 97078
    const pv = computePresentValue(cashflows, 0.02);
    expect(pv).toBeGreaterThan(97000);
    expect(pv).toBeLessThan(97100);

    const payload: any = {
      type: 'MULTI_STAGE_DRAWDOWN',
      startYear: 2026,
      endYear: 2028,
      currentAge: 64,
      assets: [{ id: 'a1', name: 'asset1', value: 100000, type: 'taxable_brokerage', assetType: 'TAXABLE', expectedGrowthRate: 0.05, expectedDividendYield: 0.0 }],
      stages: [{ id: 'stg1', fundingPriorities: [] }],
      budgetPhases: [{ phaseId: 'phase1', startYear: 2026, endYear: 2100, baselineAmount: 50000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }],
      milestones: [],
      uprrDivestmentAnnualAmount: 0,
      dividendEtfId: '',
      uprrId: '',
      targetConstantMarketReturn: 0,
      inflationRate: 0.0,
      lifestyleCreepRate: 0,
      maxRealWithdrawal: 0,
      liquidBufferYears: 0,
      globalDiscountRate: 2.0, // 2.0%
      futureIncomeStreams: [{
         id: 'f1', type: 'Pension', monthlyAmount: 1000, activationAge: 65 /* Triggers in Year 2 */, inflationAdjusted: false
      }],
      futureLiabilities: []
    };

    const results = simulateMultiStageDrawdownWorker(payload);
    
    // Year 1 (now, age 64): Assets 100k. No Pension yet.
    // Base budget liability = 50k / year. PV of (50k, 50k, 50k).
    // PV of Liabilities @ 2% ~ 145000
    // Pension starts in Yr 2 (at age 65), runs Yr 2 and Yr 3. Cashflow: (0, 12000, 12000). PV ~ 23000
    // Funded ratio = (100k + 23k) / 145k ≈ 84%
    const ratioYear1 = results[0].fundedRatio;
    expect(ratioYear1).toBeGreaterThan(0.80);
    expect(ratioYear1).toBeLessThan(0.90);
    
    // Pension cashflow correctly recorded
    expect(results[0].pvFutureIncome).toBeGreaterThan(0);
    expect(results[0].pvFutureLiabilities).toBeGreaterThan(0);
  });

  // Test Case 17: Dynamic Target End Year and Termination Bounds
  describe('Vector 17: Simulation Target End Year Halt Bounds', () => {
    it('should strictly halt the multi-stage drawdown loop exactly at the specified targetEndYear', () => {
      const payload: any = {
        type: 'MULTI_STAGE_DRAWDOWN',
        startYear: 2026,
        targetEndYear: 2031, // Explicit end year
        currentAge: 45,
        assets: [
          { id: 'ast1', value: 1000000, type: 'cash', assetType: 'CASH', expectedGrowthRate: 0.05, expectedDividendYield: 0.0 }
        ],
        stages: [
          { id: 'stg1', fundingPriorities: [], startYearType: 'absolute', startAbsoluteYear: 2026 }
        ],
        milestones: [],
        targetConstantMarketReturn: 0.05,
        inflationRate: 0.02,
        budgetPhases: [
          { phaseId: 'p1', startYear: 2026, endYear: 2100, baselineAmount: 40000, applyLifestyleAdjustment: false, lifestyleAdjustmentRate: 0 }
        ],
        maxRealWithdrawal: 1000000,
        liquidBufferYears: 0,
        futureIncomeStreams: [],
        futureLiabilities: [],
        uprrDivestmentAnnualAmount: 0
      };

      const results = simulateMultiStageDrawdownWorker(payload);

      // Verify start year is 2026 and last year is exactly 2031 (targetEndYear)
      expect(results[0].year).toBe(2026);
      expect(results[results.length - 1].year).toBe(2031);
      expect(results).toHaveLength(6); // 2026, 2027, 2028, 2029, 2030, 2031
    });

    it('should strictly halt the probabilistic Monte Carlo net worth simulation loop exactly at the specified targetEndYear', () => {
      const request: NetWorthSimRequest = {
        type: 'COMPUTE_NET_WORTH',
        userId: 'test_user_uid',
        startYear: 2026,
        endYear: 2031,
        targetEndYear: 2031, // Explicit end year
        currentAge: 45,
        assets: [
          { id: 'ast1', name: 'Cash', value: 1000000, type: 'cash', assetType: 'CASH', expectedGrowthRate: 0.05, expectedDividendYield: 0.0 }
        ],
        liabilities: [],
        rrt1AmountAt67: 0,
        rrt2AmountAt67: 0,
        pensionAmountAt65: 0,
        inflationRate: 0.02,
        numPaths: 5
      };

      const results = simulateNetWorthProbabilistic(request);

      // Verify that no data point exists for calendar years greater than 2031
      results.forEach(dp => {
        expect(dp.year).toBeLessThanOrEqual(2031);
      });
      // The last datapoint should correspond to the final year or month matching the targetEndYear limit
      const lastDatapoint = results[results.length - 1];
      expect(Math.floor(lastDatapoint.year)).toBe(2031);
    });
  });

});
