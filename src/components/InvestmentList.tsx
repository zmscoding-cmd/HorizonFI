import React from 'react';
import { AssetModel } from '../lib/db';
import { ShieldAlert, AlertTriangle, Coins, Lock, Landmark, TrendingUp, Edit2, Trash2, Plus } from 'lucide-react';

interface InvestmentListProps {
  assets: AssetModel[];
  onEdit: (asset: AssetModel) => void;
  onDelete: (assetId: string) => void;
  onAdd?: (type: AssetModel['assetType']) => void;
}

const ASSET_TYPES: AssetModel['assetType'][] = ['PRE_TAX', 'TAXABLE', 'ROTH', 'CASH'];

export function InvestmentList({ assets, onEdit, onDelete, onAdd }: InvestmentListProps) {
  const getTypeConfig = (type: AssetModel['assetType']) => {
    switch (type) {
      case 'TAXABLE': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Taxable', icon: <Landmark size={11} /> };
      case 'PRE_TAX': return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Pre-Tax', icon: <AlertTriangle size={11} /> };
      case 'ROTH': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Roth', icon: <ShieldAlert size={11} /> };
      case 'CASH': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Cash', icon: <Coins size={11} /> };
      default: return { color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', label: 'Other', icon: <Landmark size={11} /> };
    }
  };

  return (
    <div id="investment-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
      {ASSET_TYPES.map((type) => {
        const config = getTypeConfig(type);
        const groupAssets = (assets || []).filter((a) => a.assetType === type);
        const groupTotal = groupAssets.reduce((sum, a) => sum + (a.value || 0), 0);

        return (
          <div 
            key={type}
            className="flex flex-col bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 shadow-sm"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-zinc-200/60 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                  ({groupAssets.length})
                </span>
              </div>
              
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(groupTotal)}
              </div>
            </div>

            {/* Assets List */}
            <div className="flex-1 space-y-3 mb-4">
              {groupAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-3 text-center border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-xl bg-white/40 dark:bg-zinc-900/10 min-h-[100px]">
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium italic">No {config.label.toLowerCase()} assets</p>
                </div>
              ) : (
                groupAssets.map((asset) => {
                  const hasLockout = !!asset.availableDate;
                  return (
                    <div 
                      key={asset.id}
                      id={`investment-card-${asset.id}`}
                      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all flex flex-col gap-2.5"
                    >
                      {/* Asset Header: Name & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 id={`investment-title-${asset.id}`} className="font-bold text-zinc-800 dark:text-zinc-100 text-xs truncate" title={asset.name}>
                            {asset.name}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {hasLockout && (
                              <span className="inline-flex items-center gap-0.5 text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={`Locked until: ${asset.availableDate}`}>
                                <Lock size={9} /> Locked
                              </span>
                            )}
                            {asset.isLiquidationTarget && (
                              <span id={`badge-liquidation-target-${asset.id}`} className="inline-flex items-center gap-0.5 text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title="Primary Liquidation Target for drawdown">
                                Target
                              </span>
                            )}
                            {asset.isDividendDestination && (
                              <span id={`badge-dividend-destination-${asset.id}`} className="inline-flex items-center gap-0.5 text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Dividend Destination Fund for reinvestment">
                                Div
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions overlay: Edit / Delete with full touch compliance */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            id={`btn-edit-investment-${asset.id}`}
                            onClick={() => onEdit(asset)}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-none"
                            aria-label="Edit investment"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            id={`btn-delete-investment-${asset.id}`}
                            onClick={() => onDelete(asset.id)}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-none"
                            aria-label="Delete investment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Asset Details Line: Yield, Growth, Dollar Value */}
                      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-2.5 mt-1 min-w-0">
                        {/* Yield and Growth (Yield comes before growth) */}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate shrink-0">
                          <span className="flex items-center gap-0.5" title="Dividend Yield">
                            Y: {((asset.expectedDividendYield ?? 0) * 100).toFixed(1)}%
                          </span>
                          
                          <span className="h-2 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                          
                          <span className="flex items-center gap-0.5" title="Expected Growth Rate">
                            <TrendingUp size={10} className="text-emerald-500 shrink-0" />
                            {((asset.expectedGrowthRate ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Dollar amount on the right-most, right aligned */}
                        <div id={`investment-value-${asset.id}`} className="text-xs font-bold text-zinc-900 dark:text-white font-mono text-right shrink-0">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(asset.value)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Column-specific Add Button (tile) */}
            {onAdd && (
              <button
                type="button"
                onClick={() => onAdd(type)}
                className="w-full text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-1.5 py-3 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-800 rounded-xl hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-pointer transition-all min-h-[44px]"
              >
                <Plus size={14} /> Add {config.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
