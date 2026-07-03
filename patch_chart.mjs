import fs from 'fs';
let code = fs.readFileSync('src/components/LongTermPortfolioChart.tsx', 'utf8');

const target1 = `  const hasLiquidationTarget = useMemo(() => {
    return assets.some(a => a.isLiquidationTarget);
  }, [assets]);

  const hasDividendDestination = useMemo(() => {
    return assets.some(a => a.isDividendDestination);
  }, [assets]);`;

if (code.includes(target1)) {
  code = code.replace(target1, "");
}

const target2 = `  const chartData = useMemo(() => {`;

const replacement2 = `  const chartData = useMemo(() => {`;

const target3 = `  }, [data, currencyMode, displayStartYear, displayEndYear]);`;
const replacement3 = `  }, [data, currencyMode, displayStartYear, displayEndYear]);

  const hasLiquidationTarget = useMemo(() => {
    return chartData.some(d => d.LIQUIDATION_TARGET > 0 || d.liquidationTargetSaleAmount > 0);
  }, [chartData]);

  const hasDividendDestination = useMemo(() => {
    return chartData.some(d => d.DIVIDEND_DESTINATION > 0 || d.DIVIDEND_DESTINATION_LINE > 0);
  }, [chartData]);`;

if (code.includes(target3)) {
  code = code.replace(target3, replacement3);
}

fs.writeFileSync('src/components/LongTermPortfolioChart.tsx', code);
console.log('Patched LongTermPortfolioChart');
