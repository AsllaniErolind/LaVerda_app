import { Expense, WorkDayEntry } from '../types';

const STORAGE_KEY = 'la_verda_expenses_v1';
const WORKDAYS_STORAGE_KEY = 'la_verda_workdays_v1';
const SPREADSHEET_ID_KEY = 'la_verda_spreadsheet_id';


// Initial realistic landscaping expenses for demonstration & instant review
export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_20261016_01',
    date: '2026-10-16',
    category: 'fuel',
    amount: 68.50,
    description: 'Naftë për furgonin e punës (Mercedes Sprinter)',
    createdAt: '2026-10-16T08:15:00.000Z',
    createdBy: 'Arben K.',
    synced: true,
  },
  {
    id: 'exp_20261015_02',
    date: '2026-10-15',
    category: 'coffee',
    amount: 6.80,
    description: 'Kafe mëngjesi & ujë mineral për ekipin',
    createdAt: '2026-10-15T07:45:00.000Z',
    createdBy: 'Genti M.',
    synced: true,
  },
  {
    id: 'exp_20261014_03',
    date: '2026-10-14',
    category: 'food',
    amount: 34.00,
    description: 'Drekë për punëtorët gjatë rregullimit të kopshtit në vilë',
    createdAt: '2026-10-14T12:30:00.000Z',
    createdBy: 'Arben K.',
    synced: true,
  },
  {
    id: 'exp_20261012_04',
    date: '2026-10-12',
    category: 'other',
    amount: 94.50,
    description: 'Fije kosore profesionale 3.0mm dhe vaj motori 2T',
    createdAt: '2026-10-12T15:10:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'exp_20261011_05',
    date: '2026-10-11',
    category: 'fuel',
    amount: 42.00,
    description: 'Benzinë për dy kositëset e barit dhe fryrësen e gjetheve',
    createdAt: '2026-10-11T09:20:00.000Z',
    createdBy: 'Genti M.',
    synced: true,
  },
  {
    id: 'exp_20261009_06',
    date: '2026-10-09',
    category: 'food',
    amount: 29.50,
    description: 'Drekë e shpejtë në terren pas mbjelljes së pemëve',
    createdAt: '2026-10-09T13:00:00.000Z',
    createdBy: 'Arben K.',
    synced: true,
  },
  {
    id: 'exp_20261008_07',
    date: '2026-10-08',
    category: 'coffee',
    amount: 5.50,
    description: 'Kafe dhe lëngje freskuese',
    createdAt: '2026-10-08T10:15:00.000Z',
    createdBy: 'Genti M.',
    synced: true,
  },
  {
    id: 'exp_20261005_08',
    date: '2026-10-05',
    category: 'other',
    amount: 145.00,
    description: 'Plehrë organik për bar (granula) dhe gërshërë krasitjeje',
    createdAt: '2026-10-05T14:40:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'exp_20261003_09',
    date: '2026-10-03',
    category: 'fuel',
    amount: 55.00,
    description: 'Naftë për furgon pas rrugës në depot e pemishtes',
    createdAt: '2026-10-03T16:00:00.000Z',
    createdBy: 'Arben K.',
    synced: true,
  },
  {
    id: 'exp_20261001_10',
    date: '2026-10-01',
    category: 'coffee',
    amount: 7.20,
    description: 'Kafe për ekipin para fillimit të projektit mujor',
    createdAt: '2026-10-01T08:00:00.000Z',
    createdBy: 'Genti M.',
    synced: true,
  },
];

export function getStoredExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSES;
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    return INITIAL_EXPENSES;
  }
}

export function saveExpensesLocally(expenses: Expense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

export const DEFAULT_SPREADSHEET_ID = '1Onit6Ryavye_DFC9IMYC0J_igQuvjcHxbFR9SKfBYQo';

export function getStoredSpreadsheetId(): string {
  try {
    const raw = localStorage.getItem(SPREADSHEET_ID_KEY);
    if (raw && raw.trim()) return raw.trim();
    localStorage.setItem(SPREADSHEET_ID_KEY, DEFAULT_SPREADSHEET_ID);
    return DEFAULT_SPREADSHEET_ID;
  } catch {
    return DEFAULT_SPREADSHEET_ID;
  }
}

export function saveStoredSpreadsheetId(id: string): void {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
}

export function removeStoredSpreadsheetId(): void {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
}

import { getAccessToken } from './firebase';

// Helper to get auth headers with Bearer token if available
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

// ------------------- BACKEND REST API CALLS (PERMANENT & DISCONNECT-PROOF) -------------------

/**
 * Fetch all expenses from backend (which queries Google Sheets or persistent backend storage)
 */
export async function apiFetchExpenses(): Promise<Expense[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/expenses', { headers });
  if (!res.ok) throw new Error(`API fetch error (${res.status})`);
  const data = await res.json();
  if (Array.isArray(data.expenses)) {
    saveExpensesLocally(data.expenses);
    return data.expenses;
  }
  return getStoredExpenses();
}

/**
 * Create a new expense on the backend
 */
export async function apiSaveExpense(expense: Expense): Promise<Expense & { sheetSynced?: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers,
    body: JSON.stringify({ expense }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Backend save failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const saved = data.expense || expense;
  return {
    ...saved,
    synced: data.sheetSynced === true,
    sheetSynced: data.sheetSynced === true,
  };
}

/**
 * Update existing expense on the backend
 */
export async function apiUpdateExpense(expense: Expense): Promise<Expense & { sheetSynced?: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/expenses/${expense.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ expense }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Backend update failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const updated = data.expense || expense;
  return {
    ...updated,
    synced: data.sheetSynced === true,
    sheetSynced: data.sheetSynced === true,
  };
}

/**
 * Delete expense on the backend
 */
export async function apiDeleteExpense(id: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Backend delete failed (${res.status}): ${errText}`);
  }
  return true;
}

/**
 * Push all local expenses to Google Sheets (bulk backfill missing rows)
 */
export async function apiPushAllToSheets(): Promise<{
  success: boolean;
  uploadedCount?: number;
  totalLocal?: number;
  tab?: string;
  sheetId?: string;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/sync/push-to-sheets', {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Sync to Google Sheets failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Batch sync pending operations to backend
 */
export async function apiBatchSyncExpenses(operations: Array<{
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  expense?: Expense;
}>): Promise<{
  success: boolean;
  sheetConnected?: boolean;
  results: Array<{ id: string; success: boolean; error?: string }>;
  expenses?: Expense[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/expenses/sync-batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations }),
  });
  if (!res.ok) {
    throw new Error(`Batch sync failed (${res.status})`);
  }
  return await res.json();
}

export interface BackendStatusResponse {
  connected: boolean;
  credentialType?: 'service_account' | 'oauth_token' | 'none';
  hasServiceAccount: boolean;
  credentialFormatValid?: boolean;
  serviceAccountEmail?: string | null;
  hasToken: boolean;
  sheetId: string | null;
  sheetGid?: string | null;
  tabName?: string | null;
  credentialError?: string | null;
  mode: string;
  message?: string;
}

/**
 * Save Service Account JSON / credentials and Sheet ID to backend with live validation
 */
export async function apiSaveCredentials(payload: {
  serviceAccountJson?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
  sheetId?: string;
  sheetGid?: string;
}): Promise<{
  success: boolean;
  connected?: boolean;
  serviceAccountEmail?: string | null;
  sheetId?: string;
  sheetGid?: string;
  tabName?: string;
  uploadedCount?: number;
  credentialError?: string;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/config/credentials', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ruajtja e kredencialeve dështoi (${res.status})`);
  }
  return data;
}

/**
 * Get backend connection status
 */
export async function apiGetStatus(): Promise<BackendStatusResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/status', { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return {
    connected: false,
    credentialType: 'none',
    hasServiceAccount: false,
    hasToken: false,
    sheetId: null,
    mode: 'offline',
  };
}

/**
 * Exports expenses to downloadable CSV formatted for Excel/Sheets
 */
export function exportExpensesToCSV(expenses: Expense[]): void {
  const headers = ['ID', 'Data', 'Kategoria', 'Shuma (EUR)', 'Pershkrimi', 'Krijuar Me', 'Regjistruar Nga'];
  const rows = expenses.map(e => [
    `"${e.id}"`,
    `"${e.date}"`,
    `"${e.category}"`,
    e.amount.toFixed(2),
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${e.createdAt}"`,
    `"${e.createdBy}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `la-verda-shpenzime-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ------------------- WORKING DAYS STORAGE & API -------------------

export const INITIAL_WORKDAYS: WorkDayEntry[] = [
  {
    id: 'wd_20261016_arben',
    workerId: 'user_arben',
    workerName: 'Arben K.',
    date: '2026-10-16',
    days: 1,
    description: 'Ditë e plotë pune — Kositje dhe rregullim i kopshtit në vilë',
    createdAt: '2026-10-16T16:30:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'wd_20261016_genti',
    workerId: 'user_genti',
    workerName: 'Genti M.',
    date: '2026-10-16',
    days: 1,
    description: 'Ditë e plotë pune — Kositje dhe rregullim i kopshtit në vilë',
    createdAt: '2026-10-16T16:30:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'wd_20261015_arben',
    workerId: 'user_arben',
    workerName: 'Arben K.',
    date: '2026-10-15',
    days: 0.5,
    description: 'Ra shi i rrëmbyeshëm pas orës 12:30 — punëtorët punuan vetëm 1/2 ditë',
    createdAt: '2026-10-15T13:00:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'wd_20261015_genti',
    workerId: 'user_genti',
    workerName: 'Genti M.',
    date: '2026-10-15',
    days: 0.5,
    description: 'Ra shi i rrëmbyeshëm pas orës 12:30 — punëtorët punuan vetëm 1/2 ditë',
    createdAt: '2026-10-15T13:00:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'wd_20261014_arben',
    workerId: 'user_arben',
    workerName: 'Arben K.',
    date: '2026-10-14',
    days: 1,
    description: 'Mbjellje pemësh dekorative dhe plehërim',
    createdAt: '2026-10-14T17:00:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'wd_20261014_genti',
    workerId: 'user_genti',
    workerName: 'Genti M.',
    date: '2026-10-14',
    days: 1,
    description: 'Mbjellje pemësh dekorative dhe plehërim',
    createdAt: '2026-10-14T17:00:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: true,
  },
];


export function getStoredWorkDays(): WorkDayEntry[] {
  try {
    const raw = localStorage.getItem(WORKDAYS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKDAYS_STORAGE_KEY, JSON.stringify(INITIAL_WORKDAYS));
      return INITIAL_WORKDAYS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_WORKDAYS;
  } catch (e) {
    console.error('Failed to read workdays from localStorage:', e);
    return INITIAL_WORKDAYS;
  }
}

export function saveWorkDaysLocally(workdays: WorkDayEntry[]): void {
  try {
    localStorage.setItem(WORKDAYS_STORAGE_KEY, JSON.stringify(workdays));
  } catch (e) {
    console.error('Failed to save workdays to localStorage:', e);
  }
}

export async function apiFetchWorkDays(): Promise<WorkDayEntry[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/workdays', { headers });
  if (!res.ok) throw new Error(`API workdays fetch error (${res.status})`);
  const data = await res.json();
  if (Array.isArray(data.workdays)) {
    saveWorkDaysLocally(data.workdays);
    return data.workdays;
  }
  return getStoredWorkDays();
}

export async function apiSaveWorkDays(
  entries: Array<Omit<WorkDayEntry, 'id' | 'createdAt' | 'synced'> & { id?: string; createdAt?: string }>
): Promise<{ entries: WorkDayEntry[]; workdays: WorkDayEntry[]; sheetSynced: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/workdays', {
    method: 'POST',
    headers,
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Workdays save failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (Array.isArray(data.workdays)) {
    saveWorkDaysLocally(data.workdays);
  }
  return {
    entries: data.entries || [],
    workdays: data.workdays || getStoredWorkDays(),
    sheetSynced: Boolean(data.sheetSynced),
  };
}

export async function apiUpdateWorkDay(
  entry: WorkDayEntry
): Promise<{ entry: WorkDayEntry; workdays: WorkDayEntry[]; sheetSynced: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/workdays/${entry.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ entry }),
  });
  if (!res.ok) {
    throw new Error(`Workday update failed (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data.workdays)) {
    saveWorkDaysLocally(data.workdays);
  }
  return {
    entry: data.entry || entry,
    workdays: data.workdays || getStoredWorkDays(),
    sheetSynced: Boolean(data.sheetSynced),
  };
}

export async function apiDeleteWorkDay(id: string): Promise<WorkDayEntry[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/workdays/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Workday delete failed (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data.workdays)) {
    saveWorkDaysLocally(data.workdays);
    return data.workdays;
  }
  return getStoredWorkDays().filter((w) => w.id !== id);
}

export function exportWorkDaysToCSV(workdays: WorkDayEntry[]): void {
  const headers = ['ID', 'Data', 'Punetori', 'Dite Pune (1 ose 0.5)', 'Pershkrimi / Arsyeja', 'Regjistruar Nga', 'Koha'];
  const rows = workdays.map((w) => [
    `"${w.id}"`,
    `"${w.date}"`,
    `"${w.workerName.replace(/"/g, '""')}"`,
    w.days,
    `"${(w.description || '').replace(/"/g, '""')}"`,
    `"${w.createdBy.replace(/"/g, '""')}"`,
    `"${w.createdAt}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `la-verda-ditet-e-punes-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

