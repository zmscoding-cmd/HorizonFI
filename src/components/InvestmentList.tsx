import React from 'react';
import { AssetModel } from '../lib/db';
import { ShieldAlert, AlertTriangle, Coins, Lock, Landmark, TrendingUp, Edit2, Trash2 } from 'lucide-react';

interface InvestmentListProps {
  assets: AssetModel[];
  onEdit: (asset: AssetModel) => void;
  onDelete: (assetId: string) => void;
}

export function InvestmentList({ assets, onEdit, onDelete }: InvestmentListProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-900/50">
        <Landmark className="mx-auto h-8 w-8 text-zinc-400 mb-3" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">No investments added</h3>
        <p className="text-xs text-zinc-500">Add an investment to model your portfolio drawdown.</p>
      </div>
    );
  }

  const getTypeConfig = (type: AssetModel['assetType']) => {
    switch (type) {
      case 'TAXABLE': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Taxable', icon: <Landmark size={14} /> };
      case 'PRE_TAX': return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Pre-Tax', icon: <AlertTriangle size={14} /> };
      case 'ROTH': return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Roth', icon: <ShieldAlert size={14} /> };
      case 'CASH': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Cash', icon: <Coins size={14} /> };
      default: return { color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', label: 'Other', icon: <Landmark size={14} /> };
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {assets.map((asset) => {
        const config = getTypeConfig(asset.assetType);
        const hasLockout = !!asset.availableDate;
        
        return (
          <div key={asset.id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <div className="pr-16">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-50 leading-tight text-sm break-words">{asset.name}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  {hasLockout && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={`Locked until: ${asset.availableDate}`}>
                      <Lock size={12} />
                      {asset.availableDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col gap-1">
              <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(asset.value)}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1" title="Expected Growth Rate">
                  <TrendingUp size={12} className="text-emerald-500" />
                  Growth: {((asset.expectedGrowthRate ?? 0) * 100).toFixed(1)}%
                </span>
                {((asset.expectedDividendYield ?? 0) > 0) && (
                  <span className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-750 pl-3" title={`Dividend Yield (${asset.dividendReinvestment === 'payout' ? 'Payout' : 'DRIP'})`}>
                    Yield: {((asset.expectedDividendYield ?? 0) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Opaque, high-contrast actions always visible for ease of use on touch screens and dark themes */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <button
                onClick={() => onEdit(asset)}
                className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-h-[30px] min-w-[30px] flex items-center justify-center cursor-pointer focus:outline-none"
                aria-label="Edit investment"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => onDelete(asset.id)}
                className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm min-h-[30px] min-w-[30px] flex items-center justify-center cursor-pointer focus:outline-none"
                aria-label="Delete investment"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
