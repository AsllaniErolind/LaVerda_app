import { Expense, ExpenseCategory } from '../types';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
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

function formatA1Range(tabName: string, cellRange: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${cellRange}`;
}

async function resolveClientSheetTab(spreadsheetId: string, accessToken: string, preferredGid = '1924995249'): Promise<string> {
  try {
    const metaRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheets = meta.sheets || [];
      const foundGid = sheets.find((s: any) => String(s.properties?.sheetId) === String(preferredGid));
      if (foundGid?.properties?.title) return foundGid.properties.title;

      const foundNamed = sheets.find((s: any) =>
        ['expenses', 'shpenzime', 'shpenzimet'].includes(String(s.properties?.title || '').toLowerCase())
      );
      if (foundNamed?.properties?.title) return foundNamed.properties.title;

      if (sheets[0]?.properties?.title) return sheets[0].properties.title;
    }
  } catch {}
  return 'Expenses';
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
  await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [HEADERS],
    }),
  });

  return spreadsheetId;
}

/**
 * Appends a new expense record to the target Google Sheet tab
 */
export async function appendExpenseToSheet(
  spreadsheetId: string,
  expense: Expense,
  accessToken: string
): Promise<void> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
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
  const res = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gabim gjatë leximit të Google Sheets (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .map((row) => ({
      id: String(row[0] || '').trim(),
      date: String(row[1] || '').trim(),
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
 * Updates an existing expense row by matching the ID
 */
export async function updateExpenseInSheet(
  spreadsheetId: string,
  expense: Expense,
  accessToken: string
): Promise<void> {
  const tab = await resolveClientSheetTab(spreadsheetId, accessToken);
  const colARange = formatA1Range(tab, 'A:A');
  const res = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

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
  const rowsRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(colARange)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
