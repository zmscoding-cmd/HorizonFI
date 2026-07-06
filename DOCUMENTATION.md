# HorizonFI: Comprehensive User Guide & Maritime FIRE Reference

Welcome to the definitive user documentation for **HorizonFI**. This guide is designed as a standalone, offline-ready manual for couples executing the **Circumnavigation Bridge Strategy**—navigating early retirement transitions from the deck of a cruising sailboat or standard domestic environments.

---

## 1. Welcome & System Overview

### The Circumnavigation Bridge Strategy
The **Circumnavigation Bridge Strategy** is a multi-decade financial methodology designed to cross the bridge from early retirement (often before standard pension ages) to full pension eligibility (such as Railroad Retirement or Social Security) without depleting key investment assets. 

By modeling a combination of high-yield brokerage assets, tax-advantaged pre-tax IRAs, tax-free Roth accounts, liquid cash buffers, and dynamic pension trigger milestones, HorizonFI provides early retirees with an absolute, mathematically rigorous navigation path.

### Built for the Blue Water: Offline-First Architecture
Because maritime voyages and remote anchorage environments lack reliable high-speed cellular or internet links, HorizonFI is engineered from the ground up to operate completely **offline-first**:

*   **Local Coalescence (IndexedDB & RxDB):** All of your calculations, plans, and budgets run completely locally on your laptop, phone, or tablet browser profile. There is zero loading latency, and the application requires open-ocean internet access to perform its multi-decade projections.
*   **Encrypted Local State:** To preserve your privacy in a zero-trust browser design, all of your sensitive local metrics (including ledger account configurations and budget drafts) are scrambled at rest inside browser memory utilizing military-grade **AES-256 field-level encryption** (`crypto-js`).
*   **The Cloud Sync Status Badge:** Located prominently in the application header, this interactive badge communicates the precise state of your local database connection:
    *   **Synced (Green):** All local plan configurations, budget entries, links, and transactions are securely encrypted and replicated up to high-resilience Google Cloud Firestore storage.
    *   **Syncing (Blue):** The application is actively pushing local modifications or pulling cloud updates.
    *   **Sync Warning (Amber):** A momentary connection drop on your satellite line or cellular router. HorizonFI keeps catching your changes locally and will automatically retry syncing.
    *   **Offline Mode (Gray):** The application is operating in a secure, local-only replica state, relying on cached configurations. You are fully authorized to design, copy, edit, and project scenarios without any internet connection.

---

## 2. Getting Started (Plan Setup)

To begin modeling your multi-decade timeline, follow this step-by-step onboarding flow to initialize your foundational **Baseline Plan**:

```
[New Plan Button] ➔ [Add Assets] ➔ [Configure Budget] ➔ [Calibrate Buffer] ➔ [View Trajectories]
```

### Step 1: Initialize Your Baseline Plan
1.  Navigate to the central dashboard and click the **New Plan** card.
2.  Assign a custom name to your plan (e.g., *"Sailing Voyage Baseline"*). You can edit this name at any time by clicking the **pencil icon** next to the title inside the active **Scenario Builder Suite**.
3.  The system will generate a fresh, secure local plan template containing one default active scenario.

### Step 2: Establish Your Initial Asset Ledger
Navigate to the **Target Assets** tab inside the **Budget Dashboard** to register your starting household accounts. Accurate account classifications are vital because the visual projection engine treats different asset classes with separate tax rules:
*   **Taxable Brokerage Accounts:** Typically contains active exchange funds. This is treated as your primary liquid bridge asset during early years.
*   **Tax-Advantaged Accounts (Pre-Tax IRAs & 401(k)s):** Tax-deferred compounding buckets. Subject to federal tax bracket calculations and future Required Minimum Distributions (RMDs).
*   **Tax-Free Accounts (Roth IRAs):** Tax-free compounding buckets which can be drawn down or leveraged for conversions without ordinary income exposure.
*   **Cash Reserves / Capital Buffers:** Non-volatile cash assets used as a market shock absorber.
*   **Depreciating Assets (Physical Vessel / Vehicles):** You can input your physical cruising sailboat or yacht, assigning custom *negative appreciation rates* (e.g., `-5%` to `-10%` annually) to accurately simulate asset decay and boat maintenance expenditures over time.

#### Designated Simulation Roles (Liquidation Targets & Dividend Destinations)
To model complex, multi-stage wealth transition strategies, HorizonFI allows you to assign specific roles to individual assets inside a scenario:
*   **Concentrated Liquidation Target (🎯):** Designate one taxable account to act as the primary, concentrated target for divesting holdings. This allows the simulation to prioritize drawing down or unwinding specific volatile or highly concentrated single-equity accounts before general pro-rata liquidations.
*   **Dividend Destination Fund (📥):** Designate one asset as the primary recipient for qualified dividend payouts or interest distributions. This lets you simulate automatic cash flows being routed directly to a stable cash reserve or dividend-reinvestment ETF (e.g., SCHD).
*   **Strict Single-Designation Constraint:** To preserve simulation consistency, **only one asset can carry the role of Concentrated Liquidation Target, and only one can carry the role of Dividend Destination Fund** at any time. When you toggle a role to "Active" on any asset, HorizonFI automatically de-allocates that role from all sibling assets inside the active scenario, preventing double-allocations and keeping your NoSQL schema clean.
*   **Visual Status Badges:** Active roles are displayed directly on the investment cards in the asset list with intuitive, high-visibility badges to provide instant feedback.


### Step 3: Configure Your Baseline Budget & Economics
Input your projected baseline cost of living and global plan parameters:
1.  Enter your target monthly or annual baseline living expenditures (e.g., *"Marina dues, provisions, sails, and fuel"*).
2.  Set the baseline **Compounding Inflation Rate** (e.g., `3.0%`).
3.  Add any active passive income streams (e.g., rental properties, royalties, or part-time marine writing) that offset required nominal asset drawdowns.

#### Current Dollars vs. Future Nominal Dollars (Inflation Extrapolation)
When structuring your HorizonFI model, you must adhere to the **Current Dollars Mandate**:
*   **Today's Purchasing Power:** All monetary values you enter in the user interface—including the Baseline Budget, Future Budget Phase baseline amounts, Milestone costs, and Auxiliary Income streams—**MUST be entered in current dollars** (today's purchasing power).
*   **Compounding Inflation Extrapolation:** The mathematical simulation engine automatically handles the task of compounding-inflating these values over your multi-decade timeline. 
    *   *For Example:* If you configure a future budget phase starting in year 10 with a baseline amount of $60,000, and your specified compounding inflation rate is `3.0%`, the simulation engine does not treat that phase as a flat $60,000 in the year 10 projection. It compounds $60,000 by 3.0% annually for 10 years, extrapolating it to a nominal value of **$80,635** in that future year.
    *   *Lifestyle Adjustments:* If you apply a **Lifestyle Adjustment Rate** (e.g., `-2.0%` for slower-go years), it compounds alongside general inflation, allowing the simulation to realistically model how your personal spending changes relative to the macroeconomic purchasing power of the dollar.

#### The Valuation Mode Toggle (Current vs. Future Dollars)
To prevent cognitive overload and maintain accurate spatial awareness when planning multi-decade retirements, HorizonFI integrates a global **Valuation Mode Toggle** directly above the primary timeline visualizations:
*   **Current Dollars (Today's Purchasing Power):**
    *   *Calculation:* $$\text{Real Value} = \frac{\text{Nominal Value}}{(1 + \text{Inflation Rate})^{\text{Year Index}}}$$
    *   *Purpose:* Strips out inflation to represent balances and cash flows in today's purchasing power. This helps you answer the core question: *"What will my future wealth actually buy based on today's cost of goods?"*
*   **Future Dollars (Nominal Valuations):**
    *   *Calculation:* Represents the raw, un-discounted nominal value.
    *   *Purpose:* Displays the actual dollar balance you will see on your bank screens or ledger statements in that specific future year, taking into account compounding inflation.
*   **Architectural Thread Isolation:**
    In compliance with the HorizonFI offline-first performance mandate, all real vs. nominal transformations are fully calculated inside dedicated Web Workers (`simulation.worker.ts`). The worker computes both metrics concurrently during each yearly iteration, packaging them into the output snaphot arrays. When the user selects a valuation mode, Recharts instantly swaps the active `dataKey` without triggering a main-thread simulation reload, preserving valuable battery life on remote vessels. This design degrades gracefully offline, working seamlessly without any internet connection.


#### Target Asset Growth Rates & Annual Returns (Nominal vs. Real)
All **Target Asset Growth Rates & Annual Returns** entered inside your asset ledger fields (such as individual stock/bond appreciation rates or dividend yields) **MUST be entered as NOMINAL annual returns (before inflation is taken into account).**
*   **The Math Engine Separation:** The simulation engine calculates asset growth and inflation independently. In each yearly loop, assets are grown by their nominal rates (e.g., $\text{Value}_{t+1} = \text{Value}_t \times (1 + \text{Nominal Growth Rate} + \text{Nominal Yield})$), while living expenditures and liabilities are independently compounded by your global **Compounding Inflation Rate**.
*   **Modeling Real Growth:** If your goal is to simulate a `5.0%` real (inflation-adjusted) return in a `3.0%` inflation environment, you must enter a nominal return rate of **`8.0%`** in the asset field ($\text{Nominal Return} = \text{Real Return} + \text{Inflation}$). Entering a growth rate of `5.0%` directly means the real growth rate simulated will be approximately `2.0%` after accounting for the global `3.0%` compounding inflation of your living expenses.

#### The Global Discount Rate Defined
The **Global Discount Rate** (configured in your active scenario settings, defaulting to `2.0%`) is a fundamental pillar of the HorizonFI longevity math:
*   **Definition:** The discount rate is the annual percentage rate used to discount future cash flows (all expected future pension incomes, Railroad Retirement benefits, future budget phase expenses, and milestone liabilities) back to their equivalent value in today's money—known as the **Present Value (PV)**.
*   **The Funded Ratio Equation:** This rate is the core parameter used by the simulation engine to evaluate your plan's mathematical viability via the **Funded Ratio**:
    $$\text{Funded Ratio} = \frac{\text{Current Asset Ledger Balance} + \text{Present Value of Future Income Streams}}{\text{Present Value of Future Liabilities \& Milestone Capex}}$$
*   **Strategic Interpretation:**
    *   *Higher Discount Rate:* Assumes a more optimistic real, risk-free, or inflation-adjusted return on capital. This reduces the present value of future liabilities, raising your Funded Ratio and suggesting you need less starting capital.
    *   *Lower Discount Rate (Conservative):* Assumes a lower real rate of growth. This increases the present value of future liabilities, lowering your Funded Ratio and demanding a more substantial current asset buffer to ensure long-term retirement safety.

### Step 4: Calibrate the Liquid Cash Buffer
Specify your desired **Cash Buffer Multiplier (Years)** on a per-phase basis in the Budget Phase configuration forms.
*   **How it protects you:** Early retirement is exposed to severe **Sequence-of-Returns Risk** (the risk of a market crash occurring in the first few years of retirement). By keeping 24 to 36 months of living expenses in cash or cash-equivalents, HorizonFI automatically bypasses selling equities at depressed prices during market downturns, drawing down the cash bucket instead.
*   **Dynamic Phase Transitions:** When transitioning from a phase with a high cash buffer (e.g., 3.0 years) to a lower one (e.g., 1.0 years), HorizonFI automatically reallocates the excess cash to other asset buckets, maximizing yield while protecting short-term cash flow needs.

---

## 3. Feature Guides & Actionable Flows

### Dynamic Milestones
Milestones are temporal anchors that dynamically alter your household's spending, taxation, or retirement cash flows. You can establish two categories of milestones:

1.  **Absolute Milestones (Calendar Years):**
    *   *Example:* Model a major scheduled boat repower or hull refit in **2030** costing a flat $50,000.
    *   *Behavior:* The calculation engine automatically layers this discrete expenditure as a one-time Capital Expense (CapEx) in that precise year and adjusts the required withdrawal trajectories.
2.  **Relative Milestones (Age-Based):**
    *   *Age 59.5 (Penalty-Free IRA Unlock):* The engine opens penalty-free tax-advantaged liquidations.
    *   *Age 65 (Medicare Transition):* Triggers adjustments to standard private insurance expense models.
    *   *Age 67 (Railroad Retirement / Social Security Activation):* Dynamically starts monthly pension passive income streams, automatically executing complex **Provisional Income** rules to establish taxability.

### Phased Retirement Budgets (Lifestyle Adjustments)
Retirement spending is rarely a flat line adjusting only for standard inflation. Real-world retirement tends to follow a "smile" or "stepped" spending curve. 

HorizonFI allows you to configure **Target Budget Phases** to construct a highly dynamic, multi-decade roadmap, splitting your timeline into distinct periods:
1.  **The "Go-Go" Years (e.g., Ages 60-70):** A phase of high activity, extensive global travel, or physical vessel maintenance. You can set the baseline budget high and apply standard or elevated inflation rates to model aggressive early spending.
2.  **The "Slow-Go" Years (e.g., Ages 70-80):** A transition phase where physical activities slow down. You can seamlessly add a new Budget Phase linking back to a baseline amount, but critically apply a **Negative Lifestyle Adjustment Rate** (e.g., `-2.0%`). 
    * *The Strategic Difference:* **Baseline Inflation** represents the macroeconomic rise in the cost of goods (fuel, food, healthcare). A **Lifestyle Adjustment** is your personal shift in consumption. By applying a shrinking lifestyle adjustment in your late 70s, the model simulates your deliberate decision to spend less on active travel, stepping down the structural withdrawal demand from your portfolio even as standard inflation continues.
3.  **The "No-Go" Years (e.g., Ages 80+):** A late-stage phase prioritizing stability and healthcare, where budget demands typically flatten and trace standard inflation without further lifestyle contraction.

The Recharts timeline visualization provides intuitive stepped reference lines overlaying the area graph, directly tracking and color-coding your target phased budget as it grows (emerald tracking) or structurally shrinks (red trackings) against reality.

### Multi-Scenario Modeling ('What-If' Sandbox Analytics)
Sailing in remote regions requires preparing for any contingency. HorizonFI provides a robust comparative sandbox environment to stress-test your strategy safely:

*   **Copy & Stress-Test Scenarios:** Click **Clone Scenario** inside your plan to copy your baseline assets, budgets, and milestones. You can then safely manipulate individual stress variables in the cloned scenario—such as bumping inflation to `8%`, lowering investment growth rates to `2%`, or testing a sudden physical vessel upgrade—without corrupting your validated Baseline Plan.
*   **Comparative Charts:** A responsive Recharts dashboard overlays multiple longevity scenarios side-by-side, detailing exactly when and where asset paths begin to diverge over a 40+ year timeline.
*   **Strict Structural Integrity:** The database enforces a safeguard preventing the deletion of the final remaining scenario in your plan, guaranteeing every model retains a structural baseline benchmark.

### Time Horizon Controls (Phase Zooming)
Analyzing a multi-decade trajectory can sometimes make it difficult to evaluate short-term operational phases, such as the critical "bridge" years between early retirement and pension eligibility (e.g., bridging the gap before Social Security or Railroad Retirement at age 67). 

To solve this, HorizonFI provides interactive **Time Horizon Controls** that allow you to zoom the visual display dynamically:
*   **Zooming vs. Simulating:** Adjusting the `displayStartYear` and `displayEndYear` controls changes the subset of the year array passed to the Recharts visualizer. This is a purely visual filter on the front-end thread.
*   **Preserving Mathematical Integrity:** Critically, visual filtering **DOES NOT alter the underlying multi-decade calculations** running in the background Web Worker (`simulation.worker.ts`). The worker always runs the complete chronological simulation from your starting year to your final end year. This guarantees that whether you are zoomed in on a 5-year bridge window or viewing the full 40-year landscape, the compound growth, tax stacking, and drawdown waterfall trajectories remain 100% mathematically consistent and uncorrupted.
*   **Actionable Usage:** Use the slider controls in the active scenario toolbar to isolate specific phases (e.g., setting the window to 2026–2035) to examine cash buffer depletion rates, early tax-bracket margins, and dividend reinvestment yields before pre-tax retirement accounts or pensions unlock.

### Unified Bottom-Up Computational Engine
To prevent any possibility of data drift or temporal misalignment across different visual metrics, HorizonFI enforces a strict **Single Source of Truth** architecture:
*   **Asset-Level Calculation Core:** All visualizations (including the "Long-Term Portfolio Projection" stacked area chart, the "Portfolio Longevity" comparative line chart, and the "Wealth Velocity" chart) draw their dataset from the exact same chronological ledger compiled by the background Web Worker (`simulation.worker.ts`).
*   **Absolute Mathematical Identity:** The worker processes the mathematical drawdown, bucket harvesting, and growth algorithms on an asset-by-asset basis, summing them directly to construct both the granular categories (Cash, Taxable, Pre-Tax, Roth) and the overarching net worth metric. In every simulation snapshot, the sum of these visual category balances is guaranteed to match the overarching Net Worth balance.
*   **Zero-Drift Synchronization:** Because both charts pull directly from the same unified array of snapshots, any scenario shift, budget change, or market shock is immediately and identically reflected across all dashboard charts simultaneously.


---

```
                       ┌──────────────────────────┐
                       │   PLAN FUNDING SOURCES   │
                       └─────────────┬────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   ┌──────────────┐          ┌────────────────┐        ┌──────────────┐
   │ TAXABLE      │          │ PRE-TAX        │        │ ROTH         │
   │ BROKERAGE    │          │ TRADITIONAL    │        │ TAX-FREE     │
   ├──────────────┤          ├────────────────┤        ├──────────────┤
   │ Primary      │          │ Roth Conversion│        │ Tax-Free     │
   │ Bridge Asset │          │ Stacking Line  │        │ Growth Buffer│
   └──────────────┘          └────────────────┘        └──────────────┘
```

### Granular Budgeting & Funding Allocation
The **Granular Budget & Variance** workspace allows you to model exactly how your annual retirement spending is funded. The system eliminates pro-rata assumptions by letting you configure a precise withdrawal hierarchy:

1.  **Flexible Slicing Constraints:** Distribute your required drawdown percentages using responsive percentage sliders (%) or raw dollar bounds ($).
2.  **Five-Layer Structured Drawdown Queue:**
    *   **Pre-Tax Traditional accounts** (taxed as ordinary income, fueling conversions).
    *   **Taxable Brokerage principal** (subject to capital gains taxes).
    *   **Qualified Dividends** (taxed at lower capital gains brackets).
    *   **Roth IRAs** (completely tax-free drawdowns).
    *   **Cash / Gift accounts** (non-taxable capital drawdowns).
3.  **Gross-Up Conversion Math:** To guarantee your actual cost of living is completely funded, the calculation engine runs a **multi-variable numerical convergence loop** (supporting up to 25 loops or a precision limit of `< $0.01` tolerance). It calculates progressive ordinary income taxes and stacked long-term capital gains (LTCG) taxes based on 2026 statutory rates, automatically "grossing up" your pre-tax allocations. This tax liability is distributed proportionally only across active, tax-bearing funding sources (such as Traditional accounts, taxable brokerage, and dividends), while completely exempting non-taxable pools like Roth IRAs and cash gifts, guaranteeing your post-tax net payout perfectly hits your net target spend. You can view these dynamic, real-time calculations directly under the **Calculated Pre-Tax Gross-Up & Tax Projections** section in the **Budget & Funding** tab, which displays exact net outflows, pre-tax gross outflows, and estimated tax charges for each bucket.

### Auxiliary Income (Tax-Free)
Users can configure non-taxable capital inflows (such as private annual family gifts, tax-free windfalls, or structured inheritances) directly in the active Scenario settings panel:
*   **Withdrawal Deduction Prioritization**: This tax-free income bypasses ordinary and capital gains engines completely. It directly subtracts from the calculated Stage Target Budget before determining residual withdrawal needs: `remainingFundingNeed = targetBudget - activeGiftAmount`.
*   **Timeframe Specific Constraints**: Start and End boundary parameters can be assigned to align with calendar years or retiree ages (inclusive tracking), allowing temporary or sunsetting inflows to be mapped perfectly in the simulation model.
*   **Flexible Inflation Adjustments**: Toggling the inflation adjustment scales the inflows automatically with the core plan's compounding general inflation parameters over multi-year projection tables.

### Direct Asset Links & Relational Integrity
To ensure your retirement plan remains structurally coherent, your monthly budget line items can be linked directly to asset ledger categories.

*   **Relational Safety Locks (Kahn's Sort Middleware):** If you attempt to delete a physical asset or category that is actively referenced by an active budget or planned expense line-item, the database's internal middleware blocks the transaction locally, popping up an intuitive error banner. This prevents breaking mathematical calculations or leaving orphan records behind in your offline database.
*   **Supporting Named Links Lifecycle:** When creating a new planned expense or editing an existing one, you can attach direct hyperlinked references (such as contracts, insurance quotes, or marina agreements). These links can be added, custom labeled, updated (edited) in place, or removed completely at any stage of planning. Select the edit (pencil) icon next to any active link to update its details instantly without losing progress.
*   **Planned Expense Renewal Dates:** To track recurring service contracts or time-bounded quotes (e.g. marine insurance premium renewals, lease expiries, annual dockage agreements), you can configure an optional **Renewal Date** using the inline datepicker. This value is securely encrypted at rest within local IndexedDB storage and synced seamlessly to Firestore. A dedicated indicator tag is displayed within the Simulated Master Ledger list view to keep critical operational deadlines visible at a glance.
*   **Planned Expense Exclusion (Check/Uncheck Toggle):** To support scenarios where a budget item is tentative or no longer active but should be retained for historical reference or personal note-taking, HorizonFI provides an interactive checkmark toggle directly within the Master Ledger row. Unchecking a planned expense immediately mutes its appearance, applies a visual strike-through, and strips its values from all budget aggregates, category totals, and downstream multi-stage calculations. The expense remains safely persisted inside the database as a static reference note, allowing you to reactivate it with a single click at any time without having to re-key notes or supporting hyperlinks.
*   **Offline Budget & Actuals Export:** Within the **Granular Budget & Variance** tab, you can export your fully calculated planned expenses directly to a CSV spreadsheet via the "Export to CSV" button. Additionally, you can export your logged **Actual Monthly Expenditure Ledger** (including line items and manual category totals) for the currently selected month and year using the dedicated Export button in the ledger header. These files are generated entirely within your local browser sandbox, maintaining full data privacy and zero-trust security without any cloud egress requirements.
*   **Simulated Master Ledger Sorting Operations:** Group and rank planned expenses effortlessly. Dynamic controls allow you to sort your master ledger by **Category (alphabetically) followed by Expense Name**, strictly by **Expense Name (alphabetical ascending A-Z or descending Z-A)**, as well as resort dynamically by its computed **Annual Expense** in both **ascending (increasing)** or **descending (decreasing)** order. You can trigger these sorts instantly using the sleek sorting buttons located adjacent to the master ledger title, or by clicking directly on the corresponding table headers ("Expense Name & Info", "Category", or "Annual"). This allows real-time offline-first visual ranking of major cash flow drivers.

---

## 4. The Math Explained (Translating Algorithms for the User)

### 1. Guyton-Klinger Guardrails
Rather than calculating static, rigid withdrawal projections (which fail under real-world market volatility), HorizonFI utilizes the dynamic **Guyton-Klinger Ruleset** to model real-world course corrections:

```
                  ┌────────────────────────────────────────┐
                  │          UPPER GUARDRAIL               │
                  │   Withdrawal Rate Drops Below 80%      │
                  │   ➔ INITIATES 10% PROSPERITY BUMP      │
                  └───────────────────▲────────────────────┘
                                      │
                                      │ (Safe Floating Band)
                                      │
                  ┌───────────────────▼────────────────────┐
                  │          LOWER GUARDRAIL               │
                  │   Withdrawal Rate Climbs Above 120%    │
                  │   ➔ INITIATES 10% PRESERVATION CUT     │
                  └────────────────────────────────────────┘
```

*   **The Capital Preservation Rule (Lower Guardrail):**
    *   *When it triggers:* If severe market pullbacks contract your portfolio, driving your actual annual withdrawal rate up more than **20% higher than your initial rate** (e.g., your initial 4% withdrawal rate climbs above 4.8%).
    *   *The adjustment:* The system immediately slices your annual retirement spending by **10%** and halts inflation-indexing adjustments to your budget for that year.
    *   *The outcome:* This protective action stops the destruction of underlying stock shares, ensuring your portfolio capital stays in place to recover when the market rebounds.
*   **The Prosperity Rule (Upper Guardrail):**
    *   *When it triggers:* If ongoing market surges expand your portfolio, pulling your active withdrawal rate more than **20% below your initial target** (e.g., your 4% rate drops below 3.2%).
    *   *The adjustment:* Your nominal withdrawal budget is safely bumped upward by **10%**, allowing you to logically enjoy your excess growth without risking long-term safety.
*   **Fully Parameterized Controls:** You have direct control over these variables. All cut rates, prosperity bumps, trigger points, and timeline durations can be adjusted using sidebar input sliders.

### 2. Wealth Velocity Phases
The system measures the kinetic momentum of your portfolio and segments your timeline into three operational phases:

1.  **Accumulation Phase (Withdrawal Rate ≤ 0%):**
    *   *Layman explanation:* You are actively saving or living on external earned passive cash flow. The entire asset portfolio is in high-compounding mode with zero drawdown drag.
2.  **Velocity Point (Withdrawal Rate crossing the 4% to 5% safe zone):**
    *   *Layman explanation:* The self-sustaining sweet spot. Your portfolio's average historic growth matches or exceeds your annual drawdown. The momentum of compounding growth has overcome your spending rate, rendering your financial independence plan resilient to downside events.
3.  **Distribution / Drawdown Phase (Withdrawal Rate Exceeding 6%):**
    *   *Layman explanation:* The portfolio is undergoing active spending contraction relative to the underlying capital base. Inflation and spending exceed safe-yield averages, meaning principal is being systematically consumed. The system flags these years to signal that mitigations, cash buffers, or auxiliary spending trims should be engaged.

### 3. The 3-Bucket Waterfall Strategy
To protect your retirement against catastrophic "sequence of returns" risks, HorizonFI integrates a multi-duration asset-liability matching framework that isolates volatility.

1.  **Bucket 1 (Liquidity):** Holds low-risk cash equivalents to cover your most immediate baseline living expenses (typically 1-3 years). During annual simulation drawdowns, the math engine prioritizes draining this bucket **first**, fully covering living expenses, tax liabilities, and required Gross-Ups without ever touching volatile equities.
2.  **Bucket 2 (Income):** Holds yield-generating, intermediate-term assets (bonds, dividend ETFs) mapped to cover your mid-term horizon (typically years 3-8). It automatically acts as a refill reservoir, trickling cash flow to replenish Bucket 1 mechanically.
3.  **Bucket 3 (Growth/Equities):** Holds high-growth, high-volatility capital (index funds, individual stocks) intended for total portfolio longevity (typically years 8-30+).

**The Guyton-Klinger Capital Preservation Override:**
When modeling drawdowns, the mathematical simulation automatically attempts a trailing-year refill: trailing buckets organically transfer capital downwards to restore standard duration lengths (e.g., Bucket 3 drops capital into Bucket 2, which trickles down to establish 2 years in Bucket 1).
*However*, if the simulation registers a negative market return year, the Capital Preservation Guardrail automatically triggers—**strictly halting all transfers from Bucket 3 (Equities)**. This guarantees that you never sell stocks at a depressed loss, forcing you to gracefully live off your isolated liquidity (Buckets 1 and 2) until the market rebounds.

#
### The Bridge Period Optimization Module
The transition from early retirement to the onset of fixed pensions (like Railroad Retirement or Social Security) creates a critical window known as the "Bridge Period". Because your baseline ordinary income drops precipitously before these pensions begin, this window presents a massive opportunity for multi-year tax optimization.

To navigate this, HorizonFI features an offline-first **Bridge Period Optimization Module**. Instead of relying on linear projections, this module deploys a mathematically intensive Dynamic Programming engine inside a background Web Worker to evaluate thousands of permutations of stock liquidations and Roth conversions over your entire retirement timeline. 

By maximizing your terminal wealth at the end of the simulation, the algorithm inherently minimizes your lifetime tax drag.

#### 1. Concentrated Stock Liquidation & Reallocation
If you hold a disproportionate amount of wealth in a single company stock, the background Web Worker (`simulation.worker.ts`) automatically optimizes its transition to reduce idiosyncratic risk:
* **Tax Bracket Space Mapping:** The background simulation loop dynamically scans the active scenario's asset list to find your designated **Concentrated Liquidation Target (🎯)** and **Dividend Destination Fund (📥)**.
* **0% LTCG Space Maximization:** Every year, the engine calculates your remaining 0% Long-Term Capital Gains (LTCG) bracket space ($98,900 for MFJ in 2026) after accounting for all ordinary income (pensions, Social Security, and planned Roth conversions) and pre-existing investment dividend yields.
* **Progressive Capital Gains Tax:** The algorithm calculates the optimal amount of stock to liquidate to completely fill the 0% LTCG space based on a standard 60% cost basis (40% gain ratio). It calculates and subtracts the progressive federal capital gains tax (0%, 15%, 20%) dynamically, transferring the net proceeds directly into the Dividend Destination Fund balance.
* **Overriding Budget Shortfall Safeguard:** If a severe budget deficit exists that cannot be covered by other available liquid assets, the engine executes an overriding cash flow carve-out, selling sufficient target assets to fund the baseline budget, even if it triggers the 15% LTCG bracket ("tax torpedo").

#### 2. Multi-Year Roth Conversion Engine
Simultaneously, the engine evaluates Roth conversions to defuse future tax liabilities. **Crucially, the engine prioritizes stock liquidation over Roth conversions.** Because Roth conversions generate ordinary income—which sits *underneath* capital gains—large Roth conversions can crowd out your 0% Long-Term Capital Gains space, trapping you in a concentrated stock position. 

To mitigate single-stock risk first and spread out the tax burden, the engine restricts Roth conversions to lower marginal brackets (e.g., the 12% bracket limit). This prevents massive single-year tax spikes and ensures Roth conversions are spread smoothly across the entire bridge period. 

The Dynamic Programming engine treats strict legislative penalties as hard mathematical constraints:
* **The Tax Torpedo:** The system calculates the phantom marginal tax rate. If an additional $1,000 of Roth conversion pushes $1,000 of capital gains from the 0% bracket into the 15% bracket, the true effective tax rate is much higher. The engine halts recommendations when this threshold is breached.
* **IRMAA Cliffs:** Medicare Part B and D premium surcharges act as cliff penalties. The engine actively restricts Roth conversions to keep your Modified Adjusted Gross Income precisely below these cliffs.
* **Provisional Income Suppression:** By executing conversions during the bridge period, the engine depletes your pre-tax balances, systematically suppressing future Required Minimum Distributions (RMDs). This keeps your future Provisional Income low, allowing your Tier 1 Railroad Retirement or Social Security benefits to remain largely tax-free.

#### 3. Analyzing the Optimizer Outputs
Because this module calculates massive datasets locally using an RxDB JSON database, the UI is highly reactive. You can view the engine's outputs in two primary formats:

1.  **Multistage Stacked Area Chart:** This plots your comprehensive income sources and tax liabilities chronologically. The layers stack in the exact order the IRS taxes them: standard deductions at the base, ordinary income/Roth conversions in the middle, and capital gains/dividends at the top. Line overlays indicate permanent TCJA brackets and the 0% LTCG threshold.
2.  **Reactive Action Table:** Directly beneath the chart, a detailed data grid details the exact dollar amount of specific stock lots to liquidate, the capital to allocate to the dividend ETF, the optimized Roth transfer amount, and your total estimated federal tax liability for the year.


## 4. Tax & Transition Engine
HorizonFI computes multi-decade liabilities on your behalf safely behind the scenes:

*   **Roth Conversion Stacking:** To avoid the massive taxes triggered when withdrawing large sums later, the engine analyzes your pre-tax versus tax-free assets and model-schedules annual Roth conversions. It targets conversions to map perfectly up to the edge of the **0% Long-Term Capital Gains threshold** ($98,900 for Married Filing Jointly in 2026) to shield your gains from ordinary tax brackets.
*   **Concentrated Equity Transition (UPRR to SCHD):** Cruisers often hold concentrated single-stock equity from prior employment (e.g., Union Pacific Railroad - UPRR). The asset transition engine models a multi-year tax-aware transition out of volatile single-stock equities into globally diversified high-yield dividend ETFs (e.g., Schwab US Dividend Equity ETF - SCHD), estimating the precise capital gains drag per year.
*   **The "Tax Bomb" (Deferred Tax Liability):** Tax-deferred traditional balances are not fully yours—they bear a deferred tax liability. HorizonFI estimates this future tax burden based on progressive sunset-era tax brackets, representing this future liability as a virtual **contra-asset** to calculate your true post-tax net worth accurately.

---

## 5. UX & Technical Navigation

### Interactive 3-Bucket Waterfall Visualizer
HorizonFI includes an interactive configuration panel and visualization dashboard specifically designed for the 3-Bucket strategy:
*   **Dynamic Asset Duration Configurator:** Set strict timeline boundaries on your reserve tranches (e.g., locking Bucket 1 to two years, Bucket 2 to five years) using the inline input interface. The system securely writes these parameters directly to abstract models without interrupting your layout view.
*   **Multi-Decade Horizon Charting:** Monitor the sequential capital drawdown and mechanical trailing-year rebalance loops through an interactive waterfall chart. This area visualization cleanly stacks the abstract layer representations, rendering perfectly in daylight, dark mode, or night-watch mode.

### Responsive Design & Physical Accessibility
Whether navigating using a 27-inch dual-screen marine desk station, a 10-inch cabin iPad, or a rugged 6-inch smartphone in wet cockpit conditions, the UI maintains clean boundaries:
*   **Stacking Visual grids:** Displays transform smoothly from side-by-side bento layouts to comfortable single-column vertical lists, keeping all data fully readable.
*   **Friction-Free Inputs:** Forms utilize character-typing buffers and update database values on explicit `Blur` or `Enter` events, preventing text-resets or jumpy cursors on touch screens.
*   **WCAG 2.1 Touch Elements:** Buttons, checkboxes, sliders, and navigation tabs maintain a touch-target size of at least **48x48px** to prevent tiresome misclicks under rolling sea conditions.

### The Night-Watch Eye Safety Theme
For night watchstanders, maritime sailors, or low-light cabin environments, standard white screens destroy natural night vision and drain valuable battery power. 

Turning on the **Night-Watch Theme** turns background elements entirely pitch black (`#000000`) and shifts all typography, buttons, and visual charting elements to responsive red-scale tones. This protective visual mode ensures safety during night watches.

### Security, Recovery & Maintenance
*   **ITP Iframe Authentication Failsafe:** Some environments (such as iPadOS Safari) block third-party cookies and auth popups inside web applications. HorizonFI bypasses Safari Intelligent Tracking Prevention (ITP) issues by providing a **Secure Password Fallback** option on the login menu. Registered user accounts can bypass popups and log in directly via secure POST tunnels.
*   **Diagnostic Safety Banner:** Standard offline browsers frequently suppress storage exceptions. HorizonFI intercepts all indexing, write, or authentication errors and presents them in a detailed, user-dismissible red diagnostic banner, ensuring complete technical transparency.
*   **Technical Hard Reset:** If local browser storage or browser cache files ever suffer structural corruption (e.g., IndexDB schema drift error DB9), select the **Hard Reset** icon in the dashboard settings footer. After confirming the prompt, the application will wipe corrupted IndexedDB instances, flush stale cache files, and pull your encrypted, validated plan data fresh and intact from the secure Firebase database.

---

### V. Granular Investments & Temporal Lockouts
To accurately model tax drag, required minimum distributions, and complex early retirement penalty avoidance, HorizonFI supports granular asset tracking and temporal lockouts.

*   **Granular Asset Classifications:** When defining your investments inside the **Target Assets** panel, you must categorize each pool into one of four distinct tax buckets (`TAXABLE`, `PRE_TAX`, `ROTH`, `CASH`). 
    *   *TAXABLE:* Standard brokerage accounts. Subject to dividend drag and capital gains on withdrawal.
    *   *PRE_TAX:* Traditional 401ks, IRAs, and Pensions. Subject to ordinary income tax (gross-ups) and RMDs upon distribution.
    *   *ROTH:* Completely tax-free compounding and tax-free drawdowns.
    *   *CASH:* Non-volatile, zero-tax liquid buffers.
*   **Per-Asset Growth & Yield:** Unlike legacy tools that apply a global average return, HorizonFI allows you to assign specific expected growth rates and dividend yields to every individual asset, allowing the simulation to compound your high-risk tech stocks independently from your stable bond reserves.
*   **Temporal Availability Lockout:** For assets that cannot be legally drawn without severe penalties (e.g., standard 401ks before age 59.5, or a trust fund maturing in 2035), you can specify an **Availability Lockout Date** (e.g. `age:59.5` or `2035`). The simulation engine strictly blocks the 3-Bucket waterfall or multi-stage drawdown algorithms from liquidating these protected assets during any deficit year prior to their unlock trigger.

---

## 6. Security, Zero-Trust Architecture & Secrets Management

To maintain the highest tier of financial privacy and secure operations, HorizonFI operates on a mathematically rigorous **Zero-Trust Security Perimeter** model. Under this paradigm, both the local browser environment and the remote build pipeline are treated as hostile, and our secrets management practices are explicitly designed to prevent the accidental leakage, commit, or bundling of sensitive tokens.

### I. Fully Decoupled Client Initializer & Environment Isolation
*   **No Hardcoded Credentials:** Historically, client configurations were bundled into version-controlled files like `firebase-applet-config.json` or committed `.env` files. In HorizonFI, the client initialization layer (`src/lib/firebase.ts`) is completely decoupled from any static file imports.
*   **Strictly Environment Variable Driven:** The client-side application requests its core parameters strictly from isolated, dynamic runtime environmental variables (`import.meta.env.VITE_FIREBASE_*`).
*   **Fail-Safe Crash Protection:** If these variables are absent, instead of letting the application crash on evaluation with a fatal blank screen, the core loader intercepts the initialization deficit. It triggers a safe mock-driver fallback and displays a secure, interactive steel-slate **Configuration Assistant** guiding the developer/user on how to configure secrets in their GitHub dashboard.

### II. CI/CD Deployment with Tight GitHub Secrets Bindings
*   **Accidental Leaks Prevention:** Hardcoding API keys or project credentials into files checked into Git repositories is a critical vulnerability. HorizonFI resolves this by deferring all keys to the secure repository settings tab under **GitHub Actions Secrets**.
*   **Fine-Grained Step-Level Resolution:** Our automated merging pipeline (`.github/workflows/firebase-hosting-merge.yml`) does not use wildcards to inject credentials globally. Instead, individual secret bindings are explicitly mapped at the compile step:
    ```yaml
    - run: npm run build
      env:
        VITE_FIREBASE_API_KEY: '${{ secrets.VITE_FIREBASE_API_KEY }}'
        VITE_FIREBASE_AUTH_DOMAIN: '${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}'
        VITE_FIREBASE_PROJECT_ID: '${{ secrets.VITE_FIREBASE_PROJECT_ID }}'
        VITE_FIREBASE_STORAGE_BUCKET: '${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}'
        VITE_FIREBASE_MESSAGING_SENDER_ID: '${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}'
        VITE_FIREBASE_APP_ID: '${{ secrets.VITE_FIREBASE_APP_ID }}'
    ```

### III. Vite Prefix and Scope Controls
To completely block third-party tools or rogue processes from sweeping and packing adjacent system secrets (e.g. administrative `GITHUB_TOKEN` keys) into the compiled web assets:
*   **Scope Restriction:** We strictly locked down Vite's environment scanning scope inside `vite.config.ts` by setting `envPrefix: ['VITE_FIREBASE_']`. Vite will ignore any adjacent sensitive environment variables unless they are explicitly prefixed with this Firebase configuration header.
*   **Source Map Disablement:** Production source maps are completely disabled (`sourcemap: false`) within the build payload, preventing arbitrary crawlers from scanning structural comments or decompiling local AES-256 encryption algorithms.

### IV. Content Security Policy (CSP) & CDN Edge Defenses
Because your financial data deserves defense-in-depth, our Firebase Hosting configuration (`firebase.json`) injects rigid HTTP response headers directly from the edge CDN routers on every page request:
*   **Content-Security-Policy (CSP):** restrains script execution, font loading, style injections, and network connections strictly to standard Google/Firebase authentication and database endpoints. This systematically prevents cross-site scripting (XSS) from exfiltrating data.
*   **Clickjacking Blockade:** Serves `X-Frame-Options: DENY` headers to refuse page rendering if embedded inside malicious or unapproved third-party iframes.
*   **Strict-Transport-Security (HSTS):** Guarantees that any browser attempting to access the dashboard is forced to use cryptographically secure HTTPS, shielding local connections from passive packet sniffing.

---

## 7. Tax Projections & Gross-Up Engine

### Mathematical Foundations of Multi-Bucket Drawdowns

Executing a successful early retirement drawdown strategy—specifically a high-complexity framework like the **Circumnavigation Bridge Strategy**—demands far more than generic tax projections. Traditional tools rely on pro-rata assumptions, applying static average tax rates or flat-percentage deductions across all asset classes. HorizonFI, conversely, rejects these crude simplifications in favor of a mathematically rigorous, offline-first tax simulation engine. 

To guarantee that your estimated net budget matches your actual cash in hand, the computation layer in `simulation.worker.ts` isolates processing to a dedicated background thread, executing a precise **Income Stacking Methodology** coupled with a high-performance **Gross-Up Computational Loop**.

---

### The Mechanics of Income Stacking

Under the United States federal tax code (with permanent TCJA 2026 brackets), different types of income are taxed under distinct bracket structures. Crucially, these structures are not independent; they stack sequentially. The rate applied to your last dollar of capital gains depends entirely on the volume of ordinary income underneath it.

```
       ┌────────────────────────────────────────────────────────┐
       │ LONG-TERM CAPITAL GAINS (LTCG) STACK                   │
       │ (Qualified Dividends & Taxable Brokerage Gains)        │
       │ Subject to 0% / 15% / 20% brackets depending on the    │
       │ underlying Ordinary Income level.                      │
       ├────────────────────────────────────────────────────────┤ ◄─── $98,900 LTCG Threshold (2026 MFJ)
       │ ORDINARY INCOME STACK                                  │
       │ (Pre-existing pensions, social security, plus active   │
       │ manual Roth Conversions & Traditional IRA drawdowns)   │
       ├────────────────────────────────────────────────────────┤ ◄─── $30,000 Standard Deduction
       │ STANDARD DEDUCTION (Tax-Sheltered Base)                │
       └────────────────────────────────────────────────────────┘
```

HorizonFI evaluates your annual tax liabilities in this exact chronological order:

#### 1. The Standard Deduction Shield
The engine starts by applying the projected 2026 Married Filing Jointly (MFJ) standard deduction of **$30,000** as a baseline tax-sheltered floor. Any ordinary income streams must completely exhaust this shield before generating an active tax liability.

#### 2. Stacking Ordinary Income
Ordinary income consists of baseline streams (such as pre-existing railroad retirement benefits, pensions, and non-portfolio income) plus your proactive, user-defined **Target Roth Conversion Amount** and traditional IRA distributions.
$$\text{Taxable Ordinary Income} = \max(0, \text{Total Ordinary Income} - \$30,000)$$
The engine then applies the progressive permanent TCJA 2026 ordinary income tax brackets (starting at 10%, 12%, 22%, and 24%) directly to this taxable ordinary base:
$$\text{Ordinary Tax Liability} = f_{\text{progressive}}(\text{Taxable Ordinary Income})$$

#### 3. Stacking Capital Gains (The Bracket Push)
Once the ordinary income base is established, long-term capital gains—consisting of qualified dividends, tax-taxable brokerage gains from standard withdrawals, and the gain portion of your proactive **Taxable Rebalancing Sale Amount** (determined by your `rebalancingCapitalGainPercentage`)—are stacked directly on top.
*   **Standard Deduction Offsets:** If your total ordinary income is less than the standard deduction, the unused deduction portion is allowed to spill over and shield a portion of your capital gains:
    $$\text{Remaining Standard Deduction} = \max(0, \$30,000 - \text{Total Ordinary Income})$$
    $$\text{Taxable LTCG} = \max(0, \text{Total LTCG} - \text{Remaining Standard Deduction})$$
*   **The Marginal LTCG Bracket Drag:** The stacked capital gains are evaluated relative to the 2026 LTCG thresholds ($0\% \le \$98,900$, $15\% \le \$613,700$, and $20\%$ beyond, for MFJ). If your ordinary income base has already filled your brackets up to or past the $98,900 threshold, **every single dollar of capital gains is immediately pushed into the 15% or 20% bracket**. 
    *   *Strategic Rule:* A $40,000 Roth conversion on top of $60,000 of other ordinary income will push your capital gains out of the 0% bracket, transforming what would have been tax-free brokerage liquidations into 15% tax drag. HorizonFI exposes this exact interactive friction.

---

### The Gross-Up Algorithm & Computational Loop

When you specify that you need to withdraw a net sum of **$50,000** to fund your cruising lifestyle, the raw portfolio withdrawal cannot be a flat $50,000. Because withdrawing from pre-tax or brokerage accounts triggers immediate tax liabilities, your total withdrawal must be "grossed up" to cover both the baseline net target and the resulting tax burden:
$$\text{Gross Withdrawal} = \text{Net Lifestyle Target} + \text{Total Tax Liability}$$

To determine this exact figure, the Web Worker executes a **multi-variable numerical convergence loop** (configured for a maximum of 40 iterations or a strict $< \$0.01$ precision limit):

1.  **Initialize Target Allocation:** Net targets for each of the five buckets (Qualified Dividends, Taxable Brokerage, Pre-Tax, Roth, and Cash/Gifts) are established based on your active funding configuration.
2.  **Evaluate Starting Guess:** The loop begins with a baseline guess where gross withdrawals equal the net target allocations.
3.  **Income Stack & Tax Evaluation:** At each iteration, the engine stacks the active gross traditional withdrawals and brokerage gain portions alongside manual strategic events (Roth conversions and rebalancing sales) to run the full statutory 2026 bracket calculations.
4.  **Shortfall Calculation:** The engine calculates the net cash actually achieved after subtracting the generated tax liability:
    $$\text{Net Achieved} = (\text{Traditional}_{\text{Gross}} + \text{Brokerage}_{\text{Gross}} + \text{Dividends}_{\text{Gross}} + \text{Roth}_{\text{Gross}} + \text{Cash}_{\text{Gross}}) - \text{Total Tax}$$
    $$\text{Shortfall} = \text{Total Net Target} - \text{Net Achieved}$$
5.  **Proportional Distribution of Drag:** If the shortfall is greater than \$0.01, the engine dynamically adjusts the gross withdrawal targets. Critically, to preserve mathematical correctness, this tax drag adjustment is distributed proportionally across **all active funding sources**:
    $$\text{Withdrawal}_{\text{Gross}, t+1} = \text{Withdrawal}_{\text{Gross}, t} + \text{Shortfall} \times \left(\frac{\text{Withdrawal}_{\text{Net}}}{\text{Total Net Target}}\right)$$
    This ensures that tax-free buckets (like Roth IRAs or Cash Gifts) only grow by their proportional net share to cover the global deficit, while taxable buckets expand dynamically to absorb their tax-on-tax drag.
6.  **Loop Termination:** Once the absolute difference in `Shortfall` shrinks below **$0.01**, the loop terminates and passes the exact gross outputs down to your scenario ledger. This prevents cash flow deficits from compounding over 30+ year projection timelines.

---

### 7.1 Interactive Tax Bracket Optimization Suite & Safe Capacities

To empower early retirees to confidently navigate tax bracket boundaries, HorizonFI features an interactive **Tax Bracket Optimization Suite**. This tool visually maps your current income stack against progressive tax thresholds and runs a real-time, zero-latency optimization algorithm to calculate safe Roth conversions and taxable capital gain limits.

```
       ┌────────────────────────────────────────────────────────┐
       │ Safe Taxable Stock Sale Capacity                       │ ◄─── Driven by LTCG Bracket limit
       │ Derived as: Remaining LTCG Capacity / (1 - Cost Basis%)│
       ├────────────────────────────────────────────────────────┤
       │ Max Recommended Roth Conversion                        │ ◄─── Driven by Ordinary Bracket limit
       │ Fills the remainder of your target Ordinary Bracket     │
       └────────────────────────────────────────────────────────┘
```

#### 1. Interactive Stacking Parameters
The suite exposes three user-configurable variables that directly drive the real-time background optimization:
*   **Target Ordinary Bracket:** Allows you to set a threshold (e.g., Standard Deduction, 10%, 12%, or 22%) to limit your recommended ordinary income.
*   **Target LTCG Bracket:** Sets your preferred maximum long-term capital gains tax rate threshold (typically 0% for early retirement, or 15% / 20%).
*   **Taxable Account Cost Basis Percentage:** A slider from 0% to 100% reflecting the ratio of principal to gains in your taxable portfolio. A higher cost basis (e.g., 75%) indicates that only 25% of any stock sale will trigger taxable capital gains, significantly expanding your safe liquidations.

#### 2. Optimization Algorithm & Mathematical Derivations
The optimization suite executes a dual-layer calculation flow:
*   **Layer 1: Roth Conversion Headroom:**
    $$\text{Remaining Ordinary Capacity} = \max(0, \text{Target Ordinary Gross Limit} - \text{Gross Ordinary Income})$$
    $$\text{Max Recommended Roth Conversion} = \text{Remaining Ordinary Capacity}$$
    *This represents the exact dollar capacity left in your target ordinary bracket before any income spills over into the next tax tier.*
*   **Layer 2: Safe Stock Sale Headroom:**
    We stack the simulated maximum Roth conversion on top of your existing ordinary income to establish a new, simulated baseline taxable ordinary income:
    $$\text{Simulated Taxable Ordinary Income} = \max(0, (\text{Gross Ordinary Income} + \text{Max Roth Conversion}) - \$30,000)$$
    Next, we calculate the remaining capacity within your target LTCG bracket:
    $$\text{Remaining LTCG Capacity} = \max(0, \text{Target LTCG Taxable Limit} - (\text{Simulated Taxable Ordinary Income} + \text{Current LTCG Gains}))$$
    Finally, using your estimated cost basis percentage, we compute the maximum gross stock sale amount that will yield exactly that capital gain:
    $$\text{Gains Ratio} = 1.0 - \text{Cost Basis Percentage}$$
    $$\text{Max Recommended Stock Sale} = \frac{\text{Remaining LTCG Capacity}}{\text{Gains Ratio}}$$
    *If your cost basis is 100%, the Gains Ratio is 0, indicating that stock sales consist entirely of return-of-principal and trigger zero tax. The engine safely returns "Unlimited" capacity.*

#### 3. Stacking Sequence Visualization
The companion Recharts visualization renders a high-contrast stacked horizontal bar detailing how your active cash flow layers fit together:
*   **Standard Deduction (Gray Base):** The first $30,000 of ordinary income, completely tax-sheltered.
*   **Taxable Ordinary Income (Blue Middle):** The taxable portion of ordinary withdrawals and strategic Roth conversions.
*   **Capital Gains & Dividends (Green Top):** Stacked on top of ordinary income, showing if and when gains cross the statutory 0% LTCG boundary ($128,900 gross, which is $98,900 taxable + $30,000 standard deduction).

---

## 8. Dynamic Multi-Stage Integration

To accurately model complex timeline shifts, HorizonFI supports **Dynamic Temporal Logic** within the Multi-Stage Configurator. You no longer need to rely on static absolute calendar years to structure your phase transitions.

### Centralized Phased Budget Inheritance
Multi-stage budgets are now governed globally by your core **Phased Budget** settings, eliminating data entry duplication and preventing chronological drift. 
*   **Unified Source of Truth:** Instead of manually typing a separate "Target Annual Budget" inside every distinct drawdown stage, the mathematical simulation engine dynamically resolves your active budget based on the temporal bounds (e.g., your "Go-Go" or "Slow-Go" phases) configured in your main scenario budget sheet.
*   **Adaptive UI Validation:** The Stage Configurator now features a sleek, night-watch compliant informational badge indicating that the budget is dynamically inherited, ensuring you are always operating with real-time, synchronized data.

### Linking Stages to Global Milestones
Instead of hardcoding a stage to start in "2035", you can toggle the stage boundary to **Link to Milestone**. 
*   **Dynamic Resolution:** If you link a "Slow-Go" budget stage to your "Age 65 Medicare" milestone, the mathematical engine will automatically resolve the exact calendar year that stage begins based on your birth year.
*   **Ripple Effects:** If you clone your scenario and shift the milestone trigger from Age 65 to Age 67, all linked stages will automatically dynamically shift forward in time across the 40-year simulation timeline without requiring any manual reconfiguration.

### Funneling Auxiliary & Global Income Streams
In early retirement, certain phases may benefit from external income (like a part-time consulting gig or family gift), while other phases rely 100% on portfolio drawdowns. HorizonFI now allows you to funnel external income explicitly at the **Stage Level**:
*   **Include Global Income Streams:** Toggling this flag forces the simulation engine to absorb any active Social Security, pensions, or other fixed income streams and apply them directly against that specific stage's target budget, mathematically reducing the drawdown demand against your core asset buckets.
*   **Include Auxiliary Tax-Free Income:** Toggling this flag allows you to funnel tax-free capital (like scheduled inheritance or family gifts) into a specific phase. The engine safely deducts this exact amount from the required portfolio withdrawal without triggering any income tax drag gross-up, preserving your capital efficiency.

### Income Shift & Coverage Visualizations
To provide complete transparency over how much of your lifestyle is supported by passive/portfolio assets versus stable external sources, the **Income Shift Visualization** chart includes:
*   **Sequential Allocation Ledger Tracking:** The background engine separates and isolates *used* pension, RRB, other global, and future income streams, stacking them dynamically. Excess (unused) non-portfolio income is correctly funneled into automated reinvestment pipelines rather than double-counting on the active budget stack.
*   **Non-Portfolio Income Total (Rose Dashed Line):** A prominent, high-visibility Rose-colored dashed line (`Non-Portfolio Income Total`) is overlaid on the Multi-Stage Chart, illustrating your total available external income in each simulated year.
*   **Non-Portfolio Budget Coverage Stat:** The interactive hover tooltip card embeds an emerald-themed, real-time metric showing the exact **Non-Portfolio Budget Coverage** as a percentage. It is computed mathematically as:
    $$\text{Non-Portfolio Budget Coverage} = \min\left(100\%, \frac{\text{Used Auxiliary} + \text{Used Global Income}}{\text{Target Budget}} \times 100\%\right)$$
    This provides an instant, offline-ready measure of your safety margin and portfolio independence during transition years.

---

## 9. Strategic Guide: Phase-Based Cash Buffers

In standard retirement planning, retirees are often advised to maintain a static cash buffer (e.g., 2 years of expenses) across their entire retirement horizon. While simple, this static approach creates a severe **cash drag** on the portfolio during the later, more stable years of retirement and fails to address the highly front-loaded nature of risk in early retirement.

HorizonFI introduces **Phase-Based Cash Buffers**, a mathematically rigorous framework allowing early retirees to calibrate their liquid cash reserve (Bucket 1) dynamically across different phases of their retirement life cycle.

### 1. The Strategic Value for Early Retirees

*   **Mitigating Sequence-of-Returns Risk (SRR):** 
    Sequence-of-Returns Risk is highest during the first 5 to 10 years of retirement (the "Go-Go" years), when portfolio drawdowns are large, and any market crash can permanently impair the compounding path of your assets. By setting a high cash buffer multiplier (e.g., 3.0× annual budget) during your initial phases, you establish a resilient liquid shield. If a market downturn occurs, HorizonFI draws down from this pre-funded cash bucket rather than forcing you to sell equities (Bucket 3) at depressed prices.
    
*   **Improving Capital Efficiency in Later Years:**
    As you age and transition into more stable, low-spend phases (e.g., "Slow-Go" or "No-Go" phases) or begin receiving fixed pension/Social Security income, your vulnerability to SRR drops dramatically. Keeping a large cash buffer in these later phases introduces unnecessary opportunity cost, dragging down overall portfolio yield. By stepping down the cash buffer multiplier (e.g., to 1.0× or 0.5×), you dynamically redeploy capital back into yield-producing growth assets, maximizing long-term wealth velocity.

### 2. The Dynamic Reallocation Mathematics

When your simulation transitions from a high-multiplier phase to a low-multiplier phase, HorizonFI does not allow the "discarded" cash buffer to simply vanish. The background simulation worker handles the transition with strict mathematical preservation:

$$\text{Target Cash Buffer (Bucket 1)} = \text{Active Target Budget} \times \text{Phase Cash Buffer Multiplier}$$

1.  **Detecting the Drop:** Upon stepping into a new budget phase, the engine calculates the new `b1Target`. If the existing `bucket1Balance` exceeds this new target, an `excess` amount is declared:
    $$\text{Excess Cash} = \max(0, \text{bucket1Balance} - \text{New b1Target})$$
2.  **Surgical Reinvestment Flow:** This excess cash is immediately reallocated to downstream buckets:
    *   **Fill Bucket 2 Shortfall:** The excess is first funneled into Bucket 2 (Fixed Income) up to its designated target configuration (`b2Target`).
    *   **Overflow to Bucket 3:** Any remaining excess after fully refilling Bucket 2 is automatically swept into Bucket 3 (Growth Assets), where it is immediately exposed to market returns and compound growth.
3.  **Halted Harvesting Guardrails:** During negative market years, the refilling of Bucket 1 and Bucket 2 from Bucket 3 is strictly frozen (halted). The system relies purely on the existing liquid reserves, preserving equity assets from liquidation during a crash.

---
## 10. Granular Asset Return Configurations

In previous versions, HorizonFI relied on a generic, global "Target Annual Return" metric to simulate macroscopic portfolio appreciation. To provide a drastically higher fidelity forecast of wealth velocity and drawdown resilience, the mathematical engine now calculates portfolio returns from the bottom up, utilizing **Granular Asset Return Configurations**.

### 1. The Shift to Asset-Specific Forecasting
The global average return metric has been deprecated and entirely removed from the Scenario Builder. Instead, users must now ensure that every individual asset in their portfolio is assigned accurate, asset-specific parameters:
*   **Expected Capital Growth Rate (%):** The anticipated annual appreciation of the asset's principal value.
*   **Expected Dividend Yield (%):** The anticipated annual cash yield generated by the asset.
*   **Reinvestment Strategy:** A toggle to determine whether the yield is automatically reinvested back into the asset's principal (compounding) or paid out as liquid cash for drawdown consumption.

### 2. Mathematical Impact on Simulations
During the annual simulation stepping process, the Web Worker iterates through every unlocked and active asset in your portfolio. The engine applies the specific growth and yield rates independently to each balance, aggregating the individual outcomes to establish the true, weighted portfolio return for that calendar year. 

*   **Precision:** An aggressive growth ETF (10% growth, 0% yield) behaves mathematically differently under tax drag and drawdown pressure than a stable municipal bond fund (0% growth, 4% yield). 
*   **Requirement:** You must carefully audit your asset list. If an asset is left with default 0% parameters, it will correctly generate zero growth in the simulation, significantly altering your projected outcomes. Ensure all assets reflect your true market expectations.


## 11. Dynamic Time Horizon Chart Filtering

To allow users to visualize specific sections of their multi-decade projections without altering the underlying mathematical simulations, HorizonFI implements **Dynamic Time Horizon Chart Filtering**.

### 1. Separate Calculation and Display Layers
*   **Web Worker Integrity:** The background computation thread (`simulation.worker.ts`) continues to model the full, multi-decade projection (from the current year to the final `targetEndYear` of the active scenario) to guarantee that tax bracket conversions, RMD schedules, and compounding effects remain mathematically continuous and correct.
*   **UI Projection Filter:** The user interface reads the custom `displayStartYear` and `displayEndYear` boundaries from your active scenario, dynamically trimming and rendering the Recharts lines exclusively within your selected slice.

### 2. Default & Boundary Validation Logic
*   **Graceful Defaults:** If display parameters are not customized or are left empty (null/undefined), the system automatically defaults your view's `displayStartYear` to the current calendar year, and your `displayEndYear` to the scenario's `targetEndYear`.
*   **Boundary Enforcement:** When adjusting the timeline filters, the custom state hook enforces rigorous safety checks. The system strictly blocks you from:
    1. Setting a start year that is strictly greater than the end year.
    2. Attempting to set filters that exceed the absolute limits of the calculated simulation array bounds (earliest year through `targetEndYear`).

### 3. Zooming in on Specific Retirement Phases
The Time Horizon filter is especially useful for isolating critical transitional periods in your financial plan without losing full historical simulation context:
*   **The Bridging Gap:** Zoom in on early retirement years to analyze the decumulation rate, taxable account drawdowns, and Roth Conversion Stacking *before* Social Security or corporate pensions kick in.
*   **RMD Influx Analysis:** Narrow the filter to age 73 through 85 to closely examine the impact of Required Minimum Distributions (RMDs) on your marginal tax brackets and net worth velocity.
*   **Resetting to Full Bounds:** You can easily snap back to view the entire multi-decade compounding trajectory at any point by clicking the **Reset to Simulation Bounds** button.





## 7. Advanced Tax Optimization

### 7.1. The "Tax Torpedo" & Bracket Targeting
The **Tax Torpedo** is a colloquial term for the rapid spike in marginal tax rates that occurs when additional ordinary income (such as traditional IRA withdrawals or Roth conversions) pushes previously untaxed Long-Term Capital Gains (LTCG) into a taxable bracket. 
In the US tax code, capital gains sit *on top* of ordinary income. If your ordinary income fills the space up to the 0% LTCG threshold (e.g., $98,900 for Married Filing Jointly in 2026), any additional ordinary income you realize will not only be taxed at your ordinary rate, but it will also push an equivalent amount of capital gains out of the 0% bracket and into the 15% bracket. This effectively creates a marginal tax rate that is significantly higher than your nominal bracket. 

HorizonFI's Bridge Optimization DP engine is specifically programmed to navigate this interaction using a **Liquidation-Prioritized Heuristic**:
1. **Prioritized Liquidity**: The engine first calculates necessary stock liquidations to meet your Guyton-Klinger target or to maximize the 0% LTCG bracket.
2. **Selective Roth Filling**: Once the stock liquidation targets are set, the engine fills any remaining space in your *target ordinary bracket* with Roth conversions, strictly ensuring that these conversions do not inadvertently push the harvested capital gains into the 15% bracket.

### 7.2. Taxable-First Drag Application
When the long-term simulation estimates your annual tax drag (from pensions, Roth conversions, and capital gains), it utilizes a **Taxable-First Drag Application**. Instead of universally penalizing all assets (which would incorrectly reduce the value of your tax-advantaged accounts like Roths), the engine preferentially deducts the tax drag from your "Taxable" brokerage accounts first. If the taxable accounts are fully depleted, the engine falls back to a proportional deduction to maintain computational integrity.

### 7.3. Provisional Income and Railroad Retirement/Social Security
For retirees relying on Railroad Retirement Board (RRB) Tier 1 benefits or Social Security, benefits are not taxed straightaway. Instead, taxation is based on your **Provisional Income**, which is calculated as:
`Modified Adjusted Gross Income (MAGI) + 50% of your RRB Tier 1 / Social Security Benefits`

As your Provisional Income crosses specific statutory base amounts, the percentage of your benefits subject to federal income tax scales from 0% to 50% and ultimately up to 85%. This creates hidden marginal tax spikes where a single dollar of additional income (like a Roth conversion) can cause an additional 50 to 85 cents of your benefits to become taxable. HorizonFI simulates this Provisional Income curve exactly as the IRS calculates it, ensuring our recommendations never inadvertently trigger severe taxation on your retirement benefits.


## 12. Visualizing Stock Liquidation & Dividend Transitions

To give you complete, visual spatial awareness of your wealth transitions, HorizonFI features the **Long-Term Portfolio Projection Chart** (`LongTermPortfolioChart.tsx`), which replaces the generic tax-bucket projection chart.

### 1. Unified Stacking & Role Isolation
Instead of folding all brokerage assets into a single "Taxable" line or broad "Total Net Worth" bucket, the projection chart dynamically splits your portfolio into three intuitive visual layers:
*   **Concentrated Liquidation Target (Stacked Area):** Renders as an amber-shaded stacked area, depicting how much your concentrated equity holdings (e.g., UPRR) contribute to your overall net worth stack.
*   **Dividend Destination Fund (Stacked Area):** Renders as an emerald-green stacked area, allowing you to watch the progressive, tax-sheltered build-up of your safe, dividend-producing portfolio (e.g., SCHD).
*   **Other Assets (Stacked Area):** Automatically packages all remaining assets (all other cash, traditional tax-deferred accounts, and Roth buckets) into a neutral slate-blue stacked area. This ensures that the total height of your visual stack continues to perfectly represent your **Total Net Worth** at every single year index.

### 2. The High-Contrast Absolute Crossover Lines
Because stacked areas are added sequentially, their absolute boundary lines do not intersect when they grow or shrink. To make the exact year of neutralization immediately visible:
*   **High-Contrast Overlay Lines:** The chart overlays two unstacked, thick, prominent lines directly on top of your net worth stack:
    *   A bright red line tracking the **absolute dollar balance** of your Concentrated Stock.
    *   A vibrant emerald-green line tracking the **absolute dollar balance** of your Dividend Destination Fund.
*   **Neutralization Crossover Point:** These two lines form a distinct, classic "X" shape on your screen. The exact intersection of these lines marks the precise calendar year where your concentrated risk is successfully neutralized, and your dividend-generating fund surpasses the concentrated single-stock equity.

### 3. Context-Aware Hover Tooltips
When you hover over any year on the chart, the interactive tooltip expands to present highly detailed transition metrics in real-time, adjusted for your active Valuation Mode:
*   **Liquidation Target and Div Destination balances** are broken down individually alongside your remaining portfolio assets.
*   **Concentrated Shares Sold:** The tooltip dynamically reveals the exact nominal or inflation-adjusted dollar amount of concentrated stock sold during that specific year.
*   **Capital Gains Taxes Paid:** Displays the precise, progressive capital gains tax drag incurred during that year's liquidation step, providing complete, uncompromised planning transparency.


## 13. Bridge Optimization & Actionable Strategy Ledger

To seamlessly bridge the gap between early retirement and traditional retirement milestones (like Social Security and RMDs), HorizonFI employs a Dynamic Programming (DP) engine. These advanced optimization results are rendered exclusively in the **Visualization and Analytics** tab of the **Multi-Stage Modeling** workspace to maintain a clean, non-duplicative user experience.

### 1. Early Action Bonus and Tax Isolation
*   **Mathematical Pull-Forward:** The DP engine explicitly favors pulling Roth conversions and concentrated stock liquidations forward in your timeline. By employing an `earlyActionBonus`, the mathematical utility correctly reflects that paying taxes on a Roth conversion in early retirement is fundamentally advantageous to avoiding a 32% "RMD penalty" at age 75+.
*   **Precision Tax Overlay:** The timeline explicitly isolates standard marginal taxes (calculated using backward-layered 32/24/22/12% progressive margins) from the **Capital Gains Tax Torpedo** (the 15% rate applied to stock liquidations when your combined income breaches the 0% LTCG bounds). 

### 2. Actionable Strategy Ledger UX
The Actionable Strategy Ledger (rendered via `BridgeStrategyTable.tsx` inside the Multi-Stage Modeling view) provides:
*   **High Information Density Layout:** The strategy ledger utilizes extreme row-padding compression and sleek, compact executable controls. This maximizes the number of projection years visible simultaneously in the scrollable view without degrading legible tracking or typographic alignment.
*   **Transparent Tax Telemetry:** The ledger horizontally expands to display the precise, isolated tax impacts of both Roth conversions (`Tax (Roth)`) and Stock Liquidations (`Tax (Stock)`), next to the `Est. Total Tax`. 
*   **One-Click Execution:** Users can review the engine's suggested yearly optimization paths and click "Apply" to instantly patch specific yearly parameters (such as `targetRothConversionAmount`) straight into their active Scenario Budget for real-time visualization and compounding analysis.

### 3. Intuitive Dual-Dimension Tax Stack Chart & KPIs
The Multistage Tax Stack Projection is engineered to be highly intuitive, breaking down complex tax concepts into two distinct visual dimensions:
*   **Income & Brackets View:** Displays how different income types stack up against federal tax brackets. **Ordinary Income** (including Roth conversions) fills the lowest brackets first. **Capital Gains** stack on top of ordinary income. If the total height of the stack crosses the green **0% LTCG Limit** line ($128,900 for MFJ), the portion above that line triggers a 15% long-term capital gains tax.
*   **Annual Tax Drag View:** Illustrates the precise, absolute dollar amounts of tax paid. It uses a stacked bar chart to separate taxes from **Roth Conversions** from taxes on **Stock Liquidations (LTCG)**, with an overlay line displaying the **Effective Marginal Tax Rate** on the right axis.
*   **High-Density Fiscal KPIs:** Displays four crucial cumulative statistics right above the chart:
    1.  **Total Est. Taxes:** Cumulative tax drag expected over the entire bridge period.
    2.  **Peak Marginal Rate:** The highest tax bracket or marginal rate encountered during the timeline.
    3.  **Roth Tax Share:** Cumulative taxes paid to fund Roth conversions.
    4.  **Stock Tax Share:** Cumulative capital gains taxes paid.
*   **Explanatory Tooltips:** Hovering over any year reveals a detailed, plain-English breakdown of that year's total income, planned actions, tax components, and bracket warnings (such as exceeding the 0% LTCG boundary).

### Bridge Strategy Execution Tracking
The actionable strategy ledger outputs optimal yearly recommendations. Users can explicitly apply these recommendations (Stock Liquidation and Roth Conversions) directly into the Long-Term Portfolio Projection, overriding the simulation's automatic baseline heuristics. Once applied, these are explicitly modeled by moving pre-tax values into the Roth bucket, and honoring the requested concentrated stock liquidation amount to smooth tax burdens across the bridge phase.

## 14. Advanced Workflow: Extended Feature Modeling

HorizonFI includes advanced functional capabilities to support complex retirement timelines and alternative asset structures.

### Non-Taxable Gifts & Auxiliary Incomes
Non-taxable gifts and auxiliary income sources (e.g., inheritances, VA disability) are modeled as **Prioritized Inflow Offsets**. When defining a non-taxable gift inside the timeline, the simulation engine automatically deducts this amount from your active Phase Target Budget before drawing down on any tax-advantaged accounts or brokerage assets, protecting your primary capital base from depletion.

### 3-Bucket Phased Budgets
To optimize withdrawal strategies against volatile markets, HorizonFI implements a 3-Bucket phased approach:
1. **Bucket 1 (Cash Buffer):** 1-3 years of living expenses to shield against immediate downturns.
2. **Bucket 2 (Income/Bonds):** 3-7 years of intermediate stability.
3. **Bucket 3 (Growth/Equities):** Long-term capital appreciation.
These buckets seamlessly feed the multi-stage budget phases (e.g., "The Go-Go Years", "The Slow-Go Years", "The No-Go Years") mapped dynamically on your timeline.

### Chart Time Horizon Filtering
As documented in the UX controls, adjusting the visual `displayStartYear` and `displayEndYear` boundaries strictly filters the front-end Recharts overlay. The underlying multi-decade timeline calculations within the Web Worker remain uninterrupted, ensuring all compounding limits, bracket trajectories, and Guyton-Klinger guardrails are perfectly preserved regardless of your visual zoom level.

### Race Start Sequence & Net Worth Tracking
* **Race Start Sequence:** You can establish a definitive "Race Start Year" (e.g., the year you sever employment) which anchors all subsequent calculations and milestones to a clear `t=0` starting line.
* **Net Worth Tracking (Historical Datapoints):** HorizonFI includes a dedicated interface for capturing real-time monthly or annual net worth snapshots. While standard metrics are stored in plaintext to prevent N+1 query charting bottlenecks, all granular asset/liability structures are heavily encrypted via `crypto-js` at rest in the offline IndexedDB ledger.

### Manual Strategic Tax Events in Recharts UI
The Recharts interface supports interactive modeling of manual strategic tax events. To execute a manual action:
1. Navigate to the **Multi-Stage Modeling** view.
2. Scroll to the **Actionable Strategy Ledger**.
3. Review the DP Engine's optimal targets for **Target Roth Conversion** and **Stock Liquidation**.
4. Click the **Apply** button on a specific year's row to instantly patch that event into your active scenario.
5. The Recharts dashboard will immediately update the visual stack, isolating the specific tax drag of the Roth Conversion (e.g., crossing standard 22% bracket) versus the Stock Liquidation (e.g., triggering the 15% LTCG threshold) so you can visually verify the long-term compounding impact of the manual action.

### Required Minimum Distributions (RMDs) & Automated Reinvestment
To maintain absolute compliance with modern US tax legislation, HorizonFI implements full SECURE 2.0 Act RMD actuarial logic:
* **Statutory Birth-Year Cohorts:** The simulation engine automatically computes the user's statutory RMD start age (72, 73, or 75) based on their birth year. It explicitly corrects for the 1959 legislative drafting error, establishing a start age of 73 for those born in 1959.
* **IRS Lifetime Tables (Table II & Table III):** The engine dynamically selects the correct divisor. It defaults to Table III (Uniform Lifetime), but automatically shifts to Table II (Joint Life and Last Survivor Table) if the spouse is the sole beneficiary and is more than 10 years younger than the primary account holder.
* **Automated Excess Reinvestment:** RMDs are calculated based on the aggregate pre-tax balance from the previous year-end. The system satisfies the annual budget deficit first. If the RMD exceeds the deficit, the *Excess RMD* is automatically re-routed and reinvested in the user-designated taxable asset (e.g., Dividend ETF) to compound in subsequent years, modeling the real-world flow of mandatory distributions.
* **RMD Tracker Visualizer:** Displays Lifetime RMDs, Peak Annual RMDs, and cumulative Excess Reinvested sums inside a responsive dashboard, paired with a composed Recharts visualization showing the Base Budget Deficit, Required RMD Line, and Excess Reinvested Stacked Bar. Below the chart, the **Actionable RMD Ledger** details Year, Age, Required Distribution, Budget Used, Excess Reinvested, and Estimated Tax Drag.

### 14.1. RMD Reinvestment Database Schema and Edge Security Rules
To ensure secure and reliable storage of plan configurations, HorizonFI extends its NoSQL schemas and implements robust security rules at the Firestore cloud edge:
*   **Encrypted Local Properties:** The plan's root schema securely holds `primaryBirthYear`, `spouseBirthYear`, `isSpouseSoleBeneficiary`, and `rmdReinvestmentAssetId` within `crypto-js` encrypted payloads, guaranteeing data-at-rest isolation.
*   **Edge Validation Logic:** Firestore rules evaluate write requests via a dedicated `isValidPlanData` rule function. This function strictly validates that `primaryBirthYear` is a valid year integer (between 1900 and 2100) or standard base64 ciphertext, and that `rmdReinvestmentAssetId` is a standard string of limited size.
*   **Denial-of-Wallet Edge Clamping:** Nested list elements (members and scenarios arrays) are size-clamped at the Firestore edge to mitigate malicious document bloat and data-poisoning vectors.
*   **UI Location & Workflow:** The RMD configuration controls (birth year, sole-beneficiary status, and reinvestment asset selector) are dynamically rendered inside the **Active Scenario Sidebar** of the Scenario Builder. The visualizer dashboard is accessible within the **RMD Tracker** tab of the primary analytics workspace.


## Multi-Scenario Budgeting & Sandbox Mode

HorizonFI supports complex multi-scenario planning, allowing you to create different hypothetical futures (e.g., "Baseline", "Boat Refit", "High Travel Year") without impacting your real-world variance tracking.

### Active Tracking Scenario vs. Sandbox Scenarios
*   **Active Tracking Scenario:** Only **one** scenario can be designated as the "Active Tracking" scenario for a given calendar year. When you record real-world "Actual Expenses", HorizonFI compares those expenses strictly against the budget targets of the active scenario to calculate your Budget vs. Actuals variance.
*   **Sandbox Scenarios:** All other scenarios operate in "Sandbox Mode". You can freely adjust their budget targets, add scenario-specific tax events (e.g., hypothetical Roth conversions or asset liquidations), and modify funding allocations without altering your baseline variance reporting.

### Using the Scenario Hub
To manage your scenarios:
1. Click the **Scenario Switcher** dropdown in the top navigation header.
2. Select **Manage Scenarios** to open the **Scenario Hub** drawer.
3. **Create New:** Quickly build a fresh scenario from scratch.
4. **Duplicate (Clone):** Click the "Copy" icon next to an existing scenario to duplicate its configuration. This is the safest way to test hypothetical changes (e.g., cloning "Baseline" to model the tax impact of buying a boat) without destroying your core plan.
5. **Set Active:** Click the "Target" icon on a sandbox scenario to promote it to the "Active Tracking Scenario" for the current year.

*Visual Cues:* The top navigation bar explicitly displays a green "Active Tracking" badge or an amber "Sandbox Mode" badge, so you always know exactly what context you are editing.
