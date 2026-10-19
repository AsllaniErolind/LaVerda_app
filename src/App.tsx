import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Expense, Language, User, WorkDayEntry } from './types';
import { getActiveUser, setActiveUser } from './utils/users';
import { translations } from './i18n/translations';
import {
  getStoredExpenses,
  saveExpensesLocally,
  apiFetchExpenses,
  apiSaveExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  apiBatchSyncExpenses,
  apiGetStatus,
  getStoredWorkDays,
  saveWorkDaysLocally,
  apiFetchWorkDays,
  apiSaveWorkDays,
  apiUpdateWorkDay,
  apiDeleteWorkDay,
} from './services/storage';
import {
  getSyncQueue,
  enqueueSyncItem,
  removeSyncItem,
  recordQueueAttempt,
  getPendingQueueCount,
  scanAndQueueUnsyncedExpenses
} from './services/syncQueue';
import { usePWAInstall } from './hooks/usePWAInstall';

import { TopBar } from './components/TopBar';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { AddExpenseView } from './components/AddExpenseView';
import { WorkDaysView } from './components/WorkDaysView';
import { HistoryView } from './components/HistoryView';
import { AuthModal } from './components/AuthModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { SettingsModal } from './components/SettingsModal';
import { WifiOff, CheckCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('sq');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(() => getActiveUser());
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [workDays, setWorkDays] = useState<WorkDayEntry[]>(() => getStoredWorkDays());

  // Connectivity & Google Sheets state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSheetsConnected, setIsSheetsConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingQueueCount());
  const [syncBanner, setSyncBanner] = useState<{
    text: string;
    type: 'syncing' | 'success';
  } | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Lock to avoid concurrent queue processor executions
  const isProcessingQueueRef = useRef(false);

  // PWA hook
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const t = translations[lang];

  // Ensure workers cannot stay on the 'add' tab if they switch from management to worker
  useEffect(() => {
    if (currentUser.role !== 'management' && activeTab === 'add') {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  /**
   * Process the synchronization queue: retries all pending CREATE/UPDATE/DELETE actions
   * and reconciles local state with Google Sheets and the backend server.
   */
  const processSyncQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    if (!navigator.onLine) {
      setPendingSyncCount(getPendingQueueCount());
      return;
    }

    isProcessingQueueRef.current = true;

    try {
      // 1. Scan local state to ensure any unsynced items are enrolled in the queue
      scanAndQueueUnsyncedExpenses(getStoredExpenses());
      let queue = getSyncQueue();
      setPendingSyncCount(queue.length);

      if (queue.length === 0) {
        isProcessingQueueRef.current = false;
        return;
      }

      setIsSyncing(true);

      // 2. Try high-performance batch sync first
      let batchHandled = false;
      let anySynced = false;
      try {
        const batchPayload = queue.map((q) => ({
          id: q.id,
          action: q.action,
          expense: q.expense,
        }));
        const batchRes = await apiBatchSyncExpenses(batchPayload);
        if (batchRes && Array.isArray(batchRes.results)) {
          batchHandled = true;
          for (const res of batchRes.results) {
            if (res.success) {
              removeSyncItem(res.id);
              anySynced = true;
            } else {
              recordQueueAttempt(res.id, res.error);
            }
          }
          if (batchRes.sheetConnected === false) {
            setIsSheetsConnected(false);
          } else if (anySynced) {
            setIsSheetsConnected(true);
          }
        }
      } catch (batchErr) {
        console.warn('Batch sync endpoint failed, falling back to sequential retry:', batchErr);
      }

      // 3. Fallback sequential execution only if batch endpoint itself threw a network/HTTP error
      queue = getSyncQueue();
      if (!batchHandled && queue.length > 0) {
        for (const item of queue) {
          if (!navigator.onLine) break;

          try {
            if (item.action === 'CREATE' && item.expense) {
              const saved = await apiSaveExpense(item.expense);
              if (saved.sheetSynced) {
                removeSyncItem(item.id);
                anySynced = true;
              } else {
                recordQueueAttempt(item.id, 'Waiting for valid Google Sheets credentials');
                break;
              }
            } else if (item.action === 'UPDATE' && item.expense) {
              const updated = await apiUpdateExpense(item.expense);
              if (updated.sheetSynced) {
                removeSyncItem(item.id);
                anySynced = true;
              } else {
                recordQueueAttempt(item.id, 'Waiting for valid Google Sheets credentials');
                break;
              }
            } else if (item.action === 'DELETE' && item.expense?.id) {
              await apiDeleteExpense(item.expense.id);
              removeSyncItem(item.id);
              anySynced = true;
            }
          } catch (itemErr: any) {
            console.warn(`Retry failed for item ${item.id}:`, itemErr.message);
            recordQueueAttempt(item.id, itemErr.message);
            if (!navigator.onLine) break;
          }
        }
      }

      // 4. Update pending count after queue flush
      const remainingCount = getPendingQueueCount();
      setPendingSyncCount(remainingCount);

      // 5. Full consistency reconciliation with Google Sheets / backend
      if (remainingCount === 0 && anySynced) {
        try {
          const [canonicalExpenses, canonicalWorkDays] = await Promise.all([
            apiFetchExpenses(),
            apiFetchWorkDays(),
          ]);
          setExpenses(canonicalExpenses);
          saveExpensesLocally(canonicalExpenses);
          setWorkDays(canonicalWorkDays);
          saveWorkDaysLocally(canonicalWorkDays);
        } catch {}

        setSyncBanner({
          text: t.syncQueueSuccess,
          type: 'success',
        });
        setTimeout(() => {
          setSyncBanner(null);
        }, 3500);
      } else {
        setSyncBanner(null);
      }
    } catch (err) {
      console.error('Queue processing error:', err);
    } finally {
      setIsSyncing(false);
      isProcessingQueueRef.current = false;
      setPendingSyncCount(getPendingQueueCount());
    }
  }, [t.syncQueueSuccess]);

  // Track online/offline status & trigger automatic queue retry when online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncBanner({
        text: t.backOnlineNotice,
        type: 'syncing',
      });
      // Automatically drain queue and ensure full consistency with Google Sheets
      processSyncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncBanner(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processSyncQueue, t.backOnlineNotice]);

  // Periodic automatic sync check (retries pending queue every 25s if online)
  useEffect(() => {
    const timer = setInterval(() => {
      if (navigator.onLine && getPendingQueueCount() > 0) {
        processSyncQueue();
      }
    }, 25000);

    return () => clearInterval(timer);
  }, [processSyncQueue]);

  // Fetch initial expenses & working days from backend and check status on startup
  useEffect(() => {
    const initApp = async () => {
      setIsSyncing(true);
      try {
        const [fetchedExpenses, fetchedWorkDays, status] = await Promise.all([
          apiFetchExpenses(),
          apiFetchWorkDays(),
          apiGetStatus(),
        ]);
        setExpenses(fetchedExpenses);
        setWorkDays(fetchedWorkDays);
        setIsSheetsConnected(Boolean(status.connected));
        scanAndQueueUnsyncedExpenses(fetchedExpenses);
        setPendingSyncCount(getPendingQueueCount());
      } catch (err) {
        console.warn('Initial load fallback to local:', err);
      } finally {
        setIsSyncing(false);
      }

      // Also process any pending sync queue items accumulated while offline
      if (navigator.onLine) {
        processSyncQueue();
      }
    };

    initApp();
  }, [processSyncQueue]);

  // Save new expense (Management Only)
  const handleSaveExpense = async (
    newExpenseData: Omit<Expense, 'id' | 'createdAt' | 'synced'>
  ): Promise<boolean> => {
    if (currentUser.role !== 'management') return false;

    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      synced: false, // will be flipped to true upon confirmed Google Sheets sync
    };

    // 1. Immediately update UI & local storage (zero wait time for crew members)
    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      saveExpensesLocally(updated);
      return updated;
    });

    // 2. If offline, immediately queue for retry when back online
    if (!navigator.onLine) {
      enqueueSyncItem('CREATE', newExpense);
      setPendingSyncCount(getPendingQueueCount());
      return true;
    }

    // 3. If online, persist to backend and Google Sheets
    try {
      setIsSyncing(true);
      const saved = await apiSaveExpense(newExpense);
      const isSynced = saved.sheetSynced === true;
      const syncedExpense: Expense = { ...saved, synced: isSynced };

      setExpenses((prev) => {
        const updated = prev.map((e) => (e.id === newExpense.id ? syncedExpense : e));
        saveExpensesLocally(updated);
        return updated;
      });

      if (isSynced) {
        setIsSheetsConnected(true);
      } else {
        // Not uploaded to Google Sheets yet, keep queued for retry
        setIsSheetsConnected(false);
        enqueueSyncItem('CREATE', newExpense);
        setPendingSyncCount(getPendingQueueCount());
      }
    } catch (err) {
      console.warn('Backend sync failed, queued for automatic retry:', err);
      enqueueSyncItem('CREATE', newExpense);
      setPendingSyncCount(getPendingQueueCount());
    } finally {
      setIsSyncing(false);
    }

    return true;
  };

  // Update existing expense (Management Only)
  const handleUpdateExpense = async (updatedExpense: Expense): Promise<void> => {
    if (currentUser.role !== 'management') return;

    // 1. Update local state immediately
    setExpenses((prev) => {
      const updated = prev.map((e) =>
        e.id === updatedExpense.id ? { ...updatedExpense, synced: false } : e
      );
      saveExpensesLocally(updated);
      return updated;
    });

    // 2. If offline, enqueue
    if (!navigator.onLine) {
      enqueueSyncItem('UPDATE', updatedExpense);
      setPendingSyncCount(getPendingQueueCount());
      return;
    }

    // 3. If online, call backend
    try {
      setIsSyncing(true);
      const res = await apiUpdateExpense(updatedExpense);
      const isSynced = res.sheetSynced === true;
      setExpenses((prev) => {
        const updated = prev.map((e) =>
          e.id === updatedExpense.id ? { ...updatedExpense, synced: isSynced } : e
        );
        saveExpensesLocally(updated);
        return updated;
      });
      if (!isSynced) {
        enqueueSyncItem('UPDATE', updatedExpense);
        setPendingSyncCount(getPendingQueueCount());
      }
    } catch (err) {
      console.warn('Backend update failed, queued for automatic retry:', err);
      enqueueSyncItem('UPDATE', updatedExpense);
      setPendingSyncCount(getPendingQueueCount());
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete expense (Management Only)
  const handleDeleteExpense = async (expenseId: string): Promise<void> => {
    if (currentUser.role !== 'management') return;

    const existing = expenses.find((e) => e.id === expenseId);

    // 1. Delete from local state immediately
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== expenseId);
      saveExpensesLocally(updated);
      return updated;
    });

    // 2. If offline, enqueue
    if (!navigator.onLine) {
      if (existing) {
        enqueueSyncItem('DELETE', existing);
        setPendingSyncCount(getPendingQueueCount());
      }
      return;
    }

    // 3. If online, call backend
    try {
      setIsSyncing(true);
      await apiDeleteExpense(expenseId);
    } catch (err) {
      console.warn('Backend delete failed, queued for automatic retry:', err);
      if (existing) {
        enqueueSyncItem('DELETE', existing);
        setPendingSyncCount(getPendingQueueCount());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Working Days CRUD (Management Only)
  const handleSaveWorkDays = async (
    entries: Array<Omit<WorkDayEntry, 'id' | 'createdAt' | 'synced'>>
  ): Promise<void> => {
    if (currentUser.role !== 'management') return;

    // Optimistic local update
    const nowIso = new Date().toISOString();
    const optimisticEntries: WorkDayEntry[] = entries.map((item) => ({
      ...item,
      id: `wd_${item.date.replace(/-/g, '')}_${item.workerId}_${Math.random().toString(36).slice(2, 5)}`,
      createdAt: nowIso,
      synced: false,
    }));

    setWorkDays((prev) => {
      let next = [...prev];
      for (const opt of optimisticEntries) {
        const idx = next.findIndex((w) => w.workerId === opt.workerId && w.date === opt.date);
        if (idx >= 0) {
          next[idx] = { ...opt, id: next[idx].id };
        } else {
          next.unshift(opt);
        }
      }
      saveWorkDaysLocally(next);
      return next;
    });

    try {
      setIsSyncing(true);
      const res = await apiSaveWorkDays(entries);
      setWorkDays(res.workdays);
    } catch (err) {
      console.warn('Workday save fallback to local:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateWorkDay = async (entry: WorkDayEntry): Promise<void> => {
    if (currentUser.role !== 'management') return;

    setWorkDays((prev) => {
      const next = prev.map((w) => (w.id === entry.id ? entry : w));
      saveWorkDaysLocally(next);
      return next;
    });

    try {
      setIsSyncing(true);
      const res = await apiUpdateWorkDay(entry);
      setWorkDays(res.workdays);
    } catch (err) {
      console.warn('Workday update fallback to local:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteWorkDay = async (id: string): Promise<void> => {
    if (currentUser.role !== 'management') return;

    setWorkDays((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWorkDaysLocally(next);
      return next;
    });

    try {
      setIsSyncing(true);
      const next = await apiDeleteWorkDay(id);
      setWorkDays(next);
    } catch (err) {
      console.warn('Workday delete fallback to local:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setActiveUser(user);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      {/* Top Application Bar */}
      <TopBar
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'sq' ? 'en' : 'sq'))}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSheetsModal={() => {
          if (currentUser.role === 'management') setIsSheetsModalOpen(true);
        }}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onOpenSettingsModal={() => {
          if (currentUser.role === 'management') setIsSettingsModalOpen(true);
        }}
        isSheetsConnected={isSheetsConnected}
        isSyncing={isSyncing}
        isOnline={isOnline}
        isPwaInstallable={isInstallable}
        isInstalled={isInstalled}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            expenses={expenses}
            workDays={workDays}
            onNavigateToAdd={() => {
              if (currentUser.role === 'management') setActiveTab('add');
            }}
            onNavigateToWorkDays={() => setActiveTab('workdays')}
            onNavigateToHistory={() => setActiveTab('history')}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenSheetsModal={() => {
              if (currentUser.role === 'management') setIsSheetsModalOpen(true);
            }}
            isSheetsConnected={isSheetsConnected}
            isSyncing={isSyncing}
            lang={lang}
          />
        )}

        {activeTab === 'workdays' && (
          <WorkDaysView
            workDays={workDays}
            onSaveWorkDays={handleSaveWorkDays}
            onUpdateWorkDay={handleUpdateWorkDay}
            onDeleteWorkDay={handleDeleteWorkDay}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            lang={lang}
          />
        )}

        {activeTab === 'add' && currentUser.role === 'management' && (
          <AddExpenseView
            onSaveExpense={handleSaveExpense}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isSheetsConnected={isSheetsConnected}
            lang={lang}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            expenses={expenses}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            currentUser={currentUser}
            lang={lang}
          />
        )}
      </main>

      {/* Offline Alert Badge (Non-intrusive bottom notification) */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-40 bg-amber-600 text-white p-3 rounded-2xl flex items-center gap-2.5 shadow-lg text-xs font-semibold animate-fadeIn">
          <WifiOff size={16} className="shrink-0 text-amber-200" />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      {/* Online Auto-Syncing & Completion Toast (Automatic, non-intrusive) */}
      {isOnline && syncBanner && (
        <div
          className={`fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-40 p-3 rounded-2xl flex items-center gap-2.5 shadow-xl text-xs font-bold transition-all animate-fadeIn ${
            syncBanner.type === 'syncing'
              ? 'bg-[#1B4332] text-white border border-emerald-700/60'
              : 'bg-emerald-600 text-white border border-emerald-500'
          }`}
        >
          {syncBanner.type === 'syncing' ? (
            <RefreshCw size={16} className="shrink-0 animate-spin text-emerald-200" />
          ) : (
            <CheckCircle size={16} className="shrink-0 text-white" />
          )}
          <span className="leading-tight">{syncBanner.text}</span>
        </div>
      )}

      {/* Bottom Navigation Tab Bar (Fixed thumb anchor) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'add' && currentUser.role !== 'management') return;
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        lang={lang}
      />

      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        onSyncComplete={async () => {
          setIsSyncing(true);
          try {
            await processSyncQueue();
            const [fresh, freshWorkDays, status] = await Promise.all([
              apiFetchExpenses(),
              apiFetchWorkDays(),
              apiGetStatus(),
            ]);
            setExpenses(fresh);
            setWorkDays(freshWorkDays);
            setIsSheetsConnected(Boolean(status.connected));
            scanAndQueueUnsyncedExpenses(fresh);
            setPendingSyncCount(getPendingQueueCount());
          } finally {
            setIsSyncing(false);
          }
        }}
        isSyncing={isSyncing}
        lang={lang}
      />

      <PWAInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onInstall={install}
        lang={lang}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onActiveUserChange={handleSelectUser}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        isSheetsConnected={isSheetsConnected}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'sq' ? 'en' : 'sq'))}
      />
    </div>
  );
}


