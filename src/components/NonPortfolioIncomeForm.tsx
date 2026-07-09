import React from "react";
import { Plus, Trash2, Info, Coins, Calendar, Shield, HelpCircle } from "lucide-react";
import { generateUUID } from "../lib/db";

interface NonPortfolioIncomeStream {
  id: string;
  name: string;
  type: "Dividend" | "NonTaxableGift" | "StandardPension" | "RailroadRetirement";
  subType?: "Qualified" | "Ordinary" | "Tier1" | "Tier2";
  monthlyAmount: number;
  startYear?: number;
  startAge?: number;
  endYear?: number;
  endAge?: number;
  inflationAdjusted: boolean;
  colaRate?: number;
  survivorshipOptions?: string;
}

interface NonPortfolioIncomeFormProps {
  plan: any;
  activeScenario: any;
  db: any;
  handleRunSimulation: () => void;
}

export function NonPortfolioIncomeForm({
  plan,
  activeScenario,
  db,
  handleRunSimulation,
}: NonPortfolioIncomeFormProps) {
  const streams = activeScenario.nonPortfolioIncomeStreams || [];

  const updateStreams = async (newStreams: NonPortfolioIncomeStream[]) => {
    const doc = await db.plans.findOne(plan.id).exec();
    const updatedScenarios = plan.scenarios.map((s: any) =>
      s.id === activeScenario.id
        ? { ...s, nonPortfolioIncomeStreams: newStreams }
        : s,
    );
    await doc.patch({
      scenarios: updatedScenarios,
      updatedAt: Date.now(),
    });
    handleRunSimulation();
  };

  const addStream = () => {
    const newStream: NonPortfolioIncomeStream = {
      id: generateUUID(),
      name: "New Income Stream",
      type: "StandardPension",
      monthlyAmount: 2000,
      inflationAdjusted: true,
      startAge: 65,
      endAge: 95,
    };
    updateStreams([...streams, newStream]);
  };

  const deleteStream = (id: string) => {
    updateStreams(streams.filter((s) => s.id !== id));
  };

  const patchStream = (id: string, patches: Partial<NonPortfolioIncomeStream>) => {
    const updated = streams.map((s) => {
      if (s.id !== id) return s;
      const merged = { ...s, ...patches };

      // Clean up fields incompatible with selected type
      if (patches.type) {
        if (patches.type !== "Dividend" && patches.type !== "RailroadRetirement") {
          delete merged.subType;
        } else if (patches.type === "Dividend" && merged.subType !== "Qualified" && merged.subType !== "Ordinary") {
          merged.subType = "Qualified";
        } else if (patches.type === "RailroadRetirement" && merged.subType !== "Tier1" && merged.subType !== "Tier2") {
          merged.subType = "Tier1";
        }

        if (patches.type !== "StandardPension") {
          delete merged.colaRate;
          delete merged.survivorshipOptions;
        }
      }

      // Handle start boundary type toggling/mutual exclusion
      if (patches.startAge !== undefined) delete merged.startYear;
      if (patches.startYear !== undefined) delete merged.startAge;
      if (patches.endAge !== undefined) delete merged.endYear;
      if (patches.endYear !== undefined) delete merged.endAge;

      return merged;
    });
    updateStreams(updated);
  };

  return (
    <div className="space-y-6">
      {/* Current Dollars Mandate Info Banner */}
      <div className="bg-blue-50/70 dark:bg-zinc-950/40 border border-blue-200/50 dark:border-zinc-800/80 rounded-xl p-4 flex gap-3 items-start shadow-sm">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-450 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-blue-900 dark:text-zinc-200 uppercase tracking-wider">
            Current Dollars Mandate
          </h4>
          <p className="text-xs leading-relaxed text-blue-700/90 dark:text-zinc-400">
            <strong>CRITICAL ASSUMPTION:</strong> All income streams must represent{" "}
            <span className="font-semibold text-blue-950 dark:text-zinc-100">
              today's purchasing power (today's constant dollars)
            </span>
            . The simulation engine automatically applies compounding inflation
            rules or your custom Cost of Living Adjustments (COLA) over the
            multi-decade timeline. Do not manually inflate or guess future cash amounts.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center border-b border-zinc-150 dark:border-zinc-800/60 pb-3 min-h-[44px]">
        <div>
          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-zinc-500" />
            Non-Portfolio Income Streams
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure secure, non-portfolio revenue to dynamically offset your target retired budget.
          </p>
        </div>
        <button
          onClick={addStream}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-red-500 dark:hover:bg-red-600 text-white dark:text-zinc-950 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer min-h-[44px]"
          id="btn-add-non-portfolio-income"
        >
          <Plus size={14} /> Add Income Stream
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {streams.map((stream, idx) => {
          const isTriggerByAge = stream.startAge !== undefined || stream.endAge !== undefined;
          return (
            <div
              key={stream.id}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all relative"
            >
              {/* Header block with Name & Delete */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    defaultValue={stream.name}
                    placeholder="e.g. Spouse Pension or Qualified Dividends"
                    onBlur={(e) => {
                      const val = e.target.value.trim() || `Income Stream #${idx + 1}`;
                      if (val !== stream.name) {
                        patchStream(stream.id, { name: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="font-bold text-base text-zinc-900 dark:text-zinc-50 bg-transparent border-b-2 border-transparent focus:border-blue-500 dark:focus:border-red-500 outline-none transition py-1 w-full max-w-md min-h-[44px]"
                  />
                </div>
                <button
                  onClick={() => deleteStream(stream.id)}
                  className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-2.5 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  aria-label="Delete income stream"
                  title="Delete Income Stream"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* 1. Class / Type selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Classification Class
                  </label>
                  <select
                    value={stream.type}
                    onChange={(e) => {
                      patchStream(stream.id, {
                        type: e.target.value as any,
                      });
                    }}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                  >
                    <option value="Dividend">Portfolio Dividends</option>
                    <option value="NonTaxableGift">Non-Taxable Gift Inflow</option>
                    <option value="StandardPension">Standard Pension Plan</option>
                    <option value="RailroadRetirement">Railroad Retirement Board (RRB)</option>
                  </select>
                </div>

                {/* 2. Sub-Type (conditional for Dividends & RRB) */}
                {(stream.type === "Dividend" || stream.type === "RailroadRetirement") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Tax Categorization Class
                    </label>
                    <select
                      value={stream.subType || (stream.type === "Dividend" ? "Qualified" : "Tier1")}
                      onChange={(e) => {
                        patchStream(stream.id, {
                          subType: e.target.value as any,
                        });
                      }}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                    >
                      {stream.type === "Dividend" ? (
                        <>
                          <option value="Qualified">Qualified (Lower Dividend tax rates)</option>
                          <option value="Ordinary">Ordinary (Ordinary income tax rates)</option>
                        </>
                      ) : (
                        <>
                          <option value="Tier1">Tier 1 (Provisional Income Taxation)</option>
                          <option value="Tier2">Tier 2 (Taxed as private pension)</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* 3. Monthly Income amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Monthly Amount ($)
                    </label>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Annual: ${(stream.monthlyAmount * 12).toLocaleString()}/yr
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    defaultValue={stream.monthlyAmount}
                    onBlur={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      if (val !== stream.monthlyAmount) {
                        patchStream(stream.id, { monthlyAmount: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                    placeholder="Monthly Amount"
                  />
                </div>

                {/* 4. Trigger Basis (Age vs Calendar Year) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Timeline Trigger Basis
                  </label>
                  <select
                    value={isTriggerByAge ? "age" : "year"}
                    onChange={(e) => {
                      const yesAge = e.target.value === "age";
                      if (yesAge) {
                        patchStream(stream.id, {
                          startAge: stream.startAge ?? 65,
                          endAge: stream.endAge ?? 95,
                        });
                      } else {
                        const currentYear = new Date().getFullYear();
                        patchStream(stream.id, {
                          startYear: stream.startYear ?? currentYear,
                          endYear: stream.endYear ?? (currentYear + 30),
                        });
                      }
                    }}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                  >
                    <option value="age">Retiree Age Intervals</option>
                    <option value="year">Specific Calendar Years</option>
                  </select>
                </div>

                {/* 5. Start and End Trigger bounds */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                    {isTriggerByAge ? "Active Age Interval" : "Active Calendar Years"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                        Start
                      </span>
                      <input
                        type="number"
                        defaultValue={isTriggerByAge ? (stream.startAge ?? 65) : (stream.startYear ?? new Date().getFullYear())}
                        onBlur={(e) => {
                          const val = Number(e.target.value) || undefined;
                          if (isTriggerByAge) {
                            patchStream(stream.id, { startAge: val });
                          } else {
                            patchStream(stream.id, { startYear: val });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full text-right text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pr-3 pl-12 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                        End
                      </span>
                      <input
                        type="number"
                        defaultValue={isTriggerByAge ? (stream.endAge ?? 95) : (stream.endYear ?? (new Date().getFullYear() + 30))}
                        onBlur={(e) => {
                          const val = Number(e.target.value) || undefined;
                          if (isTriggerByAge) {
                            patchStream(stream.id, { endAge: val });
                          } else {
                            patchStream(stream.id, { endYear: val });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full text-right text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pr-3 pl-12 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Inflation Protection toggle */}
                <div className="space-y-1.5 flex flex-col justify-center min-h-[44px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stream.inflationAdjusted}
                      onChange={(e) => {
                        patchStream(stream.id, { inflationAdjusted: e.target.checked });
                      }}
                      className="rounded border-zinc-300 dark:border-zinc-700 h-4 w-4 text-blue-600 dark:text-red-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Standard Inflation COLA
                    </span>
                  </label>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-tight pl-6">
                    Adjusts this payout in tandem with the primary scenario inflation rate.
                  </p>
                </div>

                {/* 7. Standard Pension Fields (COLA & Survivorship) */}
                {stream.type === "StandardPension" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Custom COLA Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        defaultValue={stream.colaRate ?? 0}
                        onBlur={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (val !== stream.colaRate) {
                            patchStream(stream.id, { colaRate: val });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                        placeholder="e.g. 2.0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Survivorship Options
                      </label>
                      <select
                        value={stream.survivorshipOptions || "Single Life"}
                        onChange={(e) => {
                          patchStream(stream.id, {
                            survivorshipOptions: e.target.value,
                          });
                        }}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 min-h-[44px] text-zinc-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10"
                      >
                        <option value="Single Life">Single Life (0% Survivorship)</option>
                        <option value="50% Joint">Joint Life (50% Survivorship)</option>
                        <option value="75% Joint">Joint Life (75% Survivorship)</option>
                        <option value="100% Joint">Joint Life (100% Survivorship)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {streams.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 text-zinc-500 dark:text-zinc-450 p-6">
            <Coins className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
            <h5 className="font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              No Non-Portfolio Income Stream Configured
            </h5>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1 max-w-sm mx-auto leading-normal">
              Click the button above to define recurring pensions, gifts, railroad retirements, or qualified dividends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
