import { createRxDatabase, addRxPlugin, RxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { replicateFirestore } from 'rxdb/plugins/replication-firestore';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { collection, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

export type Stage = {
  id: string;
  name: string;
  triggerMilestoneId?: string;
  startYearType?: 'absolute' | 'milestone';
  startMilestoneId?: string;
  startAbsoluteYear?: number;
  targetAnnualBudget: number;
  fundingPriorities: string[];
  includeGlobalIncomeStreams?: boolean;
  includeAuxiliaryTaxFreeIncome?: boolean;
};

export type FutureIncomeStream = {
  id: string;
  name: string;
  type: 'Pension' | 'SocialSecurity' | 'Annuity' | 'Other';
  monthlyAmount: number;
  activationAge: number;
  inflationAdjusted: boolean;
};

export type FutureLiability = {
  id: string;
  name: string;
  type: 'Mortgage' | 'Loan' | 'Healthcare' | 'Other';
  monthlyAmount: number;
  activationAge: number;
  endAge?: number;
};

export type NonTaxableType = {
  id: string;
  name: string;
  annualAmount: number;
  startAge?: number;
  startYear?: number;
  endAge?: number;
  endYear?: number;
  inflationAdjusted: boolean;
};

export interface AllocationBuckets {
  qualifiedDividends: number;
  taxableBrokerage: number;
  traditional401kIra: number;
  rothIra: number;
  nonTaxableGift: number;
}

export interface ThreeBucketConfig {
  bucket1LiquiditySecuredYears: number; // Duration of cash/equivalent reserves
  bucket2IncomeSecuredYears: number; // Duration of lower-risk income/yield allocation
  bucket3GrowthRemainingYears: number; // Residual capital longevity target
  rebalancingTriggerType: 'Chronological' | 'Threshold' | 'Opportunistic'; // Strategy trigger rules
  rebalancingThresholdPercent?: number; // Threshold rule percentage check (+/- trigger size)
}

export type BudgetPhase = {
  phaseId: string;
  startYear: number;
  endYear: number;
  baselineAmount: number;
  applyLifestyleAdjustment: boolean;
  lifestyleAdjustmentRate: number;
};

export type AssetModel = {
  id: string;
  name: string;
  value: number;
  assetType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH';
  expectedGrowthRate: number;
  expectedDividendYield: number;
  availableDate?: string;
  // Legacy fields
  type?: string;
  growthRate?: number;
  dividendYield?: number;
  dividendReinvestment?: string;
};

export type SubScenario = {
  id: string;
  name: string;
  budget: {
    monthlyIncome: number;
    inflationRate: number;
    globalDiscountRate?: number; // Added for Present Value / Funded Ratio calculations
    budgetPhases?: BudgetPhase[];
    residencyState?: string;
    currentAge?: number;
    timelineDuration?: number;
    targetConstantMarketReturn?: number;
    maxRealWithdrawal?: number;
    upperGuardrailMultiplier?: number;
    lowerGuardrailMultiplier?: number;
    guardrailUpwardFactor?: number;
    guardrailDownwardFactor?: number;
    liquidBufferYears?: number;
    allocationMode?: 'PERCENTAGE' | 'DOLLARS';
    buckets?: AllocationBuckets;
    blendedCostBasisPercentage?: number;
    targetRothConversionAmount?: number;
    taxableRebalancingSaleAmount?: number;
    rebalancingCapitalGainPercentage?: number;
  };
  stages?: Stage[];
  milestones: any[];
  assets: AssetModel[];
  futureIncomeStreams?: FutureIncomeStream[];
  futureLiabilities?: FutureLiability[];
  nonTaxableGifts?: NonTaxableType[];
  threeBuckets?: ThreeBucketConfig; // Added for 3-Bucket Strategy support
};

export type PlanType = {
  id: string;
  name: string;
  members: string[]; // User IDs
  scenarios: SubScenario[];
  threeBuckets?: ThreeBucketConfig; // Added for 3-Bucket Strategy support
  createdAt: number;
  updatedAt: number;
};

export type HistoricalAsset = {
  id: string;
  name: string;
  value: number;
  type: string;
};

export type HistoricalLiability = {
  id: string;
  name: string;
  value: number;
  type: string;
};

export type WealthVelocityType = {
  currentSpendingRate: number;
  velocityStatus: 'Accumulation' | 'Velocity Point' | 'Distribution/Drawdown';
  projectedGrowthDelta: number;
};

export type HistoricalDatapointType = {
  id: string; // YYYY-MM-DD_UID
  userId: string;
  date: string; // YYYY-MM-DD
  assets: HistoricalAsset[];
  liabilities: HistoricalLiability[];
  aggregatedNetWorth: number; // Plaintext for high-performance direct queries
  wealthVelocity?: WealthVelocityType; // New Wealth Velocity metric object (plaintext optimize to avoid N+1 query charting)
  createdAt: number;
  updatedAt?: number;
};

const planSchema = {
  version: 6,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    members: { type: 'array', items: { type: 'string' } },
    scenarios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          budget: { 
            type: 'object',
            properties: {
              budgetPhases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phaseId: { type: 'string' },
                    startYear: { type: 'number' },
                    endYear: { type: 'number' },
                    baselineAmount: { type: 'number' },
                    applyLifestyleAdjustment: { type: 'boolean' },
                    lifestyleAdjustmentRate: { type: 'number' }
                  },
                  required: ['phaseId', 'startYear', 'endYear', 'baselineAmount', 'applyLifestyleAdjustment', 'lifestyleAdjustmentRate']
                }
              },
              allocationMode: { 
                type: 'string', 
                enum: ['PERCENTAGE', 'DOLLARS'], 
                default: 'PERCENTAGE' 
              },
              buckets: {
                type: 'object',
                properties: {
                  qualifiedDividends: { type: 'number', minimum: 0 },
                  taxableBrokerage: { type: 'number', minimum: 0 },
                  traditional401kIra: { type: 'number', minimum: 0 },
                  rothIra: { type: 'number', minimum: 0 },
                  nonTaxableGift: { type: 'number', minimum: 0 }
                },
                required: ['qualifiedDividends', 'taxableBrokerage', 'traditional401kIra', 'rothIra', 'nonTaxableGift']
              },
              blendedCostBasisPercentage: { 
                type: 'number', 
                minimum: 0, 
                maximum: 100, 
                default: 60.0 
              }
            }
          },
          stages: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                triggerMilestoneId: { type: 'string' },
                startYearType: { type: 'string', enum: ['absolute', 'milestone'], default: 'absolute' },
                startMilestoneId: { type: 'string' },
                startAbsoluteYear: { type: 'number' },
                targetAnnualBudget: { type: 'number' },
                fundingPriorities: { type: 'array', items: { type: 'string' } },
                includeGlobalIncomeStreams: { type: 'boolean', default: false },
                includeAuxiliaryTaxFreeIncome: { type: 'boolean', default: false }
              }
            }
          },
          milestones: { type: 'array' },
          assets: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                value: { type: 'number' },
                assetType: { type: 'string', enum: ['CASH', 'TAXABLE', 'PRE_TAX', 'ROTH'] },
                expectedGrowthRate: { type: 'number', minimum: -1.0, maximum: 1.0 },
                expectedDividendYield: { type: 'number', minimum: -1.0, maximum: 1.0 },
                availableDate: { type: 'string' },
                type: { type: 'string' },
                growthRate: { type: 'number' },
                dividendYield: { type: 'number' },
                dividendReinvestment: { type: 'string' }
              },
              required: ['id', 'name', 'value', 'assetType', 'expectedGrowthRate', 'expectedDividendYield']
            }
          },
          futureIncomeStreams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                monthlyAmount: { type: 'number' },
                activationAge: { type: 'number' },
                inflationAdjusted: { type: 'boolean' }
              }
            }
          },
          futureLiabilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                monthlyAmount: { type: 'number' },
                activationAge: { type: 'number' },
                endAge: { type: 'number' }
              }
            }
          },
          nonTaxableGifts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                annualAmount: { type: 'number' },
                startAge: { type: 'number' },
                startYear: { type: 'number' },
                endAge: { type: 'number' },
                endYear: { type: 'number' },
                inflationAdjusted: { type: 'boolean' }
              },
              required: ['id', 'name', 'annualAmount', 'inflationAdjusted']
            }
          },
          threeBuckets: {
            type: 'object',
            properties: {
              bucket1LiquiditySecuredYears: { type: 'number', minimum: 0 },
              bucket2IncomeSecuredYears: { type: 'number', minimum: 0 },
              bucket3GrowthRemainingYears: { type: 'number', minimum: 0 },
              rebalancingTriggerType: { type: 'string', enum: ['Chronological', 'Threshold', 'Opportunistic'] },
              rebalancingThresholdPercent: { type: 'number', minimum: 0, maximum: 100 }
            },
            required: ['bucket1LiquiditySecuredYears', 'bucket2IncomeSecuredYears', 'bucket3GrowthRemainingYears', 'rebalancingTriggerType']
          }
        }
      }
    },
    threeBuckets: {
      type: 'object',
      properties: {
        bucket1LiquiditySecuredYears: { type: 'number', minimum: 0 },
        bucket2IncomeSecuredYears: { type: 'number', minimum: 0 },
        bucket3GrowthRemainingYears: { type: 'number', minimum: 0 },
        rebalancingTriggerType: { type: 'string', enum: ['Chronological', 'Threshold', 'Opportunistic'] },
        rebalancingThresholdPercent: { type: 'number', minimum: 0, maximum: 100 }
      },
      required: ['bucket1LiquiditySecuredYears', 'bucket2IncomeSecuredYears', 'bucket3GrowthRemainingYears', 'rebalancingTriggerType']
    },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  encrypted: ['scenarios', 'threeBuckets'],
  required: ['id', 'name', 'members', 'createdAt', 'updatedAt']
};

const historicalDatapointSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 }, // Format: YYYY-MM-DD_UID
    userId: { type: 'string', maxLength: 100 },
    date: { type: 'string', maxLength: 15 },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          value: { type: 'number' },
          type: { type: 'string' }
        }
      }
    },
    liabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          value: { type: 'number' },
          type: { type: 'string' }
        }
      }
    },
    aggregatedNetWorth: { type: 'number' }, // EXCLUDED from encryption to prevent N+1 query performance degradation during charting
    // Wealth Velocity metric (plaintext to prevent N+1 queries during charting)
    // CRITICAL SECURITY NOTE: Any granular asset breakdowns used to derive these high-level metrics must remain encrypted at rest via crypto-js before being written to RxDB. Only these three calculated/aggregated metrics are stored in plaintext.
    wealthVelocity: {
      type: 'object',
      properties: {
        currentSpendingRate: { type: 'number' },
        velocityStatus: {
          type: 'string',
          enum: ['Accumulation', 'Velocity Point', 'Distribution/Drawdown']
        },
        projectedGrowthDelta: { type: 'number' }
      },
      required: ['currentSpendingRate', 'velocityStatus', 'projectedGrowthDelta']
    },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  encrypted: ['assets', 'liabilities'], // Encrypted at rest for strict zero-trust security
  required: ['id', 'userId', 'date', 'aggregatedNetWorth', 'wealthVelocity', 'createdAt']
};

export enum ExpenseFrequency {
  Monthly = 'Monthly',
  Annual = 'Annual'
}

export enum ValuationType {
  Static = 'Static',
  Relational = 'Relational'
}

export type BudgetType = {
  id: string;
  userId: string;
  name: string;
  totalPlaintextMonthly: number;
  totalPlaintextAnnual: number;
  notes?: string;
  targetRothConversionAmount?: number;
  taxableRebalancingSaleAmount?: number;
  rebalancingCapitalGainPercentage?: number;
  createdAt: number;
  updatedAt: number;
};

export type PlannedExpenseType = {
  id: string;
  userId: string;
  categoryId?: string;
  name: string;
  frequency: ExpenseFrequency;
  valuationType: ValuationType;
  staticAmount?: string; // encrypted
  relationalTargetId?: string; // encrypted
  relationalPercent?: string; // encrypted
  notes?: string; // encrypted
  urls?: { url: string; name?: string }[]; // encrypted
  renewalDate?: string; // encrypted
  createdAt: number;
  updatedAt: number;
};

export type AssetType = {
  id: string;
  userId: string;
  name: string;
  value: number;
  assetType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH';
  expectedGrowthRate: number;
  expectedDividendYield: number;
  availableDate?: string;
  type?: string;
  createdAt: number;
  updatedAt?: number;
};

export type LinkType = {
  id: string;
  userId: string;
  name: string;
  url: string;
  label?: string; // encrypted
  labels?: string[];
  createdAt: number;
  updatedAt: number;
};

export type CategoryType = {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt?: number;
};

const budgetSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    totalPlaintextMonthly: { type: 'number' },
    totalPlaintextAnnual: { type: 'number' },
    targetRothConversionAmount: { type: 'number' },
    taxableRebalancingSaleAmount: { type: 'number' },
    rebalancingCapitalGainPercentage: { type: 'number' },
    notes: { type: 'string' },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  encrypted: ['notes'],
  required: ['id', 'userId', 'name', 'totalPlaintextMonthly', 'totalPlaintextAnnual']
};

const plannedExpenseSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    categoryId: { type: 'string' },
    name: { type: 'string' },
    frequency: { type: 'string', enum: ['Monthly', 'Annual'] },
    valuationType: { type: 'string', enum: ['Static', 'Relational'] },
    staticAmount: { type: 'string' },
    relationalTargetId: { type: 'string' },
    relationalPercent: { type: 'string' },
    notes: { type: 'string' },
    excluded: { type: 'boolean' },
    urls: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          name: { type: 'string' }
        }
      }
    },
    renewalDate: { type: 'string' },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  encrypted: ['staticAmount', 'relationalTargetId', 'relationalPercent', 'notes', 'urls', 'renewalDate'],
  required: ['id', 'userId', 'name', 'frequency', 'valuationType']
};

const assetSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    value: { type: 'number' },
    assetType: { type: 'string', enum: ['CASH', 'TAXABLE', 'PRE_TAX', 'ROTH'] },
    expectedGrowthRate: { type: 'number', minimum: -1.0, maximum: 1.0 },
    expectedDividendYield: { type: 'number', minimum: -1.0, maximum: 1.0 },
    availableDate: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  required: ['id', 'userId', 'name', 'value', 'assetType', 'expectedGrowthRate', 'expectedDividendYield']
};

const categorySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    color: { type: 'string' },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  required: ['id', 'userId', 'name']
};

const linkSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    url: { type: 'string' },
    label: { type: 'string' },
    labels: {
      type: 'array',
      items: { type: 'string' }
    },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' }
  },
  encrypted: ['label'],
  required: ['id', 'userId', 'name', 'url']
};

const dexieStorage = getRxStorageDexie();
const stableStorage = wrappedKeyEncryptionCryptoJsStorage({
  storage: dexieStorage
});

let dbPromise: Promise<RxDatabase> | null = null;

export async function getEncryptionKey(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated, cannot derive offline encryption key.');
  
  // High-entropy application-specific salt/pepper to protect against offline precomputation tables
  const pepper = "HorizonFI-PWA-Secure-Storage-Salt-2026-v1";
  
  // Use high-performance Web Crypto API to securely derive a 256-bit key from UID + Salt
  const encoder = new TextEncoder();
  const data = encoder.encode(uid + pepper);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export async function getDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    let password = '';
    try {
      password = await getEncryptionKey();
    } catch (e) {
      dbPromise = null;
      throw e;
    }

    let rxdb: any;
    try {
      rxdb = await createRxDatabase({
        name: 'horizonfi_db_v7',
        storage: stableStorage,
        password: password,
        multiInstance: true
      });
    } catch (err: any) {
      const errStr = String(err?.message || err?.code || err || '');
      const isPasswordMismatch = errStr.includes('DB1') || 
                                 errStr.toLowerCase().includes('password') || 
                                 errStr.toLowerCase().includes('decrypt') || 
                                 errStr.toLowerCase().includes('hash');
      
      if (isPasswordMismatch) {
        console.warn(
          '[RxDB Auto-Recovery] Password or hash mismatch (DB1) detected during authentication context shift. ' +
          'Automatically clearing local IndexedDB cache to allow secure initialization with the new session...'
        );
        try {
          // Force remove the database from IndexedDB
          await removeRxDatabase('horizonfi_db_v7', getRxStorageDexie());
        } catch (removeErr) {
          console.error('[RxDB Auto-Recovery] Failed to remove stale IndexedDB database:', removeErr);
        }
        
        // Retry creating the database fresh
        rxdb = await createRxDatabase({
          name: 'horizonfi_db_v7',
          storage: stableStorage,
          password: password,
          multiInstance: true
        });
      } else {
        dbPromise = null; // reset cache on other failure types
        throw err;
      }
    }

    try {
      // Note: We bypass registering validate-ajv plugin in production to maximize Web Worker write throughput.
      const collectionsToCreate: any = {};
      if (!rxdb.collections.plans) {
        collectionsToCreate.plans = { 
          schema: planSchema,
          migrationStrategies: {
            1: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.budget) {
                  sc.budget.allocationMode = sc.budget.allocationMode || 'PERCENTAGE';
                  sc.budget.buckets = sc.budget.buckets || {
                    qualifiedDividends: 0,
                    taxableBrokerage: 0,
                    traditional401kIra: 0,
                    rothIra: 0,
                    nonTaxableGift: 0
                  };
                  sc.budget.blendedCostBasisPercentage = sc.budget.blendedCostBasisPercentage || 60.0;
                }
                return sc;
              });
              return oldDoc;
            },
            2: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (!sc.nonTaxableGifts) {
                  sc.nonTaxableGifts = [];
                }
                return sc;
              });
              return oldDoc;
            },
            3: function (oldDoc: any) {
              // Populate plan-level default 3-Bucket parameters
              if (!oldDoc.threeBuckets) {
                oldDoc.threeBuckets = {
                  bucket1LiquiditySecuredYears: 2,
                  bucket2IncomeSecuredYears: 5,
                  bucket3GrowthRemainingYears: 23,
                  rebalancingTriggerType: 'Chronological',
                  rebalancingThresholdPercent: 10
                };
              }
              // Populate subscenario-level default 3-Bucket parameters for existing records
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (!sc.threeBuckets) {
                  sc.threeBuckets = {
                    bucket1LiquiditySecuredYears: 2,
                    bucket2IncomeSecuredYears: 5,
                    bucket3GrowthRemainingYears: 23,
                    rebalancingTriggerType: 'Chronological',
                    rebalancingThresholdPercent: 10
                  };
                }
                return sc;
              });
              return oldDoc;
            },
            4: function (oldDoc: any) {
              // Migrate monthlyExpenses & lifestyleCreepRate to budgetPhases
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.budget) {
                  let baseline = 0;
                  if (typeof sc.budget.monthlyExpenses === 'number') {
                    baseline = sc.budget.monthlyExpenses * 12;
                  }
                  
                  let lsRate = 0;
                  if (typeof sc.budget.lifestyleCreepRate === 'number') {
                    lsRate = sc.budget.lifestyleCreepRate;
                  }

                  if (!sc.budget.budgetPhases) {
                    sc.budget.budgetPhases = [{
                      phaseId: 'legacy-migration',
                      startYear: new Date().getFullYear(),
                      endYear: 2100, // infinite representation
                      baselineAmount: baseline,
                      applyLifestyleAdjustment: lsRate !== 0,
                      lifestyleAdjustmentRate: lsRate
                    }];
                  }
                  
                  delete sc.budget.monthlyExpenses;
                  delete sc.budget.lifestyleCreepRate;
                }
                return sc;
              });
              return oldDoc;
            },
            5: function (oldDoc: any) {
              // Migrate assets to granular individual investment tracking
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.assets) {
                  sc.assets = sc.assets.map((asset: any) => {
                    let newType = 'TAXABLE';
                    if (asset.type === 'traditional_ira' || asset.type === 'PRE_TAX') {
                       newType = 'PRE_TAX';
                    } else if (asset.type === 'roth_ira' || asset.type === 'ROTH') {
                       newType = 'ROTH';
                    } else if (asset.type === 'cash' || asset.type === 'CASH') {
                       newType = 'CASH';
                    }
                    
                    const migratedAsset = {
                      ...asset,
                      assetType: asset.assetType || newType,
                      expectedGrowthRate: asset.expectedGrowthRate ?? (asset.growthRate != null ? (asset.growthRate / 100) : 0.05),
                      expectedDividendYield: asset.expectedDividendYield ?? (asset.dividendYield != null ? (asset.dividendYield / 100) : 0.02)
                    };
                    
                    if (asset.availableDate) {
                       migratedAsset.availableDate = asset.availableDate;
                    }
                    
                    return migratedAsset;
                  });
                }
                return sc;
              });
              return oldDoc;
            },
            6: function (oldDoc: any) {
              // Migrate Multi-Stage modeling configurations to support absolute/milestone temporal bounds and global income streams
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.stages) {
                  sc.stages = sc.stages.map((stage: any) => {
                    return {
                      ...stage,
                      startYearType: stage.startYearType || 'absolute',
                      startMilestoneId: stage.startMilestoneId || stage.triggerMilestoneId || '',
                      startAbsoluteYear: stage.startAbsoluteYear ?? new Date().getFullYear(),
                      includeGlobalIncomeStreams: stage.includeGlobalIncomeStreams ?? false,
                      includeAuxiliaryTaxFreeIncome: stage.includeAuxiliaryTaxFreeIncome ?? false
                    };
                  });
                }
                return sc;
              });
              return oldDoc;
            }
          }
        };
      }
      if (!rxdb.collections.historical_datapoints) {
        collectionsToCreate.historical_datapoints = {
          schema: historicalDatapointSchema,
          migrationStrategies: {
            1: function (oldDoc: any) {
              // Populate default wealthVelocity for backwards-compatibility
              oldDoc.wealthVelocity = {
                currentSpendingRate: 0,
                velocityStatus: 'Accumulation',
                projectedGrowthDelta: 0
              };
              return oldDoc;
            }
          }
        };
      }
      if (!rxdb.collections.budgets) {
        collectionsToCreate.budgets = { 
          schema: budgetSchema,
          migrationStrategies: {
            1: function (oldDoc: any) {
              oldDoc.targetRothConversionAmount = 0;
              oldDoc.taxableRebalancingSaleAmount = 0;
              oldDoc.rebalancingCapitalGainPercentage = 0;
              return oldDoc;
            }
          }
        };
      }
      if (!rxdb.collections.planned_expenses) {
        collectionsToCreate.planned_expenses = {
          schema: plannedExpenseSchema,
          migrationStrategies: {
            1: function (oldDoc: any) {
              // Gracefully migrate existing records to version 1 schema with renewalDate
              return oldDoc;
            },
            2: function (oldDoc: any) {
              // Gracefully migrate existing records to version 2 schema with excluded
              oldDoc.excluded = false;
              return oldDoc;
            }
          }
        };
      }
      if (!rxdb.collections.assets) collectionsToCreate.assets = { 
        schema: assetSchema,
        migrationStrategies: {
          1: function (oldDoc: any) {
            let newType = 'TAXABLE';
            if (oldDoc.type === 'traditional_ira' || oldDoc.type === 'PRE_TAX') {
               newType = 'PRE_TAX';
            } else if (oldDoc.type === 'roth_ira' || oldDoc.type === 'ROTH') {
               newType = 'ROTH';
            } else if (oldDoc.type === 'cash' || oldDoc.type === 'CASH') {
               newType = 'CASH';
            }
            
            oldDoc.assetType = newType;
            oldDoc.expectedGrowthRate = 0.05; // Default global growth rate
            oldDoc.expectedDividendYield = 0.02; // Default global dividend yield
            
            return oldDoc;
          }
        }
      };
      if (!rxdb.collections.categories) collectionsToCreate.categories = { schema: categorySchema };
      if (!rxdb.collections.links) collectionsToCreate.links = { schema: linkSchema };

      if (Object.keys(collectionsToCreate).length > 0) {
        await rxdb.addCollections(collectionsToCreate);
      }

      // Register preRemove middleware hooks to prevent orphan records locally
      if (rxdb.collections.assets) {
        rxdb.assets.preRemove(async (docData: any) => {
          const id = docData.id;
          const allExpenses = await rxdb.planned_expenses.find().exec();
          const isReferenced = allExpenses.some((exp: any) => exp.relationalTargetId === id);
          if (isReferenced) {
            throw new Error(`Cannot delete asset: ID "${id}" is referenced as relationalTargetId in planned expenses.`);
          }
        }, false);
      }

      if (rxdb.collections.categories) {
        rxdb.categories.preRemove(async (docData: any) => {
          const id = docData.id;
          const allExpenses = await rxdb.planned_expenses.find().exec();
          const isReferenced = allExpenses.some((exp: any) => exp.categoryId === id);
          if (isReferenced) {
            throw new Error(`Cannot delete category: ID "${id}" is referenced as categoryId in planned expenses.`);
          }
        }, false);
      }

      return rxdb;
    } catch (err) {
      dbPromise = null; // reset cache on failure
      throw err;
    }
  })();

  return dbPromise;
}

export function startReplication(
  rxdb: RxDatabase,
  onStatusUpdate?: (status: 'offline' | 'syncing' | 'synced' | 'error') => void
) {
  let activeReplications: { [key: string]: any } | null = null;
  let activeSubs: any[] = [];

  const cancelAllAndUnsubscribe = () => {
    activeSubs.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (err) {
        // ignore subscriber errors on destruction
      }
    });
    activeSubs = [];

    if (activeReplications) {
      Object.keys(activeReplications).forEach((key) => {
        try {
          activeReplications![key].cancel();
        } catch (err) {
          console.error(`Error cancelling replication for ${key}:`, err);
        }
      });
      activeReplications = null;
    }
  };

  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (!user) {
      console.log('User signed out, cancelling active RxDB replications.');
      cancelAllAndUnsubscribe();
      if (onStatusUpdate) onStatusUpdate('offline');
      return;
    }

    console.log('User authenticated, starting Firestore replication for UID:', user.uid);
    // Cancel old ones just in case to avoid parallel duplicate streams
    cancelAllAndUnsubscribe();

    try {
      const firestoreCollection = collection(db, 'households');
      const datapointsCollection = collection(db, `users/${user.uid}/historical_datapoints`);
      const linksCollection = collection(db, `users/${user.uid}/links`);
      const budgetsCollection = collection(db, `users/${user.uid}/budgets`);
      const plannedExpensesCollection = collection(db, `users/${user.uid}/planned_expenses`);
      const assetsCollection = collection(db, `users/${user.uid}/assets`);
      const categoriesCollection = collection(db, `users/${user.uid}/categories`);

      // Set up RxDB Firestore Replication for household plans
      const plansReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-plans-${user.uid}`,
        collection: rxdb.plans,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: firestoreCollection
        },
        pull: {
          filter: [where('members', 'array-contains', user.uid)],
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      // Set up RxDB Firestore Replication for historical datapoints (Net Worth History)
      const datapointsReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-datapoints-${user.uid}`,
        collection: (rxdb as any).historical_datapoints,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: datapointsCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      const linksReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-links-${user.uid}`,
        collection: (rxdb as any).links,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: linksCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      const budgetsReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-budgets-${user.uid}`,
        collection: (rxdb as any).budgets,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: budgetsCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      const plannedExpensesReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-planned_expenses-${user.uid}`,
        collection: (rxdb as any).planned_expenses,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: plannedExpensesCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      const assetsReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-assets-${user.uid}`,
        collection: (rxdb as any).assets,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: assetsCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      const categoriesReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-categories-${user.uid}`,
        collection: (rxdb as any).categories,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: categoriesCollection
        },
        pull: {
          modifier: (docData) => docData
        },
        push: {
          modifier: (docData) => JSON.parse(JSON.stringify(docData))
        },
        live: true,
        retryTime: 1000 * 5
      });

      activeReplications = {
        plansReplication,
        datapointsReplication,
        linksReplication,
        budgetsReplication,
        plannedExpensesReplication,
        assetsReplication,
        categoriesReplication
      };

      if (onStatusUpdate) {
        const reps = Object.values(activeReplications);
        const states = reps.map(() => ({ active: false, error: false }));
        const updateStatus = () => {
          const anyError = states.some(s => s.error);
          const anyActive = states.some(s => s.active);
          if (anyError) {
            onStatusUpdate('error');
          } else if (anyActive) {
            onStatusUpdate('syncing');
          } else {
            onStatusUpdate('synced');
          }
        };

        reps.forEach((rep: any, idx) => {
          activeSubs.push(
            rep.active$.subscribe((act: boolean) => {
              if (act) states[idx].error = false;
              states[idx].active = act;
              updateStatus();
            })
          );
          activeSubs.push(
            rep.error$.subscribe((err: any) => {
              console.error(`${rep.collection.name} sync error:`, err);
              states[idx].error = true;
              updateStatus();
            })
          );
        });
      }
    } catch (e) {
      console.error('Failed to setup replicateFirestore:', e);
      if (onStatusUpdate) onStatusUpdate('error');
    }
  });

  return () => {
    unsubscribeAuth();
    cancelAllAndUnsubscribe();
  };
}

export async function clearDatabase() {
  if (dbPromise) {
    try {
      const rxdb: any = await dbPromise;
      await rxdb.destroy();
    } catch (e) {
      console.warn('[clearDatabase] Ignored error while destroying database:', e);
    }
    dbPromise = null;
  }
  // Remove the underlying IndexedDB database
  try {
    await removeRxDatabase('horizonfi_db_v7', getRxStorageDexie());
  } catch (e) {
    console.error('[clearDatabase] Failed to remove IndexedDB database:', e);
  }
}

export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
