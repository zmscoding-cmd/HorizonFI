import React, { useState } from 'react';
import { AssetModel, generateUUID } from '../lib/db';
import { ShieldAlert, AlertTriangle, Coins, Lock, Info, Landmark, CheckCircle } from 'lucide-react';

interface InvestmentFormProps {
  initialAsset?: AssetModel | null;
  onSave: (asset: AssetModel) => void;
  onCancel: () => void;
}

export function InvestmentForm({ initialAsset, onSave, onCancel }: InvestmentFormProps) {
  const [name, setName] = useState(initialAsset?.name || '');
  const [value, setValue] = useState(initialAsset?.value?.toString() || '0');
  const [assetType, setAssetType] = useState<AssetModel['assetType']>(initialAsset?.assetType || 'TAXABLE');
  const [expectedGrowthRate, setExpectedGrowthRate] = useState(((initialAsset?.expectedGrowthRate ?? 0.05) * 100).toString());
  const [expectedDividendYield, setExpectedDividendYield] = useState(((initialAsset?.expectedDividendYield ?? 0.02) * 100).toString());
  const [availableDate, setAvailableDate] = useState(initialAsset?.availableDate || '');
  const [dividendReinvestment, setDividendReinvestment] = useState(initialAsset?.dividendReinvestment || 'reinvest');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const asset: AssetModel = {
      id: initialAsset?.id || generateUUID(),
      name,
      value: parseFloat(value) || 0,
      assetType,
      expectedGrowthRate: parseFloat(expectedGrowthRate) / 100 || 0,
      expectedDividendYield: parseFloat(expectedDividendYield) / 100 || 0,
      availableDate: availableDate.trim() ? availableDate : undefined,
      dividendReinvestment
    };

    onSave(asset);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {initialAsset ? 'Edit Investment' : 'Add Investment'}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name & Value */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Investment Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Vanguard Brokerage, 401(k), etc."
            className="w-full min-h-[44px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Current Balance ($)</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full min-h-[44px] text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
          />
        </div>

        {/* Asset Type Radio Group */}
        <div className="sm:col-span-2 space-y-2 pt-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Asset Tax Classification</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { type: 'TAXABLE', label: 'Taxable', icon: <Landmark size={16} /> },
              { type: 'PRE_TAX', label: 'Pre-Tax', icon: <AlertTriangle size={16} /> },
              { type: 'ROTH', label: 'Roth', icon: <ShieldAlert size={16} /> },
              { type: 'CASH', label: 'Cash', icon: <Coins size={16} /> }
            ].map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setAssetType(option.type as AssetModel['assetType'])}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border min-h-[60px] transition-all ${
                  assetType === option.type
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="mb-1">{option.icon}</div>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Helper Text */}
        <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 flex items-start gap-3">
          <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            {assetType === 'TAXABLE' && "Taxable brokerage accounts are subject to capital gains tax upon withdrawal. Dividends are taxed annually."}
            {assetType === 'PRE_TAX' && "Pre-tax accounts (Traditional IRA, 401k) will incur ordinary income tax upon withdrawal. Required Minimum Distributions (RMDs) apply."}
            {assetType === 'ROTH' && "Roth accounts are funded with after-tax dollars. Qualified withdrawals and growth are entirely tax-free."}
            {assetType === 'CASH' && "Cash or highly liquid equivalents. No tax drag on withdrawals, but highly exposed to inflation."}
          </p>
        </div>

        {/* Growth & Yield */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Expected Growth (%)</label>
          <input
            type="number"
            step="0.01"
            value={expectedGrowthRate}
            onChange={(e) => setExpectedGrowthRate(e.target.value)}
            className="w-full min-h-[44px] text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Expected Yield (%)</label>
          <input
            type="number"
            step="0.01"
            value={expectedDividendYield}
            onChange={(e) => setExpectedDividendYield(e.target.value)}
            className="w-full min-h-[44px] text-right bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
          />
        </div>
        
        {/* Dividend Reinvestment */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Yield Strategy</label>
          <select
            value={dividendReinvestment}
            onChange={(e) => setDividendReinvestment(e.target.value)}
            className="w-full min-h-[44px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="reinvest">Reinvest (DRIP)</option>
            <option value="payout">Payout (Cash Flow to Cash Bucket)</option>
          </select>
        </div>

        {/* Availability Lockout */}
        <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Lock size={14} />
            Availability Lockout (Optional)
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">
            Enter a calendar year (e.g. <code>2035</code>) or an age trigger (e.g. <code>age:59.5</code>) when this asset becomes available for drawdown without penalty. Leave blank if fully liquid now.
          </p>
          <input
            type="text"
            value={availableDate}
            onChange={(e) => setAvailableDate(e.target.value)}
            placeholder="e.g. age:59.5 or 2030"
            className="w-full min-h-[44px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] px-5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-[44px] px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <CheckCircle size={16} />
          {initialAsset ? 'Update' : 'Add'} Investment
        </button>
      </div>
    </form>
  );
}
