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

/**
 * One-time data recovery function to rescue orphaned budget items (planned_expenses,
 * funding_allocations, tax_events) that are missing a scenarioId, have null/undefined values,
 * or are still mapped to legacy global plan IDs.
 */
export async function rescueOrphanedBudgetItems(db: any, userId: string) {
  if (!db || !userId) return;
  console.log(`[Data Rescue] Initiating orphaned data recovery for userId: ${userId}`);

  try {
    // 1. Fetch scenarios for the user to determine the Baseline ID
    const userScenarios = await db.scenarios.find({ selector: { userId } }).exec();
    let baselineScenario = userScenarios.find((s: any) => s.isBaseline);
    let baselineId = "";

    if (baselineScenario) {
      baselineId = baselineScenario.id;
    } else if (userScenarios.length > 0) {
      baselineScenario = userScenarios[0];
      await baselineScenario.patch({ isBaseline: true, updatedAt: Date.now() });
      baselineId = baselineScenario.id;
    } else {
      // Pre-create the Baseline scenario so that orphans have an ID to map to immediately
      baselineId = generateUUID();
      try {
        await db.scenarios.insert({
          id: baselineId,
          userId,
          name: "Baseline",
          isBaseline: true,
          activeTrackingYears: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`[Data Rescue] Pre-created Baseline scenario for user: ${baselineId}`);
      } catch (insertErr) {
        console.error("[Data Rescue] Failed to pre-insert Baseline scenario:", insertErr);
        baselineId = "Baseline"; // Fallback identifier
      }
    }

    // 2. Query user plans to find possible legacy global plan IDs
    const userPlans = await db.plans.find().exec();
    const planIds = new Set<string>(userPlans.map((p: any) => p.id));
    planIds.add("BaselinePlan");

    // 3. Define collections to rescue
    const collectionsToRescue = [
      { key: "planned_expenses", col: db.planned_expenses },
      { key: "funding_allocations", col: db.funding_allocations },
      { key: "tax_events", col: db.tax_events }
    ];

    for (const { key, col } of collectionsToRescue) {
      if (!col) continue;

      // Find all user docs in this collection
      const docs = await col.find({ selector: { userId } }).exec();
      let rescueCount = 0;

      for (const doc of docs) {
        const sId = doc.scenarioId ?? (doc as any).scenario_id ?? (doc as any).get?.("scenarioId") ?? (doc as any).get?.("scenario_id");
        
        const isOrphaned =
          sId === undefined ||
          sId === null ||
          sId === "" ||
          sId === "null" ||
          sId === "undefined" ||
          planIds.has(sId);

        if (isOrphaned) {
          const patchData: any = { scenarioId: baselineId };
          if ((doc as any).scenario_id !== undefined || (doc as any).get?.("scenario_id") !== undefined) {
            patchData.scenario_id = baselineId;
          }
          await doc.patch(patchData);
          rescueCount++;
        }
      }

      if (rescueCount > 0) {
        console.log(`[Data Rescue] Successfully rescued ${rescueCount} orphaned documents from "${key}" and mapped them to Baseline scenario "${baselineId}".`);
      }
    }

    console.log("[Data Rescue] Orphaned data recovery process completed.");
  } catch (err) {
    console.error("[Data Rescue] Execution failed during data recovery:", err);
  }
}

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
    getDatabase().then(async (db) => {
      // Execute the orphaned data recovery task right after RxDB initializes
      await rescueOrphanedBudgetItems(db, userId);

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
