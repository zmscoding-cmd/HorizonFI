import React, { useState, useRef, useEffect } from 'react';
import { Info, Coins, Landmark } from 'lucide-react';
import { useCurrencyMode, CurrencyMode } from '../contexts/CurrencyModeContext';
import { useTheme } from './ThemeProvider';

export const CurrencyToggle: React.FC = () => {
  const { currencyMode, setCurrencyMode } = useCurrencyMode();
  const { theme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative flex items-center gap-2 sm:gap-3" 
      id="currency-toggle-container"
    >
      {/* Segmented Controller Switch */}
      <div 
        className="flex bg-zinc-100 dark:bg-zinc-900/90 night-watch:bg-red-950/30 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 night-watch:border-red-950/40 shadow-sm"
        role="radiogroup"
        aria-label="Valuation currency mode"
      >
        <button
          type="button"
          onClick={() => setCurrencyMode('CURRENT')}
          role="radio"
          aria-checked={currencyMode === 'CURRENT'}
          className={`relative flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-3.5 sm:px-4 rounded-lg transition-all min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 night-watch:focus-visible:ring-red-700 ${
            currencyMode === 'CURRENT'
              ? 'bg-white dark:bg-zinc-800 night-watch:bg-red-900/80 text-zinc-900 dark:text-zinc-50 night-watch:text-red-100 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 night-watch:text-red-500/60 hover:text-zinc-800 dark:hover:text-zinc-200 night-watch:hover:text-red-400'
          }`}
        >
          <Coins size={15} className={currencyMode === 'CURRENT' ? 'text-blue-500 dark:text-blue-400 night-watch:text-red-300' : ''} />
          <span>Current Dollars</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrencyMode('FUTURE')}
          role="radio"
          aria-checked={currencyMode === 'FUTURE'}
          className={`relative flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-3.5 sm:px-4 rounded-lg transition-all min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 night-watch:focus-visible:ring-red-700 ${
            currencyMode === 'FUTURE'
              ? 'bg-white dark:bg-zinc-800 night-watch:bg-red-900/80 text-zinc-900 dark:text-zinc-50 night-watch:text-red-100 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 night-watch:text-red-500/60 hover:text-zinc-800 dark:hover:text-zinc-200 night-watch:hover:text-red-400'
          }`}
        >
          <Landmark size={15} className={currencyMode === 'FUTURE' ? 'text-blue-500 dark:text-blue-400 night-watch:text-red-300' : ''} />
          <span>Future Dollars</span>
        </button>
      </div>

      {/* Accessible Interactive Info Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`w-[44px] h-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 night-watch:focus-visible:ring-red-700 ${
            showTooltip
              ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-blue-400 night-watch:bg-red-950/50 night-watch:border-red-900 night-watch:text-red-400'
              : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 night-watch:bg-black night-watch:border-red-950 night-watch:text-red-500/60 night-watch:hover:text-red-400'
          }`}
          aria-label="Explain currency mode differences"
          aria-expanded={showTooltip}
        >
          <Info size={18} />
        </button>

        {/* Floating Tooltip Explainer Popover */}
        {showTooltip && (
          <div 
            id="currency-tooltip"
            className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 p-4 rounded-xl bg-white dark:bg-zinc-950 night-watch:bg-black border border-zinc-200 dark:border-zinc-800 night-watch:border-red-900/60 shadow-xl dark:shadow-black/50 z-50 text-left transition-all duration-200 animate-in fade-in slide-in-from-top-1"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 night-watch:text-red-500/70 mb-2.5">
              Valuation Methodology
            </h4>
            
            <div className="space-y-3.5">
              {/* Current Dollars Explanation */}
              <div className={`p-2.5 rounded-lg border transition-colors ${
                currencyMode === 'CURRENT' 
                  ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/15 dark:border-blue-900/30 night-watch:bg-red-950/20 night-watch:border-red-900/30' 
                  : 'bg-transparent border-transparent'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currencyMode === 'CURRENT' ? 'bg-blue-500 night-watch:bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700 night-watch:bg-red-950/60'}`} />
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 night-watch:text-red-200">
                    Current Dollars (Inflation Adjusted)
                  </p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 night-watch:text-red-400/80 leading-relaxed pl-3">
                  Strips out inflation. Shows you what this money can buy based on today's purchasing power.
                </p>
              </div>

              {/* Future Dollars Explanation */}
              <div className={`p-2.5 rounded-lg border transition-colors ${
                currencyMode === 'FUTURE' 
                  ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/15 dark:border-blue-900/30 night-watch:bg-red-950/20 night-watch:border-red-900/30' 
                  : 'bg-transparent border-transparent'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currencyMode === 'FUTURE' ? 'bg-blue-500 night-watch:bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700 night-watch:bg-red-950/60'}`} />
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 night-watch:text-red-200">
                    Future Dollars (Nominal Valuations)
                  </p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 night-watch:text-red-400/80 leading-relaxed pl-3">
                  Nominal value. The actual account balance you will see on your bank screen in that future year, inflated by your assumed inflation rate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
