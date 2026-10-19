import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Expense, ExpenseCategory, Language, User, WorkDayEntry } from '../types';
import { formatCurrency, formatDateDDMMYYYY, getMonthName } from '../utils/formatters';
import { getStoredUsers } from '../utils/users';
import { translations, getCategoryColor } from '../i18n/translations';
import { DonutChart } from './DonutChart';
import { CategoryIcon } from './CategoryIcon';
import {
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Calendar,
  CalendarCheck,
  Receipt,
  Award,
  UserCheck,
  Cloud,
  RefreshCw,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface DashboardViewProps {
  expenses: Expense[];
  workDays: WorkDayEntry[];
  onNavigateToAdd: () => void;
  onNavigateToWorkDays: () => void;
  onNavigateToHistory: () => void;
  currentUser: User;
  onOpenAuthModal: () => void;
  onOpenSheetsModal: () => void;
  isSheetsConnected: boolean;
  isSyncing: boolean;
  lang: Language;
}

interface WorkerDaysBarItem {
  workerId: string;
  name: string;
  fullName: string;
  fullDays: number;
  halfDays: number;
  halfDaysCount: number;
  totalDays: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  workDays,
  onNavigateToAdd,
  onNavigateToWorkDays,
  onNavigateToHistory,
  currentUser,
  onOpenAuthModal,
  onOpenSheetsModal,
  isSheetsConnected,
  isSyncing,
  lang,
}) => {
  const t = translations[lang];
  const isManagement = currentUser.role === 'management';

  // Current calendar month filtering (from 1st day of current month to today)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Working days this month (for current worker if role === 'worker', or total team if management)
  const monthWorkDays = workDays.filter((w) => {
    const d = new Date(w.date);
    const sameMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    if (!sameMonth) return false;
    if (!isManagement) {
      return w.workerId === currentUser.id;
    }
    return true;
  });

  const totalWorkDaysThisMonth = monthWorkDays.reduce(
    (sum, w) => sum + (w.days === 0.5 ? 0.5 : 1),
    0
  );
  const halfWorkDaysCount = monthWorkDays.filter((w) => w.days === 0.5).length;

  // Build Working Days by Employee Bar Chart Data (Scoped by Role)
  const workerBarData: WorkerDaysBarItem[] = useMemo(() => {
    const storedUsers = getStoredUsers();
    const visibleUsers = isManagement
      ? storedUsers
      : storedUsers.filter((u) => u.id === currentUser.id);

    const map = new Map<string, WorkerDaysBarItem>();

    visibleUsers.forEach((u) => {
      const shortName = u.name.split(' (')[0];
      map.set(u.id, {
        workerId: u.id,
        name: shortName,
        fullName: u.name,
        fullDays: 0,
        halfDays: 0,
        halfDaysCount: 0,
        totalDays: 0,
      });
    });

    monthWorkDays.forEach((entry) => {
      if (!isManagement && entry.workerId !== currentUser.id) return;
      let existing = map.get(entry.workerId);
      if (!existing) {
        const shortName = entry.workerName.split(' (')[0];
        existing = {
          workerId: entry.workerId,
          name: shortName,
          fullName: entry.workerName,
          fullDays: 0,
          halfDays: 0,
          halfDaysCount: 0,
          totalDays: 0,
        };
        map.set(entry.workerId, existing);
      }

      if (entry.days === 0.5) {
        existing.halfDays += 0.5;
        existing.halfDaysCount += 1;
        existing.totalDays += 0.5;
      } else {
        existing.fullDays += 1;
        existing.totalDays += 1;
      }
    });

    return Array.from(map.values());
  }, [monthWorkDays, isManagement, currentUser.id]);

  // Category distribution for this month
  const categoryTotals: Record<ExpenseCategory, number> = {
    food: 0,
    coffee: 0,
    fuel: 0,
    other: 0,
  };

  monthExpenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    }
  });

  const chartData = (['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).map((cat) => {
    const amt = categoryTotals[cat];
    const pct = totalThisMonth > 0 ? (amt / totalThisMonth) * 100 : 0;
    const colors = getCategoryColor(cat);
    return {
      category: cat,
      amount: amt,
      percentage: pct,
      color: colors.hex,
    };
  });

  // 3 Quick Statistics
  // 1. Last 7 Days Total
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const last7DaysTotal = expenses
    .filter((e) => new Date(e.date) >= sevenDaysAgo)
    .reduce((sum, e) => sum + e.amount, 0);

  // 2. Total Transactions this month
  const totalTransactionsCount = monthExpenses.length;

  // 3. Biggest Expense Category this month
  let biggestCat: ExpenseCategory = 'fuel';
  let maxCatAmount = -1;
  (['fuel', 'food', 'coffee', 'other'] as ExpenseCategory[]).forEach((cat) => {
    if (categoryTotals[cat] > maxCatAmount) {
      maxCatAmount = categoryTotals[cat];
      biggestCat = cat;
    }
  });

  // Count unsynced items
  const unsyncedCount = expenses.filter((e) => !e.synced).length;

  // 10 Most Recent Expenses
  const recentExpenses = [...expenses]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto px-4 pt-3">
      {/* Active Worker / Employee Quick Bar */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.initials}
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {t.activeWorker}
              </span>
              {!isManagement && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {t.viewOnlyBadge}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px] sm:max-w-xs">
              {currentUser.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
          >
            <UserCheck size={13} />
            <span>{t.switchWorker}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Alert Bar if Unsynced or Offline */}
      {unsyncedCount > 0 && isSheetsConnected && isManagement && (
        <div
          onClick={onOpenSheetsModal}
          className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-100/70 transition-colors animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <Cloud size={15} className="text-emerald-700" />
            <span className="font-semibold">
              {lang === 'sq'
                ? `${unsyncedCount} shpenzime po sinkronizohen automatikisht...`
                : `${unsyncedCount} expenses auto-syncing with Google Sheets...`}
            </span>
          </div>
          {isSyncing ? (
            <RefreshCw size={13} className="animate-spin text-emerald-700" />
          ) : (
            <span className="text-[11px] font-bold text-emerald-900 underline">
              {lang === 'sq' ? 'Shiko' : 'View'}
            </span>
          )}
        </div>
      )}

      {/* 1. Monthly Spending Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B4332] via-[#245740] to-[#143326] p-6 text-white shadow-xl shadow-emerald-950/15">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute top-2 right-4 text-emerald-200/20 pointer-events-none">
          <svg className="w-24 h-24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md">
                <Calendar size={14} className="text-emerald-300" />
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
                {getMonthName(now, lang)}
              </span>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-emerald-100">
              {totalTransactionsCount} {t.transactionsCount}
            </span>
          </div>

          <div className="mt-4">
            <h2 className="text-xs font-medium text-emerald-100/90 tracking-wide">
              {t.totalThisMonth}
            </h2>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
              {formatCurrency(totalThisMonth)}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/90">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-300" />
              {t.last7Days}:{' '}
              <strong className="text-white tabular-nums">{formatCurrency(last7DaysTotal)}</strong>
            </span>
            <span className="text-[11px] text-emerald-200/80">
              {lang === 'sq' ? 'Përditësuar sot' : 'Updated today'}
            </span>
          </div>
        </div>
      </div>

      {/* WORKING DAYS COUNTER SUMMARY CARD (Direct link to Working Days Calendar) */}
      <div
        onClick={onNavigateToWorkDays}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-50/40 transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#1B4332] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                {t.workDaysTab}
              </span>
              {halfWorkDaysCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {halfWorkDaysCount} × ½ {t.daysUnit}
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
              {totalWorkDaysThisMonth}{' '}
              <span className="text-sm font-bold text-slate-600">{t.daysUnit}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {isManagement
                ? lang === 'sq'
                  ? 'Shto 1 ditë ose ½ ditë + përshkrim (p.sh. shi)'
                  : 'Add 1 day or ½ day + description (e.g. rain)'
                : lang === 'sq'
                ? 'Shiko kalendarin e ditëve të punës dhe arsyet'
                : 'View your working days calendar and descriptions'}
            </p>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-900 transition-colors shrink-0">
          <ArrowRight size={18} />
        </div>
      </div>

      {/* 2. DASHBOARD STATISTICS SECTION (RECHARTS) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
              <BarChart3 size={16} className="text-[#1B4332]" />
              <span>{t.dashboardStatistics}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t.dashboardStatisticsSub}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60">
            {getMonthName(now, lang)}
          </span>
        </div>

        {/* Chart 1: Monthly Expenses by Category (Recharts Donut Chart) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <PieChartIcon size={13} className="text-emerald-700" />
              <span>{t.monthlyExpensesByCategory}</span>
            </span>
            <span className="text-xs font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(totalThisMonth)}
            </span>
          </div>
          <DonutChart data={chartData} totalAmount={totalThisMonth} lang={lang} />
        </div>

        {/* Chart 2: Working Days by Employee (Recharts Stacked Bar Chart) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <CalendarCheck size={14} className="text-[#1B4332]" />
                <span>{t.workingDaysByEmployee}</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isManagement
                  ? lang === 'sq'
                    ? 'Krahasimi i ditëve të plota (1) dhe gjysmë ditëve (½) për ekipin'
                    : 'Team comparison of full days (1) and half days (½)'
                  : lang === 'sq'
                  ? 'Ditët tuaja të plota (1) dhe gjysmë ditët (½) këtë muaj'
                  : 'Your full days (1) and half days (½) this month'}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToWorkDays}
              className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer shrink-0"
            >
              <span>{t.viewCalendarLink}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Custom Legend Pill Bar */}
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1B4332]" />
              <span>{t.fullDaysBar}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
              <span>{t.halfDaysBar}</span>
            </div>
          </div>

          <div className="w-full h-56 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workerBarData}
                margin={{ top: 8, right: 12, left: -20, bottom: 4 }}
                barSize={38}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={true}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as WorkerDaysBarItem;
                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1.5 min-w-[170px]">
                        <p className="font-extrabold text-white border-b border-white/10 pb-1">
                          {item.fullName}
                        </p>
                        <div className="flex items-center justify-between gap-3 tabular-nums">
                          <span className="text-emerald-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-[#52B788]" />
                            {t.fullDaysBar}:
                          </span>
                          <span className="font-bold">
                            {item.fullDays} {t.daysUnit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 tabular-nums">
                          <span className="text-amber-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" />
                            {t.halfDaysBar}:
                          </span>
                          <span className="font-bold">
                            {item.halfDaysCount} × ½ ({item.halfDays} {t.daysUnit})
                          </span>
                        </div>
                        <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-3 tabular-nums font-extrabold text-sm">
                          <span>{t.totalDaysLabel}:</span>
                          <span className="text-emerald-200">
                            {item.totalDays} {t.daysUnit}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="fullDays"
                  name={t.fullDaysBar}
                  stackId="workdays"
                  fill="#1B4332"
                  radius={[0, 0, 6, 6]}
                  isAnimationActive={true}
                  animationDuration={450}
                />
                <Bar
                  dataKey="halfDays"
                  name={t.halfDaysBar}
                  stackId="workdays"
                  fill="#D97706"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={450}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Employee Summary Chips Beneath Bar Chart */}
          <div
            className={`grid gap-2 pt-2 border-t border-slate-100 ${
              workerBarData.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {workerBarData.map((w) => (
              <div
                key={w.workerId}
                onClick={onNavigateToWorkDays}
                className="p-2.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold text-slate-800 truncate">
                  {w.name}
                </span>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-[#1B4332] tabular-nums">
                    {w.totalDays} {t.daysUnit}
                  </span>
                  {w.halfDaysCount > 0 && (
                    <span className="block text-[10px] font-semibold text-amber-700 tabular-nums">
                      {w.halfDaysCount} × ½
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Quick Statistics (3 Compact Cards) */}
      <section className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          {/* Stat 1: Last 7 Days */}
          <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <Calendar size={15} />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">
                {t.last7Days}
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
                {formatCurrency(last7DaysTotal)}
              </p>
            </div>
          </div>

          {/* Stat 2: Total Transactions */}
          <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
              <Receipt size={15} />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">
                {t.totalTransactions}
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
                {totalTransactionsCount}
              </p>
            </div>
          </div>

          {/* Stat 3: Biggest Category */}
          <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
              <Award size={15} />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 leading-tight">
                {t.biggestCategory}
              </span>
              <p className="mt-1 text-xs font-bold text-slate-900 truncate">
                {maxCatAmount > 0 ? t.categories[biggestCat] : '-'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Add Expense Button (Management Only) OR View-Only Notice for Workers */}
      {isManagement ? (
        <div>
          <button
            type="button"
            onClick={onNavigateToAdd}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143326] hover:to-[#245740] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={22} strokeWidth={2.5} />
            <span>{t.addExpense}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex items-center gap-3 text-xs">
          <Eye size={18} className="shrink-0 text-amber-700" />
          <span className="font-semibold leading-relaxed">{t.viewOnlyExpenseNotice}</span>
        </div>
      )}

      {/* 5. Recent Expenses (10 newest transactions) */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            {t.recentExpenses}
          </h3>
          <button
            type="button"
            onClick={onNavigateToHistory}
            className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <span>{t.viewAll}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 text-xs text-slate-500">
            {t.noExpensesThisMonth}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-100/80 shadow-xs overflow-hidden">
            {recentExpenses.map((expense) => {
              const catColor = getCategoryColor(expense.category);
              return (
                <div
                  key={expense.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
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
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          · {formatDateDDMMYYYY(expense.date)}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs mt-0.5">
                          {expense.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {expense.createdBy.split(' ')[0]} ·{' '}
                      {expense.synced ? (
                        <span className="text-emerald-700 font-medium">✓ Sheets</span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
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
      </section>
    </div>
  );
};
