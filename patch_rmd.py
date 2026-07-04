import sys

with open('src/workers/simulation.worker.ts', 'r') as f:
    content = f.read()

# 1. Update evaluateMultiBucketTax
tax_replace_old = """  // 2026 MFJ Threshold Baselines
  const ordinaryBrackets: TaxBracket[] = [
    { limit: 23200, rate: 0.10 },
    { limit: 94300, rate: 0.12 },
    { limit: 201050, rate: 0.22 },
    { limit: Infinity, rate: 0.24 }
  ];"""

tax_replace_new = """  // Post-TCJA Sunset Reversion Brackets (2026 MFJ Estimates)
  const ordinaryBrackets: TaxBracket[] = [
    { limit: 24000, rate: 0.10 },
    { limit: 97000, rate: 0.15 },
    { limit: 195000, rate: 0.25 },
    { limit: 295000, rate: 0.28 },
    { limit: 525000, rate: 0.33 },
    { limit: 600000, rate: 0.35 },
    { limit: Infinity, rate: 0.396 }
  ];"""

if tax_replace_old in content:
    content = content.replace(tax_replace_old, tax_replace_new)
else:
    print("Could not find old tax brackets.")

# Add state tax variable forcing to zero
state_tax_old = """    const ltcgTax = computeStackedLtcgTax(taxableLtcgGains, taxableOrdinaryIncome, ltcgBrackets);
    const totalCalculatedTax = ordTax + ltcgTax;"""

state_tax_new = """    const ltcgTax = computeStackedLtcgTax(taxableLtcgGains, taxableOrdinaryIncome, ltcgBrackets);
    const stateTaxRate = 0.0; // Florida Residency (forced to zero)
    const stateTax = taxableOrdinaryIncome * stateTaxRate;
    const totalCalculatedTax = ordTax + ltcgTax + stateTax;"""

if state_tax_old in content:
    content = content.replace(state_tax_old, state_tax_new)
else:
    print("Could not find state tax insertion point.")


# 2. Insert RMD calculation in the year loop
rmd_insertion_point = """    excessExternalIncome = excessAuxiliary + excessGlobal;"""

rmd_logic = """    excessExternalIncome = excessAuxiliary + excessGlobal;

    // --- SECURE 2.0 Act RMD Actuarial Logic ---
    const primaryAge = payload.primaryBirthYear ? currentYear - payload.primaryBirthYear : payload.currentAge + step;
    const rmdStartAge = getRMDStartAge(payload.primaryBirthYear);
    let rmdAmount = 0;
    
    const isInitialRMDYear = primaryAge === rmdStartAge;
    const skipRMD = isInitialRMDYear && payload.delayInitialRMD;
    
    if (primaryAge >= rmdStartAge && !skipRMD) {
      let totalPreTaxBalance = 0;
      currentAssets.forEach(a => {
        if (a.assetType === 'PRE_TAX' && a.value > 0) {
          totalPreTaxBalance += a.value;
        }
      });
      if (totalPreTaxBalance > 0) {
        const spouseAge = payload.spouseBirthYear ? currentYear - payload.spouseBirthYear : undefined;
        const rmdDenominator = getRMDDenominator(primaryAge, spouseAge, payload.isSpouseSoleBeneficiary);
        rmdAmount = totalPreTaxBalance / rmdDenominator;
        
        let remainingRmd = rmdAmount;
        const preTaxAssets = currentAssets.filter(a => a.assetType === 'PRE_TAX' && a.value > 0);
        for (const a of preTaxAssets) {
          if (remainingRmd <= 0) break;
          const take = Math.min(a.value, remainingRmd);
          a.value -= take;
          remainingRmd -= take;
        }
        
        const annualBudgetDeficit = remainingBudgetTarget;
        
        if (rmdAmount > annualBudgetDeficit) {
          const excessRmd = rmdAmount - annualBudgetDeficit;
          let rmdDestAsset = payload.rmdReinvestmentAssetId ? currentAssets.find(a => a.id === payload.rmdReinvestmentAssetId) : null;
          if (!rmdDestAsset) rmdDestAsset = currentAssets.find(a => a.isDividendDestination);
          if (!rmdDestAsset) rmdDestAsset = currentAssets.find(a => a.assetType === 'TAXABLE' && !a.isLiquidationTarget);
          if (!rmdDestAsset) {
             rmdDestAsset = { id: payload.rmdReinvestmentAssetId || 'auto-rmd-reinvestment', name: 'RMD Reinvestment Bucket', value: 0, assetType: 'TAXABLE', expectedGrowthRate: 0.05, expectedDividendYield: 0 };
             currentAssets.push(rmdDestAsset);
          }
          rmdDestAsset.value += excessRmd;
        }
        
        const rmdUsedForBudget = Math.min(rmdAmount, remainingBudgetTarget);
        remainingBudgetTarget -= rmdUsedForBudget;
      }
    }
"""

if rmd_insertion_point in content:
    content = content.replace(rmd_insertion_point, rmd_logic, 1)
else:
    print("Could not find rmd insertion point.")

# 3. Update tax dependencies to include rmdAmount
ordinary_income_old = """      const ordinaryIncomeThisYear = pensionIncome + rrbIncome + otherIncome + currentFutureIncome + targetRothConversionAmount;"""
ordinary_income_new = """      const ordinaryIncomeThisYear = pensionIncome + rrbIncome + otherIncome + currentFutureIncome + targetRothConversionAmount + rmdAmount;"""

if ordinary_income_old in content:
    content = content.replace(ordinary_income_old, ordinary_income_new)
else:
    print("Could not find ordinaryIncomeThisYear assignment.")


eval_tax_old = """       preExistingOrdinaryIncome: pensionIncome + rrbIncome + otherIncome + currentFutureIncome,"""
eval_tax_new = """       preExistingOrdinaryIncome: pensionIncome + rrbIncome + otherIncome + currentFutureIncome + rmdAmount,"""

if eval_tax_old in content:
    content = content.replace(eval_tax_old, eval_tax_new)
else:
    print("Could not find preExistingOrdinaryIncome parameter inside eval.")

with open('src/workers/simulation.worker.ts', 'w') as f:
    f.write(content)

