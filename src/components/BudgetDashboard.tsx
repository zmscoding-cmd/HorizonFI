import { useScenarioManager } from '../contexts/ScenarioContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { generateUUID } from '../lib/db';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Plus,
  Trash2,
  DollarSign,
  Briefcase,
  Layers,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
  PiggyBank,
  ChevronRight,
  TrendingDown,
  Info,
  Edit2,
  Check,
  X,
  Download,
  Percent
} from 'lucide-react';
import FundingAllocation from './FundingAllocation';

export default function BudgetDashboard({ 
  db, 
  userId,
  plan,
  activeScenario,
  handleRunSimulation
}: { 
  db: any; 
  userId: string;
  plan?: any;
  activeScenario?: any;
  handleRunSimulation?: any;
}) { 
  const { currentlyViewingScenarioId } = useScenarioManager();

  const { theme } = useTheme();
  const isNightWatch = theme === 'night-watch';
  const isDark = theme === 'dark' || theme === 'night-watch';

  // Responsive and high contrast visual styling properties
  const gridKeyline = isNightWatch ? '#2e0910' : (isDark ? '#27272a' : '#e4e4e7');
  const tickStroke = isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#a1a1aa');
  const textFill = isNightWatch ? '#f87171' : (isDark ? '#a1a1aa' : '#71717a');

  const tooltipBg = isNightWatch ? '#0c0204' : (isDark ? '#18181b' : '#ffffff');
  const tooltipBorder = isNightWatch ? '#4a0d1a' : (isDark ? '#3f3f46' : '#e4e4e7');
  const tooltipTexColor = isNightWatch ? '#fca5a5' : (isDark ? '#f4f4f5' : '#09090b');

  // React state subscriptions to RxDB
  const [categories, setCategories] = useState<any[]>([]);

  // Sorted categories for selecting alphabetically in dropdowns
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [categories]);
  const [assets, setAssets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [calculatedExpenses, setCalculatedExpenses] = useState<any[]>([]);
  const [ledgerSort, setLedgerSort] = useState<'category_name' | 'expense_name_asc' | 'expense_name_desc' | 'annual_asc' | 'annual_desc'>('category_name');
  const [categorySort, setCategorySort] = useState<'amount_desc' | 'amount_asc' | 'name_asc' | 'name_desc'>('amount_desc');

  const sortedCalculatedExpenses = useMemo(() => {
    const list = [...calculatedExpenses];
    if (ledgerSort === 'category_name') {
      list.sort((a, b) => {
        const catA = categories.find(c => c.id === a.categoryId)?.name || '';
        const catB = categories.find(c => c.id === b.categoryId)?.name || '';
        
        const catCompare = catA.localeCompare(catB, undefined, { sensitivity: 'base', numeric: true });
        if (catCompare !== 0) return catCompare;
        
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
      });
    } else if (ledgerSort === 'expense_name_asc') {
      list.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
      });
    } else if (ledgerSort === 'expense_name_desc') {
      list.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
      });
    } else if (ledgerSort === 'annual_asc') {
      list.sort((a, b) => {
        const valA = Number(a.annualValue || 0);
        const valB = Number(b.annualValue || 0);
        if (valA !== valB) return valA - valB;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
      });
    } else if (ledgerSort === 'annual_desc') {
      list.sort((a, b) => {
        const valA = Number(a.annualValue || 0);
        const valB = Number(b.annualValue || 0);
        if (valA !== valB) return valB - valA;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
      });
    }
    return list;
  }, [calculatedExpenses, ledgerSort, categories]);

  const [totals, setTotals] = useState({ monthly: 0, annual: 0 });
  const [cyclicError, setCyclicError] = useState<string | null>(null);

  // Loading indicator for background computation roundtrips
  const [isComputing, setIsComputing] = useState(false);

  // Interactive Tab controls
  const [activeTab, setActiveTab] = useState<'funding' | 'overview' | 'expenses' | 'actuals' | 'categories' | 'assets'>('funding');

  // Month Ledger selection for variance logging
  const [selectedLedgerMonth, setSelectedLedgerMonth] = useState<string>(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[new Date().getMonth()];
  });

  const [selectedLedgerYear, setSelectedLedgerYear] = useState<number>(() => {
    return new Date().getFullYear();
  });

  // Actual Monthly Category Expenditures stored in localStorage (offline-first persistence)
  const [actualExpenses, setActualExpenses] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem(`hzk_${userId}_budget_actuals`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to restore budget actuals', e);
    }
    // Pre-populated default actuals to make the default view gorgeous
    return {
      'January': { 'housing': 2100, 'food': 650, 'utilities': 400, 'leisure': 320 },
      'February': { 'housing': 1950, 'food': 580, 'utilities': 420, 'leisure': 280 },
      'March': { 'housing': 2000, 'food': 620, 'utilities': 390, 'leisure': 350 },
      'April': { 'housing': 2200, 'food': 710, 'utilities': 410, 'leisure': 450 },
      'May': { 'housing': 2050, 'food': 600, 'utilities': 350, 'leisure': 500 },
      'June': { 'housing': 2000, 'food': 640, 'utilities': 380, 'leisure': 420 },
      'July': { 'housing': 2000, 'food': 690, 'utilities': 430, 'leisure': 480 },
      'August': { 'housing': 2000, 'food': 600, 'utilities': 450, 'leisure': 390 },
      'September': { 'housing': 2100, 'food': 610, 'utilities': 390, 'leisure': 310 },
      'October': { 'housing': 2000, 'food': 630, 'utilities': 400, 'leisure': 290 },
      'November': { 'housing': 2250, 'food': 680, 'utilities': 430, 'leisure': 360 },
      'December': { 'housing': 2100, 'food': 800, 'utilities': 500, 'leisure': 650 }
    };
  });

  // Save budget actuals in localStorage on change
  useEffect(() => {
    localStorage.setItem(`hzk_${userId}_budget_actuals`, JSON.stringify(actualExpenses));
  }, [actualExpenses, userId]);

  // Form states for item insertions
  const [actualLineItems, setActualLineItems] = useState<Record<string, Array<{id: string, categoryId: string, description: string, amount: number, date?: string}>>>(() => {
    try {
      const saved = localStorage.getItem(`hzk_${userId}_budget_line_items`);
      if (saved) return JSON.parse(saved);
    } catch { }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`hzk_${userId}_budget_line_items`, JSON.stringify(actualLineItems));
  }, [actualLineItems, userId]);

  const [newLineItem, setNewLineItem] = useState({ description: '', categoryId: '', amount: 0, date: '' });

  const [lastColorUsed, setLastColorUsed] = useState<string>(() => {
    try {
      return localStorage.getItem(`hzk_${userId}_last_category_color`) || '#3b82f6';
    } catch {
      return '#3b82f6';
    }
  });

  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });

  // Update new category color to lastColorUsed when it changes or loads
  useEffect(() => {
    setNewCategory(prev => ({ ...prev, color: lastColorUsed }));
  }, [lastColorUsed]);

  const [newAsset, setNewAsset] = useState({ name: '', value: 100000, type: 'Brokerage' });
  const [newExpense, setNewExpense] = useState({
    name: '',
    categoryId: '',
    frequency: 'Monthly' as 'Monthly' | 'Annual',
    valuationType: 'Static' as 'Static' | 'Relational',
    staticAmount: 1000,
    relationalTargetId: '',
    relationalPercent: 5,
    notes: '',
    urlsText: '',
    renewalDate: ''
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Category editing states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('#3b82f6');

  // Colors in use memo
  const inUseColors = useMemo(() => {
    const colors = new Set<string>();
    categories.forEach(c => {
      if (c.color) colors.add(c.color.toLowerCase());
    });
    return Array.from(colors);
  }, [categories]);

  // Asset editing states
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState('');
  const [editingAssetValue, setEditingAssetValue] = useState(100000);
  const [editingAssetType, setEditingAssetType] = useState('Brokerage');

  // Expense editing states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseName, setEditingExpenseName] = useState('');
  const [editingExpenseCategoryId, setEditingExpenseCategoryId] = useState('');
  const [editingExpenseFrequency, setEditingExpenseFrequency] = useState<'Monthly' | 'Annual'>('Monthly');
  const [editingExpenseValuationType, setEditingExpenseValuationType] = useState<'Static' | 'Relational'>('Static');
  const [editingExpenseStaticAmount, setEditingExpenseStaticAmount] = useState(1000);
  const [editingExpenseRelationalTargetId, setEditingExpenseRelationalTargetId] = useState('');
  const [editingExpenseRelationalPercent, setEditingExpenseRelationalPercent] = useState(5);
  const [editingExpenseNotes, setEditingExpenseNotes] = useState('');
  const [editingExpenseUrlsText, setEditingExpenseUrlsText] = useState('');
  const [editingExpenseRenewalDate, setEditingExpenseRenewalDate] = useState('');
  const [editingExpenseExcluded, setEditingExpenseExcluded] = useState(false);

  // Expense Supporting Named Links
  const [newExpenseLinks, setNewExpenseLinks] = useState<{ url: string; name: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [activeIndexNewExpenseLinkEdit, setActiveIndexNewExpenseLinkEdit] = useState<number | null>(null);

  const [editingExpenseLinks, setEditingExpenseLinks] = useState<{ url: string; name: string }[]>([]);
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkName, setEditLinkName] = useState('');
  const [activeIndexEditExpenseLinkEdit, setActiveIndexEditExpenseLinkEdit] = useState<number | null>(null);

  // Subscriptions to RxDB
  const [targetRothConversionAmount, setTargetRothConversionAmount] = useState<number>(0);
  const [taxableRebalancingSaleAmount, setTaxableRebalancingSaleAmount] = useState<number>(0);
  const [rebalancingCapitalGainPercentage, setRebalancingCapitalGainPercentage] = useState<number>(0);

  useEffect(() => {
    if (!db) return;

    // Fetch the existing budget to initialize tax planning fields
    db.budgets.findOne({ selector: { userId } }).exec().then((budget: any) => {
      if (budget) {
        setTargetRothConversionAmount(budget.targetRothConversionAmount || 0);
        setTaxableRebalancingSaleAmount(budget.taxableRebalancingSaleAmount || 0);
        setRebalancingCapitalGainPercentage(budget.rebalancingCapitalGainPercentage || 0);
      }
    });

    const subscriptions = [
      db.categories.find({ selector: { userId } }).$.subscribe((data: any[]) => {
        setCategories(data.map(d => d.toJSON()));
      }),
      db.assets.find({ selector: { userId } }).$.subscribe((data: any[]) => {
        setAssets(data.map(d => d.toJSON()));
      }),
      db.planned_expenses.find({ selector: { userId, scenarioId: activeScenario?.id || 'Baseline' } }).$.subscribe((data: any[]) => {
        setExpenses(data.map(d => d.toJSON()));
      })
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [db, userId]);

  // Web Worker for background computations
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<any>) => {
      setIsComputing(false);
      const res = event.data;
      if (res.success && res.type === 'BUDGET_SIMULATION') {
        setCalculatedExpenses(res.data.expenses);
        setTotals({
          monthly: res.data.totalMonthly,
          annual: res.data.totalAnnual
        });
        setCyclicError(null);

        // Update Budget summary document in database for global replication access
        updateDatabaseBudgetSummary(res.data.totalMonthly, res.data.totalAnnual);
      } else if (!res.success || res.error) {
        setCyclicError(res.error || 'Failed calculation pipeline.');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Post to Web Worker whenever collections mutate
  useEffect(() => {
    if (!workerRef.current || expenses.length === 0) {
      if (expenses.length === 0) {
        setCalculatedExpenses([]);
        setTotals({ monthly: 0, annual: 0 });
      }
      return;
    }

    setIsComputing(true);
    setCyclicError(null);

    // Format RxDB models into pristine numerical models for topological sorting
    const formattedExpenses = expenses.map(exp => ({
      id: exp.id,
      name: exp.name,
      frequency: exp.frequency,
      valuationType: exp.valuationType,
      categoryId: exp.categoryId,
      staticAmount: exp.staticAmount ? parseFloat(exp.staticAmount) : 0,
      relationalTargetId: exp.relationalTargetId || '',
      relationalPercent: exp.relationalPercent ? parseFloat(exp.relationalPercent) : 0,
      notes: exp.notes || '',
      excluded: !!exp.excluded,
      urls: exp.urls || []
    }));

    const formattedAssets = assets.map(ast => ({
      id: ast.id,
      name: ast.name,
      value: ast.value || 0
    }));

    workerRef.current.postMessage({
      type: 'BUDGET_SIMULATION',
      expenses: formattedExpenses,
      assets: formattedAssets
    });
  }, [expenses, assets, categories]);

  const updateDatabaseTaxPlanningEvents = async (updates: any) => {
    try {
      // Strict sanitization before persisting and passing to simulation worker
      const sanitizedUpdates: any = {};
      if ('targetRothConversionAmount' in updates) {
        sanitizedUpdates.targetRothConversionAmount = Math.max(0, Number(updates.targetRothConversionAmount) || 0);
      }
      if ('taxableRebalancingSaleAmount' in updates) {
        sanitizedUpdates.taxableRebalancingSaleAmount = Math.max(0, Number(updates.taxableRebalancingSaleAmount) || 0);
      }
      if ('rebalancingCapitalGainPercentage' in updates) {
        sanitizedUpdates.rebalancingCapitalGainPercentage = Math.max(0, Math.min(100, Number(updates.rebalancingCapitalGainPercentage) || 0));
      }

      const existing = await db.budgets.findOne({ selector: { userId } }).exec();
      if (existing) {
        await existing.patch({
          ...sanitizedUpdates,
          updatedAt: Date.now(),
        scenarioId: activeScenario?.id || 'Baseline'
        });
      } else {
        await db.budgets.insert({
          id: generateUUID(),
          userId,
          name: 'Main Household Budget',
          totalPlaintextMonthly: totals.monthly,
          totalPlaintextAnnual: totals.annual,
          ...sanitizedUpdates,
          notes: 'Auto-calculated offline via Kahn Simulation worker.',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Error auto-syncing tax planning events to DB', err);
    }
  };

  const updateDatabaseBudgetSummary = async (monthly: number, annual: number) => {
    try {
      const existing = await db.budgets.findOne({ selector: { userId } }).exec();
      if (existing) {
        await existing.patch({
          totalPlaintextMonthly: monthly,
          totalPlaintextAnnual: annual,
          updatedAt: Date.now()
        });
      } else {
        await db.budgets.insert({
          id: generateUUID(),
          userId,
          name: 'Main Household Budget',
          totalPlaintextMonthly: monthly,
          totalPlaintextAnnual: annual,
          targetRothConversionAmount,
          taxableRebalancingSaleAmount,
          rebalancingCapitalGainPercentage,
          notes: 'Auto-calculated offline via Kahn Simulation worker.',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Error auto-syncing budget summary to DB', err);
    }
  };

  // Form insertions handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    setValidationError(null);

    try {
      const colorToUse = newCategory.color;
      await db.categories.insert({
        id: generateUUID(),
        userId,
        name: newCategory.name.trim(),
        color: colorToUse,
        createdAt: Date.now()
      });
      setLastColorUsed(colorToUse);
      try {
        localStorage.setItem(`hzk_${userId}_last_category_color`, colorToUse);
      } catch (err) {
        console.error('Failed to save last category color', err);
      }
      setNewCategory({ name: '', color: colorToUse });
    } catch (err: any) {
      setValidationError(err.message || 'Error inserting category.');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    setValidationError(null);

    try {
      const doc = await db.categories.findOne(id).exec();
      if (doc) {
        await doc.patch({
          name: editingCategoryName.trim(),
          color: editingCategoryColor
        });
        setLastColorUsed(editingCategoryColor);
        try {
          localStorage.setItem(`hzk_${userId}_last_category_color`, editingCategoryColor);
        } catch (err) {
          console.error('Failed to save last category color', err);
        }
        setEditingCategoryId(null);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setValidationError(null);
    try {
      const doc = await db.categories.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      setValidationError(err.message || 'Validation failed.');
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) return;
    setValidationError(null);

    try {
      await db.assets.insert({
        id: generateUUID(),
        userId,
        name: newAsset.name.trim(),
        value: Number(newAsset.value),
        type: newAsset.type,
        createdAt: Date.now()
      });
      setNewAsset({ name: '', value: 100000, type: 'Brokerage' });
    } catch (err: any) {
      setValidationError(err.message || 'Error inserting asset.');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    setValidationError(null);
    try {
      const doc = await db.assets.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      setValidationError(err.message || 'Validation failed.');
    }
  };

  const handleUpdateAsset = async (id: string) => {
    if (!editingAssetName.trim()) return;
    setValidationError(null);
    try {
      const doc = await db.assets.findOne(id).exec();
      if (doc) {
        await doc.patch({
          name: editingAssetName.trim(),
          value: Number(editingAssetValue),
          type: editingAssetType
        });
      }
      setEditingAssetId(null);
    } catch (err: any) {
      setValidationError(err.message || 'Error updating asset.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.name.trim()) return;
    setValidationError(null);

    // Validate that relational matches selected targets
    if (newExpense.valuationType === 'Relational' && !newExpense.relationalTargetId) {
      setValidationError('Please select a target asset, category, or other expense for the relational link.');
      return;
    }

    try {
      const payload: any = {
        id: generateUUID(),
        userId,
        name: newExpense.name.trim(),
        frequency: newExpense.frequency,
        valuationType: newExpense.valuationType,
        excluded: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      if (newExpense.categoryId) payload.categoryId = newExpense.categoryId;
      if (newExpense.valuationType === 'Static') payload.staticAmount = String(newExpense.staticAmount);
      if (newExpense.valuationType === 'Relational') {
        payload.relationalTargetId = newExpense.relationalTargetId;
        payload.relationalPercent = String(newExpense.relationalPercent);
      }
      if (newExpense.notes.trim()) payload.notes = newExpense.notes.trim();
      
      let finalLinks = [...newExpenseLinks];
      if (newLinkUrl.trim()) {
        let targetUrl = newLinkUrl.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }
        if (activeIndexNewExpenseLinkEdit !== null) {
          finalLinks[activeIndexNewExpenseLinkEdit] = { name: newLinkName.trim(), url: targetUrl };
        } else {
          if (!finalLinks.some(link => link.url === targetUrl)) {
            finalLinks.push({ name: newLinkName.trim(), url: targetUrl });
          }
        }
      }
      payload.urls = finalLinks;

      if (newExpense.renewalDate) payload.renewalDate = newExpense.renewalDate;

      await db.planned_expenses.insert(payload);

      // Clear form
      setNewExpense({
        name: '',
        categoryId: categories[0]?.id || '',
        frequency: 'Monthly',
        valuationType: 'Static',
        staticAmount: 1000,
        relationalTargetId: '',
        relationalPercent: 5,
        notes: '',
        urlsText: '',
        renewalDate: ''
      });
      setNewExpenseLinks([]);
      setNewLinkName('');
      setNewLinkUrl('');
      setActiveIndexNewExpenseLinkEdit(null);
    } catch (err: any) {
      setValidationError(err.message || 'Error inserting planned expense.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setValidationError(null);
    try {
      const doc = await db.planned_expenses.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      setValidationError(err.message || 'Failed deleting expense.');
    }
  };

  const handleToggleExclude = async (id: string, currentlyExcluded: boolean) => {
    setValidationError(null);
    try {
      const doc = await db.planned_expenses.findOne(id).exec();
      if (doc) {
        await doc.patch({ excluded: !currentlyExcluded });
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to toggle expense exclusion.');
    }
  };

  const handleUpdateExpense = async (id: string) => {
    if (!editingExpenseName.trim()) return;
    setValidationError(null);

    // Validate relational
    if (editingExpenseValuationType === 'Relational' && !editingExpenseRelationalTargetId) {
      setValidationError('Please select a target asset, category, or other expense for the relational link.');
      return;
    }

    try {
      const doc = await db.planned_expenses.findOne(id).exec();
      if (doc) {
        const payload: any = {
          name: editingExpenseName.trim(),
          frequency: editingExpenseFrequency,
          valuationType: editingExpenseValuationType,
          updatedAt: Date.now()
        };
        
        if (editingExpenseCategoryId) payload.categoryId = editingExpenseCategoryId;
        if (editingExpenseValuationType === 'Static') payload.staticAmount = String(editingExpenseStaticAmount);
        if (editingExpenseValuationType === 'Relational') {
          payload.relationalTargetId = editingExpenseRelationalTargetId;
          payload.relationalPercent = String(editingExpenseRelationalPercent);
        }
        if (editingExpenseNotes.trim()) payload.notes = editingExpenseNotes.trim();
        payload.excluded = editingExpenseExcluded;
        
        let finalLinks = [...editingExpenseLinks];
        if (editLinkUrl.trim()) {
          let targetUrl = editLinkUrl.trim();
          if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
          }
          if (activeIndexEditExpenseLinkEdit !== null) {
            finalLinks[activeIndexEditExpenseLinkEdit] = { name: editLinkName.trim(), url: targetUrl };
          } else {
            if (!finalLinks.some(link => link.url === targetUrl)) {
              finalLinks.push({ name: editLinkName.trim(), url: targetUrl });
            }
          }
        }
        payload.urls = finalLinks;

        payload.renewalDate = editingExpenseRenewalDate || '';

        await doc.patch(payload);
      }
      setEditingExpenseId(null);
      setEditingExpenseRenewalDate('');
      setEditingExpenseLinks([]);
      setEditLinkName('');
      setEditLinkUrl('');
      setActiveIndexEditExpenseLinkEdit(null);
    } catch (err: any) {
      setValidationError(err.message || 'Error updating planned expense.');
    }
  };

  // Variance actual logs updater
  const handleUpdateVarianceActual = (categoryId: string, value: number) => {
    const key = `${selectedLedgerMonth} ${selectedLedgerYear}`;
    setActualExpenses(prev => {
      const existing = prev[key] || prev[selectedLedgerMonth] || {};
      return {
        ...prev,
        [key]: {
          ...existing,
          [categoryId]: value
        }
      };
    });
  };

  // Compile Chart data for budgeted vs. actual comparison
  // Budgeted is from simulated category totals + Static amounts
  // Actuals is mapped from logged months state
  // Guyton-Klinger macro boundaries are lines mapped to secondary Y-axis (right)
  const chartData = useMemo(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Compute active target aggregated budget values
    const staticTotal = calculatedExpenses.reduce((sum, exp) => sum + (exp.monthlyValue || 0), 0);

    // Dynamic Guyton-Klingerboundaries lines. Simulated baseline is based on 4% of total assets annually, converted monthly
    const totalAssetBalance = assets.reduce((sum, a) => sum + Number(a.value || 0), 0) || 1200000;
    const gkBaseSafeWithdrawalMonthly = (totalAssetBalance * 0.04) / 12;
    const gkUpperGuardrail = gkBaseSafeWithdrawalMonthly * 1.2; // +20% threshold
    const gkLowerGuardrail = gkBaseSafeWithdrawalMonthly * 0.8; // -20% threshold

    return months.map(m => {
      const key = `${m} ${selectedLedgerYear}`;
      const manualActuals = actualExpenses[key] || actualExpenses[m] || {};
      const lines = actualLineItems[key] || actualLineItems[m] || [];
      const actualsByCat: Record<string, number> = { ...manualActuals };
      lines.forEach(l => {
         actualsByCat[l.categoryId] = (actualsByCat[l.categoryId] || 0) + l.amount;
      });

      const actualSum = Object.values(actualsByCat).reduce<number>((a, b) => a + Number(b), 0);

      // Distribute actual categories for stacked bars
      const categorySec: Record<string, number> = {};
      categories.forEach(cat => {
         categorySec[cat.name] = actualsByCat[cat.id] || 0;
      });

      return {
        month: m.slice(0, 3),
        CalculatedBudget: Math.round(staticTotal),
        ActualTotal: Math.round(actualSum),
        ...categorySec,
        // Macro Portfolio Guardrails
        PortfolioValue: totalAssetBalance,
        UpperSafetyBoundary: Math.round(gkUpperGuardrail),
        LowerDangerBoundary: Math.round(gkLowerGuardrail)
      };
    });
  }, [calculatedExpenses, actualExpenses, actualLineItems, categories, assets, selectedLedgerYear]);

  const expensesByCategory = useMemo(() => {
    const byCategory: Record<string, { categoryId: string; name: string, color: string, monthly: number, annual: number }> = {};
    
    // Initialize with all categories
    categories.forEach(c => {
      byCategory[c.id] = { categoryId: c.id, name: c.name, color: c.color || '#94a3b8', monthly: 0, annual: 0 };
    });

    byCategory['uncategorized'] = { categoryId: 'uncategorized', name: 'Uncategorized', color: '#cbd5e1', monthly: 0, annual: 0 };

    calculatedExpenses.forEach(exp => {
      const cid = exp.categoryId || 'uncategorized';
      if (!byCategory[cid]) {
        byCategory[cid] = { categoryId: cid, name: 'Unknown', color: '#cbd5e1', monthly: 0, annual: 0 };
      }
      byCategory[cid].monthly += (exp.monthlyValue || 0);
      byCategory[cid].annual += (exp.annualValue || 0);
    });

    return Object.values(byCategory).filter(c => c.monthly > 0 || c.annual > 0).sort((a, b) => {
      if (categorySort === 'amount_desc') return b.monthly - a.monthly;
      if (categorySort === 'amount_asc') return a.monthly - b.monthly;
      if (categorySort === 'name_asc') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      if (categorySort === 'name_desc') return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      return b.monthly - a.monthly;
    });
  }, [calculatedExpenses, categories, categorySort]);

  // Custom label rendering for persistent slices without hover for Expenses
  const renderCustomExpenseLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Offset the label slightly outside the pie
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    const percentage = totals.monthly > 0 ? Math.round((value / totals.monthly) * 100) : 0;
    const displayValue = `${percentage}%`;

    return (
      <text
        x={x}
        y={y}
        fill={isNightWatch ? '#fca5a5' : (isDark ? '#e4e4e7' : '#18181b')}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="text-[10px] font-bold animate-fade-in"
      >
        {`${displayValue} ${name}`}
      </text>
    );
  };

  const exportExpensesToCSV = () => {
    if (!calculatedExpenses || calculatedExpenses.length === 0) return;

    const headers = [
      'Expense Name',
      'Category',
      'Frequency',
      'Valuation Type',
      'Monthly Value ($)',
      'Annual Value ($)'
    ];

    const rows = sortedCalculatedExpenses.map(exp => {
      const categoryName = categories.find(c => c.id === exp.categoryId)?.name || 'Uncategorized';
      return [
        `"${(exp.name || '').replace(/"/g, '""')}"`,
        `"${categoryName.replace(/"/g, '""')}"`,
        `"${exp.frequency || 'Monthly'}"`,
        `"${exp.valuationType || 'Static'}"`,
        (exp.monthlyValue || 0).toFixed(2),
        (exp.annualValue || 0).toFixed(2)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `planned_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActualsToCSV = () => {
    const ledgerKey = `${selectedLedgerMonth} ${selectedLedgerYear}`;
    const items = actualLineItems[ledgerKey] || actualLineItems[selectedLedgerMonth] || [];
    
    // Include both raw inputs (actualExpenses state mapping) and logged individual items (actualLineItems)
    const headers = [
      'Type',
      'Date',
      'Category',
      'Description',
      'Amount ($)'
    ];

    const rows: string[] = [];
    
    // First: the individual line items
    items.forEach(item => {
      const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized';
      rows.push([
        '"Line Item"',
        `"${item.date || ''}"`,
        `"${categoryName.replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        (item.amount || 0).toFixed(2)
      ].join(','));
    });

    // Second: the manually entered categorical actuals without line items backing them
    categories.forEach(cat => {
      const manualVal = actualExpenses[ledgerKey]?.[cat.id] ?? actualExpenses[selectedLedgerMonth]?.[cat.id] ?? 0;
      if (manualVal > 0) {
        rows.push([
          '"Manual Entry"',
          '""',
          `"${cat.name.replace(/"/g, '""')}"`,
          '"Manual Category Total"',
          manualVal.toFixed(2)
        ].join(','));
      }
    });

    if (rows.length === 0) return;

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `actual_expenses_${selectedLedgerMonth}_${selectedLedgerYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Info Block */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <PiggyBank className="text-blue-600 dark:text-red-500" />
              Granular Budgeting & Variance View
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Topological formula resolution via Kahn's algorithm web worker with live comparative analytics.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-center min-w-[120px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Monthly</p>
              <p className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-50">
                ${Math.round(totals.monthly).toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-center min-w-[120px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Annual</p>
              <p className="text-lg font-mono font-bold text-blue-600 dark:text-red-400">
                ${Math.round(totals.annual).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic warning banner if Cyclic Dependency is locked */}
        {cyclicError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2.5">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">Infinite Loop Blocked</p>
              <p className="text-xs opacity-90 mt-0.5">{cyclicError}</p>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2.5">
            <Info className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">Validation Issue</p>
              <p className="text-xs opacity-90 mt-0.5">{validationError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top-aligned Horizontal Navigation Menu */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('funding')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'funding'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Percent size={18} className="shrink-0" /> Funding Allocation and Taxes
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <FileText size={18} className="shrink-0" /> Budget vs. Variance
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <DollarSign size={18} className="shrink-0" /> Planned Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('actuals')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'actuals'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <PiggyBank size={18} className="shrink-0" /> Actual Expenses
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Layers size={18} className="shrink-0" /> Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 sm:flex-initial text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer min-h-[44px] ${
              activeTab === 'assets'
                ? 'bg-blue-600 text-white dark:bg-red-950/40 dark:text-red-400 dark:border dark:border-red-900/50 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Briefcase size={18} className="shrink-0" /> Target Assets ({assets.length})
          </button>
        </div>
      </div>

      {/* Active Content Window (Full Width) */}
      <div className="space-y-6 w-full">

        {/* Funding Allocation and Taxes tab content */}
        {activeTab === 'funding' && (
          <FundingAllocation
            plan={plan}
            activeScenario={activeScenario}
            db={db}
            userId={userId}
            handleRunSimulation={handleRunSimulation}
          />
        )}

          {/* OVERVIEW PANEL - Visualizes comparative ComposedChart */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Composed Chart Wrapper with dimensional parameters for viewport stability */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Budget vs. Actual Variance Map</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Stacked actual category bars compared to target budget and Guyton-Klinger macro boundaries.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-600 rounded-full" />
                    <span className="text-xs font-semibold text-zinc-500">Left: Stacked Expenditures</span>
                    <span className="w-3 h-3 bg-red-500 rounded-full ml-2" />
                    <span className="text-xs font-semibold text-zinc-500">Right: Safety Guardrails</span>
                  </div>
                </div>

                <div id="budget-chart-container" className="w-full h-96 min-h-[300px] overflow-hidden">
                  <ResponsiveContainer key={currentlyViewingScenarioId || 'default'} initialDimension={{ width: 800, height: 400 }} width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridKeyline} />
                      <XAxis
                        dataKey="month"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        stroke={tickStroke}
                        tick={{ fill: textFill }}
                      />
                      {/* Left primary Y-axis for granular expenditures */}
                      <YAxis
                        yAxisId="left"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        stroke={tickStroke}
                        tick={{ fill: textFill }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      {/* Right secondary Y-axis for macro portfolio guardrails */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        stroke={tickStroke}
                        tick={{ fill: textFill }}
                        tickFormatter={(v) => `$${v}`}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: `1px solid ${tooltipBorder}`,
                          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
                          backgroundColor: tooltipBg,
                          color: tooltipTexColor,
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: tooltipTexColor }}
                        labelStyle={{ color: textFill }}
                        formatter={(val: any, name: string) => {
                          if (name.includes('Boundary')) {
                            return [`$${Math.round(val).toLocaleString()}`, `${name} (GK Guardrail)`];
                          }
                          return [`$${Math.round(val).toLocaleString()}`, name];
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                      {/* Map monthly target budget as solid bar or Reference line */}
                      <Bar
                        yAxisId="left"
                        dataKey="CalculatedBudget"
                        name="Simulated Budget"
                        fill={isNightWatch ? '#450a0a' : (isDark ? '#27272a' : '#f4f4f5')}
                        radius={[4, 4, 0, 0]}
                        opacity={0.7}
                      />

                      {/* Stacked Bars representing active categories contribution */}
                      {categories.map((cat, idx) => (
                        <Bar
                          key={cat.id}
                          yAxisId="left"
                          stackId="actuals"
                          dataKey={cat.name}
                          name={`Actual ${cat.name}`}
                          fill={isNightWatch ? '#991b1b' : cat.color || '#3b82f6'}
                          radius={[0, 0, 0, 0]}
                        />
                      ))}

                      {/* Map macro Guyton-Klinger safety thresholds with right Y-axis */}
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="UpperSafetyBoundary"
                        name="Upper Safety Margin"
                        stroke={isNightWatch ? '#f87171' : '#10b981'}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="LowerDangerBoundary"
                        name="Lower Danger Margin"
                        stroke={isNightWatch ? '#ef4444' : '#ef4444'}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ACTUAL EXPENSES PANEL - Actual Monthly Expenditure Ledger */}
          {activeTab === 'actuals' && (
            <div className="space-y-6">
              {/* Monthly ledger log form */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Actual Monthly Expenditure Ledger</h4>
                    <p className="text-xs text-zinc-500">Record and review real expenditures below to balance your simulation boundaries.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                    <button 
                      onClick={exportActualsToCSV}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                      title={`Export ${selectedLedgerMonth} ${selectedLedgerYear} Actuals to CSV`}
                    >
                      <Download size={14} />
                      Export
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Month:</label>
                      <select
                        value={selectedLedgerMonth}
                        onChange={(e) => setSelectedLedgerMonth(e.target.value)}
                        className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 rounded-lg p-2 text-xs font-bold font-sans h-10 min-w-[120px] outline-none text-right"
                        style={{ textAlignLast: 'right' }}
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Year:</label>
                      <select
                        value={selectedLedgerYear}
                        onChange={(e) => setSelectedLedgerYear(Number(e.target.value))}
                        className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 rounded-lg p-2 text-xs font-bold font-sans h-10 min-w-[100px] outline-none text-right"
                        style={{ textAlignLast: 'right' }}
                      >
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {categories.length === 0 ? (
                  <p className="text-center text-xs text-zinc-400 py-6">Please define custom Categories in the Categories tab to begin tracking actuals.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {categories.map(cat => {
                        const ledgerKey = `${selectedLedgerMonth} ${selectedLedgerYear}`;
                        const val = actualExpenses[ledgerKey]?.[cat.id] ?? actualExpenses[selectedLedgerMonth]?.[cat.id] ?? 0;
                        const itemsVal = (actualLineItems[ledgerKey] || actualLineItems[selectedLedgerMonth] || []).filter(item => item.categoryId === cat.id).reduce((sum, item) => sum + item.amount, 0);
                        return (
                          <div key={cat.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 truncate">{cat.name}</span>
                              </div>
                              {itemsVal > 0 && <span className="text-[10px] font-mono text-zinc-400">Items: ${Math.round(itemsVal)}</span>}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-bold">$</span>
                              <input
                                type="number"
                                value={val || ''}
                                placeholder="0"
                                onChange={(e) => handleUpdateVarianceActual(cat.id, Math.max(0, Number(e.target.value)))}
                                className="w-full text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 pl-6 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono outline-none focus:border-blue-500 min-h-[40px]"
                              />
                            </div>
                            {itemsVal > 0 && (
                              <div className="pt-1 text-right">
                                <span className="text-[10.5px] font-bold text-zinc-500">Total: ${Math.round(val + itemsVal).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Line Items Manager */}
                    <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-5 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h5 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Individual Expenditures Log</h5>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">For {selectedLedgerMonth} {selectedLedgerYear}</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Description (e.g. Electric Bill)"
                          value={newLineItem.description}
                          onChange={e => setNewLineItem(p => ({ ...p, description: e.target.value }))}
                          className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 min-h-[40px]"
                        />
                        <select
                          value={newLineItem.categoryId}
                          onChange={e => setNewLineItem(p => ({ ...p, categoryId: e.target.value }))}
                          className="sm:w-40 text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 min-h-[40px]"
                        >
                          <option value="" disabled>Category...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input
                          type="date"
                          value={newLineItem.date}
                          onChange={e => setNewLineItem(p => ({ ...p, date: e.target.value }))}
                          className="sm:w-36 text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 min-h-[40px]"
                        />
                        <div className="relative sm:w-32">
                          <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-bold">$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={newLineItem.amount || ''}
                            onChange={e => setNewLineItem(p => ({ ...p, amount: Math.max(0, Number(e.target.value)) }))}
                            className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 pl-6 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono outline-none focus:border-blue-500 min-h-[40px]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!newLineItem.description || !newLineItem.categoryId || newLineItem.amount <= 0) return;
                            const item = { ...newLineItem, id: generateUUID() };
                            setActualLineItems(prev => {
                              const key = `${selectedLedgerMonth} ${selectedLedgerYear}`;
                              const existing = prev[key] || prev[selectedLedgerMonth] || [];
                              return { ...prev, [key]: [...existing, item] };
                            });
                            setNewLineItem({ description: '', categoryId: '', amount: 0, date: '' });
                          }}
                          disabled={!newLineItem.description || !newLineItem.categoryId || newLineItem.amount <= 0}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors min-h-[40px] shrink-0 flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>

                      {(() => {
                        const key = `${selectedLedgerMonth} ${selectedLedgerYear}`;
                        const lineItemsList = actualLineItems[key] || actualLineItems[selectedLedgerMonth] || [];
                        if (lineItemsList.length === 0) return null;

                        return (
                          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shrink-0 mt-3 max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                  <th className="px-3 py-2 font-medium">Description</th>
                                  <th className="px-3 py-2 font-medium">Category</th>
                                  <th className="px-3 py-2 font-medium">Date</th>
                                  <th className="px-3 py-2 font-medium text-right mt-0">Amount</th>
                                  <th className="px-3 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                {lineItemsList.map((item) => {
                                  const cat = categories.find(c => c.id === item.categoryId);
                                  return (
                                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                      <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-200">{item.description}</td>
                                      <td className="px-3 py-2.5">
                                        {cat ? (
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                                          </div>
                                        ) : <span className="text-zinc-400 italic">Unknown</span>}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                        {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-mono text-zinc-700 dark:text-zinc-300">${item.amount.toLocaleString()}</td>
                                      <td className="px-3 py-2.5 text-right mt-0">
                                        <button 
                                          onClick={() => {
                                            setActualLineItems(prev => {
                                              const existing = prev[key] || prev[selectedLedgerMonth] || [];
                                              return { ...prev, [key]: existing.filter(i => i.id !== item.id) };
                                            });
                                          }}
                                          className="text-zinc-400 hover:text-red-500 p-1 rounded-md"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PLANNED EXPENSES TAB - List & edit topological formulas */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              
              {/* Planned Expenses Summaries */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 lg:gap-8">
                  <div className="flex-1 w-full flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
                      <h4 className="font-bold text-zinc-950 dark:text-zinc-50">Planned Expenses Analytics</h4>
                      <button 
                        onClick={exportExpensesToCSV}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shrink-0"
                      >
                        <Download size={14} />
                        Export to CSV
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4">Total simulated costs aggregated from static bases and relational percent links.</p>
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 min-w-[140px] flex-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Monthly</p>
                        <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">${Math.round(totals.monthly).toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 min-w-[140px] flex-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Annual</p>
                        <p className="text-2xl font-mono font-bold text-blue-600 dark:text-red-400">${Math.round(totals.annual).toLocaleString()}</p>
                      </div>
                    </div>
                    {expensesByCategory.length > 0 && (
                      <div className="overflow-x-auto mt-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                              <th 
                                className="pb-2 font-bold text-left cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                onClick={() => setCategorySort(categorySort === 'name_asc' ? 'name_desc' : 'name_asc')}
                              >
                                Category
                                {categorySort === 'name_asc' && <span className="ml-1 text-[9px] text-zinc-500">▲</span>}
                                {categorySort === 'name_desc' && <span className="ml-1 text-[9px] text-zinc-500">▼</span>}
                                {categorySort !== 'name_asc' && categorySort !== 'name_desc' && <span className="ml-1 text-[9px] opacity-30">⬍</span>}
                              </th>
                              <th 
                                className="pb-2 pl-4 font-bold text-right cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                onClick={() => setCategorySort(categorySort === 'amount_desc' ? 'amount_asc' : 'amount_desc')}
                              >
                                Monthly
                                {categorySort === 'amount_asc' && <span className="ml-1 text-[9px] text-zinc-500">▲</span>}
                                {categorySort === 'amount_desc' && <span className="ml-1 text-[9px] text-zinc-500">▼</span>}
                                {categorySort !== 'amount_asc' && categorySort !== 'amount_desc' && <span className="ml-1 text-[9px] opacity-30">⬍</span>}
                              </th>
                              <th 
                                className="pb-2 pl-4 font-bold text-right cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                onClick={() => setCategorySort(categorySort === 'amount_desc' ? 'amount_asc' : 'amount_desc')}
                              >
                                Annual
                                {categorySort === 'amount_asc' && <span className="ml-1 text-[9px] text-zinc-500">▲</span>}
                                {categorySort === 'amount_desc' && <span className="ml-1 text-[9px] text-zinc-500">▼</span>}
                                {categorySort !== 'amount_asc' && categorySort !== 'amount_desc' && <span className="ml-1 text-[9px] opacity-30">⬍</span>}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100/50 dark:divide-zinc-800/20">
                            {expensesByCategory.map(cat => (
                              <tr key={cat.categoryId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: cat.color }} />
                                    <span className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-[160px]" title={cat.name}>
                                      {cat.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 pl-4 text-right font-mono font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                                  ${Math.round(cat.monthly).toLocaleString()}
                                </td>
                                <td className="py-2 pl-4 text-right font-mono font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                                  ${Math.round(cat.annual).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {expensesByCategory.length > 0 && (
                    <div className="w-full sm:w-[320px] lg:w-[360px] h-[280px] shrink-0 mx-auto sm:mx-0">
                       <ResponsiveContainer key={currentlyViewingScenarioId || 'default'} initialDimension={{ width: 800, height: 400 }} width="100%" height="100%">
                          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Pie
                              data={expensesByCategory}
                              dataKey="monthly"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={2}
                              stroke="none"
                              label={renderCustomExpenseLabel}
                              labelLine={{
                                stroke: isNightWatch ? '#7f1d1d' : (isDark ? '#52525b' : '#d4d4d8'),
                                strokeWidth: 1,
                                strokeDasharray: '2 2'
                              }}
                            >
                              {expensesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => `$${Math.round(value).toLocaleString()}`}
                              contentStyle={{
                                borderRadius: '12px',
                                border: `1px solid ${tooltipBorder}`,
                                backgroundColor: tooltipBg,
                                color: tooltipTexColor,
                                fontSize: '12px',
                                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)'
                              }}
                              itemStyle={{ color: tooltipTexColor, fontWeight: 'bold' }}
                            />
                          </PieChart>
                       </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Form to insert a new expense */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-zinc-950 dark:text-zinc-50">Create Planned Expense</h4>
                
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Expense Name</label>
                    <input
                      type="text"
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      placeholder="e.g. Health Insurance"
                      value={newExpense.name}
                      onChange={e => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Category</label>
                    <select
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      value={newExpense.categoryId}
                      onChange={e => setNewExpense(prev => ({ ...prev, categoryId: e.target.value }))}
                    >
                      <option value="">No Category</option>
                      {sortedCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Frequency</label>
                    <select
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      value={newExpense.frequency}
                      onChange={e => setNewExpense(prev => ({ ...prev, frequency: e.target.value as any }))}
                    >
                      <option value="Monthly">Monthly Cycle</option>
                      <option value="Annual">Annual Cycle</option>
                    </select>
                  </div>

                  {/* Valuation Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Valuation Model</label>
                    <select
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      value={newExpense.valuationType}
                      onChange={e => setNewExpense(prev => ({ ...prev, valuationType: e.target.value as any, relationalTargetId: '' }))}
                    >
                      <option value="Static">Static Amount (Flat $)</option>
                      <option value="Relational">Relational (% link)</option>
                    </select>
                  </div>

                  {/* Static Amount Field */}
                  {newExpense.valuationType === 'Static' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Flat Amount ($)</label>
                      <input
                        type="number"
                        className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                        value={newExpense.staticAmount}
                        onChange={e => setNewExpense(prev => ({ ...prev, staticAmount: Math.max(0, Number(e.target.value)) }))}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Relational Target Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Relational Anchor</label>
                        <select
                          className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                          value={newExpense.relationalTargetId}
                          onChange={e => setNewExpense(prev => ({ ...prev, relationalTargetId: e.target.value }))}
                          required
                        >
                          <option value="">Select Anchor Target...</option>
                          <optgroup label="Static Assets">
                            {assets.map(a => (
                              <option key={a.id} value={a.id}>{a.name} Asset (${a.value.toLocaleString()})</option>
                            ))}
                          </optgroup>
                          <optgroup label="Planned Expenses">
                            {expenses.map(exp => (
                              <option key={exp.id} value={exp.id}>{exp.name} Expense</option>
                            ))}
                          </optgroup>
                          <optgroup label="Categories Aggregate">
                            {sortedCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.name} Category Total</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Relational Percent */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Percent Link (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                          value={newExpense.relationalPercent}
                          onChange={e => setNewExpense(prev => ({ ...prev, relationalPercent: Number(e.target.value) }))}
                        />
                      </div>
                    </>
                  )}

                  {/* Renewal Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Renewal Date</label>
                    <input
                      type="date"
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      value={newExpense.renewalDate || ''}
                      onChange={e => setNewExpense(prev => ({ ...prev, renewalDate: e.target.value }))}
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Documentation & Notes</label>
                    <input
                      type="text"
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                      placeholder="e.g. Quote valid through Q4 2026."
                      value={newExpense.notes}
                      onChange={e => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  {/* Supporting URL Attachments */}
                  <div className="sm:col-span-2 lg:col-span-3 space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase block">Supporting Named Links</label>
                    
                    {/* Render existing links in the list to be added */}
                    {newExpenseLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 rounded-xl">
                        {newExpenseLinks.map((link, idx) => (
                          <div 
                            key={idx} 
                            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border shadow-sm transition-all ${
                              activeIndexNewExpenseLinkEdit === idx 
                                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-800 dark:text-blue-200" 
                                : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <LinkIcon size={12} className="text-zinc-400" />
                            <span className="font-bold">{link.name || "Unnamed Link"}:</span>
                            <span className="text-zinc-400 font-mono text-[10px] truncate max-w-[150px]">{link.url}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveIndexNewExpenseLinkEdit(idx);
                                setNewLinkName(link.name);
                                setNewLinkUrl(link.url);
                              }}
                              className="text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 p-1 rounded-lg transition"
                              title="Edit link"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeIndexNewExpenseLinkEdit === idx) {
                                  setActiveIndexNewExpenseLinkEdit(null);
                                  setNewLinkName('');
                                  setNewLinkUrl('');
                                }
                                setNewExpenseLinks(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 p-1 rounded-lg transition"
                              title="Remove link"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form to insert/edit a named link */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Link Label/Name (e.g. Agreement Contract)"
                        className="flex-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                        value={newLinkName}
                        onChange={e => setNewLinkName(e.target.value)}
                      />
                      <input
                        type="url"
                        placeholder="Link URL (https://...)"
                        className="flex-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[44px]"
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                      />
                      {activeIndexNewExpenseLinkEdit !== null ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!newLinkUrl.trim()) return;
                              let targetUrl = newLinkUrl.trim();
                              if (!/^https?:\/\//i.test(targetUrl)) {
                                targetUrl = 'https://' + targetUrl;
                              }
                              setNewExpenseLinks(prev => {
                                const updated = [...prev];
                                updated[activeIndexNewExpenseLinkEdit] = { name: newLinkName.trim(), url: targetUrl };
                                return updated;
                              });
                              setActiveIndexNewExpenseLinkEdit(null);
                              setNewLinkName('');
                              setNewLinkUrl('');
                            }}
                            className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                          >
                            <Check size={14} /> Update Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveIndexNewExpenseLinkEdit(null);
                              setNewLinkName('');
                              setNewLinkUrl('');
                            }}
                            className="px-4 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                            title="Cancel Editing"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!newLinkUrl.trim()) return;
                            let targetUrl = newLinkUrl.trim();
                            if (!/^https?:\/\//i.test(targetUrl)) {
                              targetUrl = 'https://' + targetUrl;
                            }
                            setNewExpenseLinks(prev => [...prev, { name: newLinkName.trim(), url: targetUrl }]);
                            setNewLinkName('');
                            setNewLinkUrl('');
                          }}
                          className="px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                        >
                          <Plus size={14} /> Add Link
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isComputing}
                      className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-zinc-100 dark:text-zinc-950 px-6 py-2.5 rounded-xl font-bold transition text-xs flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
                    >
                      <Plus size={16} /> Add Planned Expense
                    </button>
                  </div>
                </form>
              </div>

              {/* Grid of existing planned expenses */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <span>Simulated Master Ledger</span>
                    {isComputing && <span className="animate-pulse text-blue-500 text-[10px] lowercase font-normal">(computing...)</span>}
                  </p>

                  {/* Sorting Controls */}
                  {calculatedExpenses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mr-1.5">Sort:</span>
                      
                      <button
                        type="button"
                        onClick={() => setLedgerSort('category_name')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all uppercase tracking-wider ${
                          ledgerSort === 'category_name'
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Default
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSort('expense_name_asc')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all flex items-center gap-1 uppercase tracking-wider ${
                          ledgerSort === 'expense_name_asc'
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Name <span className="text-[9px]">▲</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSort('expense_name_desc')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all flex items-center gap-1 uppercase tracking-wider ${
                          ledgerSort === 'expense_name_desc'
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Name <span className="text-[9px]">▼</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setLedgerSort('annual_asc')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all flex items-center gap-1 uppercase tracking-wider ${
                          ledgerSort === 'annual_asc'
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Annual Base <span className="text-[9px]">▲</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setLedgerSort('annual_desc')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border transition-all flex items-center gap-1 uppercase tracking-wider ${
                          ledgerSort === 'annual_desc'
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 dark:bg-zinc-900 border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Annual Base <span className="text-[9px]">▼</span>
                      </button>
                    </div>
                  )}
                </div>

                {calculatedExpenses.length > 0 && (
                  <div className="hidden md:grid grid-cols-12 gap-4 px-5 pt-6 pb-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 select-none items-end">
                    <div 
                      className="col-span-3 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                      onClick={() => setLedgerSort(ledgerSort === 'expense_name_asc' ? 'expense_name_desc' : 'expense_name_asc')}
                      title="Toggle expense name sort order"
                    >
                      Expense Name & Info
                      {ledgerSort === 'expense_name_asc' && <span className="text-[9px] text-zinc-500">▲</span>}
                      {ledgerSort === 'expense_name_desc' && <span className="text-[9px] text-zinc-500">▼</span>}
                      {ledgerSort !== 'expense_name_asc' && ledgerSort !== 'expense_name_desc' && <span className="text-[9px] opacity-30">⬍</span>}
                    </div>
                    <div 
                      className="col-span-2 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                      onClick={() => setLedgerSort('category_name')}
                      title="Sort by Category, then Expense Name"
                    >
                      Category
                      {ledgerSort === 'category_name' && <span className="text-[9px] text-zinc-500">▲</span>}
                      {ledgerSort !== 'category_name' && <span className="text-[9px] opacity-30">⬍</span>}
                    </div>
                    <div className="col-span-1">Renewal</div>
                    <div className="col-span-2 text-right">Monthly</div>
                    <div 
                      className="col-span-2 text-right cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center justify-end gap-1"
                      onClick={() => setLedgerSort(ledgerSort === 'annual_desc' ? 'annual_asc' : 'annual_desc')}
                      title="Toggle annual expense sort order"
                    >
                      Annual
                      {ledgerSort === 'annual_asc' && <span className="text-[9px] text-zinc-500">▲</span>}
                      {ledgerSort === 'annual_desc' && <span className="text-[9px] text-zinc-500">▼</span>}
                      {ledgerSort !== 'annual_asc' && ledgerSort !== 'annual_desc' && <span className="text-[9px] opacity-30">⬍</span>}
                    </div>
                    <div className="col-span-2 text-right pr-2">Actions</div>
                  </div>
                )}

                {calculatedExpenses.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 p-12 text-center text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    No planned expenses yet. Add static or relational entries using the form above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedCalculatedExpenses.map(exp => {
                      const categoryObj = categories.find(c => c.id === exp.categoryId);
                      const targetName = exp.valuationType === 'Relational'
                        ? (assets.find(a => a.id === exp.relationalTargetId)?.name ||
                           categories.find(c => c.id === exp.relationalTargetId)?.name ||
                           expenses.find(e => e.id === exp.relationalTargetId)?.name ||
                           'Unknown Target')
                        : '';

                      const isEditing = editingExpenseId === exp.id;
                      if (isEditing) {
                        return (
                          <div
                            key={exp.id}
                            className="bg-white dark:bg-zinc-900 border-2 border-blue-600 dark:border-blue-500 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm transition-all"
                          >
                            <h5 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                              <Edit2 size={14} className="text-blue-500" /> Edit Planned Expense
                            </h5>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Name field */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Expense Name</label>
                                <input
                                  type="text"
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseName}
                                  onChange={e => setEditingExpenseName(e.target.value)}
                                  required
                                />
                              </div>

                              {/* Category selection */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Category</label>
                                <select
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseCategoryId || ''}
                                  onChange={e => setEditingExpenseCategoryId(e.target.value)}
                                >
                                  <option value="">No Category</option>
                                  {sortedCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Frequency selection */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Frequency</label>
                                <select
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseFrequency}
                                  onChange={e => setEditingExpenseFrequency(e.target.value as any)}
                                >
                                  <option value="Monthly">Monthly Cycle</option>
                                  <option value="Annual">Annual Cycle</option>
                                </select>
                              </div>

                              {/* Valuation Type */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Valuation Model</label>
                                <select
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseValuationType}
                                  onChange={e => setEditingExpenseValuationType(e.target.value as any)}
                                >
                                  <option value="Static">Static Amount (Flat $)</option>
                                  <option value="Relational">Relational (% link)</option>
                                </select>
                              </div>

                              {/* Static of Relational details */}
                              {editingExpenseValuationType === 'Static' ? (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Flat Amount ($)</label>
                                  <input
                                    type="number"
                                    className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                    value={editingExpenseStaticAmount}
                                    onChange={e => setEditingExpenseStaticAmount(Number(e.target.value))}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Relational Anchor</label>
                                    <select
                                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                      value={editingExpenseRelationalTargetId}
                                      onChange={e => setEditingExpenseRelationalTargetId(e.target.value)}
                                      required
                                    >
                                      <option value="">Select Anchor Target...</option>
                                      <optgroup label="Static Assets">
                                        {assets.map(a => (
                                          <option key={a.id} value={a.id}>{a.name} Asset (${a.value.toLocaleString()})</option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Planned Expenses">
                                        {expenses.filter(e => e.id !== exp.id).map(e => (
                                          <option key={e.id} value={e.id}>{e.name} Expense</option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Categories Aggregate">
                                        {sortedCategories.map(c => (
                                          <option key={c.id} value={c.id}>{c.name} Category Total</option>
                                        ))}
                                      </optgroup>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Percent Link (%)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                      value={editingExpenseRelationalPercent}
                                      onChange={e => setEditingExpenseRelationalPercent(Number(e.target.value))}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Renewal Date */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Renewal Date</label>
                                <input
                                  type="date"
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseRenewalDate || ''}
                                  onChange={e => setEditingExpenseRenewalDate(e.target.value)}
                                />
                              </div>

                              {/* Included / Active checkbox */}
                              <div className="space-y-1 flex items-center h-full pt-4 pl-1">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={!editingExpenseExcluded}
                                    onChange={e => setEditingExpenseExcluded(!e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-750 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Included in calculations</span>
                                </label>
                              </div>

                              {/* Notes */}
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Notes & Documentation</label>
                                <input
                                  type="text"
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                  value={editingExpenseNotes}
                                  onChange={e => setEditingExpenseNotes(e.target.value)}
                                />
                              </div>

                              {/* URLs support */}
                              <div className="sm:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Supporting Named Links</label>
                                
                                {editingExpenseLinks.length > 0 && (
                                  <div className="flex flex-wrap gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                    {editingExpenseLinks.map((link, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-sm transition-all ${
                                          activeIndexEditExpenseLinkEdit === idx 
                                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-800 dark:text-blue-200" 
                                            : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                                        }`}
                                      >
                                        <LinkIcon size={12} className="text-zinc-400" />
                                        <span className="font-bold">{link.name || "Unnamed Link"}:</span>
                                        <span className="text-zinc-400 font-mono text-[10px] truncate max-w-[124px]">{link.url}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveIndexEditExpenseLinkEdit(idx);
                                            setEditLinkName(link.name);
                                            setEditLinkUrl(link.url);
                                          }}
                                          className="text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 p-0.5 rounded transition"
                                          title="Edit link"
                                        >
                                          <Edit2 size={10} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (activeIndexEditExpenseLinkEdit === idx) {
                                              setActiveIndexEditExpenseLinkEdit(null);
                                              setEditLinkName('');
                                              setEditLinkUrl('');
                                            }
                                            setEditingExpenseLinks(prev => prev.filter((_, i) => i !== idx));
                                          }}
                                          className="text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 p-0.5 rounded transition"
                                          title="Remove link"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Form to insert/edit a link */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    placeholder="Label Name (e.g. Agreement Contract)"
                                    className="flex-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                    value={editLinkName}
                                    onChange={e => setEditLinkName(e.target.value)}
                                  />
                                  <input
                                    type="url"
                                    placeholder="URL (https://...)"
                                    className="flex-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                    value={editLinkUrl}
                                    onChange={e => setEditLinkUrl(e.target.value)}
                                  />
                                  {activeIndexEditExpenseLinkEdit !== null ? (
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!editLinkUrl.trim()) return;
                                          let targetUrl = editLinkUrl.trim();
                                          if (!/^https?:\/\//i.test(targetUrl)) {
                                            targetUrl = 'https://' + targetUrl;
                                          }
                                          setEditingExpenseLinks(prev => {
                                            const updated = [...prev];
                                            updated[activeIndexEditExpenseLinkEdit] = { name: editLinkName.trim(), url: targetUrl };
                                            return updated;
                                          });
                                          setActiveIndexEditExpenseLinkEdit(null);
                                          setEditLinkName('');
                                          setEditLinkUrl('');
                                        }}
                                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 min-h-[38px] cursor-pointer"
                                      >
                                        <Check size={12} /> Update Link
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveIndexEditExpenseLinkEdit(null);
                                          setEditLinkName('');
                                          setEditLinkUrl('');
                                        }}
                                        className="px-3 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-205 font-bold text-xs rounded-xl transition flex items-center justify-center min-h-[38px] cursor-pointer"
                                        title="Cancel Editing"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!editLinkUrl.trim()) return;
                                        let targetUrl = editLinkUrl.trim();
                                        if (!/^https?:\/\//i.test(targetUrl)) {
                                          targetUrl = 'https://' + targetUrl;
                                        }
                                        setEditingExpenseLinks(prev => [...prev, { name: editLinkName.trim(), url: targetUrl }]);
                                        setEditLinkName('');
                                        setEditLinkUrl('');
                                      }}
                                      className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 min-h-[38px] cursor-pointer"
                                    >
                                      <Plus size={12} /> Add Link
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleUpdateExpense(exp.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold min-h-[38px] cursor-pointer"
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExpenseId(null)}
                                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl transition flex items-center justify-center gap-1 text-xs font-semibold min-h-[38px] cursor-pointer"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={exp.id}
                          className={`bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-2.5 sm:py-3 sm:px-5 hover:shadow-sm transition-all ${exp.excluded ? 'opacity-65 grayscale-[30%] bg-zinc-50/50 dark:bg-zinc-950/20' : ''}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center w-full">
                               {/* Column 1: name, notes, links */}
                            <div className="col-span-1 md:col-span-3 space-y-1">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  id={`chk-exclude-${exp.id}`}
                                  checked={!exp.excluded}
                                  onChange={() => handleToggleExclude(exp.id, !!exp.excluded)}
                                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-750 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                                  title={exp.excluded ? "Include in budget calculations" : "Exclude from budget calculations"}
                                />
                                <h5 className={`font-bold text-zinc-900 dark:text-zinc-100 break-words text-sm sm:text-base leading-snug ${exp.excluded ? 'line-through text-zinc-400 dark:text-zinc-550' : ''}`}>
                                  {exp.name}
                                </h5>
                              </div>
                              {exp.notes && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 font-medium italic break-words leading-relaxed">
                                  {exp.notes}
                                </p>
                              )}
                              {/* URLs lists */}
                              {exp.urls && exp.urls.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {exp.urls.map((item: any, idx: number) => {
                                    const linkUrl = typeof item === 'string' ? item : item?.url || '';
                                    const linkName = typeof item === 'string' ? '' : item?.name || '';
                                    if (!linkUrl) return null;
                                    return (
                                      <a
                                        key={idx}
                                        href={linkUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition truncate max-w-full"
                                      >
                                        <LinkIcon size={12} className="text-zinc-400 shrink-0" />
                                        <span className="truncate">{linkName || `Link #${idx + 1}`}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Column 2: Category */}
                            <div className="col-span-1 md:col-span-2">
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider md:hidden block mb-1">Category</span>
                              {categoryObj ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg max-w-full flex-wrap whitespace-normal bg-opacity-10 opacity-100" style={{ backgroundColor: `${categoryObj.color}15`, color: categoryObj.color }}>
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: categoryObj.color }} />
                                  <span className="break-words whitespace-normal leading-tight max-w-[140px]">{categoryObj.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-550 italic">No Category</span>
                              )}
                            </div>

                            {/* Column 3: Renewal (frequency and optional date) */}
                            <div className="col-span-1 md:col-span-1 space-y-1">
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider md:hidden block mb-1">Renewal</span>
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-md font-mono uppercase font-bold tracking-wider inline-block">
                                  {exp.frequency?.toUpperCase()}
                                </span>
                                {exp.renewalDate && (
                                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                                    {exp.renewalDate}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Column 4: Monthly */}
                            <div className="col-span-1 md:col-span-2 text-right">
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider md:hidden mb-1 text-right">Monthly</p>
                              <p className="text-base font-mono font-bold text-zinc-800 dark:text-zinc-200 text-right">
                                ${Math.round(exp.monthlyValue || 0).toLocaleString()}
                              </p>
                            </div>

                            {/* Column 5: Annual */}
                            <div className="col-span-1 md:col-span-2 text-right md:border-l md:border-zinc-100 dark:md:border-zinc-800 md:pl-2">
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider md:hidden mb-1 text-right">Annual</p>
                              <p className="text-base font-mono font-bold text-zinc-800 dark:text-zinc-200 text-right">
                                ${Math.round(exp.annualValue || 0).toLocaleString()}
                              </p>
                            </div>

                            {/* Column 6: Actions */}
                            <div className="col-span-1 md:col-span-2 flex flex-row items-center justify-start md:justify-end gap-0.5 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-zinc-800">
                              <button
                                onClick={() => {
                                  setEditingExpenseId(exp.id);
                                  setEditingExpenseName(exp.name || '');
                                  setEditingExpenseCategoryId(exp.categoryId || '');
                                  setEditingExpenseFrequency(exp.frequency || 'Monthly');
                                  setEditingExpenseValuationType(exp.valuationType || 'Static');
                                  setEditingExpenseStaticAmount(Number(exp.staticAmount || 1000));
                                  setEditingExpenseRelationalTargetId(exp.relationalTargetId || '');
                                  setEditingExpenseRelationalPercent(Number(exp.relationalPercent || 5));
                                  setEditingExpenseNotes(exp.notes || '');
                                  setEditingExpenseRenewalDate(exp.renewalDate || '');
                                  const normalized = (exp.urls || []).map((u: any) => {
                                    if (typeof u === 'string') return { url: u, name: '' };
                                    return { url: u?.url || '', name: u?.name || '' };
                                  });
                                  setEditingExpenseLinks(normalized);
                                  setEditLinkName('');
                                  setEditLinkUrl('');
                                  setActiveIndexEditExpenseLinkEdit(null);
                                }}
                                className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                                title="Edit Planned Expense"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                                title="Delete Planned Expense"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Computational Engine Info Block */}
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Computational Engine</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Kahn’s Algorithm resolves relational formulas by checking dependency ranks. Deletion attempts on parent assets/categories are strictly halted locally in IndexedDB using schema filters.
                </p>
              </div>

            </div>
          )}

          {/* TARGET ASSETS PANEL - Manage active asset links */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              
              {/* Form to insert asset */}
              <form onSubmit={handleAddAsset} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Asset Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Residence"
                    className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none min-h-[44px]"
                    value={newAsset.name}
                    onChange={e => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Estimated Value ($)</label>
                  <input
                    type="number"
                    className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none min-h-[44px]"
                    value={newAsset.value}
                    onChange={e => setNewAsset(prev => ({ ...prev, value: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Asset Class</label>
                    <select
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 p-3 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none min-h-[44px]"
                      value={newAsset.type}
                      onChange={e => setNewAsset(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Brokerage">Brokerage Portfolio</option>
                      <option value="PreTax">Pre-tax IRA/401k</option>
                      <option value="Roth">Roth IRA</option>
                      <option value="Property">Real Property</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-zinc-100 dark:text-zinc-950 px-4 rounded-xl font-bold transition flex items-center justify-center min-w-[44px] min-h-[44px] shrink-0 cursor-pointer"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </form>

              {/* Assets list */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800">
                  <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-300">Registered Static Assets</h4>
                </div>
                {assets.length === 0 ? (
                  <p className="text-center text-xs text-zinc-500 py-12">No assets logged. Create assets to use relational calculations like property maintenance percentage formulas.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {assets.map(ast => {
                      const isEditing = editingAssetId === ast.id;
                      return (
                        <div key={ast.id} className="p-4 transition-colors">
                          {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end w-full">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Asset Name</label>
                                <input
                                  type="text"
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none min-h-[38px] focus:border-blue-500"
                                  value={editingAssetName}
                                  onChange={e => setEditingAssetName(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Balance ($)</label>
                                <input
                                  type="number"
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none min-h-[38px] focus:border-blue-500"
                                  value={editingAssetValue}
                                  onChange={e => setEditingAssetValue(Number(e.target.value))}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">Class Type</label>
                                <select
                                  className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none min-h-[38px] focus:border-blue-500"
                                  value={editingAssetType}
                                  onChange={e => setEditingAssetType(e.target.value)}
                                >
                                  <option value="Brokerage">Brokerage Portfolio</option>
                                  <option value="PreTax">Pre-tax IRA/401k</option>
                                  <option value="Roth">Roth IRA</option>
                                  <option value="Property">Real Property</option>
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end min-h-[38px] items-center">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAsset(ast.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition flex items-center justify-center min-w-[38px] min-h-[38px] cursor-pointer"
                                  title="Save changes"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssetId(null)}
                                  className="bg-zinc-105 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 p-2 rounded-xl transition flex items-center justify-center min-w-[38px] min-h-[38px] cursor-pointer"
                                  title="Cancel editing"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 rounded-xl -m-2 p-2 transition-colors">
                              <div>
                                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{ast.name}</p>
                                <p className="text-xs text-zinc-400 italic">Type: {ast.type}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-sm mr-2">
                                  ${Number(ast.value).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingAssetId(ast.id);
                                    setEditingAssetName(ast.name || '');
                                    setEditingAssetValue(ast.value || 0);
                                    setEditingAssetType(ast.type || 'Brokerage');
                                  }}
                                  className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-950/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition cursor-pointer"
                                  title="Edit Asset"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(ast.id)}
                                  className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition cursor-pointer"
                                  title="Delete Asset"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CATEGORIES TAB - Manage budget aggregations */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              
              {/* Form to insert categories */}
              <form onSubmit={handleAddCategory} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="space-y-1.5 flex-1 w-full">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Housing, Fun, Boat Maintenance"
                      className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 p-3 border border-zinc-100 dark:border-zinc-805 rounded-xl outline-none min-h-[44px]"
                      value={newCategory.name}
                      onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-zinc-105 dark:text-zinc-950 px-6 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1 min-h-[44px] cursor-pointer w-full md:w-auto"
                  >
                    <Plus size={16} /> Create Category
                  </button>
                </div>

                <CategoryColorPicker
                  selectedColor={newCategory.color}
                  onChangeColor={(c) => setNewCategory(prev => ({ ...prev, color: c }))}
                  inUseColors={inUseColors}
                />
              </form>

              {/* Categories list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.length === 0 ? (
                  <p className="col-span-full text-center text-xs text-zinc-500 py-12">No categories defined. Organize your planned expenses into granular buckets above.</p>
                ) : (
                  categories.map(cat => {
                    const isEditing = editingCategoryId === cat.id;
                    return (
                      <div key={cat.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm border-l-4 transition-all duration-200" style={{ borderLeftColor: isEditing ? editingCategoryColor : cat.color }}>
                        {isEditing ? (
                          <div className="space-y-4 w-full">
                            <div className="space-y-1.5 w-full">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Category Name</label>
                              <input
                                type="text"
                                className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-blue-500 min-h-[38px]"
                                value={editingCategoryName}
                                onChange={e => setEditingCategoryName(e.target.value)}
                                required
                              />
                            </div>

                            <CategoryColorPicker
                              selectedColor={editingCategoryColor}
                              onChangeColor={setEditingCategoryColor}
                              inUseColors={inUseColors}
                            />

                            <div className="flex gap-2 justify-end min-h-[38px] items-center pt-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateCategory(cat.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs rounded-xl font-bold transition flex items-center justify-center gap-1 min-h-[38px] cursor-pointer"
                                title="Save changes"
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-xs rounded-xl font-bold transition flex items-center justify-center gap-1 min-h-[38px] cursor-pointer"
                                title="Cancel editing"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <h5 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{cat.name}</h5>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name || '');
                                  setEditingCategoryColor(cat.color || '#3b82f6');
                                }}
                                className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-950/10 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                                title="Edit Category Name & Color"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

      </div>
    </div>
  );
}

function CategoryColorPicker({
  selectedColor,
  onChangeColor,
  inUseColors
}: {
  selectedColor: string;
  onChangeColor: (color: string) => void;
  inUseColors: string[];
}) {
  const STANDARD_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#ef4444', // Red
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  const normalizedSelected = (selectedColor || '').toLowerCase();

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-3.5 space-y-3.5 w-full">
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Standard Tones</span>
        <div className="flex flex-wrap gap-2">
          {STANDARD_COLORS.map(c => {
            const isSel = normalizedSelected === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChangeColor(c)}
                className="w-7 h-7 rounded-full border-2 transition hover:scale-110 active:scale-95 cursor-pointer relative"
                style={{
                  backgroundColor: c,
                  borderColor: isSel ? '#ffffff' : 'transparent',
                  boxShadow: isSel ? '0 0 0 2px #3b82f6' : 'none'
                }}
                title={`Select standard tone ${c}`}
              >
                {isSel && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {inUseColors.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Tones Already In Use</span>
          <div className="flex flex-wrap gap-2">
            {inUseColors.map((c, idx) => {
              const isSel = normalizedSelected === c.toLowerCase();
              return (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  onClick={() => onChangeColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition hover:scale-110 active:scale-95 cursor-pointer relative"
                  style={{
                    backgroundColor: c,
                    borderColor: isSel ? '#ffffff' : 'transparent',
                    boxShadow: isSel ? '0 0 0 2px #3b82f6' : 'none'
                  }}
                  title={`Select in-use tone ${c}`}
                >
                  {isSel && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-805">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest uppercase">Custom Selector:</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent overflow-hidden"
            value={selectedColor || '#3b82f6'}
            onChange={e => onChangeColor(e.target.value)}
          />
          <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase">{selectedColor || '#3b82f6'}</span>
        </div>
      </div>
    </div>
  );
}
