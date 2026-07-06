import React, { useState, useRef, useEffect } from 'react';
import { useScenarioManager } from '../contexts/ScenarioContext';
import { ChevronDown, AlertCircle, CheckCircle, Settings2 } from 'lucide-react';
import ScenarioHub from './ScenarioHub';

export default function ScenarioSwitcher() {
  const { 
    scenarios, 
    currentlyViewingScenarioId, 
    setCurrentlyViewingScenarioId, 
    activeTrackingScenarioId 
  } = useScenarioManager();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentlyViewingScenarioId || scenarios.length === 0) return null;

  const currentScenario = scenarios.find(s => s.id === currentlyViewingScenarioId);
  const isActiveTracking = currentlyViewingScenarioId === activeTrackingScenarioId;

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-4 py-2 min-h-[44px] min-w-[44px] rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            isActiveTracking 
              ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20'
              : 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              {isActiveTracking ? 'Active Tracking' : 'Sandbox Mode'}
            </span>
            <span className="text-sm font-medium truncate max-w-[150px]">
              {currentScenario?.name || 'Loading...'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                Select Scenario
              </div>
              {scenarios.map(scenario => {
                const isTracking = scenario.id === activeTrackingScenarioId;
                const isSelected = scenario.id === currentlyViewingScenarioId;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setCurrentlyViewingScenarioId(scenario.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 min-h-[44px] text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                    }`}
                    role="menuitem"
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        {scenario.name}
                      </span>
                      {isTracking && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center mt-0.5">
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </button>
                );
              })}
              <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsHubOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 min-h-[44px] text-sm flex items-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Manage Scenarios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ScenarioHub isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />
    </>
  );
}
