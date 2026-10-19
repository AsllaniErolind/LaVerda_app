import { Expense } from '../types';

export type SyncActionType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  expenseId: string;
  expense: Expense;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const SYNC_QUEUE_KEY = 'la_verda_sync_queue_v2';

/**
 * Retrieve current pending queue from persistent storage
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read sync queue from localStorage:', e);
    return [];
  }
}

/**
 * Persist queue to localStorage
 */
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save sync queue to localStorage:', e);
  }
}

/**
 * Add or update an action in the sync queue with smart deduplication
 */
export function enqueueSyncItem(action: SyncActionType, expense: Expense): SyncQueueItem {
  const currentQueue = getSyncQueue();

  // Deduplication & coalescing logic
  if (action === 'DELETE') {
    // If expense was created locally while offline and never sent to backend,
    // we can simply remove the pending CREATE/UPDATE queue item!
    const pendingCreateIdx = currentQueue.findIndex(
      (item) => item.expenseId === expense.id && item.action === 'CREATE'
    );
    if (pendingCreateIdx >= 0) {
      const filtered = currentQueue.filter((_, idx) => idx !== pendingCreateIdx);
      saveSyncQueue(filtered);
      return {
        id: `cancelled_${expense.id}`,
        action: 'DELETE',
        expenseId: expense.id,
        expense,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
    }
    // Otherwise, filter out any pending UPDATEs and append a DELETE
    const filtered = currentQueue.filter((item) => item.expenseId !== expense.id);
    const deleteItem: SyncQueueItem = {
      id: `sync_del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action: 'DELETE',
      expenseId: expense.id,
      expense,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    saveSyncQueue([...filtered, deleteItem]);
    return deleteItem;
  }

  if (action === 'UPDATE') {
    // If there is already a pending CREATE for this item, update its expense data in place
    const pendingCreateIdx = currentQueue.findIndex(
      (item) => item.expenseId === expense.id && item.action === 'CREATE'
    );
    if (pendingCreateIdx >= 0) {
      currentQueue[pendingCreateIdx].expense = expense;
      saveSyncQueue(currentQueue);
      return currentQueue[pendingCreateIdx];
    }

    // If there is already a pending UPDATE, merge it
    const pendingUpdateIdx = currentQueue.findIndex(
      (item) => item.expenseId === expense.id && item.action === 'UPDATE'
    );
    if (pendingUpdateIdx >= 0) {
      currentQueue[pendingUpdateIdx].expense = expense;
      saveSyncQueue(currentQueue);
      return currentQueue[pendingUpdateIdx];
    }
  }

  if (action === 'CREATE') {
    const existingCreateIdx = currentQueue.findIndex(
      (item) => item.expenseId === expense.id && item.action === 'CREATE'
    );
    if (existingCreateIdx >= 0) {
      currentQueue[existingCreateIdx].expense = expense;
      saveSyncQueue(currentQueue);
      return currentQueue[existingCreateIdx];
    }
  }

  // Otherwise, create a new queue item
  const newItem: SyncQueueItem = {
    id: `sync_${action.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    action,
    expenseId: expense.id,
    expense,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  saveSyncQueue([...currentQueue, newItem]);
  return newItem;
}

/**
 * Remove an item from the queue after successful sync
 */
export function removeSyncItem(id: string): void {
  const current = getSyncQueue();
  const updated = current.filter((item) => item.id !== id);
  saveSyncQueue(updated);
}

/**
 * Record an error / failed attempt for a queue item
 */
export function recordQueueAttempt(id: string, error?: string): void {
  const current = getSyncQueue();
  const updated = current.map((item) =>
    item.id === id
      ? { ...item, attempts: item.attempts + 1, lastError: error }
      : item
  );
  saveSyncQueue(updated);
}

/**
 * Get count of pending sync actions
 */
export function getPendingQueueCount(): number {
  return getSyncQueue().length;
}

/**
 * Clear the entire sync queue
 */
export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch {}
}

/**
 * Ensure any expenses in local storage with synced === false are in the sync queue,
 * and prune any CREATE/UPDATE items that are already confirmed synced === true
 */
export function scanAndQueueUnsyncedExpenses(expenses: Expense[]): number {
  const syncedIds = new Set(expenses.filter((e) => e.synced === true).map((e) => e.id));
  const currentQueue = getSyncQueue().filter(
    (item) => !(item.action !== 'DELETE' && syncedIds.has(item.expenseId))
  );
  saveSyncQueue(currentQueue);

  const queuedIds = new Set(currentQueue.map((item) => item.expenseId));
  let queuedCount = 0;

  for (const exp of expenses) {
    if (exp.synced === false && !queuedIds.has(exp.id)) {
      enqueueSyncItem('CREATE', exp);
      queuedCount++;
    }
  }

  return queuedCount;
}
