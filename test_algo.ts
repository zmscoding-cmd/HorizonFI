export type SpecificTaxLot = {
  id: string;
  shares: number;
  costBasisPerShare: number;
  acquisitionDate: string;
  isTargetConcentratedPosition: boolean;
};

export interface DPOptimizationParams {
  currentAge: number;
  endAge: number;
  targetOrdinaryBracket: number;
  targetLTCGBracket: number;
  rrbTier1Benefits: number; 
  baseMagi: number;
  guytonKlingerTarget: number;
}

const dpMemoCache = new Map<string, any>();
// ...
