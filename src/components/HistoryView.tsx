import React, { useState } from 'react';
import { Expense, ExpenseCategory, DateFilterRange, Language, User as AppUser } from '../types';
import { formatCurrency, formatDateDDMMYYYY, formatDateTimeVienna, getTodayISODate } from '../utils/formatters';
import { translations, getCategoryColor } from '../i18n/translations';
import { CategoryIcon } from './CategoryIcon';
import { exportExpensesToCSV } from '../services/storage';
import {
  Calendar,
  Filter,
  Download,
  Trash2,
  Edit3,
  X,
  Search,
  AlertTriangle,
  Receipt,
  User,
  Clock,
  Eye
} from 'lucide-react';

interface HistoryViewProps {
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  currentUser: AppUser;
  lang: Language;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  expenses,
  onUpdateExpense,
  onDeleteExpense,
  currentUser,
  lang,
}) => {
  const t = translations[lang];
  const isManagement = currentUser.role === 'management';


  const [rangeFilter, setRangeFilter] = useState<DateFilterRange>('month');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom date range state
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(getTodayISODate());

  // Modal inspection & edit/delete state
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('fuel');
  const [editDate, setEditDate] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  // Delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 1. Filter by Date Range
  const now = new Date();
  const filteredByDate = expenses.filter((e) => {
    const expDate = new Date(e.date);
    if (isNaN(expDate.getTime())) return false;

    if (rangeFilter === '7days') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      return expDate >= cutoff;
    }
    if (rangeFilter === '30days') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      return expDate >= cutoff;
    }
    if (rangeFilter === 'month') {
      return expDate.getFullYear() === now.getFullYear() && expDate.getMonth() === now.getMonth();
    }
    if (rangeFilter === 'custom') {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return expDate >= start && expDate <= end;
    }
    return true; // 'all'
  });

  // 2. Spending Summary & Category Breakdown for selected period
  const periodTotal = filteredByDate.reduce((sum, e) => sum + e.amount, 0);
  const periodCount = filteredByDate.length;

  const categoryTotals: Record<ExpenseCategory, number> = {
    food: 0,
    coffee: 0,
    fuel: 0,
    other: 0,
  };

  filteredByDate.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    }
  });

  // 3. Filter by Category & Search query
  const displayedExpenses = filteredByDate
    .filter((e) => selectedCategory === 'all' || e.category === selectedCategory)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchWorker = e.createdBy.toLowerCase().includes(q);
      const matchCat = t.categories[e.category].toLowerCase().includes(q);
      return matchDesc || matchWorker || matchCat;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Handle open modal
  const handleOpenDetail = (expense: Expense) => {
    setActiveExpense(expense);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditDesc(expense.description || '');
  };

  // Handle Save Edit
  const handleSaveEdit = async () => {
    if (!activeExpense) return;
    const numAmt = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(numAmt) || numAmt <= 0) return;

    setIsProcessing(true);
    try {
      const updated: Expense = {
        ...activeExpense,
        amount: Math.round(numAmt * 100) / 100,
        category: editCategory,
        date: editDate || activeExpense.date,
        description: editDesc.trim() || undefined,
      };
      await onUpdateExpense(updated);
      setActiveExpense(null);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete with Confirmation
  const handleConfirmDelete = async () => {
    if (!activeExpense) return;
    setIsProcessing(true);
    try {
      await onDeleteExpense(activeExpense.id);
      setActiveExpense(null);
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4 pt-4 space-y-5">
      {/* 1. DATE RANGE FILTER SEGMENTED CONTROL */}
      <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-700" />
            <span>{t.dateRange}</span>
          </span>
          <button
            type="button"
            onClick={() => exportExpensesToCSV(filteredByDate)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <Download size={13} />
            <span>{t.exportCsv}</span>
          </button>
        </div>

        {/* Segmented Filter Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl">
          {(['7days', '30days', 'month', 'all', 'custom'] as DateFilterRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeFilter(r)}
              className={`py-2 px-2 text-xs font-bold rounded-xl transition-all text-center truncate ${
                rangeFilter === r
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.ranges[r]}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {rangeFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 animate-fadeIn">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                {t.startDate}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                {t.endDate}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. SPENDING SUMMARY FOR SELECTED PERIOD */}
      <div className="bg-gradient-to-r from-emerald-900 to-[#1B4332] text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-emerald-200">
            {t.ranges[rangeFilter]}
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
            {formatCurrency(periodTotal)}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-100">
            <Receipt size={13} />
            <span className="tabular-nums">{periodCount}</span> {t.transactionsCount}
          </span>
        </div>
      </div>

      {/* 3. CATEGORY BREAKDOWN VISUAL BAR & STATS */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-700">
          {t.categoryBreakdown}
        </h4>

        {/* Visual Multi-Segment Bar */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {(['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).map((cat) => {
            const amt = categoryTotals[cat];
            const pct = periodTotal > 0 ? (amt / periodTotal) * 100 : 0;
            const colors = getCategoryColor(cat);
            if (pct <= 0) return null;

            return (
              <div
                key={cat}
                style={{ width: `${pct}%`, backgroundColor: colors.hex }}
                title={`${t.categories[cat]}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                className="h-full transition-all duration-300"
              />
            );
          })}
        </div>

        {/* Category Stat Rows */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {(['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).map((cat) => {
            const amt = categoryTotals[cat];
            const pct = periodTotal > 0 ? (amt / periodTotal) * 100 : 0;
            const colors = getCategoryColor(cat);

            return (
              <div key={cat} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.hex }} />
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {t.categories[cat]}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatCurrency(amt)}
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EXPENSE LIST WITH SEARCH & CATEGORY FILTER PILLS */}
      <div className="space-y-3">
        {/* Search bar & filter pills */}
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchExpenses}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-2xl bg-white border border-slate-200 focus:outline-hidden focus:border-[#1B4332]"
            />
          </div>

          {/* Category Filter Pills (Functional Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.allCategories}
            </button>
            {(['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CategoryIcon category={cat} size={13} />
                  <span>{t.categories[cat]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses Table/List */}
        {displayedExpenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 text-xs text-slate-500">
            {t.noExpensesFound}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100/80 shadow-xs overflow-hidden">
            {displayedExpenses.map((expense) => {
              const catColor = getCategoryColor(expense.category);
              return (
                <div
                  key={expense.id}
                  onClick={() => handleOpenDetail(expense)}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${catColor.bg} ${catColor.text}`}
                    >
                      <CategoryIcon category={expense.category} size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {t.categories[expense.category]}
                        </span>
                        <span className="text-[11px] text-slate-600 tabular-nums">
                          · {formatDateDDMMYYYY(expense.date)}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-slate-600 truncate max-w-[210px] sm:max-w-xs mt-0.5">
                          {expense.description}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-600">
                        {expense.createdBy}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                    <span className="block text-[10px] mt-0.5">
                      {expense.synced ? (
                        <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                          ✓ Sheets
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                          {lang === 'sq' ? '⏳ Në pritje' : '⏳ Pending'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. EXPENSE DETAILS / CORRECTION & DELETION MODAL */}
      {activeExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {isEditing ? t.editExpense : t.expenseDetails}
              </h3>
              <button
                type="button"
                onClick={() => setActiveExpense(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Read-Only View vs Edit View */}
            {!isEditing ? (
              <div className="space-y-4 pt-4">
                {/* Amount Callout */}
                <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    {t.categories[activeExpense.category]}
                  </span>
                  <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">
                    {formatCurrency(activeExpense.amount)}
                  </p>
                </div>

                {/* Metadata List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} />
                      {t.expenseDate}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatDateDDMMYYYY(activeExpense.date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User size={14} />
                      {t.recordedBy}
                    </span>
                    <span className="font-bold text-slate-900">
                      {activeExpense.createdBy}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock size={14} />
                      {t.timestamp}
                    </span>
                    <span className="font-medium text-slate-700 tabular-nums">
                      {formatDateTimeVienna(activeExpense.createdAt)}
                    </span>
                  </div>

                  {activeExpense.description && (
                    <div className="pt-1">
                      <span className="text-slate-500 block mb-1">
                        {t.description}
                      </span>
                      <p className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium">
                        {activeExpense.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation Warning (Management Only) */}
                {isManagement && showDeleteConfirm ? (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span className="font-bold text-xs">{t.confirmDeleteTitle}</span>
                    </div>
                    <p className="text-xs text-red-600 leading-relaxed">
                      {t.confirmDeleteMsg}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors"
                      >
                        {isProcessing ? '...' : t.confirmDeleteButton}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : isManagement ? (
                  /* Action Buttons: Edit and Delete (Management Only) */
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 size={15} />
                      <span>{t.editExpense}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                    >
                      <Trash2 size={15} />
                      <span>{t.deleteExpense}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center gap-2 text-xs">
                    <Eye size={15} className="shrink-0 text-amber-700" />
                    <span className="font-semibold">{t.viewOnlyBadge}</span>
                  </div>
                )}
              </div>

            ) : (
              /* Inline Edit Form */
              <div className="space-y-3 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.enterAmount} (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base font-extrabold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.selectCategory}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditCategory(cat)}
                        className={`p-2 rounded-xl text-xs font-bold border text-left flex items-center gap-2 ${
                          editCategory === cat
                            ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332]'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <CategoryIcon category={cat} size={15} />
                        <span>{t.categories[cat]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.expenseDate}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.description}
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs transition-colors"
                  >
                    {isProcessing ? '...' : t.saveChanges}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
