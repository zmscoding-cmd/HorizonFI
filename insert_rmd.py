import re

with open("src/workers/simulation.worker.ts", "r") as f:
    content = f.read()

payload_additions = """  appliedBridgeStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];
  primaryBirthYear?: number;
  spouseBirthYear?: number;
  isSpouseSoleBeneficiary?: boolean;
  rmdReinvestmentAssetId?: string;
  delayInitialRMD?: boolean;"""

content = content.replace("  appliedBridgeStrategies?: { year: number; stockLiquidation: number; rothConversion: number; }[];", payload_additions)

rmd_helpers = """
// --------------------------------------------------------
// SECURE 2.0 Act RMD Actuarial Logic
// --------------------------------------------------------

export function getRMDStartAge(birthYear?: number): number {
  if (!birthYear) return 75; // Default max delay if undefined
  if (birthYear <= 1950) return 72;
  // The 1959 drafting error: corrected to 73 for 1951-1959.
  if (birthYear <= 1959) return 73;
  return 75;
}

// IRS Uniform Lifetime Table (Table III) Denominators
const IRS_TABLE_III: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0
};

// IRS Joint and Last Survivor Table (Table II) approximation for >10 years younger spouse.
// The actual table is a massive 2D matrix. We approximate by taking the spouse's age, 
// looking up single life expectancy and adding a blending factor, or we can just add the difference.
// For the purpose of this engine, a simple actuarial heuristic for >10yr difference is to 
// increase the denominator by (Age Diff - 10) * 0.8.
function getRMDDenominator(age: number, spouseAge?: number, isSoleBeneficiary?: boolean): number {
  if (age > 120) return 1.9;
  
  let baseDenominator = IRS_TABLE_III[age] || 27.4;
  
  if (isSoleBeneficiary && spouseAge !== undefined) {
    const ageDiff = age - spouseAge;
    if (ageDiff > 10) {
      // Shift to Table II approximation
      baseDenominator += (ageDiff - 10) * 0.85; 
    }
  }
  return baseDenominator;
}

"""

# Insert before simulateMultiStageDrawdownWorker
content = content.replace("export function simulateMultiStageDrawdownWorker", rmd_helpers + "export function simulateMultiStageDrawdownWorker")

with open("src/workers/simulation.worker.ts", "w") as f:
    f.write(content)
