import re

with open('DOCUMENTATION.md', 'r') as f:
    text = f.read()

insertion = """
### The Bridge Period Optimization Module
The transition from early retirement to the onset of fixed pensions (like Railroad Retirement or Social Security) creates a critical window known as the "Bridge Period". Because your baseline ordinary income drops precipitously before these pensions begin, this window presents a massive opportunity for multi-year tax optimization.

To navigate this, HorizonFI features an offline-first **Bridge Period Optimization Module**. Instead of relying on linear projections, this module deploys a mathematically intensive Dynamic Programming engine inside a background Web Worker to evaluate thousands of permutations of stock liquidations and Roth conversions over your entire retirement timeline. 

By maximizing your terminal wealth at the end of the simulation, the algorithm inherently minimizes your lifetime tax drag.

#### 1. Concentrated Stock Liquidation & Reallocation
If you hold a disproportionate amount of wealth in a single company stock (e.g., from former employment), the optimizer helps you systematically unwind this idiosyncratic risk. 
* **Specific Identification Accounting:** Instead of using the IRS default First-In, First-Out (FIFO) method, HorizonFI requires you to input your specific tax lots (acquisition dates, share counts, and cost bases). 
* **Targeted Gain Engineering:** The algorithm targets exact shares to sell, pairing highly appreciated lots with high-basis lots to engineer a precise capital gain. It mathematically maps these sales to fill up the remainder of your 0% Long-Term Capital Gains bracket without spilling into the 15% penalty zone.
* **Dividend ETF Reinvestment:** The proceeds are modeled as an immediate reinvestment into a dividend-yield ETF (specifically tracking the Schwab U.S. Dividend Equity ETF). The engine dynamically accounts for the ongoing qualified dividend tax drag this creates on your portfolio's compound annual growth rate.

#### 2. Multi-Year Roth Conversion Engine
Simultaneously, the engine calculates the exact dollar gap between your current baseline taxable income and the upper limit of your target tax bracket (e.g., the 24% bracket) to execute multi-year Roth conversions. 

The Dynamic Programming engine treats strict legislative penalties as hard mathematical constraints:
* **The Tax Torpedo:** The system calculates the phantom marginal tax rate. If an additional $1,000 of Roth conversion pushes $1,000 of capital gains from the 0% bracket into the 15% bracket, the true effective tax rate is much higher. The engine halts recommendations when this threshold is breached.
* **IRMAA Cliffs:** Medicare Part B and D premium surcharges act as cliff penalties. The engine actively restricts Roth conversions to keep your Modified Adjusted Gross Income precisely below these cliffs.
* **Provisional Income Suppression:** By executing conversions during the bridge period, the engine depletes your pre-tax balances, systematically suppressing future Required Minimum Distributions (RMDs). This keeps your future Provisional Income low, allowing your Tier 1 Railroad Retirement or Social Security benefits to remain largely tax-free.

#### 3. Analyzing the Optimizer Outputs
Because this module calculates massive datasets locally using an RxDB JSON database, the UI is highly reactive. You can view the engine's outputs in two primary formats:

1.  **Multistage Stacked Area Chart:** This plots your comprehensive income sources and tax liabilities chronologically. The layers stack in the exact order the IRS taxes them: standard deductions at the base, ordinary income/Roth conversions in the middle, and capital gains/dividends at the top. Line overlays indicate permanent TCJA brackets and the 0% LTCG threshold.
2.  **Reactive Action Table:** Directly beneath the chart, a detailed data grid details the exact dollar amount of specific stock lots to liquidate, the capital to allocate to the dividend ETF, the optimized Roth transfer amount, and your total estimated federal tax liability for the year.
"""

text = re.sub(r'(## 4\. Tax & Transition Engine)', insertion + r'\n\n\1', text)

with open('DOCUMENTATION.md', 'w') as f:
    f.write(text)
