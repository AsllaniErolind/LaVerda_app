import { Expense, WorkDayEntry } from '../types';
import { getAccessToken } from './firebase';
import { syncUsersFromSheetData } from '../utils/users';
import {
  extractSheetId,
  extractSheetGid,
  getStoredSheetGid,
  saveStoredSheetGid,
  saveStoredServiceAccount,
  getClientEffectiveToken,
  resolveClientSheetTab,
  reconcileClientExpensesWithSheet,
  appendExpenseToSheet,
  updateExpenseInSheet,
  deleteExpenseFromSheet,
  reconcileClientWorkDaysWithSheet,
  updateWorkDayInSheet,
  deleteWorkDayFromSheet,
  normalizeSheetDate,
} from './googleSheets';

const STORAGE_KEY = 'la_verda_expenses_v1';
const WORKDAYS_STORAGE_KEY = 'la_verda_workdays_v1';
const SPREADSHEET_ID_KEY = 'la_verda_spreadsheet_id';

// Initial expenses snapshot
export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_1792392756154_yfbm',
    date: '2026-10-19',
    category: 'coffee',
    amount: 20,
    description: 'Kafe mëngjesi',
    createdAt: '2026-10-19T06:52:36.154Z',
    createdBy: 'Lemi A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'exp_1792310822326_xwbo',
    date: '2026-10-18',
    category: 'other',
    amount: 66,
    description: 'Pipa digjital',
    createdAt: '2026-10-18T08:07:02.326Z',
    createdBy: 'Lemi A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'exp_1792310442110_qt3t',
    date: '2026-10-18',
    category: 'fuel',
    amount: 50,
    description: 'Drekë për ekipin',
    createdAt: '2026-10-18T08:00:42.110Z',
    createdBy: 'Lemi A. (Menaxhment)',
    synced: true,
  },
  {
    id: 'exp_1792305349450_pzec',
    date: '2026-10-18',
    category: 'other',
    amount: 50,
    createdAt: '2026-10-18T06:35:49.450Z',
    createdBy: 'Armend A.',
    synced: true,
  },
  {
    id: 'exp_1792305112462_e9qg',
    date: '2026-10-18',
    category: 'fuel',
    amount: 199,
    description: 'Drekë për ekipin',
    createdAt: '2026-10-18T06:31:52.462Z',
    createdBy: 'Armend A.',
    synced: true,
  },
  {
    id: 'exp_1792226808688_amj9',
    date: '2026-10-17',
    category: 'fuel',
    amount: 54.6,
    description: 'Naft per kombi',
    createdAt: '2026-10-17T08:46:48.688Z',
    createdBy: 'Armend A.',
    synced: true,
  },
  {
    id: 'exp_1792226302737_0adu',
    date: '2026-10-17',
    category: 'other',
    amount: 88,
    createdAt: '2026-10-17T08:38:22.737Z',
    createdBy: 'Pipo A.',
    synced: true,
  },
  {
    id: 'exp_1792214345141_yfz8',
    date: '2026-10-17',
    category: 'fuel',
    amount: 155,
    description: 'Naftë për furgonin',
    createdAt: '2026-10-17T05:19:05.141Z',
    createdBy: 'Pipo A.',
    synced: true,
  },
  {
    id: 'exp_1792213960342_isyf',
    date: '2026-10-17',
    category: 'fuel',
    amount: 50,
    description: 'Drekë për ekipin',
    createdAt: '2026-10-17T05:12:40.342Z',
    createdBy: 'Pipo A.',
    synced: true,
  },
  {
    id: 'exp_1792189173466_vh6a',
    date: '2026-10-17',
    category: 'coffee',
    amount: 10,
    description: 'Espresso + Ice Tea, Te GEG',
    createdAt: '2026-10-16T22:19:33.466Z',
    createdBy: 'Pipo A.',
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

// Helper to get auth headers with Bearer token if available
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    }
    const eff = await getClientEffectiveToken();
    if (eff.token) {
      headers['Authorization'] = `Bearer ${eff.token}`;
    }
  } catch {}
  return headers;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return res.ok && ct.includes('application/json');
}

// ------------------- BACKEND + CLIENT DIRECT SHEETS HYBRID API -------------------

/**
 * Fetch all expenses from backend (or directly from Google Sheets when hosted on static Vercel)
 */
export async function apiFetchExpenses(): Promise<Expense[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/expenses', { headers });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (Array.isArray(data.expenses)) {
        const normalized = data.expenses.map((e: Expense) => ({
          ...e,
          date: normalizeSheetDate(e.date),
        }));
        saveExpensesLocally(normalized);
        return normalized;
      }
    }
  } catch {}

  // Fallback for static hosting (e.g., Vercel): sync directly with Google Sheets
  try {
    const sheetId = getStoredSpreadsheetId();
    const eff = await getClientEffectiveToken(sheetId);
    if (eff.token) {
      const { mergedExpenses } = await reconcileClientExpensesWithSheet(
        sheetId,
        eff.token,
        getStoredExpenses()
      );
      saveExpensesLocally(mergedExpenses);
      return mergedExpenses;
    }
  } catch (e) {
    console.warn('Direct Google Sheets fetch fallback warning:', e);
  }

  return getStoredExpenses();
}

/**
 * Create a new expense on the backend or directly in Google Sheets (Vercel)
 */
export async function apiSaveExpense(expense: Expense): Promise<Expense & { sheetSynced?: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers,
      body: JSON.stringify({ expense }),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      const saved = data.expense || expense;
      return {
        ...saved,
        synced: data.sheetSynced === true,
        sheetSynced: data.sheetSynced === true,
      };
    }
  } catch {}

  // Direct client-side Google Sheets fallback (Vercel)
  const sheetId = getStoredSpreadsheetId();
  const eff = await getClientEffectiveToken(sheetId);
  if (eff.token) {
    await appendExpenseToSheet(sheetId, expense, eff.token);
    return { ...expense, synced: true, sheetSynced: true };
  }

  return { ...expense, synced: false, sheetSynced: false };
}

/**
 * Update existing expense on the backend or directly in Google Sheets (Vercel)
 */
export async function apiUpdateExpense(expense: Expense): Promise<Expense & { sheetSynced?: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ expense }),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      const updated = data.expense || expense;
      return {
        ...updated,
        synced: data.sheetSynced === true,
        sheetSynced: data.sheetSynced === true,
      };
    }
  } catch {}

  const sheetId = getStoredSpreadsheetId();
  const eff = await getClientEffectiveToken(sheetId);
  if (eff.token) {
    await updateExpenseInSheet(sheetId, expense, eff.token);
    return { ...expense, synced: true, sheetSynced: true };
  }

  return { ...expense, synced: false, sheetSynced: false };
}

/**
 * Delete expense on the backend or directly in Google Sheets (Vercel)
 */
export async function apiDeleteExpense(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  const sheetId = getStoredSpreadsheetId();
  const eff = await getClientEffectiveToken(sheetId);
  if (eff.token) {
    await deleteExpenseFromSheet(sheetId, id, eff.token);
    return true;
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
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/sync/push-to-sheets', {
      method: 'POST',
      headers,
    });
    if (isJsonResponse(res)) {
      return await res.json();
    }
  } catch {}

  // Client-side direct Google Sheets push (for Vercel / static hosting)
  const sheetId = getStoredSpreadsheetId();
  const eff = await getClientEffectiveToken(sheetId);
  if (!eff.token) {
    throw new Error(
      eff.authError ||
        'No active Google Sheets credentials found. Upload your Service Account JSON key or connect via Google OAuth.'
    );
  }

  const localExpenses = getStoredExpenses();
  const reconciled = await reconcileClientExpensesWithSheet(sheetId, eff.token, localExpenses);
  saveExpensesLocally(reconciled.mergedExpenses);

  // Also sync Working Days to Ditet_e_Punes tab
  try {
    const localWorkDays = getStoredWorkDays();
    const mergedWd = await reconcileClientWorkDaysWithSheet(sheetId, eff.token, localWorkDays);
    saveWorkDaysLocally(mergedWd);
    syncUsersFromSheetData(mergedWd, reconciled.mergedExpenses);
  } catch (wdErr) {
    console.warn('Working days client sync warning:', wdErr);
  }

  return {
    success: true,
    uploadedCount: reconciled.uploadedCount,
    totalLocal: reconciled.mergedExpenses.length,
    tab: reconciled.tab,
    sheetId,
  };
}

/**
 * Batch sync pending operations to backend or directly to Google Sheets
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
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/expenses/sync-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations }),
    });
    if (isJsonResponse(res)) {
      return await res.json();
    }
  } catch {}

  // Direct client-side batch sync fallback (Vercel)
  const sheetId = getStoredSpreadsheetId();
  const eff = await getClientEffectiveToken(sheetId);
  if (!eff.token) {
    return {
      success: false,
      sheetConnected: false,
      results: operations.map((op) => ({
        id: op.id,
        success: false,
        error: 'Waiting for Google Sheets credentials',
      })),
    };
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const op of operations) {
    try {
      if (op.action === 'CREATE' && op.expense) {
        await appendExpenseToSheet(sheetId, op.expense, eff.token);
      } else if (op.action === 'UPDATE' && op.expense) {
        await updateExpenseInSheet(sheetId, op.expense, eff.token);
      } else if (op.action === 'DELETE' && op.expense?.id) {
        await deleteExpenseFromSheet(sheetId, op.expense.id, eff.token);
      }
      results.push({ id: op.id, success: true });
    } catch (err: any) {
      results.push({ id: op.id, success: false, error: err.message });
    }
  }

  return {
    success: true,
    sheetConnected: true,
    results,
  };
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
 * Save custom Sheet ID / URL on both client and backend
 */
export async function apiSaveSheetId(rawInput: string): Promise<{
  sheetId: string;
  sheetGid: string;
}> {
  const extractedId = extractSheetId(rawInput) || DEFAULT_SPREADSHEET_ID;
  const extractedGid = extractSheetGid(rawInput) || getStoredSheetGid();
  saveStoredSpreadsheetId(extractedId);
  saveStoredSheetGid(extractedGid);

  try {
    const res = await fetch('/api/config/sheet-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: rawInput }),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (data.sheetId) saveStoredSpreadsheetId(data.sheetId);
      if (data.sheetGid) saveStoredSheetGid(data.sheetGid);
      return {
        sheetId: data.sheetId || extractedId,
        sheetGid: data.sheetGid || extractedGid,
      };
    }
  } catch {}

  return {
    sheetId: extractedId,
    sheetGid: extractedGid,
  };
}

/**
 * Save Service Account JSON / credentials and Sheet ID with live validation (Backend + Vercel Browser WebCrypto)
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
  // Always persist in browser storage so Vercel / static web mode works immediately
  if (payload.sheetId) {
    const cleanId = extractSheetId(payload.sheetId);
    const cleanGid = extractSheetGid(payload.sheetId);
    if (cleanId) saveStoredSpreadsheetId(cleanId);
    if (cleanGid) saveStoredSheetGid(cleanGid);
  }
  if (payload.sheetGid) {
    const cleanGid = extractSheetGid(payload.sheetGid);
    if (cleanGid) saveStoredSheetGid(cleanGid);
  }

  const localSaved = saveStoredServiceAccount(payload);
  if (localSaved.error) {
    throw new Error(localSaved.error);
  }

  // Try backend first if running
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/config/credentials', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      return data;
    }
  } catch {}

  // Browser-direct validation & sync (Vercel / static hosting)
  const sheetId = getStoredSpreadsheetId();
  const sheetGid = getStoredSheetGid();
  const eff = await getClientEffectiveToken(sheetId);

  if (!eff.token) {
    return {
      success: true,
      connected: false,
      serviceAccountEmail: eff.serviceAccountEmail,
      sheetId,
      sheetGid,
      credentialError: eff.authError || 'Could not obtain Google Sheets access token.',
    };
  }

  try {
    const reconciled = await reconcileClientExpensesWithSheet(
      sheetId,
      eff.token,
      getStoredExpenses()
    );
    saveExpensesLocally(reconciled.mergedExpenses);

    try {
      const mergedWd = await reconcileClientWorkDaysWithSheet(
        sheetId,
        eff.token,
        getStoredWorkDays()
      );
      saveWorkDaysLocally(mergedWd);
      syncUsersFromSheetData(mergedWd, reconciled.mergedExpenses);
    } catch {}

    return {
      success: true,
      connected: true,
      serviceAccountEmail: eff.serviceAccountEmail,
      sheetId,
      sheetGid,
      tabName: reconciled.tab,
      uploadedCount: reconciled.uploadedCount,
    };
  } catch (err: any) {
    const msg = String(err.message || '');
    const friendlyError =
      msg.includes('403') || msg.toLowerCase().includes('permission')
        ? `Service Account "${eff.serviceAccountEmail}" does not have permission on Sheet "${sheetId}". Click "Share" in your Google Sheet and add ${eff.serviceAccountEmail} as an Editor!`
        : msg;

    return {
      success: true,
      connected: false,
      serviceAccountEmail: eff.serviceAccountEmail,
      sheetId,
      sheetGid,
      credentialError: friendlyError,
    };
  }
}

/**
 * Get connection status (from backend if available, otherwise directly from browser to Google Sheets)
 */
export async function apiGetStatus(): Promise<BackendStatusResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/status', { headers });
    if (isJsonResponse(res)) {
      const backendData: BackendStatusResponse = await res.json();
      if (backendData.connected || backendData.hasServiceAccount) {
        return backendData;
      }
    }
  } catch {}

  // Direct client-side status check (for Vercel / browser OAuth / browser Service Account)
  const sheetId = getStoredSpreadsheetId();
  const sheetGid = getStoredSheetGid();
  const eff = await getClientEffectiveToken(sheetId);

  if (!eff.token) {
    return {
      connected: false,
      credentialType: 'none',
      hasServiceAccount: eff.hasServiceAccount,
      serviceAccountEmail: eff.serviceAccountEmail,
      hasToken: false,
      sheetId,
      sheetGid,
      credentialError: eff.authError,
      mode: 'client-local',
    };
  }

  try {
    const tabName = await resolveClientSheetTab(sheetId, eff.token, sheetGid);
    return {
      connected: true,
      credentialType: eff.credentialType,
      hasServiceAccount: eff.hasServiceAccount,
      credentialFormatValid: true,
      serviceAccountEmail: eff.serviceAccountEmail,
      hasToken: true,
      sheetId,
      sheetGid,
      tabName,
      credentialError: null,
      mode: 'google-sheets-live',
    };
  } catch (err: any) {
    const msg = String(err.message || '');
    const friendlyError =
      (msg.includes('403') || msg.toLowerCase().includes('permission')) && eff.serviceAccountEmail
        ? `Service Account "${eff.serviceAccountEmail}" does not have Editor access to Sheet "${sheetId}". Share the Google Sheet with ${eff.serviceAccountEmail} as Editor.`
        : msg;
    return {
      connected: false,
      credentialType: eff.credentialType,
      hasServiceAccount: eff.hasServiceAccount,
      serviceAccountEmail: eff.serviceAccountEmail,
      hasToken: true,
      sheetId,
      sheetGid,
      credentialError: friendlyError,
      mode: 'sheet-error',
    };
  }
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
    id: 'wd_20261019_user_1792189042733_dyl',
    date: '2026-10-19',
    workerId: 'user_1792189042733',
    workerName: 'Fatjon A.',
    days: 0.5,
    description: 'Ka shku me marr Maltin ne aroport',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:09:23.832Z',
    synced: true,
  },
  {
    id: 'wd_20261018_user_arben_4rq',
    date: '2026-10-18',
    workerId: 'user_arben',
    workerName: 'Pipo A.',
    days: 1,
    description: 'Erë e fortë / kushte të papërshtatshme',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:02:29.123Z',
    synced: true,
  },
  {
    id: 'wd_20261018_user_genti_v37',
    date: '2026-10-18',
    workerId: 'user_genti',
    workerName: 'Armend A.',
    days: 1,
    description: 'Erë e fortë / kushte të papërshtatshme',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:02:29.123Z',
    synced: true,
  },
  {
    id: 'wd_20261018_user_1792189042733_s1r',
    date: '2026-10-18',
    workerId: 'user_1792189042733',
    workerName: 'Fatjon A.',
    days: 1,
    description: 'Erë e fortë / kushte të papërshtatshme',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:02:29.123Z',
    synced: true,
  },
  {
    id: 'wd_20261018_user_1792305385295_via',
    date: '2026-10-18',
    workerId: 'user_1792305385295',
    workerName: 'Lindi',
    days: 1,
    description: 'Erë e fortë / kushte të papërshtatshme',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:02:29.123Z',
    synced: true,
  },
  {
    id: 'wd_20261018_user_1792310419515_ndp',
    date: '2026-10-18',
    workerId: 'user_1792310419515',
    workerName: 'Vali',
    days: 1,
    description: 'Erë e fortë / kushte të papërshtatshme',
    createdBy: 'Lemi A. (Menaxhment)',
    createdAt: '2026-10-18T08:02:29.123Z',
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
    if (Array.isArray(parsed)) {
      return parsed.map((w: WorkDayEntry) => ({
        ...w,
        date: normalizeSheetDate(w.date),
      }));
    }
    return INITIAL_WORKDAYS;
  } catch (e) {
    console.error('Failed to read workdays from localStorage:', e);
    return INITIAL_WORKDAYS;
  }
}

export function saveWorkDaysLocally(workdays: WorkDayEntry[]): void {
  try {
    const normalized = workdays.map((w) => ({
      ...w,
      date: normalizeSheetDate(w.date),
    }));
    localStorage.setItem(WORKDAYS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to save workdays to localStorage:', e);
  }
}

export async function apiFetchWorkDays(): Promise<WorkDayEntry[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/workdays', { headers });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (Array.isArray(data.workdays)) {
        const normalized = data.workdays.map((w: WorkDayEntry) => ({
          ...w,
          date: normalizeSheetDate(w.date),
        }));
        saveWorkDaysLocally(normalized);
        syncUsersFromSheetData(normalized);
        return normalized;
      }
    }
  } catch {}

  try {
    const sheetId = getStoredSpreadsheetId();
    const eff = await getClientEffectiveToken(sheetId);
    if (eff.token) {
      const merged = await reconcileClientWorkDaysWithSheet(
        sheetId,
        eff.token,
        getStoredWorkDays()
      );
      saveWorkDaysLocally(merged);
      syncUsersFromSheetData(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Direct Google Sheets workdays fetch fallback warning:', e);
  }

  return getStoredWorkDays();
}

export async function apiSaveWorkDays(
  entries: Array<Omit<WorkDayEntry, 'id' | 'createdAt' | 'synced'> & { id?: string; createdAt?: string }>
): Promise<{ entries: WorkDayEntry[]; workdays: WorkDayEntry[]; sheetSynced: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/workdays', {
      method: 'POST',
      headers,
      body: JSON.stringify({ entries }),
    });
    if (isJsonResponse(res)) {
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
  } catch {}

  // Client-side direct Google Sheets fallback (Vercel)
  const nowIso = new Date().toISOString();
  const current = getStoredWorkDays();
  const createdOrUpdated: WorkDayEntry[] = [];

  for (const item of entries) {
    const cleanDate = normalizeSheetDate(item.date);
    const existingIdx = current.findIndex(
      (w) => w.workerId === item.workerId && normalizeSheetDate(w.date) === cleanDate
    );
    const entryObj: WorkDayEntry = {
      id:
        existingIdx >= 0
          ? current[existingIdx].id
          : item.id ||
            `wd_${cleanDate.replace(/-/g, '')}_${item.workerId}_${Math.random()
              .toString(36)
              .slice(2, 5)}`,
      workerId: item.workerId,
      workerName: item.workerName,
      date: cleanDate,
      days: item.days === 0.5 ? 0.5 : 1,
      description: item.description,
      createdBy: item.createdBy,
      createdAt: item.createdAt || nowIso,
      synced: false,
    };

    if (existingIdx >= 0) {
      current[existingIdx] = entryObj;
    } else {
      current.unshift(entryObj);
    }
    createdOrUpdated.push(entryObj);
  }

  let sheetSynced = false;
  try {
    const sheetId = getStoredSpreadsheetId();
    const eff = await getClientEffectiveToken(sheetId);
    if (eff.token) {
      for (const entry of createdOrUpdated) {
        await updateWorkDayInSheet(sheetId, entry, eff.token);
        entry.synced = true;
      }
      sheetSynced = true;
    }
  } catch (e) {
    console.warn('Direct Google Sheets workdays save warning:', e);
  }

  const sorted = [...current].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  saveWorkDaysLocally(sorted);

  return {
    entries: createdOrUpdated,
    workdays: sorted,
    sheetSynced,
  };
}

export async function apiUpdateWorkDay(
  entry: WorkDayEntry
): Promise<{ entry: WorkDayEntry; workdays: WorkDayEntry[]; sheetSynced: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/workdays/${entry.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ entry }),
    });
    if (isJsonResponse(res)) {
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
  } catch {}

  let sheetSynced = false;
  try {
    const sheetId = getStoredSpreadsheetId();
    const eff = await getClientEffectiveToken(sheetId);
    if (eff.token) {
      await updateWorkDayInSheet(sheetId, entry, eff.token);
      sheetSynced = true;
    }
  } catch (e) {
    console.warn('Direct Google Sheets workday update warning:', e);
  }

  const updatedEntry = { ...entry, date: normalizeSheetDate(entry.date), synced: sheetSynced };
  const next = getStoredWorkDays().map((w) => (w.id === entry.id ? updatedEntry : w));
  saveWorkDaysLocally(next);

  return {
    entry: updatedEntry,
    workdays: next,
    sheetSynced,
  };
}

export async function apiDeleteWorkDay(id: string): Promise<WorkDayEntry[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/workdays/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (Array.isArray(data.workdays)) {
        saveWorkDaysLocally(data.workdays);
        return data.workdays;
      }
    }
  } catch {}

  try {
    const sheetId = getStoredSpreadsheetId();
    const eff = await getClientEffectiveToken(sheetId);
    if (eff.token) {
      await deleteWorkDayFromSheet(sheetId, id, eff.token);
    }
  } catch (e) {
    console.warn('Direct Google Sheets workday delete warning:', e);
  }

  const next = getStoredWorkDays().filter((w) => w.id !== id);
  saveWorkDaysLocally(next);
  return next;
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
