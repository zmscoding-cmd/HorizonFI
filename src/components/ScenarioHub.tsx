import React, { useState } from 'react';
import { useScenarioManager } from '../contexts/ScenarioContext';
import { Plus, Copy, Trash2, X, AlertTriangle, Settings2, Target } from 'lucide-react';

interface ScenarioHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScenarioHub({ isOpen, onClose }: ScenarioHubProps) {
  const { 
    scenarios, 
    currentlyViewingScenarioId, 
    setCurrentlyViewingScenarioId,
    activeTrackingScenarioId,
    createScenario,
    duplicateScenario,
    setActiveTrackingScenario,
    deleteScenario
  } = useScenarioManager();

  const [isCreating, setIsCreating] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newScenarioName.trim()) return;
    const id = await createScenario(newScenarioName);
    setCurrentlyViewingScenarioId(id);
    setNewScenarioName('');
    setIsCreating(false);
  };

  const handleDuplicate = async (id: string, name: string) => {
    const newId = await duplicateScenario(id, `${name} (Copy)`);
    setCurrentlyViewingScenarioId(newId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-blue-500" />
              Scenario Hub
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage hypothetical budgets and tracking targets.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Active Tracking Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="ml-3 text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold block mb-1">Sandbox Architecture</span>
              Modifying scenarios without the "Active" badge will not affect your real-world variance tracking. Use them to safely simulate different futures.
            </div>
          </div>

          {/* Scenario List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Your Scenarios</h3>
            
            {scenarios.map(scenario => {
              const isTracking = scenario.id === activeTrackingScenarioId;
              const isViewing = scenario.id === currentlyViewingScenarioId;

              return (
                <div 
                  key={scenario.id}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isViewing 
                      ? 'border-blue-500 ring-1 ring-blue-500 bg-white dark:bg-gray-800 shadow-sm' 
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setCurrentlyViewingScenarioId(scenario.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{scenario.name}</h4>
                        {scenario.isBaseline && (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            Baseline
                          </span>
                        )}
                      </div>
                      
                      {isTracking ? (
                         <div className="flex items-center text-xs font-medium text-green-600 dark:text-green-400 mt-2">
                           <Target className="w-3.5 h-3.5 mr-1" />
                           Active for {new Date().getFullYear()} Variance
                         </div>
                      ) : (
                         <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 mt-2">
                           Sandbox Mode
                         </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-4">
                      {!isTracking && (
                        <button
                          title="Set as Active Tracking Scenario"
                          onClick={() => setActiveTrackingScenario(scenario.id, new Date().getFullYear())}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        title="Duplicate Scenario"
                        onClick={() => handleDuplicate(scenario.id, scenario.name)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {!scenario.isBaseline && (
                        <button
                          title="Delete Scenario"
                          onClick={() => deleteScenario(scenario.id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New */}
          {isCreating ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                autoFocus
                type="text"
                placeholder="Scenario Name (e.g. Boat Refit)"
                value={newScenarioName}
                onChange={e => setNewScenarioName(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 min-h-[44px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg min-h-[44px] transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg min-h-[44px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create New Scenario</span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
