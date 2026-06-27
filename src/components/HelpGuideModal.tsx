import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Anchor, Terminal, Cpu, Award, Milestone, HelpCircle, ChevronRight, Copy, Check } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  const [activeTab, setActiveTab] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const sections = [
    {
      id: 'intro',
      title: '1. Welcome & Introduction',
      shortTitle: 'Introduction',
      icon: Anchor,
      content: (
        <div className="space-y-4">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
            Welcome to <strong className="text-blue-600 dark:text-blue-400">HorizonFI</strong>, the mathematically rigorous, offline-first progressive web application (PWA) designed exclusively to support the <span className="font-semibold text-zinc-900 dark:text-zinc-100">Circumnavigation Bridge Strategy</span>.
          </p>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold font-mono text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Maritime Optimization Mandate
            </h4>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
              Built for the exact needs of a liveaboard couple executing a multi-decade Financial Independence, Retire Early (FIRE) transition, HorizonFI serves as your navigator through shifting tax codes, market volatility, and dynamic lifestyle phases. Because maritime environments lack reliable internet, this simulator is built <strong>offline-first</strong>—meaning you can model decades of financial trajectories, run complex Monte Carlo algorithms, and adjust your withdrawal guardrails from the middle of the Pacific Ocean with zero latency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold font-mono block mb-1">LOCAL COALESCENCE</span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">Runs 100% locally on device database records, isolated from latency spikes or remote API blackouts.</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold font-mono block mb-1">DELTA SYNC PIPELINE</span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">Delta synchronizes locally queued records securely back to Google Cloud Firestore when cellular, Wi-Fi or Starlink connects.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: '2. Getting Started (Plan Setup)',
      shortTitle: 'Plan Setup',
      icon: Milestone,
      content: (
        <div className="space-y-4">
          <p className="text-zinc-750 dark:text-zinc-300 leading-relaxed text-sm">
            To begin modeling your financial trajectory, follow these structural steps to initialize your Baseline Plan:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5">1</div>
              <div className="space-y-1">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">Initialize the Baseline Plan</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Click "New Plan" from the main dashboard to establish your foundational household scenario container.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5">2</div>
              <div className="space-y-1">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">Establish Starting Portfolios</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Input current live asset allocation nodes across your primary accounts:</p>
                <ul className="list-disc pl-4 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mt-1">
                  <li><strong>Taxable Brokerage:</strong> ~$2.5M baseline allocation</li>
                  <li><strong>Tax-Advantaged (IRAs/401ks):</strong> ~$2.4M tax-deferred baseline allocation</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5">3</div>
              <div className="space-y-1">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">Configure Baseline Budget</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Set starting baseline expenses (which are adjusted automatically by compounding inflation schedules) and persistent passive income nodes.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5">4</div>
              <div className="space-y-1">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">Set the Liquid Savings Buffer</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Define the duration (e.g., 2–3 years) of cash/cash-equivalent pools. This protects your portfolio from destructive sequence-of-returns risks during severe equity drawdowns by providing a non-volatile buffer.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: '3. Feature Guide (How to Use)',
      shortTitle: 'Feature Guide',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-zinc-750 dark:text-zinc-300 leading-relaxed text-sm">
            HorizonFI manages complex, shifting life events through an intuitive and dynamic financial modeling interface.
          </p>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Dynamic Milestones
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed pl-3.5">
                Add absolute temporal landmarks (such as a major vessel boat refit in <strong>2030</strong>) or relative age triggers (e.g., age <strong>59.5</strong> IRA access, age <strong>65</strong> Medicare transition, or age <strong>67</strong> RRB stacking). The engine automatically shifts tax structures and spending obligations in response at the exact month of execution.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Multi-Scenario Mode ('What-If' Analytics)
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed pl-3.5">
                Clone baseline metrics to run aggressive test simulations side-by-side. Isolate compounding variables like extreme hyper-inflation events, physical vessel upgrades, or sustained market stress-tests without altering core, validated structures.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Auxiliary Income (Tax-Free)
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed pl-3.5">
                Configure tax-free capital inflows—such as annual family gifts, inheritances, or tax-free windfalls. These bypass ordinary and capital gains engines completely and act as a primary offset, directly reducing the annual stage target budget before other portfolios are drawn down. Timeframes can be bound by target calendar years or retiree ages.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> Wealth Velocity Analytics
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed pl-3.5">
                Analyze your plan’s long-term compounding speed and phase transitions. Wealth Velocity measures net asset growth against withdrawal drag and inflation offsets, auto-categorizing your years into <strong>Accumulation</strong>, <strong>Velocity Point</strong> (stable 0–5% safe drawdown), or <strong>Distribution/Drawdown</strong> phases.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Dashboard Visualizations
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed pl-3.5">
                The Recharts-powered interactive graphs lay out cumulative post-tax values and absolute depletion trajectory curves over 40+ years, detailing exactly how sequence-of-returns, tax brackets, and regulatory sunsets interact.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'calculations',
      title: '4. The Calculation Engine Demystified',
      shortTitle: 'Math Engine',
      icon: Cpu,
      content: (
        <div className="space-y-5">
          <p className="text-zinc-750 dark:text-zinc-300 leading-relaxed text-sm">
            Our background computation thread offloads iterative multidecade data sweeps to ensure 60fps local rendering. Below is how the logic executes:
          </p>

          <div className="space-y-4">
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Guyton-Klinger Guardrails
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">Capital Preservation Rule:</span>
                  <p className="text-zinc-500 dark:text-zinc-450 leading-relaxed mt-0.5">
                    If modern drawdowns push the withdrawal rate 20% higher than the baseline rate, annual spending is immediately sliced by 10%. Inflation modifications to the budget strictly cease during down years to prevent selling equities at a loss.
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">Prosperity Rule:</span>
                  <p className="text-zinc-500 dark:text-zinc-455 leading-relaxed mt-0.5">
                    If sustained market appreciation pulls the current withdrawal rate 20% below target thresholds, annual withdrawals comfortably increase by 10% to prevent excess drag.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                 Roth Conversion Stacking & the Tax Bomb
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                Before liquidating assets, the engine optimizes taxable ordinary income by harvesting conversions to the maximum limit of the 0% Federal Long-Term Capital Gains (LTCG) bracket (<strong>$98,900</strong> for IRS MFJ in 2026). 
              </p>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                Pre-tax Traditional accounts are continuously balanced against <strong>2026 TCJA sunset re-indexing</strong> and <strong>Railroad Retirement Tier 1 & 2 provisional income</strong> stacking boundaries, calculating the dynamic <strong>"Tax Bomb"</strong> (Deferred Tax Liability) as a contra-asset index.
              </p>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                 Multi-Bucket Tax Gross-Up Engine
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                To guarantee your retirement expenditures are fully funded, the simulation engine employs a <strong>multi-variable numerical convergence loop</strong> to calculate pre-tax "gross" withdrawals. 
              </p>
              <ul className="list-disc pl-4 text-xs text-zinc-550 dark:text-zinc-400 space-y-1 mt-1">
                <li><strong>Proportional Tax Allocation:</strong> Tax drag is automatically computed and distributed back into active, tax-bearing funding buckets (Pre-tax Traditional, Taxable Brokerage, and Qualified Dividends) based on their relative targets.</li>
                <li><strong>Exclusion of Tax-Free Sources:</strong> Roth IRA withdrawals and Non-Taxable Gifts strictly bypass our progressive tax calculations, ensuring $0 tax liability on those portions.</li>
                <li><strong>Numerical Convergence:</strong> The engine iterates (up to 25 loops or &lt; $0.01 tolerance) to offset capital gains and ordinary income tax drag, meaning your net post-tax distribution perfectly covers your budget without over-withdrawing.</li>
              </ul>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Mathematical Formulations
              </h4>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Absolute Net Worth Trajectory:</p>
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-lg flex items-center justify-between font-mono text-[11px] text-zinc-800 dark:text-blue-300 select-all border border-zinc-250/20 dark:border-blue-900/10">
                <span>NetWorth_t = Σ(Asset_t) - Σ(Liability_t) - ContraAsset_t</span>
                <button 
                  onClick={() => handleCopy('NetWorth_t = \\sum(Asset_t) - \\sum(Liability_t) - ContraAsset_t', 'nw')}
                  className="text-zinc-400 hover:text-zinc-650 dark:hover:text-blue-400 cursor-pointer p-1"
                  title="Copy Formula"
                >
                  {copiedText === 'nw' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pt-2">UPRR Divestiture Target Balance (SCHD Conversion Stage):</p>
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-lg flex items-center justify-between font-mono text-[11px] text-zinc-800 dark:text-blue-300 select-all border border-zinc-250/20 dark:border-blue-900/10">
                <span>CapGainsDrag_t = DivestAmount_t * (CostBasisDelta / AssetPrice) * CapGainsRate_t</span>
                <button 
                  onClick={() => handleCopy('CapGainsDrag_t = DivestAmount_t * (CostBasisDelta / AssetPrice) * CapGainsRate_t', 'drag')}
                  className="text-zinc-400 hover:text-zinc-650 dark:hover:text-blue-400 cursor-pointer p-1"
                  title="Copy Formula"
                >
                  {copiedText === 'drag' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pt-2">Wealth Velocity Growth Delta:</p>
              <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-lg flex items-center justify-between font-mono text-[11px] text-zinc-800 dark:text-blue-300 select-all border border-zinc-250/20 dark:border-blue-900/10">
                <span>GrowthDelta = (Balance * GrowthRate) - (Balance * WithdrawalRate)</span>
                <button 
                  onClick={() => handleCopy('GrowthDelta = (Balance * GrowthRate) - (Balance * WithdrawalRate)', 'velocity')}
                  className="text-zinc-400 hover:text-zinc-650 dark:hover:text-blue-400 cursor-pointer p-1"
                  title="Copy Formula"
                >
                  {copiedText === 'velocity' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tech',
      title: '5. Technology Stack Overview',
      shortTitle: 'Tech Stack',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <p className="text-zinc-755 dark:text-zinc-300 leading-relaxed text-sm">
            HorizonFI combines premium browser performance modules to safeguard cryptographic state offline:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20">
              <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400 block uppercase">RxDB Local Storage</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Executes locally using a custom Pouch/IndexedDB layer utilizing 100% Client-Side <strong>AES-256 field-level encryption</strong> securely keyed by Google Firebase auth vectors.
              </p>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20">
              <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400 block uppercase">Durable Integrities API</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Relational planned budget records enforce relational structures online and offline. Custom `preRemove` middleware cascades through references to prevent broken links.
              </p>
            </div>

            <div className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 col-span-1 md:col-span-2">
              <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400 block uppercase">Isolated Worker Simulation</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Multi-path Monte Carlo trajectories running decades are computed asynchronously in a background <strong>Web Worker thread</strong> (<code className="font-mono bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded text-[11px]">simulation.worker.ts</code>). Results are capped at 600 indices using memory-decimation pipelines to avoid out-of-memory browser events.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.map(sec => {
      // Very simple filter to see if this matches
      const isMatch = sec.title.toLowerCase().includes(query) || 
                      sec.shortTitle.toLowerCase().includes(query) ||
                      JSON.stringify(sec.content).toLowerCase().includes(query);
      return { ...sec, isMatch };
    }).filter(sec => sec.isMatch);
  }, [searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Overlay */}
      <div 
        id="help-guide-overlay"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
      />

      {/* Main Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col relative z-10 overflow-hidden transform scale-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-lg">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HorizonFI Technical Guide
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Offline PWA reference for Circumnavigation Bridge Strategy
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900/20 flex items-center gap-2">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input 
            type="text"
            placeholder="Search instructions, formulas, stack specifics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none focus:ring-0 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 min-h-[36px]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 py-1 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Sidebar + Scrollable Content */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-white dark:bg-zinc-950/10">
          
          {/* Left Navigation bar (Desktop) */}
          <nav className="w-56 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto shrink-0 hidden md:block bg-zinc-50/50 dark:bg-zinc-900/10 p-3 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider block px-2.5 py-1.5 uppercase">
              DOCUMENT SECTIONS
            </span>
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition duration-150 cursor-pointer group ${
                    isActive 
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/10' 
                      : 'text-zinc-600 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={16} className={`shrink-0 transition-all duration-150 ${isActive ? 'rotate-3 scale-110' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`} />
                  <span className="truncate">{sec.shortTitle}</span>
                </button>
              );
            })}
            {filteredSections.length === 0 && (
              <p className="text-zinc-400 dark:text-zinc-500 text-xs px-3 py-4 text-center italic">No results found</p>
            )}
          </nav>

          {/* Master Content Panes */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* Mobile Adaptive Top bar navigation */}
            <div className="block md:hidden pb-4 border-b border-zinc-150 dark:border-zinc-800">
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block mb-1.5 uppercase font-mono tracking-wider">
                Active Section Select
              </label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filteredSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Rendered Search results if Search is active, otherwise standard active Tab */}
            {searchQuery.trim() ? (
              <div className="space-y-8 animate-in fade-in duration-200">
                {filteredSections.map((sec) => (
                  <div key={sec.id} className="space-y-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-6 last:border-0 last:pb-0">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-150 flex items-center gap-2">
                      <sec.icon size={18} className="text-blue-500" />
                      {sec.title}
                    </h3>
                    <div className="pl-1">
                      {sec.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                {sections.map((sec) => {
                  if (sec.id !== activeTab) return null;
                  return (
                    <div key={sec.id} className="space-y-4">
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
                        <sec.icon size={20} className="text-blue-500" />
                        {sec.title}
                      </h3>
                      <div className="pt-1">
                        {sec.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50 dark:bg-zinc-900/30 flex items-center justify-between text-xs font-mono text-zinc-400 dark:text-zinc-500 select-none">
          <span>COMPLIANCE STATUS: NIGHT WATCH SECURE</span>
          <span>OFFLINE LOCAL REPLICA</span>
        </div>
      </div>
    </div>
  );
}
