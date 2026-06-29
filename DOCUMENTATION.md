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
Specify your desired **Cash Buffer Duration** inside the active sidebar (default is *2 to 3 years*).
*   **How it protects you:** Early retirement is exposed to severe **Sequence-of-Returns Risk** (the risk of a market crash occurring in the first few years of retirement). By keeping 24 to 36 months of living expenses in cash or cash-equivalents, HorizonFI automatically bypasses selling equities at depressed prices during market downturns, drawing down the cash bucket instead.

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

### 4. Tax & Transition Engine
HorizonFI computes multi-decade liabilities on your behalf safely behind the scenes:

*   **2026 TCJA Sunset Reversion:** The engine factors in the statutory expiration of the 2017 Tax Cuts and Jobs Act on December 31, 2025. In calendar year 2026, progressive tax rates automatically return to pre-sunset brackets (indexing ordinary brackets up to 39.6% and halving the standard deduction).
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

Under the United States federal tax code (projected for the Post-TCJA 2026 sunset era), different types of income are taxed under distinct bracket structures. Crucially, these structures are not independent; they stack sequentially. The rate applied to your last dollar of capital gains depends entirely on the volume of ordinary income underneath it.

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
The engine then applies the progressive post-TCJA 2026 ordinary income tax brackets (starting at 10%, 12%, 22%, and 24%) directly to this taxable ordinary base:
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


