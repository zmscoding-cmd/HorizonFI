import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Sliders, AlertCircle } from 'lucide-react';
import { useTimeHorizonFilter } from '../hooks/useTimeHorizonFilter';
import { useTheme } from './ThemeProvider';

interface TimeHorizonControlsProps {
  db: any;
  planId: string;
  scenarioId: string;
}

export function TimeHorizonControls({ db, planId, scenarioId }: TimeHorizonControlsProps) {
  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || isNightWatch;

  const {
    displayStartYear,
    displayEndYear,
    absoluteStartYear,
    absoluteEndYear,
    updateTimeHorizon,
    loading
  } = useTimeHorizonFilter(db, planId, scenarioId);

  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-xs font-mono text-zinc-500 animate-pulse">
        Initializing Time Horizon Filters...
      </div>
    );
  }

  const horizonYears = displayEndYear - displayStartYear + 1;

  const handleStartChange = async (newStart: number) => {
    try {
      setError(null);
      await updateTimeHorizon(newStart, displayEndYear);
    } catch (err: any) {
      setError(err.message || 'Invalid boundary selection');
    }
  };

  const handleEndChange = async (newEnd: number) => {
    try {
      setError(null);
      await updateTimeHorizon(displayStartYear, newEnd);
    } catch (err: any) {
      setError(err.message || 'Invalid boundary selection');
    }
  };

  return (
    <div 
      id="time-horizon-controls-panel"
      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm space-y-3 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Header & Dynamic Horizon Label */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800">
            <Sliders className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Simulation Time Horizon
            </h4>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Viewing <span className="text-blue-600 dark:text-blue-400 font-bold">{horizonYears}-Year</span> Horizon ({displayStartYear} – {displayEndYear})
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Bounds Reset */}
        <button
          type="button"
          onClick={async () => {
            try {
              setError(null);
              await updateTimeHorizon(absoluteStartYear, absoluteEndYear);
            } catch (err: any) {
              setError(err.message);
            }
          }}
          disabled={displayStartYear === absoluteStartYear && displayEndYear === absoluteEndYear}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 min-h-[36px]"
        >
          <Calendar className="w-3.5 h-3.5" />
          Reset to Simulation Bounds
        </button>
      </div>

      {/* Control Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Year Control */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Display Start Year
          </label>
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-11">
            <button
              type="button"
              id="start-year-decrement"
              onClick={() => handleStartChange(displayStartYear - 1)}
              disabled={displayStartYear <= absoluteStartYear}
              className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">
              {displayStartYear}
            </div>
            <button
              type="button"
              id="start-year-increment"
              onClick={() => handleStartChange(displayStartYear + 1)}
              disabled={displayStartYear >= displayEndYear}
              className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* End Year Control */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Display End Year
          </label>
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-11">
            <button
              type="button"
              id="end-year-decrement"
              onClick={() => handleEndChange(displayEndYear - 1)}
              disabled={displayEndYear <= displayStartYear}
              className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">
              {displayEndYear}
            </div>
            <button
              type="button"
              id="end-year-increment"
              onClick={() => handleEndChange(displayEndYear + 1)}
              disabled={displayEndYear >= absoluteEndYear}
              className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {error && (
        <div 
          id="horizon-error-alert"
          className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Invalid Selection:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
}
