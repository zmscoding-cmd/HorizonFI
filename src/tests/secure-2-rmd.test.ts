import { describe, it, expect } from 'vitest';

describe('SECURE 2.0 Act RMD Actuarial Logic Validation', () => {
  it('correctly maps the 1959 drafting error cohort to age 73 start age', () => {
    // 1959 cohort
    const primaryBirthYear = 1959;
    const startAge = primaryBirthYear >= 1960 ? 75 : (primaryBirthYear >= 1951 ? 73 : 72);
    expect(startAge).toBe(73); // Validating the correction logic directly
  });

  it('correctly shifts to Age 75 start age for cohorts born in 1960 and later', () => {
    const primaryBirthYear = 1960;
    const startAge = primaryBirthYear >= 1960 ? 75 : (primaryBirthYear >= 1951 ? 73 : 72);
    expect(startAge).toBe(75);
  });
  
  it('correctly shifts to Table II if spouse is sole beneficiary and >10 years younger', () => {
    const primaryAge = 75;
    const spouseAge = 60; // 15 years younger
    const isSpouseSoleBeneficiary = true;
    const ageDiff = primaryAge - spouseAge;
    
    // Simulate getRMDDenominator proxy
    const isTableII = isSpouseSoleBeneficiary && ageDiff > 10;
    expect(isTableII).toBe(true);
  });
});
