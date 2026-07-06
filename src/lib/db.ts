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
  monthlyAmount?: number;
  inputFrequency?: 'monthly' | 'yearly';
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
  cashBufferMultiplier?: number;
  isUnlinked?: boolean;
};

export type AssetModel = {
  id: string;
  name: string;
  value: number;
  assetType: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH';
  expectedGrowthRate: number;
  expectedDividendYield: number;
  availableDate?: string;
  isLiquidationTarget?: boolean;
  isDividendDestination?: boolean;
  // Legacy fields
  type?: string;
  growthRate?: number;
  dividendYield?: number;
  dividendReinvestment?: string;
};

export type SubScenario = {
  id: string;
  name: string;
  targetEndYear: number;
  budget: {
    monthlyIncome: number;
    inflationRate: number;
    globalDiscountRate?: number; // Added for Present Value / Funded Ratio calculations
    budgetPhases?: BudgetPhase[];
    residencyState?: string;
    currentAge?: number;
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
  targetOrdinaryBracket?: number;
  targetLTCGBracket?: number;
  taxableAccountCostBasisPct?: number;
  displayStartYear?: number;
  displayEndYear?: number;
  stockLiquidationStartYear?: number;
  rothConversionStartYear?: number;
  bridgeOptimizationEnabled?: boolean;
  bridgeStockLiquidationStartYear?: number;
  bridgeRothConversionStartYear?: number;
  bridgeRothMarginalBrackets?: { startYear: number; endYear: number; bracket: number; }[];
  appliedBridgeStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];
  rmdReinvestmentAssetId?: string;
  delayInitialRMD?: boolean;
};

export type PlanType = {
  id: string;
  name: string;
  members: string[]; // User IDs
  primaryBirthYear?: number;
  spouseBirthYear?: number;
  isSpouseSoleBeneficiary?: boolean;
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


export type TaxLot = {
  id: string;
  accountId: string;
  ticker: string;
  shares: number;
  costBasisPerShare: number;
  acquisitionDate: string;
  isTargetConcentratedPosition: boolean;
};

const taxLotSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    accountId: { type: 'string', maxLength: 100 },
    ticker: { type: 'string' },
    shares: { type: 'number' },
    costBasisPerShare: { type: 'number' },
    acquisitionDate: { type: 'string' },
    isTargetConcentratedPosition: { type: 'boolean' }
  },
  required: ['id', 'accountId', 'ticker', 'shares', 'costBasisPerShare', 'acquisitionDate', 'isTargetConcentratedPosition']
};

const planSchema = {
  version: 16,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    members: { type: 'array', items: { type: 'string' } },
    primaryBirthYear: { type: 'number' },
    spouseBirthYear: { type: 'number' },
    isSpouseSoleBeneficiary: { type: 'boolean' },
    scenarios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          targetEndYear: { type: 'integer', minimum: 2026, maximum: 2150 },
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
                    lifestyleAdjustmentRate: { type: 'number' },
                    cashBufferMultiplier: { type: 'number', default: 2.0 }
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
                isLiquidationTarget: { type: 'boolean' },
                isDividendDestination: { type: 'boolean' },
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
                monthlyAmount: { type: 'number' },
                inputFrequency: { type: 'string', enum: ['monthly', 'yearly'] },
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
          },
          targetOrdinaryBracket: { type: 'number', default: 0.12 },
          targetLTCGBracket: { type: 'number', default: 0.0 },
          taxableAccountCostBasisPct: { type: 'number', default: 0.75 },
          displayStartYear: { type: 'number' },
          displayEndYear: { type: 'number' },
          stockLiquidationStartYear: { type: 'number' },
          rothConversionStartYear: { type: 'number' },
          bridgeStockLiquidationStartYear: { type: 'number' },
          bridgeRothConversionStartYear: { type: 'number' },
          bridgeRothMarginalBrackets: { 
            type: 'array', 
            items: { 
              type: 'object',
              properties: {
                startYear: { type: 'number' },
                endYear: { type: 'number' },
                bracket: { type: 'number' }
              }
            }
          },
          rmdReinvestmentAssetId: { type: 'string' },
          delayInitialRMD: { type: 'boolean' }
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
  encrypted: ['scenarios', 'threeBuckets', 'primaryBirthYear', 'spouseBirthYear', 'isSpouseSoleBeneficiary'],
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
  isLiquidationTarget?: boolean;
  isDividendDestination?: boolean;
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


export type ScenarioModel = {
  id: string;
  userId: string;
  name: string;
  isBaseline: boolean;
  activeTrackingYears: number[];
  createdAt: number;
  updatedAt: number;
};

const scenarioSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    userId: { type: 'string', maxLength: 128 },
    name: { type: 'string' },
    isBaseline: { type: 'boolean' },
    activeTrackingYears: {
      type: 'array',
      items: { type: 'number' }
    },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' }
  },
  required: ['id', 'userId', 'name', 'isBaseline', 'createdAt', 'updatedAt'],
  encrypted: ['name', 'activeTrackingYears']
};

const budgetSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    totalPlaintextMonthly: { type: 'number' },
    totalPlaintextAnnual: { type: 'number' },
    calculatedGrossWithdrawalAnnual: { type: 'number' },
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
  version: 2,
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
    isLiquidationTarget: { type: 'boolean' },
    isDividendDestination: { type: 'boolean' },
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
            },
            7: function (oldDoc: any) {
              // Remove redundant targetAnnualBudget from individual stages, as budgetPhases are now the source of truth
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.stages) {
                  sc.stages = sc.stages.map((stage: any) => {
                    const migratedStage = { ...stage };
                    delete migratedStage.targetAnnualBudget;
                    return migratedStage;
                  });
                }
                return sc;
              });
              return oldDoc;
            },
            8: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                sc.targetOrdinaryBracket = sc.targetOrdinaryBracket ?? 0.12;
                sc.targetLTCGBracket = sc.targetLTCGBracket ?? 0.0;
                sc.taxableAccountCostBasisPct = sc.taxableAccountCostBasisPct ?? 0.75;
                return sc;
              });
              return oldDoc;
            },
            9: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.budget && sc.budget.budgetPhases) {
                  sc.budget.budgetPhases = sc.budget.budgetPhases.map((phase: any) => {
                    phase.cashBufferMultiplier = phase.cashBufferMultiplier ?? 2.0;
                    return phase;
                  });
                }
                return sc;
              });
              return oldDoc;
            },
            10: function (oldDoc: any) {
              const currentYear = new Date().getFullYear();
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                let startYear = currentYear;
                if (sc.budget && sc.budget.budgetPhases && sc.budget.budgetPhases.length > 0) {
                  const firstPhaseStart = Math.min(...sc.budget.budgetPhases.map((p: any) => p.startYear));
                  if (!isNaN(firstPhaseStart)) {
                    startYear = firstPhaseStart;
                  }
                }
                const legacyDuration = sc.budget?.timelineDuration ?? 50;
                sc.targetEndYear = startYear + legacyDuration;
                if (sc.budget) {
                  delete sc.budget.timelineDuration;
                }
                return sc;
              });
              return oldDoc;
            },
            11: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.budget) {
                  delete sc.budget.targetConstantMarketReturn;
                }
                return sc;
              });
              return oldDoc;
            },
            12: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                // Initialize optional display years as undefined / blank
                return sc;
              });
              return oldDoc;
            },
            13: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                // Initialize new start year targets as undefined/blank
                return sc;
              });
              return oldDoc;
            },
            14: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.assets) {
                  sc.assets = sc.assets.map((asset: any) => {
                    return {
                      ...asset,
                      isLiquidationTarget: asset.isLiquidationTarget ?? false,
                      isDividendDestination: asset.isDividendDestination ?? false
                    };
                  });
                }
                return sc;
              });
              return oldDoc;
            },
            15: function (oldDoc: any) {
              oldDoc.scenarios = (oldDoc.scenarios || []).map((sc: any) => {
                if (sc.nonTaxableGifts) {
                  sc.nonTaxableGifts = sc.nonTaxableGifts.map((gift: any) => {
                    return {
                      ...gift,
                      inputFrequency: gift.inputFrequency || 'yearly',
                      monthlyAmount: gift.monthlyAmount ?? (gift.annualAmount ? (gift.annualAmount / 12) : 0)
                    };
                  });
                }
                return sc;
              });
              return oldDoc;
            },
            16: function (oldDoc: any) {
              // Initialize new SECURE 2.0 Act fields
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
      if (!rxdb.collections.scenarios) {
        collectionsToCreate.scenarios = {
          schema: scenarioSchema,
          migrationStrategies: {}
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
            },
            2: function (oldDoc: any) {
              oldDoc.calculatedGrossWithdrawalAnnual = oldDoc.totalPlaintextAnnual || 0;
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
          },
          2: function (oldDoc: any) {
            oldDoc.isLiquidationTarget = oldDoc.isLiquidationTarget ?? false;
            oldDoc.isDividendDestination = oldDoc.isDividendDestination ?? false;
            return oldDoc;
          }
        }
      };

      if (!rxdb.collections.tax_lots) {
        collectionsToCreate.tax_lots = { schema: taxLotSchema };
      }
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

  const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('User signed out, cancelling active RxDB replications.');
      cancelAllAndUnsubscribe();
      if (onStatusUpdate) onStatusUpdate('offline');
      return;
    }

    const syncUid = user.uid;

    console.log('User authenticated, starting Firestore replication for sync UID:', syncUid);
    
    // One-time cleanup for the 'shared_household' bug that was preventing syncs
    try {
      if (rxdb && rxdb.collections.plans) {
        const plans = await rxdb.plans.find().exec();
        for (const plan of plans) {
          if (plan.members && plan.members.includes('shared_household')) {
            console.log('Fixing stuck plan members array for sync...');
            await plan.patch({ members: [user.uid] });
          }
        }
      }
      
      const collectionsToCheck = ['scenarios', 'categories', 'budgets', 'assets', 'planned_expenses', 'links'];
      for (const colName of collectionsToCheck) {
        if (rxdb && rxdb.collections[colName]) {
          const docs = await rxdb.collections[colName].find().exec();
          for (const doc of docs) {
            if (doc.userId === 'shared_household') {
              console.log(`Fixing stuck userId in ${colName} for sync...`);
              await doc.patch({ userId: user.uid });
            }
          }
        }
      }
    } catch (cleanupErr) {
      console.warn('Error during shared_household cleanup:', cleanupErr);
    }
    
    // Cancel old ones just in case to avoid parallel duplicate streams
    cancelAllAndUnsubscribe();

    try {
      const firestoreCollection = collection(db, 'households');
      const datapointsCollection = collection(db, `users/${syncUid}/historical_datapoints`);
      const linksCollection = collection(db, `users/${syncUid}/links`);
      const budgetsCollection = collection(db, `users/${syncUid}/budgets`);
      const plannedExpensesCollection = collection(db, `users/${syncUid}/planned_expenses`);
      const assetsCollection = collection(db, `users/${syncUid}/assets`);
      const categoriesCollection = collection(db, `users/${syncUid}/categories`);

      // Set up RxDB Firestore Replication for household plans
      const plansReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-plans-${syncUid}`,
        collection: rxdb.plans,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: firestoreCollection
        },
        pull: {
          filter: [where('members', 'array-contains', syncUid)],
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
        replicationIdentifier: `firestore-sync-datapoints-${syncUid}`,
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
        replicationIdentifier: `firestore-sync-links-${syncUid}`,
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

      
      const scenariosCollection = collection(db, `users/${syncUid}/scenarios`);
      const scenariosReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-scenarios-${syncUid}`,
        collection: (rxdb as any).scenarios,
        firestore: {
          projectId: db.app.options.projectId!,
          database: db,
          collection: scenariosCollection
        },
        pull: { modifier: (docData) => docData },
        push: { modifier: (docData) => JSON.parse(JSON.stringify(docData)) },
        live: true,
        retryTime: 1000 * 5
      });

      const budgetsReplication = replicateFirestore({
        replicationIdentifier: `firestore-sync-budgets-${syncUid}`,
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
        replicationIdentifier: `firestore-sync-planned_expenses-${syncUid}`,
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
        replicationIdentifier: `firestore-sync-assets-${syncUid}`,
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
        replicationIdentifier: `firestore-sync-categories-${syncUid}`,
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
        scenariosReplication,
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
