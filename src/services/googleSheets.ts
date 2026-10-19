import { Expense, ExpenseCategory, WorkDayEntry } from '../types';
import { getAccessToken } from './firebase';
import defaultServerConfig from '../../data/config.json';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SERVICE_ACCOUNT_STORAGE_KEY = 'la_verda_service_account_v1';
const SHEET_GID_STORAGE_KEY = 'la_verda_sheet_gid_v1';
export const DEFAULT_SHEET_GID = defaultServerConfig.sheetGid || '1924995249';

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface StoredServiceAccount {
  clientEmail: string;
  privateKey: string;
}

export const HEADERS = [
  'ID',
  'Date',
  'Category',
  'Amount',
  'Description',
  'Created At',
  'Created By',
];

export const WORKDAYS_TAB_NAME = 'Ditet_e_Punes';
export const WORKDAYS_HEADERS = [
  'ID',
  'Data',
  'Worker ID',
  'Punëtori',
  'Ditë Pune (1 ose 0.5)',
  'Përshkrimi / Arsyeja',
  'Regjistruar Nga',
  'Krijuar Më',
];

/**
 * Converts Google Sheets / Excel serial date numbers (e.g. "46313" -> "2026-10-18")
 * or DD/MM/YYYY strings into standard YYYY-MM-DD format.
 */
export function normalizeSheetDate(raw: any): string {
  const str = String(raw || '').trim();
  if (!str) return new Date().toISOString().slice(0, 10);

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Excel / Google Sheets serial date number (e.g. 46313 -> 2026-10-18)
  if (/^\d{5}$/.test(str)) {
    const serial = Number(str);
    if (serial > 40000 && serial < 60000) {
      const utcMs = Date.UTC(1899, 11, 30) + serial * 86400000;
      return new Date(utcMs).toISOString().slice(0, 10);
    }
  }

  // DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return str;
}

export function extractSheetId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.trim();
  if (!str || str === 'YOUR_GOOGLE_SHEET_ID') return null;
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return str;
}

export function extractSheetGid(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.trim();
  const match = str.match(/[#&?]gid=([0-9]+)/);
  if (match && match[1]) return match[1];
  if (/^[0-9]+$/.test(str)) return str;
  return null;
}

export function getStoredSheetGid(): string {
  try {
    return localStorage.getItem(SHEET_GID_STORAGE_KEY) || DEFAULT_SHEET_GID;
  } catch {
    return DEFAULT_SHEET_GID;
  }
}

export function saveStoredSheetGid(gid: string): void {
  try {
    localStorage.setItem(SHEET_GID_STORAGE_KEY, gid);
  } catch {}
}

function normalizePrivateKey(rawKey: string | null | undefined): string | null {
  if (!rawKey) return null;
  let cleaned = rawKey.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, '\n');
  return cleaned;
}

export function getStoredServiceAccount(): {
  account: StoredServiceAccount | null;
  formatError: string | null;
} {
  try {
    const raw =
      localStorage.getItem(SERVICE_ACCOUNT_STORAGE_KEY) ||
      import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON ||
      defaultServerConfig.serviceAccountJson ||
      '';
    if (!raw || !raw.trim()) {
      if (defaultServerConfig.serviceAccountEmail && defaultServerConfig.privateKey) {
        const fallbackKey = normalizePrivateKey(defaultServerConfig.privateKey);
        if (fallbackKey) {
          return {
            account: {
              clientEmail: defaultServerConfig.serviceAccountEmail.trim(),
              privateKey: fallbackKey,
            },
            formatError: null,
          };
        }
      }
      return { account: null, formatError: null };
    }
    const parsed = JSON.parse(raw.trim());
    const email = String(parsed.client_email || parsed.clientEmail || '').trim();
    const key = normalizePrivateKey(parsed.private_key || parsed.privateKey || '');
    if (!email || !email.includes('@')) {
      return {
        account: null,
        formatError: 'Invalid Service Account client_email format.',
      };
    }
    if (!key || !key.includes('BEGIN PRIVATE KEY')) {
      return {
        account: null,
        formatError: 'Invalid private_key format (must include BEGIN PRIVATE KEY).',
      };
    }
    return {
      account: { clientEmail: email, privateKey: key },
      formatError: null,
    };
  } catch (e: any) {
    return {
      account: null,
      formatError: `Invalid Service Account JSON: ${e.message}`,
    };
  }
}

export function saveStoredServiceAccount(payload: {
  serviceAccountJson?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
}): { account: StoredServiceAccount | null; error: string | null } {
  try {
    let email = payload.serviceAccountEmail?.trim() || '';
    let key = normalizePrivateKey(payload.privateKey) || '';

    if (payload.serviceAccountJson && payload.serviceAccountJson.trim()) {
      const parsed = JSON.parse(payload.serviceAccountJson.trim());
      if (parsed.type && parsed.type !== 'service_account') {
        return {
          account: null,
          error: `Invalid credential type "${parsed.type}". Expected "service_account" JSON key.`,
        };
      }
      email = String(parsed.client_email || email).trim();
      key = normalizePrivateKey(parsed.private_key || key) || '';
    }

    if (!email || !email.includes('@')) {
      return {
        account: null,
        error: 'Invalid Service Account client_email (must be a valid email address).',
      };
    }
    if (!key || !key.includes('BEGIN PRIVATE KEY')) {
      return {
        account: null,
        error: 'Invalid private_key (must contain -----BEGIN PRIVATE KEY-----).',
      };
    }

    const toStore = JSON.stringify({
      type: 'service_account',
      client_email: email,
      private_key: key,
    });
    localStorage.setItem(SERVICE_ACCOUNT_STORAGE_KEY, toStore);
    cachedSaToken = null;
    cachedSaExpiry = 0;

    return {
      account: { clientEmail: email, privateKey: key },
      error: null,
    };
  } catch (e: any) {
    return {
      account: null,
      error: `Service Account JSON is not valid JSON: ${e.message}`,
    };
  }
}

// Web Crypto RS256 JWT token cache for browser-direct Service Account authentication (e.g., on Vercel)
let cachedSaToken: string | null = null;
let cachedSaExpiry = 0;

function base64UrlEncodeString(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getClientServiceAccountToken(): Promise<{
  token: string | null;
  email: string | null;
  error: string | null;
}> {
  const { account, formatError } = getStoredServiceAccount();
  if (!account) {
    return { token: null, email: null, error: formatError };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedSaToken && cachedSaExpiry > nowSec + 120) {
    return { token: cachedSaToken, email: account.clientEmail, error: null };
  }

  try {
    const keyBuffer = pemToArrayBuffer(account.privateKey);
    const cryptoKey = await window.crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const header = base64UrlEncodeString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimSet = base64UrlEncodeString(
      JSON.stringify({
        iss: account.clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: nowSec,
        exp: nowSec + 3600,
      })
    );

    const signingInput = `${header}.${claimSet}`;
    const signatureBuffer = await window.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    const jwt = `${signingInput}.${base64UrlEncodeBuffer(signatureBuffer)}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      return {
        token: null,
        email: account.clientEmail,
        error:
          tokenData.error_description ||
          tokenData.error ||
          `OAuth2 token exchange failed (${tokenRes.status})`,
      };
    }

    cachedSaToken = tokenData.access_token;
    cachedSaExpiry = nowSec + Number(tokenData.expires_in || 3500);
    return { token: cachedSaToken, email: account.clientEmail, error: null };
  } catch (err: any) {
    return {
      token: null,
      email: account.clientEmail,
      error: `Service Account signing error: ${err.message}`,
    };
  }
}

export async function getClientEffectiveToken(spreadsheetId?: string): Promise<{
  token: string | null;
  credentialType: 'service_account' | 'oauth_token' | 'none';
  serviceAccountEmail: string | null;
  hasServiceAccount: boolean;
  authError: string | null;
}> {
  const [sa, oauthToken] = await Promise.all([
    getClientServiceAccountToken(),
    getAccessToken(),
  ]);

  // If both tokens exist and a spreadsheetId is provided, verify which token has permission on this sheet
  if (spreadsheetId && sa.token && oauthToken) {
    try {
      const testSa = await fetch(
        `${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${sa.token}` } }
      );
      if (testSa.ok) {
        return {
          token: sa.token,
          credentialType: 'service_account',
          serviceAccountEmail: sa.email,
          hasServiceAccount: true,
          authError: null,
        };
      }
    } catch {}

    try {
      const testOAuth = await fetch(
        `${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${oauthToken}` } }
      );
      if (testOAuth.ok) {
        return {
          token: oauthToken,
          credentialType: 'oauth_token',
          serviceAccountEmail: sa.email,
          hasServiceAccount: Boolean(sa.email),
          authError: null,
        };
      }
    } catch {}
  }

  if (sa.token) {
    return {
      token: sa.token,
      credentialType: 'service_account',
      serviceAccountEmail: sa.email,
      hasServiceAccount: true,
      authError: null,
    };
  }

  if (oauthToken) {
    return {
      token: oauthToken,
      credentialType: 'oauth_token',
      serviceAccountEmail: sa.email,
      hasServiceAccount: Boolean(sa.email),
      authError: sa.error,
    };
  }

  return {
    token: null,
    credentialType: 'none',
    serviceAccountEmail: sa.email,
    hasServiceAccount: Boolean(sa.email),
    authError: sa.error,
  };
}

function formatA1Range(tabName: string, cellRange: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${cellRange}`;
}

export async function resolveClientSheetTab(
  spreadsheetId: string,
  accessToken: string,
  preferredGid?: string
): Promise<string> {
  const targetGid = preferredGid || getStoredSheetGid() || DEFAULT_SHEET_GID;
  const metaRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    const errText = await metaRes.text().catch(() => '');
    let parsedMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      parsedMsg = parsed.error?.message || errText;
    } catch {}
    throw new Error(`Google Sheets API (${metaRes.status}): ${parsedMsg}`);
  }

  const meta = await metaRes.json();
  const sheets = meta.sheets || [];

  const foundGid = sheets.find((s: any) => String(s.properties?.sheetId) === String(targetGid));
  if (foundGid?.properties?.title) return foundGid.properties.title;

  const foundNamed = sheets.find((s: any) =>
    ['expenses', 'shpenzime', 'shpenzimet'].includes(
      String(s.properties?.title || '').toLowerCase()
    )
  );
  if (foundNamed?.properties?.title) return foundNamed.properties.title;

  if (sheets[0]?.properties?.title) return sheets[0].properties.title;

  return 'Expenses';
}

export async function ensureClientSheetHeader(
  spreadsheetId: string,
  tab: string,
  accessToken: string
): Promise<void> {
  const rangeA1 = formatA1Range(tab, 'A1:G1');
  const checkRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!checkRes.ok) return;
  const data = await checkRes.json();
  const values = data.values || [];
  if (values.length === 0 || !values[0] || values[0].length === 0) {
    await fetch(
      `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [HEADERS],
        }),
      }
    );
  }
}

/**
 * Creates a brand-new Google Sheet with an 'Expenses' worksheet pre-formatted for La Verda
 */
export async function createLaVerdaSpreadsheet(accessToken: string): Promise<string> {
  const response = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'La Verda — Shpenzime Kopshtarie (Expenses)',
      },
      sheets: [
        {
          properties: {
            title: 'Expenses',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Dështoi krijimi i Google Sheet (${response.status})`);
  }

  const sheetData = await response.json();
  const spreadsheetId = sheetData.spreadsheetId;

  const headerRange = formatA1Range('Expenses', 'A1:G1');
  await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [HEADERS],
      }),
    }
  );

  return spreadsheetId;
}

/**
 * Appends a new expense record to the target Google Sheet tab (idempotent by ID)
 */
export async function appendExpenseToSheet(
  spreadsheetId: string,
  expense: Expense,
  accessToken: string
): Promise<void> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  await ensureClientSheetHeader(spreadsheetId, tab, accessToken);

  const colARange = formatA1Range(tab, 'A:A');
  const existingRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (existingRes.ok) {
    const existingData = await existingRes.json();
    const existingIds = new Set(
      (existingData.values || []).map((r: any[]) => String(r[0] || '').trim())
    );
    if (existingIds.has(String(expense.id).trim())) {
      return;
    }
  }

  const row = [
    expense.id,
    expense.date,
    expense.category,
    expense.amount,
    expense.description || '',
    expense.createdAt,
    expense.createdBy,
  ];

  const appendRange = formatA1Range(tab, 'A:G');
  const res = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gabim gjatë ruajtjes në Google Sheets (${res.status})`);
  }
}

/**
 * Reads all expenses from the Google Sheet
 */
export async function fetchExpensesFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<Expense[]> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  const range = formatA1Range(tab, 'A2:G');
  const res = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gabim gjatë leximit të Google Sheets (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .map((row) => ({
      id: String(row[0] || '').trim(),
      date: normalizeSheetDate(row[1]),
      category: String(row[2] || 'other').trim().toLowerCase() as ExpenseCategory,
      amount: Number(String(row[3] || '0').replace(/[^0-9.-]+/g, '')) || 0,
      description: row[4] ? String(row[4]) : undefined,
      createdAt: String(row[5] || new Date().toISOString()),
      createdBy: String(row[6] || 'Stafi'),
      synced: true,
    }))
    .filter((exp) => exp.id && exp.id !== 'ID' && exp.amount > 0);
}

/**
 * Reconcile local expenses with Google Sheets directly from the browser.
 * Only uploads local items that are unsynced (`synced === false`), or all items if the sheet is completely empty.
 */
export async function reconcileClientExpensesWithSheet(
  spreadsheetId: string,
  accessToken: string,
  localExpenses: Expense[],
  forceUploadAll = false
): Promise<{
  uploadedCount: number;
  tab: string;
  mergedExpenses: Expense[];
}> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  await ensureClientSheetHeader(spreadsheetId, tab, accessToken);

  const sheetExpenses = await fetchExpensesFromSheet(spreadsheetId, accessToken);
  const sheetIds = new Set(sheetExpenses.map((e) => e.id));

  const missingInSheet = localExpenses.filter(
    (e) =>
      e.id &&
      !sheetIds.has(e.id) &&
      (e.synced === false || forceUploadAll || sheetExpenses.length === 0)
  );

  if (missingInSheet.length > 0) {
    const rowsToAppend = missingInSheet.map((e) => [
      e.id,
      e.date,
      e.category,
      e.amount,
      e.description || '',
      e.createdAt,
      e.createdBy,
    ]);

    const appendRange = formatA1Range(tab, 'A:G');
    const appendRes = await fetch(
      `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rowsToAppend }),
      }
    );

    if (!appendRes.ok) {
      const appendErr = await appendRes.text().catch(() => '');
      throw new Error(`Google Sheets append failed (${appendRes.status}): ${appendErr}`);
    }
  }

  const markedLocal = missingInSheet.map((e) => ({ ...e, synced: true }));
  const merged = [...markedLocal, ...sheetExpenses].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );

  return {
    uploadedCount: missingInSheet.length,
    tab,
    mergedExpenses: merged,
  };
}

/**
 * Updates an existing expense row by matching the ID
 */
export async function updateExpenseInSheet(
  spreadsheetId: string,
  expense: Expense,
  accessToken: string
): Promise<void> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  const colARange = formatA1Range(tab, 'A:A');
  const res = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error('Dështoi gjetja e rreshtit në Google Sheets');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(expense.id).trim());

  if (rowIndex === -1) {
    return appendExpenseToSheet(spreadsheetId, expense, accessToken);
  }

  const sheetRowNum = rowIndex + 1;
  const rowRange = formatA1Range(tab, `A${sheetRowNum}:G${sheetRowNum}`);
  const updateRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            expense.id,
            expense.date,
            expense.category,
            expense.amount,
            expense.description || '',
            expense.createdAt,
            expense.createdBy,
          ],
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Dështoi përditësimi në Google Sheets');
  }
}

/**
 * Deletes an expense row from the Google Sheet by matching its ID
 */
export async function deleteExpenseFromSheet(
  spreadsheetId: string,
  expenseId: string,
  accessToken: string
): Promise<void> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  const metaRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) throw new Error('Dështoi lidhja me fletën e llogaritjes');

  const metaData = await metaRes.json();
  const expenseSheet = metaData.sheets?.find((s: any) => s.properties?.title === tab);
  const sheetInternalId = expenseSheet ? expenseSheet.properties.sheetId : 0;

  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(expenseId).trim());

  if (rowIndex === -1) {
    return;
  }

  const deleteRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetInternalId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });

  if (!deleteRes.ok) {
    const err = await deleteRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Dështoi fshirja nga Google Sheets');
  }
}

// ------------------- CLIENT-SIDE WORKING DAYS SYNC (Ditet_e_Punes Tab) -------------------

export async function ensureClientWorkDaysTab(
  spreadsheetId: string,
  accessToken: string
): Promise<string> {
  const metaRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Could not read spreadsheet metadata (${metaRes.status})`);
  }
  const meta = await metaRes.json();
  const sheets = meta.sheets || [];

  const existing = sheets.find(
    (s: any) =>
      String(s.properties?.title || '').toLowerCase() === WORKDAYS_TAB_NAME.toLowerCase() ||
      ['ditet e punes', 'ditët e punës', 'working days', 'workdays'].includes(
        String(s.properties?.title || '').toLowerCase()
      )
  );

  let targetTab = existing?.properties?.title || WORKDAYS_TAB_NAME;

  if (!existing) {
    const createRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: WORKDAYS_TAB_NAME,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      }),
    });
    if (createRes.ok) {
      targetTab = WORKDAYS_TAB_NAME;
    }
  }

  const headerRange = formatA1Range(targetTab, 'A1:H1');
  const checkRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(headerRange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (checkRes.ok) {
    const data = await checkRes.json();
    const values = data.values || [];
    if (values.length === 0 || !values[0] || values[0].length === 0) {
      await fetch(
        `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [WORKDAYS_HEADERS] }),
        }
      );
    }
  }

  return targetTab;
}

export async function fetchWorkDaysFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<WorkDayEntry[]> {
  const tab = await ensureClientWorkDaysTab(spreadsheetId, accessToken);
  const range = formatA1Range(tab, 'A2:H');
  const res = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets workdays fetch failed (${res.status})`);
  }
  const data = await res.json();
  const rows: any[][] = data.values || [];
  return rows
    .map((r) => {
      const rawDays = Number(String(r[4] || '1').replace(',', '.'));
      const days: 1 | 0.5 = rawDays === 0.5 ? 0.5 : 1;
      return {
        id: String(r[0] || '').trim(),
        date: normalizeSheetDate(r[1]),
        workerId: String(r[2] || '').trim(),
        workerName: String(r[3] || '').trim(),
        days,
        description: r[5] ? String(r[5]) : undefined,
        createdBy: String(r[6] || 'Menaxhmenti'),
        createdAt: String(r[7] || new Date().toISOString()),
        synced: true,
      };
    })
    .filter((w) => w.id && w.id !== 'ID' && w.date);
}

export async function appendWorkDaysToSheet(
  spreadsheetId: string,
  entries: WorkDayEntry[],
  accessToken: string
): Promise<void> {
  if (entries.length === 0) return;
  const tab = await ensureClientWorkDaysTab(spreadsheetId, accessToken);

  const colARange = formatA1Range(tab, 'A:A');
  const existingRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const existingIds = new Set<string>();
  if (existingRes.ok) {
    const existingData = await existingRes.json();
    (existingData.values || []).forEach((r: any[]) => {
      if (r[0]) existingIds.add(String(r[0]).trim());
    });
  }

  const toAppend = entries.filter((e) => !existingIds.has(String(e.id).trim()));
  if (toAppend.length === 0) return;

  const rows = toAppend.map((w) => [
    w.id,
    `'${normalizeSheetDate(w.date)}`,
    w.workerId,
    w.workerName,
    w.days,
    w.description || '',
    w.createdBy,
    w.createdAt,
  ]);

  const appendRange = formatA1Range(tab, 'A:H');
  const res = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets workdays append failed (${res.status})`);
  }
}

export async function updateWorkDayInSheet(
  spreadsheetId: string,
  entry: WorkDayEntry,
  accessToken: string
): Promise<void> {
  const tab = await ensureClientWorkDaysTab(spreadsheetId, accessToken);
  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!rowsRes.ok) throw new Error('Could not read workday IDs from Google Sheets');
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(entry.id).trim());

  if (rowIndex === -1) {
    return appendWorkDaysToSheet(spreadsheetId, [entry], accessToken);
  }

  const sheetRowNum = rowIndex + 1;
  const rowRange = formatA1Range(tab, `A${sheetRowNum}:H${sheetRowNum}`);
  const updateRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            entry.id,
            `'${normalizeSheetDate(entry.date)}`,
            entry.workerId,
            entry.workerName,
            entry.days,
            entry.description || '',
            entry.createdBy,
            entry.createdAt,
          ],
        ],
      }),
    }
  );
  if (!updateRes.ok) throw new Error('Could not update workday in Google Sheets');
}

export async function deleteWorkDayFromSheet(
  spreadsheetId: string,
  entryId: string,
  accessToken: string
): Promise<void> {
  const tab = await ensureClientWorkDaysTab(spreadsheetId, accessToken);
  const metaRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) return;
  const metaData = await metaRes.json();
  const wdSheet = metaData.sheets?.find((s: any) => s.properties?.title === tab);
  if (!wdSheet) return;
  const sheetInternalId = wdSheet.properties.sheetId;

  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(entryId).trim());
  if (rowIndex === -1) return;

  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetInternalId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });
}

export async function reconcileClientWorkDaysWithSheet(
  spreadsheetId: string,
  accessToken: string,
  localWorkDays: WorkDayEntry[],
  forceUploadAll = false
): Promise<WorkDayEntry[]> {
  const sheetWorkDays = await fetchWorkDaysFromSheet(spreadsheetId, accessToken);
  const sheetIds = new Set(sheetWorkDays.map((w) => w.id));
  const missingInSheet = localWorkDays.filter(
    (w) =>
      w.id &&
      !sheetIds.has(w.id) &&
      (w.synced === false || forceUploadAll || sheetWorkDays.length === 0)
  );

  if (missingInSheet.length > 0) {
    await appendWorkDaysToSheet(spreadsheetId, missingInSheet, accessToken);
  }

  const markedLocal = missingInSheet.map((w) => ({
    ...w,
    date: normalizeSheetDate(w.date),
    synced: true,
  }));
  return [...markedLocal, ...sheetWorkDays].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
