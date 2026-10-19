import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { JWT } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// Persistent data directory
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'expenses.json');
const WORKDAYS_FILE = path.join(DATA_DIR, 'workdays.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial realistic working days including full days (1) and half days (0.5) with descriptions
const INITIAL_WORKDAYS = [
  {
    id: 'wd_20261016_arben',
    workerId: 'user_arben',
    workerName: 'Arben K.',
    date: '2026-10-16',
    days: 1,
    description: 'Ditë e plotë pune — Kositje dhe rregullim i kopshtit në vilë',
    createdAt: '2026-10-16T16:30:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: false,
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
    synced: false,
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
    synced: false,
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
    synced: false,
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
    synced: false,
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
    synced: false,
  },
];


function getLocalWorkDays(): any[] {
  try {
    if (!fs.existsSync(WORKDAYS_FILE)) {
      fs.writeFileSync(WORKDAYS_FILE, JSON.stringify(INITIAL_WORKDAYS, null, 2), 'utf8');
      return INITIAL_WORKDAYS;
    }
    const content = fs.readFileSync(WORKDAYS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local workdays:', err);
    return INITIAL_WORKDAYS;
  }
}

function saveLocalWorkDays(workdays: any[]) {
  try {
    fs.writeFileSync(WORKDAYS_FILE, JSON.stringify(workdays, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local workdays:', err);
  }
}

// Initial realistic landscaping expenses if database is clean
const INITIAL_EXPENSES = [
  {
    id: 'exp_20261016_01',
    date: '2026-10-16',
    category: 'fuel',
    amount: 68.50,
    description: 'Naftë për furgonin e punës (Mercedes Sprinter)',
    createdAt: '2026-10-16T08:15:00.000Z',
    createdBy: 'Arben K.',
    synced: false,
  },
  {
    id: 'exp_20261015_02',
    date: '2026-10-15',
    category: 'coffee',
    amount: 6.80,
    description: 'Kafe mëngjesi & ujë mineral për ekipin',
    createdAt: '2026-10-15T07:45:00.000Z',
    createdBy: 'Pipo A.',
    synced: false,
  },
  {
    id: 'exp_20261014_03',
    date: '2026-10-14',
    category: 'food',
    amount: 34.00,
    description: 'Drekë për punëtorët gjatë rregullimit të kopshtit në vilë',
    createdAt: '2026-10-14T12:30:00.000Z',
    createdBy: 'Mendi A.',
    synced: false,
  },
  {
    id: 'exp_20261012_04',
    date: '2026-10-12',
    category: 'other',
    amount: 94.50,
    description: 'Fije kosore profesionale 3.0mm dhe vaj motori 2T',
    createdAt: '2026-10-12T15:10:00.000Z',
    createdBy: 'Lemi A. (Menaxhment)',
    synced: false,
  },
  {
    id: 'exp_20261011_05',
    date: '2026-10-11',
    category: 'fuel',
    amount: 42.00,
    description: 'Benzinë për dy kositëset e barit dhe fryrësen e gjetheve',
    createdAt: '2026-10-11T09:20:00.000Z',
    createdBy: 'Genti M.',
    synced: false,
  },
  {
    id: 'exp_20261009_06',
    date: '2026-10-09',
    category: 'food',
    amount: 29.50,
    description: 'Drekë e shpejtë në terren pas mbjelljes së pemëve',
    createdAt: '2026-10-09T13:00:00.000Z',
    createdBy: 'Arben K.',
    synced: false,
  },
  {
    id: 'exp_20261008_07',
    date: '2026-10-08',
    category: 'coffee',
    amount: 5.50,
    description: 'Kafe dhe lëngje freskuese',
    createdAt: '2026-10-08T10:15:00.000Z',
    createdBy: 'Genti M.',
    synced: false,
  },
  {
    id: 'exp_20261005_08',
    date: '2026-10-05',
    category: 'other',
    amount: 145.00,
    description: 'Plehrë organik për bar (granula) dhe gërshërë krasitjeje',
    createdAt: '2026-10-05T14:40:00.000Z',
    createdBy: 'Erolind A. (Menaxhment)',
    synced: false,
  },
  {
    id: 'exp_20261003_09',
    date: '2026-10-03',
    category: 'fuel',
    amount: 55.00,
    description: 'Naftë për furgon pas rrugës në depot e pemishtes',
    createdAt: '2026-10-03T16:00:00.000Z',
    createdBy: 'Arben K.',
    synced: false,
  },
  {
    id: 'exp_20261001_10',
    date: '2026-10-01',
    category: 'coffee',
    amount: 7.20,
    description: 'Kafe për ekipin para fillimit të projektit mujor',
    createdAt: '2026-10-01T08:00:00.000Z',
    createdBy: 'Genti M.',
    synced: false,
  },
];

// Helper to read local JSON database
function getLocalExpenses(): any[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_EXPENSES, null, 2), 'utf8');
      return INITIAL_EXPENSES;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local expenses:', err);
    return INITIAL_EXPENSES;
  }
}

// Helper to save local JSON database
function saveLocalExpenses(expenses: any[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local expenses:', err);
  }
}

export interface BackendConfig {
  sheetId?: string;
  sheetGid?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
  serviceAccountJson?: string;
}


// Read saved backend config
function getBackendConfig(): BackendConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveBackendConfig(config: Partial<BackendConfig>) {
  try {
    const existing = getBackendConfig();
    const merged = { ...existing, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save backend config:', e);
  }
}

const DEFAULT_SHEET_ID = '1Onit6Ryavye_DFC9IMYC0J_igQuvjcHxbFR9SKfBYQo';
const DEFAULT_SHEET_GID = '1924995249';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function extractSheetId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.trim();
  if (!str || str === 'YOUR_GOOGLE_SHEET_ID') return null;
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return str;
}

function extractSheetGid(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = raw.trim();
  const match = str.match(/[#&?]gid=([0-9]+)/);
  if (match && match[1]) return match[1];
  if (/^[0-9]+$/.test(str)) return str;
  return null;
}

function normalizePrivateKey(rawKey: string | null | undefined): string | null {
  if (!rawKey) return null;
  let cleaned = rawKey.trim();
  // Remove surrounding quotes if user copied from .env
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Convert literal \n sequences to actual newline characters
  cleaned = cleaned.replace(/\\n/g, '\n');
  return cleaned;
}

export interface CredentialInspection {
  jwt: JWT | null;
  sheetId: string;
  sheetGid: string;
  serviceAccountEmail: string | null;
  hasServiceAccount: boolean;
  credentialFormatValid: boolean;
  formatError: string | null;
}

// Inspect and build Google Sheets Service Account JWT with format validation
function getGoogleAuth(): CredentialInspection {
  const config = getBackendConfig();
  const sheetId =
    extractSheetId(config.sheetId) ||
    extractSheetId(process.env.GOOGLE_SHEET_ID) ||
    DEFAULT_SHEET_ID;
  const sheetGid =
    extractSheetGid(config.sheetGid) ||
    extractSheetGid(config.sheetId) ||
    extractSheetGid(process.env.GOOGLE_SHEET_ID) ||
    DEFAULT_SHEET_GID;

  let email: string | null = config.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
  let key: string | null = config.privateKey || process.env.GOOGLE_PRIVATE_KEY || null;
  let formatError: string | null = null;

  // Ignore placeholder values from .env.example
  if (email === 'your-service-account@project.iam.gserviceaccount.com') email = null;
  if (key && key.includes('MIIEvgIBADANBgk...')) key = null;

  const rawJson = config.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson.trim());
      if (parsed.type && parsed.type !== 'service_account') {
        formatError = `Invalid credential type "${parsed.type}". Expected "service_account" JSON key (not OAuth Web Client ID).`;
      } else {
        email = parsed.client_email || email;
        key = parsed.private_key || key;
      }
    } catch (e: any) {
      formatError = `Service Account JSON is not valid JSON format: ${e.message}`;
    }
  }

  if (!email && !key) {
    return {
      jwt: null,
      sheetId,
      sheetGid,
      serviceAccountEmail: null,
      hasServiceAccount: false,
      credentialFormatValid: false,
      formatError,
    };
  }

  if (!email || !email.includes('@')) {
    return {
      jwt: null,
      sheetId,
      sheetGid,
      serviceAccountEmail: email,
      hasServiceAccount: false,
      credentialFormatValid: false,
      formatError: formatError || 'Invalid Service Account client_email format (must be a valid email address).',
    };
  }

  const formattedKey = normalizePrivateKey(key);
  if (!formattedKey || !formattedKey.includes('BEGIN PRIVATE KEY')) {
    return {
      jwt: null,
      sheetId,
      sheetGid,
      serviceAccountEmail: email,
      hasServiceAccount: false,
      credentialFormatValid: false,
      formatError:
        formatError ||
        'Invalid private_key format. Must include "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----".',
    };
  }

  try {
    const jwt = new JWT({
      email: email.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return {
      jwt,
      sheetId,
      sheetGid,
      serviceAccountEmail: email.trim(),
      hasServiceAccount: true,
      credentialFormatValid: true,
      formatError: null,
    };
  } catch (err: any) {
    return {
      jwt: null,
      sheetId,
      sheetGid,
      serviceAccountEmail: email.trim(),
      hasServiceAccount: false,
      credentialFormatValid: false,
      formatError: `Failed to initialize Service Account JWT: ${err.message}`,
    };
  }
}

async function getEffectiveSheetsToken(req?: Request): Promise<{
  token: string | null;
  sheetId: string;
  sheetGid: string;
  credentialType: 'service_account' | 'oauth_token' | 'none';
  serviceAccountEmail: string | null;
  authError: string | null;
}> {
  const authInfo = getGoogleAuth();
  const { jwt, sheetId, sheetGid, serviceAccountEmail, formatError } = authInfo;

  // 1. Prioritize Service Account JWT if configured on the backend (permanent, never expires)
  if (jwt) {
    try {
      const tok = await jwt.getAccessToken();
      if (tok?.token) {
        return {
          token: tok.token,
          sheetId,
          sheetGid,
          credentialType: 'service_account',
          serviceAccountEmail,
          authError: null,
        };
      }
    } catch (e: any) {
      return {
        token: null,
        sheetId,
        sheetGid,
        credentialType: 'none',
        serviceAccountEmail,
        authError: `Service Account token error: ${e.message}`,
      };
    }
  }

  // 2. Check req.headers.authorization Bearer token (from client Google OAuth fallback)
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.slice(7).trim();
    if (raw && raw !== 'null' && raw !== 'undefined') {
      return {
        token: raw,
        sheetId,
        sheetGid,
        credentialType: 'oauth_token',
        serviceAccountEmail,
        authError: formatError,
      };
    }
  }

  return {
    token: null,
    sheetId,
    sheetGid,
    credentialType: 'none',
    serviceAccountEmail,
    authError: formatError,
  };
}

// Cached tab names per sheetId+gid
const tabNameCache: { [key: string]: string } = {};

// Safely format A1 notation with single quotes around sheet tab title
function formatA1Range(tabName: string, cellRange: string): string {
  const escapedTab = tabName.replace(/'/g, "''");
  return `'${escapedTab}'!${cellRange}`;
}

async function getSheetTabName(sheetId: string, token: string, preferredGid?: string): Promise<string> {
  const config = getBackendConfig();
  const targetGid = preferredGid || config.sheetGid || DEFAULT_SHEET_GID;
  const cacheKey = `${sheetId}:${targetGid}`;

  if (tabNameCache[cacheKey]) return tabNameCache[cacheKey];

  const metaRes = await fetch(`${SHEETS_BASE}/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
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

  // 1. Prioritize matching the exact gid (e.g. 1924995249)
  if (targetGid) {
    const foundGid = sheets.find((s: any) => String(s.properties?.sheetId) === String(targetGid));
    if (foundGid?.properties?.title) {
      tabNameCache[cacheKey] = foundGid.properties.title;
      return foundGid.properties.title;
    }
  }

  // 2. Look for tab named Expenses or Shpenzime
  const foundNamed = sheets.find((s: any) =>
    ['expenses', 'shpenzime', 'shpenzimet'].includes(String(s.properties?.title || '').toLowerCase())
  );
  if (foundNamed?.properties?.title) {
    tabNameCache[cacheKey] = foundNamed.properties.title;
    return foundNamed.properties.title;
  }

  // 3. Fallback to first worksheet tab
  if (sheets[0]?.properties?.title) {
    tabNameCache[cacheKey] = sheets[0].properties.title;
    return sheets[0].properties.title;
  }

  return 'Sheet1';
}

// Ensure header row exists in the target tab
async function ensureSheetHeader(sheetId: string, tab: string, token: string): Promise<void> {
  const rangeA1 = formatA1Range(tab, 'A1:G1');
  const checkRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(rangeA1)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!checkRes.ok) return;
  const data = await checkRes.json();
  const values = data.values || [];
  if (values.length === 0 || !values[0] || values[0].length === 0) {
    await fetch(
      `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(rangeA1)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['ID', 'Date', 'Category', 'Amount', 'Description', 'Created At', 'Created By']],
        }),
      }
    );
  }
}

// Fetch rows from Google Sheets using any valid token
async function fetchGoogleSheetsRows(sheetId: string, token: string): Promise<any[]> {
  const tab = await getSheetTabName(sheetId, token);
  const range = formatA1Range(tab, 'A2:G');
  const res = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Sheets fetch failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  return rows
    .map((r) => ({
      id: String(r[0] || '').trim(),
      date: String(r[1] || '').trim(),
      category: String(r[2] || 'other').trim().toLowerCase(),
      amount: Number(String(r[3] || '0').replace(/[^0-9.-]+/g, '')) || 0,
      description: r[4] ? String(r[4]) : undefined,
      createdAt: String(r[5] || new Date().toISOString()),
      createdBy: String(r[6] || 'Stafi'),
      synced: true,
    }))
    .filter((e) => e.id && e.id !== 'ID' && e.amount > 0);
}

// Append row to Google Sheets (idempotent: checks if ID already exists)
async function appendGoogleSheetsRow(sheetId: string, expense: any, token: string): Promise<void> {
  const tab = await getSheetTabName(sheetId, token);
  await ensureSheetHeader(sheetId, tab, token);

  // Check if expense ID already exists in column A to avoid duplicate rows on retry
  const colARange = formatA1Range(tab, 'A:A');
  const existingRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existingRes.ok) {
    const existingData = await existingRes.json();
    const existingIds = new Set((existingData.values || []).map((r: any[]) => String(r[0] || '').trim()));
    if (existingIds.has(String(expense.id).trim())) {
      return; // Already uploaded
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
    `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets append failed (${res.status}): ${await res.text()}`);
  }
}

// Update row in Google Sheets
async function updateGoogleSheetsRow(sheetId: string, expense: any, token: string): Promise<void> {
  const tab = await getSheetTabName(sheetId, token);
  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!rowsRes.ok) throw new Error('Could not read IDs from Google Sheets');
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(expense.id).trim());

  if (rowIndex === -1) {
    return appendGoogleSheetsRow(sheetId, expense, token);
  }

  const sheetRowNum = rowIndex + 1;
  const rowRange = formatA1Range(tab, `A${sheetRowNum}:G${sheetRowNum}`);
  const updateRes = await fetch(
    `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
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

  if (!updateRes.ok) throw new Error('Could not update row in Google Sheets');
}

// Delete row from Google Sheets
async function deleteGoogleSheetsRow(sheetId: string, expenseId: string, token: string): Promise<void> {
  const tab = await getSheetTabName(sheetId, token);
  const metaRes = await fetch(`${SHEETS_BASE}/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error('Could not fetch sheet metadata');

  const metaData = await metaRes.json();
  const expenseSheet = metaData.sheets?.find((s: any) => s.properties?.title === tab);
  const sheetInternalId = expenseSheet ? expenseSheet.properties.sheetId : 0;

  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(expenseId).trim());

  if (rowIndex === -1) return;

  const batchRes = await fetch(`${SHEETS_BASE}/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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

  if (!batchRes.ok) {
    throw new Error(`Could not delete row from Google Sheets (${batchRes.status})`);
  }
}

// Reconcile local expenses with Google Sheets (backfills any missing local items to Sheet)
async function reconcileAndBackfillWithSheets(sheetId: string, token: string): Promise<{
  uploadedCount: number;
  tab: string;
  mergedExpenses: any[];
}> {
  const tab = await getSheetTabName(sheetId, token);
  await ensureSheetHeader(sheetId, tab, token);

  const sheetExpenses = await fetchGoogleSheetsRows(sheetId, token);
  const sheetIds = new Set(sheetExpenses.map((e) => e.id));

  const local = getLocalExpenses();
  const missingInSheet = local.filter((e) => e.id && !sheetIds.has(e.id));

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
      `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

  // Build canonical merged list marked synced: true
  const markedLocal = missingInSheet.map((e) => ({ ...e, synced: true }));
  const merged = [...markedLocal, ...sheetExpenses].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );

  saveLocalExpenses(merged);
  return {
    uploadedCount: missingInSheet.length,
    tab,
    mergedExpenses: merged,
  };
}

// ------------------- WORKING DAYS GOOGLE SHEETS SYNC (Ditet_e_Punes Tab) -------------------

const WORKDAYS_TAB_NAME = 'Ditet_e_Punes';
const WORKDAYS_HEADERS = [
  'ID',
  'Data',
  'Worker ID',
  'Punëtori',
  'Ditë Pune (1 ose 0.5)',
  'Përshkrimi / Arsyeja',
  'Regjistruar Nga',
  'Krijuar Më',
];

async function ensureWorkDaysTab(sheetId: string, token: string): Promise<string> {
  const metaRes = await fetch(`${SHEETS_BASE}/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
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
    // Create the Ditet_e_Punes tab automatically
    const createRes = await fetch(`${SHEETS_BASE}/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

  // Ensure header row A1:H1
  const headerRange = formatA1Range(targetTab, 'A1:H1');
  const checkRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(headerRange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (checkRes.ok) {
    const data = await checkRes.json();
    const values = data.values || [];
    if (values.length === 0 || !values[0] || values[0].length === 0) {
      await fetch(
        `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [WORKDAYS_HEADERS] }),
        }
      );
    }
  }

  return targetTab;
}

async function fetchGoogleSheetsWorkDays(sheetId: string, token: string): Promise<any[]> {
  const tab = await ensureWorkDaysTab(sheetId, token);
  const range = formatA1Range(tab, 'A2:H');
  const res = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
        date: String(r[1] || '').trim(),
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

async function appendGoogleSheetsWorkDays(sheetId: string, entries: any[], token: string): Promise<void> {
  if (entries.length === 0) return;
  const tab = await ensureWorkDaysTab(sheetId, token);

  const colARange = formatA1Range(tab, 'A:A');
  const existingRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
    w.date,
    w.workerId,
    w.workerName,
    w.days,
    w.description || '',
    w.createdBy,
    w.createdAt,
  ]);

  const appendRange = formatA1Range(tab, 'A:H');
  const res = await fetch(
    `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Sheets workdays append failed (${res.status})`);
  }
}

async function updateGoogleSheetsWorkDay(sheetId: string, entry: any, token: string): Promise<void> {
  const tab = await ensureWorkDaysTab(sheetId, token);
  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!rowsRes.ok) throw new Error('Could not read workday IDs from Google Sheets');
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(entry.id).trim());

  if (rowIndex === -1) {
    return appendGoogleSheetsWorkDays(sheetId, [entry], token);
  }

  const sheetRowNum = rowIndex + 1;
  const rowRange = formatA1Range(tab, `A${sheetRowNum}:H${sheetRowNum}`);
  const updateRes = await fetch(
    `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            entry.id,
            entry.date,
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

async function deleteGoogleSheetsWorkDay(sheetId: string, entryId: string, token: string): Promise<void> {
  const tab = await ensureWorkDaysTab(sheetId, token);
  const metaRes = await fetch(`${SHEETS_BASE}/${sheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) return;
  const metaData = await metaRes.json();
  const wdSheet = metaData.sheets?.find((s: any) => s.properties?.title === tab);
  if (!wdSheet) return;
  const sheetInternalId = wdSheet.properties.sheetId;

  const colARange = formatA1Range(tab, 'A:A');
  const rowsRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await rowsRes.json();
  const rows: any[][] = data.values || [];
  const rowIndex = rows.findIndex((r) => String(r[0] || '').trim() === String(entryId).trim());
  if (rowIndex === -1) return;

  await fetch(`${SHEETS_BASE}/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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

async function reconcileWorkDaysWithSheets(sheetId: string, token: string): Promise<any[]> {
  const sheetEntries = await fetchGoogleSheetsWorkDays(sheetId, token);
  const sheetIds = new Set(sheetEntries.map((w) => w.id));
  const local = getLocalWorkDays();
  const missingInSheet = local.filter((w) => w.id && !sheetIds.has(w.id));

  if (missingInSheet.length > 0) {
    await appendGoogleSheetsWorkDays(sheetId, missingInSheet, token);
  }

  const markedLocal = missingInSheet.map((w) => ({ ...w, synced: true }));
  const merged = [...markedLocal, ...sheetEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  saveLocalWorkDays(merged);
  return merged;
}

// ------------------- API ROUTES -------------------

// 1. Backend Status with live credential & permission verification
app.get('/api/status', async (req: Request, res: Response) => {
  const auth = await getEffectiveSheetsToken(req);
  const { token, sheetId, sheetGid, credentialType, serviceAccountEmail, authError } = auth;
  const authInspection = getGoogleAuth();

  let isConnected = false;
  let tabName: string | null = null;
  let credentialError: string | null = authError;

  if (token && sheetId) {
    try {
      tabName = await getSheetTabName(sheetId, token, sheetGid);
      const testRange = formatA1Range(tabName, 'A1:A1');
      const testRes = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(testRange)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (testRes.ok) {
        isConnected = true;
        credentialError = null;
      } else {
        const errText = await testRes.text().catch(() => '');
        let detail = errText;
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.error?.message || errText;
        } catch {}
        if (testRes.status === 403 && serviceAccountEmail) {
          credentialError = `Permission denied (403). Please share your Google Sheet as "Editor" with: ${serviceAccountEmail}`;
        } else {
          credentialError = `Google API (${testRes.status}): ${detail}`;
        }
      }
    } catch (e: any) {
      if (e.message?.includes('403') && serviceAccountEmail) {
        credentialError = `Permission denied (403). Please share your Google Sheet as "Editor" with: ${serviceAccountEmail}`;
      } else {
        credentialError = e.message;
      }
    }
  } else if (!credentialError) {
    credentialError =
      'No Service Account credentials configured on the server yet. Paste your Service Account JSON key in the Google Sheets settings modal.';
  }

  res.json({
    connected: isConnected,
    credentialType,
    hasServiceAccount: authInspection.hasServiceAccount,
    credentialFormatValid: authInspection.credentialFormatValid,
    serviceAccountEmail,
    hasToken: !!token,
    sheetId,
    sheetGid,
    tabName,
    credentialError,
    mode: isConnected ? 'google_sheets_live' : 'server_persistent',
    message: isConnected
      ? `Connected to Google Sheets (${tabName || 'Sheet1'})`
      : credentialError,
  });
});

// 2. GET all expenses (merges & backfills if connected, never loses unsynced local expenses)
app.get('/api/expenses', async (req: Request, res: Response) => {
  const { token, sheetId } = await getEffectiveSheetsToken(req);

  if (token && sheetId) {
    try {
      const { mergedExpenses } = await reconcileAndBackfillWithSheets(sheetId, token);
      return res.json({ expenses: mergedExpenses, source: 'google_sheets' });
    } catch (err: any) {
      console.warn('Google Sheets live fetch fallback to local cache:', err.message);
    }
  }

  const local = getLocalExpenses();
  res.json({ expenses: local, source: 'server_database' });
});

// 3. POST new expense
app.post('/api/expenses', async (req: Request, res: Response) => {
  const { expense } = req.body;
  if (!expense || !expense.amount || !expense.category) {
    return res.status(400).json({ error: 'Missing required expense fields' });
  }

  let sheetSynced = false;
  let syncError: string | null = null;
  const { token, sheetId } = await getEffectiveSheetsToken(req);

  const newExpense = {
    ...expense,
    id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: expense.createdAt || new Date().toISOString(),
    synced: false,
  };

  if (token && sheetId) {
    try {
      await appendGoogleSheetsRow(sheetId, newExpense, token);
      sheetSynced = true;
      newExpense.synced = true;
    } catch (err: any) {
      console.error('Google Sheets append error:', err.message);
      syncError = err.message;
    }
  }

  // Persist to local server database with accurate `synced` flag
  const current = getLocalExpenses();
  const existingIdx = current.findIndex((e) => e.id === newExpense.id);
  const updated =
    existingIdx >= 0
      ? current.map((e) => (e.id === newExpense.id ? newExpense : e))
      : [newExpense, ...current];
  saveLocalExpenses(updated);

  res.status(201).json({
    success: true,
    expense: newExpense,
    sheetSynced,
    syncError,
  });
});

// 4. PUT update expense
app.put('/api/expenses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { expense } = req.body;

  let sheetSynced = false;
  let syncError: string | null = null;
  const { token, sheetId } = await getEffectiveSheetsToken(req);

  if (token && sheetId) {
    try {
      await updateGoogleSheetsRow(sheetId, expense, token);
      sheetSynced = true;
    } catch (err: any) {
      console.error('Google Sheets update error:', err.message);
      syncError = err.message;
    }
  }

  const savedExpense = { ...expense, synced: sheetSynced };
  const current = getLocalExpenses();
  const updated = current.map((e) => (e.id === id ? savedExpense : e));
  saveLocalExpenses(updated);

  res.json({ success: true, expense: savedExpense, sheetSynced, syncError });
});

// 5. DELETE expense
app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const current = getLocalExpenses();
  const updated = current.filter((e) => e.id !== id);
  saveLocalExpenses(updated);

  let sheetSynced = false;
  let syncError: string | null = null;
  const { token, sheetId } = await getEffectiveSheetsToken(req);

  if (token && sheetId) {
    try {
      await deleteGoogleSheetsRow(sheetId, id, token);
      sheetSynced = true;
    } catch (err: any) {
      console.error('Google Sheets delete error:', err.message);
      syncError = err.message;
    }
  }

  res.json({ success: true, sheetSynced, syncError });
});

// ------------------- WORKING DAYS API ROUTES (/api/workdays) -------------------

// GET all working day entries
app.get('/api/workdays', async (req: Request, res: Response) => {
  const { token, sheetId } = await getEffectiveSheetsToken(req);
  if (token && sheetId) {
    try {
      const merged = await reconcileWorkDaysWithSheets(sheetId, token);
      return res.json({ workdays: merged, source: 'google_sheets' });
    } catch (err: any) {
      console.warn('Google Sheets workdays fetch fallback to local:', err.message);
    }
  }
  const local = getLocalWorkDays();
  res.json({ workdays: local, source: 'server_database' });
});

// POST one or multiple working day entries (supports single employee or "All Workers")
app.post('/api/workdays', async (req: Request, res: Response) => {
  const { entries } = req.body;
  const rawList = Array.isArray(entries) ? entries : req.body.entry ? [req.body.entry] : [];
  if (rawList.length === 0) {
    return res.status(400).json({ error: 'At least one workday entry is required' });
  }

  const { token, sheetId } = await getEffectiveSheetsToken(req);
  const current = getLocalWorkDays();
  let updatedList = [...current];
  const savedEntries: any[] = [];

  for (const item of rawList) {
    const normalizedDays: 1 | 0.5 = Number(item.days) === 0.5 ? 0.5 : 1;
    // Check if an entry already exists for this workerId + date so we update/replace it cleanly
    const existingIdx = updatedList.findIndex(
      (w) => w.workerId === item.workerId && w.date === item.date
    );

    const newEntry = {
      id:
        existingIdx >= 0
          ? updatedList[existingIdx].id
          : item.id || `wd_${item.date.replace(/-/g, '')}_${item.workerId}_${Math.random().toString(36).slice(2, 5)}`,
      workerId: item.workerId,
      workerName: item.workerName,
      date: item.date,
      days: normalizedDays,
      description: item.description ? String(item.description).trim() : undefined,
      createdAt: item.createdAt || new Date().toISOString(),
      createdBy: item.createdBy || 'Menaxhmenti',
      synced: false,
    };

    if (existingIdx >= 0) {
      updatedList[existingIdx] = newEntry;
    } else {
      updatedList.unshift(newEntry);
    }
    savedEntries.push(newEntry);
  }

  let sheetSynced = false;
  if (token && sheetId) {
    try {
      for (const entry of savedEntries) {
        await updateGoogleSheetsWorkDay(sheetId, entry, token);
        entry.synced = true;
      }
      sheetSynced = true;
      updatedList = updatedList.map((w) => {
        const match = savedEntries.find((s) => s.id === w.id);
        return match ? { ...match, synced: true } : w;
      });
    } catch (err: any) {
      console.error('Google Sheets workday sync error:', err.message);
    }
  }

  saveLocalWorkDays(updatedList);
  res.status(201).json({
    success: true,
    entries: savedEntries,
    workdays: updatedList,
    sheetSynced,
  });
});

// PUT update a working day entry
app.put('/api/workdays/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { entry } = req.body;
  if (!entry) {
    return res.status(400).json({ error: 'entry is required' });
  }

  const { token, sheetId } = await getEffectiveSheetsToken(req);
  let sheetSynced = false;

  if (token && sheetId) {
    try {
      await updateGoogleSheetsWorkDay(sheetId, entry, token);
      sheetSynced = true;
    } catch (err: any) {
      console.error('Google Sheets workday update error:', err.message);
    }
  }

  const savedEntry = { ...entry, synced: sheetSynced };
  const current = getLocalWorkDays();
  const updated = current.map((w) => (w.id === id ? savedEntry : w));
  saveLocalWorkDays(updated);

  res.json({ success: true, entry: savedEntry, workdays: updated, sheetSynced });
});

// DELETE a working day entry
app.delete('/api/workdays/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const current = getLocalWorkDays();
  const updated = current.filter((w) => w.id !== id);
  saveLocalWorkDays(updated);

  const { token, sheetId } = await getEffectiveSheetsToken(req);
  let sheetSynced = false;
  if (token && sheetId) {
    try {
      await deleteGoogleSheetsWorkDay(sheetId, id, token);
      sheetSynced = true;
    } catch (err: any) {
      console.error('Google Sheets workday delete error:', err.message);
    }
  }

  res.json({ success: true, workdays: updated, sheetSynced });
});

// 6. POST batch sync (strictly requires Google Sheets upload to mark items synced)
app.post('/api/expenses/sync-batch', async (req: Request, res: Response) => {
  const { operations } = req.body;
  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: 'operations array is required' });
  }

  const { token, sheetId, authError } = await getEffectiveSheetsToken(req);
  const results: any[] = [];
  const current = getLocalExpenses();
  let updatedList = [...current];

  // If no valid Google Sheets token is available, keep items in local server store with synced: false
  // and return success: false for each operation so the client syncQueue retains them!
  if (!token || !sheetId) {
    for (const op of operations) {
      const { action, expense, id } = op;
      if (action === 'CREATE' && expense) {
        const item = { ...expense, synced: false };
        const idx = updatedList.findIndex((e) => e.id === item.id);
        if (idx >= 0) updatedList[idx] = item;
        else updatedList.unshift(item);
      } else if (action === 'UPDATE' && expense) {
        const item = { ...expense, synced: false };
        updatedList = updatedList.map((e) => (e.id === item.id ? item : e));
      } else if (action === 'DELETE' && id) {
        updatedList = updatedList.filter((e) => e.id !== id);
      }
      results.push({
        id: op.id,
        success: false,
        error: authError || 'Google Sheets credentials not configured yet',
      });
    }
    saveLocalExpenses(updatedList);
    return res.json({
      success: false,
      sheetConnected: false,
      results,
      expenses: updatedList,
    });
  }

  for (const op of operations) {
    const { action, expense, id } = op;
    try {
      if (action === 'CREATE' && expense) {
        await appendGoogleSheetsRow(sheetId, expense, token);
        const item = { ...expense, synced: true };
        const idx = updatedList.findIndex((e) => e.id === item.id);
        if (idx >= 0) {
          updatedList[idx] = item;
        } else {
          updatedList.unshift(item);
        }
        results.push({ id: op.id, success: true });
      } else if (action === 'UPDATE' && expense) {
        await updateGoogleSheetsRow(sheetId, expense, token);
        const item = { ...expense, synced: true };
        updatedList = updatedList.map((e) => (e.id === item.id ? item : e));
        results.push({ id: op.id, success: true });
      } else if (action === 'DELETE' && (id || expense?.id)) {
        const targetId = id || expense?.id;
        await deleteGoogleSheetsRow(sheetId, targetId, token);
        updatedList = updatedList.filter((e) => e.id !== targetId);
        results.push({ id: op.id, success: true });
      }
    } catch (err: any) {
      console.error(`Batch sync item failed for ${op.action}:`, err.message);
      results.push({ id: op.id, success: false, error: err.message });
    }
  }

  saveLocalExpenses(updatedList);
  res.json({ success: true, sheetConnected: true, results, expenses: updatedList });
});

// 7. Save Sheet ID and/or Service Account Credentials with live verification
app.post('/api/config/sheet-id', (req: Request, res: Response) => {
  const { sheetId } = req.body;
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId is required' });
  }

  const extractedId = extractSheetId(sheetId) || sheetId.trim();
  const extractedGid = extractSheetGid(sheetId);
  const update: Partial<BackendConfig> = { sheetId: extractedId };
  if (extractedGid) {
    update.sheetGid = extractedGid;
  }

  // Clear tab cache when sheet changes
  Object.keys(tabNameCache).forEach((k) => delete tabNameCache[k]);
  saveBackendConfig(update);

  res.json({ success: true, sheetId: extractedId, sheetGid: extractedGid || DEFAULT_SHEET_GID });
});

app.post('/api/config/credentials', async (req: Request, res: Response) => {
  const { serviceAccountJson, serviceAccountEmail, privateKey, sheetId, sheetGid } = req.body;

  const update: Partial<BackendConfig> = {};

  if (sheetId && String(sheetId).trim()) {
    update.sheetId = extractSheetId(String(sheetId)) || String(sheetId).trim();
    const gidFromUrl = extractSheetGid(String(sheetId));
    if (gidFromUrl) update.sheetGid = gidFromUrl;
  }
  if (sheetGid && String(sheetGid).trim()) {
    update.sheetGid = extractSheetGid(String(sheetGid)) || String(sheetGid).trim();
  }

  // Validate if full JSON was provided
  if (serviceAccountJson && String(serviceAccountJson).trim()) {
    const raw = String(serviceAccountJson).trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      return res.status(400).json({
        success: false,
        error: `Format i pavlefshëm JSON: ${e.message}. Ju lutem ngjisni të gjithë përmbajtjen e skedarit JSON të Service Account.`,
      });
    }

    if (parsed.type && parsed.type !== 'service_account') {
      return res.status(400).json({
        success: false,
        error: `Lloji i kredencialeve është "${parsed.type}", por kërkohet "service_account". Krijoni një Service Account Key në Google Cloud Console.`,
      });
    }

    if (!parsed.client_email || !parsed.private_key) {
      return res.status(400).json({
        success: false,
        error: 'Skedarit JSON i mungon "client_email" ose "private_key".',
      });
    }

    update.serviceAccountJson = raw;
    update.serviceAccountEmail = String(parsed.client_email).trim();
    update.privateKey = normalizePrivateKey(parsed.private_key) || parsed.private_key;
  } else if (serviceAccountEmail || privateKey) {
    if (!serviceAccountEmail || !String(serviceAccountEmail).includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ju lutem vendosni një adresë të vlefshme Service Account Email (p.sh. ...@...iam.gserviceaccount.com).',
      });
    }
    const normKey = normalizePrivateKey(privateKey);
    if (!normKey || !normKey.includes('BEGIN PRIVATE KEY')) {
      return res.status(400).json({
        success: false,
        error: 'Çelësi privat (Private Key) nuk është në formatin e saktë PEM (duhet të përmbajë "-----BEGIN PRIVATE KEY-----").',
      });
    }
    update.serviceAccountEmail = String(serviceAccountEmail).trim();
    update.privateKey = normKey;
    update.serviceAccountJson = '';
  }

  // Clear tab cache and save configuration
  Object.keys(tabNameCache).forEach((k) => delete tabNameCache[k]);
  saveBackendConfig(update);

  // Now test the saved credentials live against Google Sheets and backfill any missing rows
  const auth = await getEffectiveSheetsToken(req);
  if (!auth.token) {
    return res.status(400).json({
      success: false,
      serviceAccountEmail: auth.serviceAccountEmail,
      error: auth.authError || 'Nuk u arrit gjenerimi i tokenit nga Service Account.',
    });
  }

  try {
    const backfill = await reconcileAndBackfillWithSheets(auth.sheetId, auth.token);
    await reconcileWorkDaysWithSheets(auth.sheetId, auth.token).catch(() => {});
    return res.json({
      success: true,
      connected: true,
      serviceAccountEmail: auth.serviceAccountEmail,
      sheetId: auth.sheetId,
      sheetGid: auth.sheetGid,
      tabName: backfill.tab,
      uploadedCount: backfill.uploadedCount,
    });
  } catch (err: any) {
    const isPermissionError = err.message?.includes('403');
    const friendlyError =
      isPermissionError && auth.serviceAccountEmail
        ? `Kredencialet janë të sakta, por Google Sheet nuk është ndarë (Share) ende me Service Account! Hapni Google Sheet tuaj dhe bëni Share (si Editor) me adresën: ${auth.serviceAccountEmail}`
        : err.message;

    return res.status(200).json({
      success: true,
      connected: false,
      serviceAccountEmail: auth.serviceAccountEmail,
      sheetId: auth.sheetId,
      sheetGid: auth.sheetGid,
      credentialError: friendlyError,
    });
  }
});

// 8. Push all local expenses and working days to Google Sheets (Backfill missing rows)
app.post('/api/sync/push-to-sheets', async (req: Request, res: Response) => {
  const { token, sheetId, serviceAccountEmail, authError } = await getEffectiveSheetsToken(req);
  if (!token || !sheetId) {
    return res.status(401).json({
      success: false,
      error: 'NO_TOKEN',
      message:
        authError ||
        'Kërkohen kredencialet e Service Account ose hyrja me Google për të ngarkuar shpenzimet.',
    });
  }

  try {
    const result = await reconcileAndBackfillWithSheets(sheetId, token);
    await reconcileWorkDaysWithSheets(sheetId, token).catch(() => {});
    res.json({
      success: true,
      uploadedCount: result.uploadedCount,
      totalLocal: result.mergedExpenses.length,
      tab: result.tab,
      sheetId,
      serviceAccountEmail,
    });
  } catch (err: any) {
    console.error('Error in push-to-sheets:', err);
    const is403 = err.message?.includes('403');
    const message =
      is403 && serviceAccountEmail
        ? `Mungon qasja (403). Bëni Share fletën tuaj në Google Sheets (si Editor) me: ${serviceAccountEmail}`
        : err.message;
    res.status(500).json({ success: false, error: message, message });
  }
});


// ------------------- VITE / STATIC SERVING -------------------
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
