import React from 'react';
import { AssetModel } from '../lib/db';
import { ShieldAlert, AlertTriangle, Coins, Lock, Landmark, TrendingUp, Edit2, Trash2, Target, Download } from 'lucide-react';

interface InvestmentListProps {
  assets: AssetModel[];
  onEdit: (asset: AssetModel) => void;
  onDelete: (assetId: string) => void;
}

export function InvestmentList({ assets, onEdit, onDelete }: InvestmentListProps) {
  if (!assets || assets.length === 0) {
    return (
      <div id="no-investments-placeholder" className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center bg-zinc-50 dark:bg-zinc-900/50">
        <Landmark className="mx-auto h-6 w-6 text-zinc-400 mb-2" />
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">No investments added</h3>
        <p className="text-[11px] text-zinc-500">Add an investment to model your portfolio drawdown.</p>
      </div>
    );
  }

  const getTypeConfig = (type: AssetModel['assetType']) => {
    switch (type) {
      case 'TAXABLE': return { color: 'bg-purple-150 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Taxable', icon: <Landmark size={11} /> };
      case 'PRE_TAX': return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Pre-Tax', icon: <AlertTriangle size={11} /> };
      case 'ROTH': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Roth', icon: <ShieldAlert size={11} /> };
      case 'CASH': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Cash', icon: <Coins size={11} /> };
      default: return { color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', label: 'Other', icon: <Landmark size={11} /> };
    }
  };

  return (
    <div id="investment-grid" className="grid grid-cols-1 gap-2">
      {assets.map((asset) => {
        const config = getTypeConfig(asset.assetType);
        const hasLockout = !!asset.availableDate;
        
        return (
          <div 
            id={`investment-card-${asset.id}`} 
            key={asset.id} 
            className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 shadow-sm hover:shadow transition-shadow flex items-center justify-between gap-2"
          >
            {/* Left/Middle Content */}
            <div className="flex-1 min-w-0 pr-14 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate">
                <h4 id={`investment-title-${asset.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 text-xs truncate max-w-[120px]">
                  {asset.name}
                </h4>
                
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-0.5 text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  {hasLockout && (
                    <span className="inline-flex items-center gap-0.5 text-[8.5px] uppercase font-bold tracking-wider px-1 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={`Locked until: ${asset.availableDate}`}>
                      <Lock size={9} />
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
              
              <div className="flex items-center gap-3 shrink-0">
                <div id={`investment-value-${asset.id}`} className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(asset.value)}
                </div>
                
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-0.5" title="Expected Growth Rate">
                    <TrendingUp size={10} className="text-emerald-500 shrink-0" />
                    {((asset.expectedGrowthRate ?? 0) * 100).toFixed(1)}%
                  </span>
                  {((asset.expectedDividendYield ?? 0) > 0) && (
                    <span className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-1.5" title={`Dividend Yield`}>
                       Y: {((asset.expectedDividendYield ?? 0) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions aligned to the right center */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                id={`btn-edit-investment-${asset.id}`}
                onClick={() => onEdit(asset)}
                className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-h-[26px] min-w-[26px] flex items-center justify-center cursor-pointer focus:outline-none"
                aria-label="Edit investment"
              >
                <Edit2 size={11} />
              </button>
              <button
                id={`btn-delete-investment-${asset.id}`}
                onClick={() => onDelete(asset.id)}
                className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-h-[26px] min-w-[26px] flex items-center justify-center cursor-pointer focus:outline-none"
                aria-label="Delete investment"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
