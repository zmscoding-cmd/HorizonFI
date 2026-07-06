import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, generateUUID } from '../lib/db';

export interface ScenarioModel {
  id: string;
  userId: string;
  name: string;
  isBaseline: boolean;
  activeTrackingYears: number[];
  createdAt: number;
  updatedAt: number;
}

interface ScenarioContextProps {
  scenarios: ScenarioModel[];
  currentlyViewingScenarioId: string | null;
  setCurrentlyViewingScenarioId: (id: string | null) => void;
  activeTrackingScenarioId: string | null;
  createScenario: (name: string, isBaseline?: boolean) => Promise<string>;
  duplicateScenario: (id: string, newName: string) => Promise<string>;
  setActiveTrackingScenario: (id: string, year: number) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
}

const ScenarioContext = createContext<ScenarioContextProps | undefined>(undefined);

export const ScenarioProvider: React.FC<{ children: React.ReactNode; userId: string | null }> = ({ children, userId }) => {
  const [scenarios, setScenarios] = useState<ScenarioModel[]>([]);
  const [currentlyViewingScenarioId, setCurrentlyViewingScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setScenarios([]);
      setCurrentlyViewingScenarioId(null);
      return;
    }

    let sub: any;
    getDatabase().then(db => {
      sub = db.scenarios.find({ selector: { userId } }).$.subscribe((docs: any[]) => {
        const sorted = docs.sort((a, b) => a.createdAt - b.createdAt);
        setScenarios(sorted);
        
        // Ensure we always have a default scenario if none exist, or select baseline
        if (sorted.length > 0 && !currentlyViewingScenarioId) {
          const baseline = sorted.find(s => s.isBaseline);
          setCurrentlyViewingScenarioId(baseline ? baseline.id : sorted[0].id);
        } else if (sorted.length === 0) {
           // Auto-create a baseline scenario? Wait, let the parent do it, or we do it here.
           createScenario("Baseline", true).then(id => {
               setCurrentlyViewingScenarioId(id);
               setActiveTrackingScenario(id, new Date().getFullYear());
           });
        }
      });
    });

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [userId]);

  const currentYear = new Date().getFullYear();
  const activeTrackingScenario = scenarios.find(s => s.activeTrackingYears && s.activeTrackingYears.includes(currentYear));
  const activeTrackingScenarioId = activeTrackingScenario ? activeTrackingScenario.id : null;

  const createScenario = async (name: string, isBaseline: boolean = false) => {
    if (!userId) throw new Error("No user ID");
    const db = await getDatabase();
    const newId = generateUUID();
    const doc = {
      id: newId,
      userId,
      name,
      isBaseline,
      activeTrackingYears: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.scenarios.insert(doc);
    return newId;
  };

  const duplicateScenario = async (id: string, newName: string) => {
    if (!userId) throw new Error("No user ID");
    const db = await getDatabase();
    
    // Create new scenario doc
    const newId = generateUUID();
    const doc = {
      id: newId,
      userId,
      name: newName,
      isBaseline: false,
      activeTrackingYears: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.scenarios.insert(doc);

    // TODO: also duplicate budgets, tax_events, planned_expenses...
    // For now, just duplicate the scenario shell, since this is a UI stub for discovery
    
    return newId;
  };

  const setActiveTrackingScenario = async (id: string, year: number) => {
    const db = await getDatabase();
    
    // First, remove year from all other scenarios
    const allScenarios = await db.scenarios.find({ selector: { userId } }).exec();
    for (const sc of allScenarios) {
      if (sc.id === id) {
        if (!sc.activeTrackingYears.includes(year)) {
          await sc.patch({ activeTrackingYears: [...sc.activeTrackingYears, year] });
        }
      } else {
        if (sc.activeTrackingYears.includes(year)) {
          await sc.patch({ activeTrackingYears: sc.activeTrackingYears.filter((y: number) => y !== year) });
        }
      }
    }
  };

  const deleteScenario = async (id: string) => {
     const db = await getDatabase();
     const doc = await db.scenarios.findOne(id).exec();
     if (doc) {
       await doc.remove();
     }
  };

  return (
    <ScenarioContext.Provider value={{
      scenarios,
      currentlyViewingScenarioId,
      setCurrentlyViewingScenarioId,
      activeTrackingScenarioId,
      createScenario,
      duplicateScenario,
      setActiveTrackingScenario,
      deleteScenario
    }}>
      {children}
    </ScenarioContext.Provider>
  );
};

export const useScenarioManager = () => {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenarioManager must be used within ScenarioProvider");
  return ctx;
};
