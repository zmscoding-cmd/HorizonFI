import React, { useEffect, useState } from 'react';
import { getDatabase, startReplication, clearDatabase, PlanType, LinkType, generateUUID } from './lib/db';
import { auth } from './lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Plus, LogOut, Wallet, TrendingUp, Save, ServerCrash, AlertTriangle, HelpCircle, Link as LinkIcon, Search, Trash2, ExternalLink, Copy } from 'lucide-react';
import ScenarioBuilder from './components/ScenarioBuilder';
import { ThemeToggle } from './components/ThemeToggle';
import HelpGuideModal from './components/HelpGuideModal';
import LinksSection from './components/LinksSection';

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [db, setDb] = useState<any>(null);
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [dbInitError, setDbInitError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'synced' | 'error'>('offline');

  useEffect(() => {
    if (!db || !user) {
      setSyncStatus('offline');
      return;
    }

    let cleanupReplication: (() => void) | null = null;

    try {
      cleanupReplication = startReplication(db, (status) => {
        setSyncStatus(status);
      });
    } catch (e) {
      console.error('Error starting replication integration:', e);
    }

    return () => {
      if (cleanupReplication) {
        try {
          cleanupReplication();
        } catch (cleanupErr) {
          console.error('Error during replication cleanup:', cleanupErr);
        }
      }
    };
  }, [db, user]);

  useEffect(() => {
    // Attempt to salvage credentials if redirected back from Google sign-in
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Successfully completed redirect sign-in:', result.user.email);
        }
      })
      .catch((err: any) => {
        console.error('Redirect sign-in lookup error:', err);
        // Avoid showing error if they just canceled
        if (err.code !== 'auth/redirect-cancelled-by-user') {
          setAuthError(err.message || 'Redirect login failed. Please try again.');
        }
      });

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const allowedEmails = ['jesse.laten.shumaker@gmail.com', 'cshumaker81@gmail.com'];
        if (u.email && !allowedEmails.includes(u.email)) {
          await signOut(auth);
          setAuthError('Unauthorized: Your email address is not permitted to access this application.');
          setUser(null);
          setLoading(false);
          return;
        }
        setAuthError(null);
        setUser(u);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      setDb(null);
      setLoading(false);
      return;
    }

    let activeSubscription: any = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        setLoading(true);
        const rxdb = await getDatabase();
        if (isCancelled) return;
        setDb(rxdb);
        setDbInitError(null);

        activeSubscription = rxdb.plans.find().$.subscribe((plansData) => {
          if (isCancelled) return;
          setPlans(plansData.map(p => p.toJSON()));
          setLoading(false);
        });
      } catch (e: any) {
        if (isCancelled) return;
        console.error(e);
        setDbInitError(e.message || 'IndexedDB failed to initialize. Please check your storage availability.');
        setLoading(false);
      }
    };

    setup();

    return () => {
      isCancelled = true;
      if (activeSubscription) {
        try {
          activeSubscription.unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing plans query:', e);
        }
      }
    };
  }, [user]);

  const createPlan = async () => {
    if (!db) {
      setPlanError('Database is not initialized. Please wait a moment or check database status.');
      return;
    }
    if (!user) {
      setPlanError('You must be signed in to create a plan.');
      return;
    }
    setPlanError(null);
    try {
      const newPlan: PlanType = {
        id: generateUUID(),
        name: 'New Shared Plan',
        members: [user.uid],
        scenarios: [
          {
            id: generateUUID(),
            name: 'Baseline Plan',
            budget: { 
              monthlyIncome: 10000, 
              budgetPhases: [{
                phaseId: generateUUID(),
                startYear: new Date().getFullYear(),
                endYear: 2100,
                baselineAmount: 4500 * 12,
                applyLifestyleAdjustment: true,
                lifestyleAdjustmentRate: 2.0
              }],
              inflationRate: 3.0, 
              residencyState: 'FL',
              allocationMode: 'PERCENTAGE',
              buckets: { qualifiedDividends: 0, taxableBrokerage: 0, traditional401kIra: 0, rothIra: 0, nonTaxableGift: 0 },
              blendedCostBasisPercentage: 60.0
            },
            milestones: [{ id: generateUUID(), name: 'Financial Independence', targetAmount: 1500000, targetYear: 2040 }],
            assets: []
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.plans.insert(newPlan);
      console.log('Successfully created new plan', newPlan.id);
    } catch (e: any) {
      console.error('Error creating plan:', e);
      setPlanError(e.message || 'Failed to create new plan.');
    }
  };

  const handleSignOut = async () => {
    try {
      await clearDatabase();
      setDb(null);
      setPlans([]);
    } catch(e) {
      console.error('Failed to clear database', e);
    }
    await signOut(auth);
  };

  const hardReset = async () => {
    setIsResetting(true);
    try {
      await clearDatabase();
    } catch(e) {
      console.error(e);
    }
    window.location.reload();
  };

  const login = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    
    // Apple (iOS, iPadOS, macOS Safari) enforces Apple's Intelligent Tracking Prevention (ITP) which blocks
    // access to third-party authorization cookies inside iframes, breaking signInWithRedirect completely.
    // Therefore, any iOS/iPadOS device (including iPad presenting as Macintosh) MUST use signInWithPopup.
    const isAppleOrSafari = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (typeof navigator.platform === 'string' && /iPad|iPhone|iPod/.test(navigator.platform)) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ||
      (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));

    // Non-Apple mobile devices (like Android Chrome on Galaxy S25) don't have this restriction and are prone to
    // having popups blocked by default, so they utilize signInWithRedirect.
    const isAndroidOrOtherMobile = /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      if (isAppleOrSafari) {
        console.log('Apple/Safari environment detected. Initializing signInWithPopup to bypass Safari ITP redirect issue...');
        await signInWithPopup(auth, provider);
      } else if (isAndroidOrOtherMobile) {
        console.log('Android or other mobile environment detected. Initializing signInWithRedirect...');
        await signInWithRedirect(auth, provider);
      } else {
        console.log('Desktop environment detected. Initializing signInWithPopup...');
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      console.error('Initial login attempt failed:', err);
      // Fallback if popup is blocked on Apple/Desktop
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          console.log('Popup blocked or cancelled. Swapping to redirect as fallback...');
          await signInWithRedirect(auth, provider);
        } catch (redirErr: any) {
          setAuthError(redirErr.message || 'Failed redirection process.');
        }
      } else {
        setAuthError(err.message || 'Failed to sign in.');
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Email and Password are required.');
      return;
    }
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error('Email sign in failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid credentials. Please verify your email and password, or register below.');
      } else {
        setAuthError(err.message || 'Failed to sign in with email and password.');
      }
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Email and Password are required.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    
    const allowedEmails = ['jesse.laten.shumaker@gmail.com', 'cshumaker81@gmail.com'];
    if (!allowedEmails.includes(email.trim().toLowerCase())) {
      setAuthError('Unauthorized: This email address is not permitted to register.');
      return;
    }

    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAuthSuccessMsg('Account registered successfully! Logging you in...');
    } catch (err: any) {
      console.error('Email registration failed:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. If you forgot your password, click "Forgot Password" or login directly.');
      } else {
        setAuthError(err.message || 'Failed to register password.');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError('Please enter your email address first to request a password reset.');
      return;
    }
    setAuthError(null);
    setAuthSuccessMsg(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthSuccessMsg('Password reset link sent to your email. Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setAuthError(err.message || 'Failed to send password reset email.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <p className="font-medium animate-pulse">Loading HorizonFI...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-4 transition-colors">
        <div id="login-theme-toggle-container" className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl dark:shadow-black/45 max-w-md w-full text-center space-y-6 border border-zinc-100 dark:border-zinc-800/80">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">HorizonFI</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Offline-first financial planning for remote environments.</p>
          </div>
          
          {authError && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm p-3.5 rounded-xl border border-red-100 dark:border-red-900/30 text-left whitespace-pre-wrap leading-relaxed">
              {authError}
            </div>
          )}

          {authSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-left whitespace-pre-wrap leading-relaxed">
              {authSuccessMsg}
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={login}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors cursor-pointer min-h-[48px] flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              Sign in with Google
            </button>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Prone to storage-blocking loops on mobile WebKit frames.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-widest">iPad & WebKit Failsafe Fallback</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>

          <form onSubmit={isRegistering ? handleEmailRegister : handleEmailLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="failsafe-email" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Whitelisted Email Address
              </label>
              <input
                id="failsafe-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jesse.laten.shumaker@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="failsafe-password" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Password
                </label>
                {!isRegistering && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer focus:outline-none min-h-[32px] px-1"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                id="failsafe-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition min-h-[44px]"
              />
            </div>

            <div className="pt-2 text-center space-y-3">
              <button
                type="submit"
                className="w-full bg-zinc-850 hover:bg-zinc-700 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 font-semibold py-3 px-4 rounded-xl transition cursor-pointer min-h-[48px] text-sm shadow-sm"
              >
                {isRegistering ? 'Register Failsafe Account' : 'Sign In with Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] px-4 w-full"
              >
                {isRegistering 
                  ? 'Already registered? Click here to Sign In' 
                  : "First time using password failsafe? Register Password"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActivePlanId(null)}
            className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
          >
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tighter text-zinc-900 dark:text-zinc-100">HorizonFI</h1>
          </button>

          {/* Cloud Sync Status Pill */}
          {syncStatus === 'synced' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 transition-all shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium tracking-tight">Synced to Cloud</span>
            </div>
          )}
          {syncStatus === 'syncing' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-105 dark:border-blue-900/30 transition-all shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 animate-pulse"></span>
              </span>
              <span className="text-[11px] font-medium tracking-tight">Syncing data...</span>
            </div>
          )}
          {syncStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 transition-all shadow-sm animate-pulse" title="Sync connection interrupted. Retrying automatically...">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[11px] font-medium tracking-tight">Sync Warning</span>
            </div>
          )}
          {syncStatus === 'offline' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/35 border border-zinc-200 dark:border-zinc-700/30 transition-all">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400 dark:bg-zinc-650"></span>
              </span>
              <span className="text-[11px] font-medium tracking-tight">Offline Mode</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between sm:justify-end">
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-semibold bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus:outline-none" 
            title="Open Technical & Help Guide"
            aria-label="Open Technical & Help Guide"
          >
             <HelpCircle size={18} />
             <span className="hidden sm:inline">Help Guide</span>
          </button>

          <button 
            onClick={() => setShowResetModal(true)} 
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/30 transition shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-red-600 focus:outline-none" 
            title="Hard Reset Database"
            aria-label="Hard Reset Database"
          >
             <ServerCrash size={20} />
          </button>

          <ThemeToggle />

          <div className="flex items-center gap-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold overflow-hidden border border-blue-200 dark:border-blue-900/30">
              {user.photoURL ? <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" /> : user.email?.[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium pr-1.5 hidden sm:block truncate max-w-[150px] text-zinc-800 dark:text-zinc-200">{user.email}</span>
          </div>
          <button 
            onClick={handleSignOut} 
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus:outline-none" 
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 h-full">
        {(dbInitError || planError) && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/35 text-red-650 dark:text-red-400 text-sm p-4 rounded-xl border border-red-200 dark:border-red-900/40 flex items-start gap-3.5 shadow-sm">
            <AlertTriangle className="shrink-0 mt-0.5 text-red-600 dark:text-red-400 animate-pulse" size={18} />
            <div className="space-y-1">
              <h4 className="font-semibold text-red-850 dark:text-red-300 leading-none">Planning / Storage Warning</h4>
              <p className="text-xs leading-relaxed text-red-600 dark:text-red-400/90 whitespace-pre-wrap mt-1">{dbInitError || planError}</p>
              <button 
                onClick={() => { setDbInitError(null); setPlanError(null); }}
                className="text-[10px] uppercase font-bold tracking-wider text-red-700 dark:text-red-300 hover:underline pt-1 block cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activePlanId ? (
           <ScenarioBuilder 
              plan={plans.find(p => p.id === activePlanId)!} 
              db={db} 
              onClose={() => setActivePlanId(null)} 
           />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Your Plans</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage and execute simulation scenarios for financial planning</p>
              </div>
              <button 
                onClick={createPlan}
                className="flex items-center justify-center gap-2 min-h-[44px] bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus:outline-none text-white dark:text-zinc-950 px-5 py-2.5 rounded-xl font-semibold transition cursor-pointer text-sm w-full sm:w-auto border border-transparent dark:border-zinc-700"
              >
                <Plus size={18} /> New Plan
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-16 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 transition-colors">
                <Wallet size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200 mb-1">No plans yet</p>
                <p className="text-sm max-w-md mx-auto text-zinc-500 dark:text-zinc-400">Create a shared household plan to start simulating your financial horizon offline-first.</p>
                <button 
                  onClick={createPlan}
                  className="mt-6 inline-flex items-center justify-center gap-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl transition"
                >
                  Create Plan
                </button>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {plans.map(plan => (
                   <PlanCard key={plan.id} plan={plan} db={db} user={user} onOpen={() => setActivePlanId(plan.id)} />
                ))}
              </div>
            )}
            
            <LinksSection db={db} user={user} />
          </>
        )}
      </main>

      {showResetModal && (
        <div id="reset-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => { if (!isResetting) setShowResetModal(false); }}
          />
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative z-10 flex flex-col gap-5 transform scale-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                <AlertTriangle size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Critical Database Reset
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  ACTION REQUIRED • IRREVERSIBLE
                </p>
              </div>
            </div>

            <div className="text-zinc-650 dark:text-zinc-300 text-sm leading-relaxed space-y-2">
              <p>
                Are you absolutely sure you want to perform a hard reset?
              </p>
              <p className="bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/40">
                This clears all local encrypted IndexedDB records, database structure, and offline cache. All un-synchronized offline changes will be permanently lost.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer text-sm transition animate-none"
              >
                Cancel
              </button>
              <button
                disabled={isResetting}
                onClick={hardReset}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-800/60 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm transition focus-visible:ring-2 focus-visible:ring-red-600"
              >
                {isResetting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting...
                  </>
                ) : (
                  "Yes, Hard Reset"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpGuideModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}

const PlanCard: React.FC<{ plan: PlanType, db: any, user: any, onOpen: () => void }> = ({ plan, db, user, onOpen }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(plan.name);
  }, [plan.name]);

  const save = async () => {
    if (!name.trim()) return;
    const doc = await db.plans.findOne(plan.id).exec();
    await doc.patch({
      name,
      updatedAt: Date.now()
    });
    setEditing(false);
  };

  const deletePlan = async () => {
    if (!db) return;
    try {
      const doc = await db.plans.findOne(plan.id).exec();
      if (doc) {
        await doc.remove();
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const addScenario = async () => {
    const doc = await db.plans.findOne(plan.id).exec();
    const currentScenarios = doc.scenarios || [];
    const newScenario = {
      id: generateUUID(),
      name: `Scenario ${currentScenarios.length + 1}`,
      budget: { monthlyIncome: 10000, budgetPhases: [{ phaseId: generateUUID(), startYear: new Date().getFullYear(), endYear: 2100, baselineAmount: 4500 * 12, applyLifestyleAdjustment: true, lifestyleAdjustmentRate: 2.0 }], inflationRate: 3.0, residencyState: 'FL' },
      milestones: [{ id: generateUUID(), name: 'Financial Independence', targetAmount: 1500000, targetYear: 2040 }],
      assets: [{ id: generateUUID(), name: 'Primary Residence', type: 'property', value: 350000 }]
    };
    await doc.patch({
      scenarios: [...currentScenarios, newScenario],
      updatedAt: Date.now()
    });
  };

  const duplicateScenario = async (scenarioToDup: any) => {
    const doc = await db.plans.findOne(plan.id).exec();
    const currentScenarios = doc.scenarios || [];
    const duplicatedScenario = {
      ...scenarioToDup,
      id: generateUUID(),
      name: `${scenarioToDup.name} (Copy)`
    };
    await doc.patch({
      scenarios: [...currentScenarios, duplicatedScenario],
      updatedAt: Date.now()
    });
  };

  const duplicatePlan = async () => {
    if (!db || !user) return;
    try {
      const newPlan: PlanType = {
        id: generateUUID(),
        name: `${plan.name} (Copy)`,
        members: [user.uid],
        scenarios: (plan.scenarios || []).map(scenario => ({
          ...scenario,
          id: generateUUID()
        })),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.plans.insert(newPlan);
    } catch (err) {
      console.error('Error duplicating plan:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 relative isolate overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 dark:from-red-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/30 p-5 rounded-2xl flex flex-col justify-between z-10">
          <div className="space-y-1.5">
            <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 text-sm">
              <AlertTriangle size={16} />
              Delete Plan?
            </h4>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to delete <strong>{plan.name}</strong>? This action is permanent and cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 min-h-[40px] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-805 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={deletePlan}
              className="flex-1 min-h-[40px] bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="flex gap-2 items-center w-full">
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-xl px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-50 outline-none focus:border-blue-500 dark:focus:border-red-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-red-500/10 text-sm min-h-[44px]"
            autoFocus
          />
          <button 
            onClick={save} 
            className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
            aria-label="Save name"
          >
            <Save size={20}/>
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-start gap-2">
          <h3 
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 cursor-pointer hover:text-blue-600 dark:hover:text-red-450 focus-visible:underline focus:outline-none rounded-sm"
            onClick={() => setEditing(true)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setEditing(true); } }}
            title="Click to rename"
          >
            {plan.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={duplicatePlan}
              className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title="Copy / Duplicate Plan"
            >
              <Copy size={16} />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              title="Delete Plan"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="text-sm font-semibold text-zinc-400 flex items-center gap-3">
        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded-md text-xs font-mono">{plan.scenarios?.length || 0} Scenarios</span>
        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded-md text-xs font-mono">{plan.members?.length || 0} Members</span>
      </div>

      <div className="mt-2 space-y-3 flex-1">
        {plan.scenarios?.map(scenario => (
          <div key={scenario.id} className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl p-3 sm:p-4 text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="space-y-0.5">
              <p className="font-bold text-zinc-800 dark:text-zinc-200">{scenario.name}</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Income: ${scenario.budget.monthlyIncome.toLocaleString()} | {scenario.assets.length} Assets</p>
            </div>
            <button 
              onClick={() => duplicateScenario(scenario)} 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none font-semibold text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200/80 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/10 px-3 py-2 rounded-lg cursor-pointer transition min-h-[44px] flex items-center justify-center sm:self-center"
            >
              Duplicate
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button 
          onClick={addScenario} 
          className="text-zinc-700 dark:text-zinc-350 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 transition cursor-pointer min-h-[44px]"
        >
          <Plus size={16} /> Add Scenario
        </button>
        <button 
          onClick={onOpen} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-1 rounded-xl px-5 py-2.5 transition cursor-pointer min-h-[44px] shadow-sm hover:shadow active:scale-98"
        >
          Open Plan &rarr;
        </button>
      </div>
    </div>
  );
}
