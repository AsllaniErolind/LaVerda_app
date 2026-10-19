export type ExpenseCategory = 'food' | 'coffee' | 'fuel' | 'other';

export interface Expense {
  id: string;
  date: string; // ISO YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  description?: string;
  createdAt: string; // ISO string
  createdBy: string; // Employee Name
  synced?: boolean;
}

export interface WorkDayEntry {
  id: string;
  workerId: string;
  workerName: string;
  date: string; // ISO YYYY-MM-DD
  days: 1 | 0.5; // 1 full day or 0.5 half day
  description?: string; // e.g. rain or half-day reason
  createdAt: string; // ISO string
  createdBy: string; // Management Staff Name
  synced?: boolean;
}


export interface User {
  id: string;
  name: string;
  role: 'worker' | 'management';
  pin: string;
  avatarColor: string;
  initials: string;
}

export type DateFilterRange = '7days' | '30days' | 'month' | 'all' | 'custom';

export type Language = 'sq' | 'en';

export interface CategorySummary {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percentage: number;
}
