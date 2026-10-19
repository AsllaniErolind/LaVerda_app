import React, { useState, useMemo } from 'react';
import { WorkDayEntry, User, Language } from '../types';
import { getStoredUsers } from '../utils/users';
import { formatDateDDMMYYYY, getTodayISODate, getMonthName } from '../utils/formatters';
import { translations } from '../i18n/translations';
import { exportWorkDaysToCSV } from '../services/storage';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudRain,
  PlusCircle,
  CheckCircle2,
  Eye,
  Users,
  UserCheck,
  FileText,
  Trash2,
  Edit3,
  Download,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorkDaysViewProps {
  workDays: WorkDayEntry[];
  onSaveWorkDays: (
    entries: Array<Omit<WorkDayEntry, 'id' | 'createdAt' | 'synced'>>
  ) => Promise<void>;
  onUpdateWorkDay: (entry: WorkDayEntry) => Promise<void>;
  onDeleteWorkDay: (id: string) => Promise<void>;
  currentUser: User;
  onOpenAuthModal: () => void;
  lang: Language;
}

export const WorkDaysView: React.FC<WorkDaysViewProps> = ({
  workDays,
  onSaveWorkDays,
  onUpdateWorkDay,
  onDeleteWorkDay,
  currentUser,
  onOpenAuthModal,
  lang,
}) => {
  const t = translations[lang];
  const isManagement = currentUser.role === 'management';

  // Load all staff members; filter workers for "All Workers" option
  const allUsers = useMemo(() => getStoredUsers(), [currentUser]);
  const workerUsers = useMemo(
    () => allUsers.filter((u) => u.role === 'worker'),
    [allUsers]
  );


  // Selected month for calendar & counter
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0-11

  // Filter by employee ('all' or specific user.id)
  // If a regular worker logs in, default filter to their own ID so they immediately see their own counter, with option to view all
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>(() =>
    currentUser.role === 'worker' ? currentUser.id : 'all'
  );

  // Selected date on the calendar (for filtering or quick logging)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayISODate());

  // Management Form State
  const [targetWorkerId, setTargetWorkerId] = useState<string>('ALL_WORKERS');
  const [formDate, setFormDate] = useState<string>(getTodayISODate());
  const [selectedDays, setSelectedDays] = useState<1 | 0.5>(1);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Edit Modal State (Management Only)
  const [editingEntry, setEditingEntry] = useState<WorkDayEntry | null>(null);
  const [editDays, setEditDays] = useState<1 | 0.5>(1);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  // Filter entries for the current viewed month
  const monthEntries = useMemo(() => {
    return workDays.filter((w) => {
      const d = new Date(w.date);
      if (isNaN(d.getTime())) return false;
      const sameMonth = d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      if (!sameMonth) return false;
      if (selectedWorkerFilter !== 'all' && w.workerId !== selectedWorkerFilter) {
        return false;
      }
      return true;
    });
  }, [workDays, viewYear, viewMonth, selectedWorkerFilter]);

  // Calculate monthly working day counters
  const totalDaysCount = useMemo(
    () => monthEntries.reduce((sum, w) => sum + (w.days === 0.5 ? 0.5 : 1), 0),
    [monthEntries]
  );
  const fullDaysCount = useMemo(
    () => monthEntries.filter((w) => w.days === 1).length,
    [monthEntries]
  );
  const halfDaysCount = useMemo(
    () => monthEntries.filter((w) => w.days === 0.5).length,
    [monthEntries]
  );

  // Group month entries by YYYY-MM-DD for calendar cells
  const entriesByDate = useMemo(() => {
    const map: Record<string, WorkDayEntry[]> = {};
    monthEntries.forEach((w) => {
      if (!map[w.date]) map[w.date] = [];
      map[w.date].push(w);
    });
    return map;
  }, [monthEntries]);

  // Build calendar grid days for viewYear / viewMonth
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ dateStr: string | null; dayNumber: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateStr: null, dayNumber: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const m = String(viewMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      cells.push({ dateStr: `${viewYear}-${m}-${d}`, dayNumber: day });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayCellClick = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setFormDate(dateStr);
  };

  const handleManagementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagement || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetDate = formDate || getTodayISODate();
      let entriesToCreate: Array<Omit<WorkDayEntry, 'id' | 'createdAt' | 'synced'>> = [];

      if (targetWorkerId === 'ALL_WORKERS') {
        const crew = workerUsers.length > 0 ? workerUsers : allUsers;
        entriesToCreate = crew.map((u) => ({
          workerId: u.id,
          workerName: u.name,
          date: targetDate,
          days: selectedDays,
          description: description.trim() || undefined,
          createdBy: currentUser.name,
        }));
      } else {
        const foundUser = allUsers.find((u) => u.id === targetWorkerId) || currentUser;
        entriesToCreate = [
          {
            workerId: foundUser.id,
            workerName: foundUser.name,
            date: targetDate,
            days: selectedDays,
            description: description.trim() || undefined,
            createdBy: currentUser.name,
          },
        ];
      }

      await onSaveWorkDays(entriesToCreate);

      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.75 },
        colors: ['#1B4332', '#2D6A4F', '#D97706', '#52B788'],
      });

      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (entry: WorkDayEntry) => {
    if (!isManagement) return;
    setEditingEntry(entry);
    setEditDays(entry.days);
    setEditDesc(entry.description || '');
    setEditDate(entry.date);
  };

  const handleSaveEditModal = async () => {
    if (!editingEntry || !isManagement) return;
    await onUpdateWorkDay({
      ...editingEntry,
      days: editDays,
      date: editDate || editingEntry.date,
      description: editDesc.trim() || undefined,
    });
    setEditingEntry(null);
  };

  const weekDayHeaders =
    lang === 'sq'
      ? ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto px-4 pt-3">
      {/* Active User & Role Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.initials}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isManagement
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isManagement
                  ? lang === 'sq'
                    ? 'Menaxhment'
                    : 'Management'
                  : t.viewOnlyBadge}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block">{t.workDaysSubtitle}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-emerald-800 transition-colors cursor-pointer shrink-0"
        >
          <UserCheck size={13} />
          <span>{t.switchWorker}</span>
        </button>
      </div>

      {/* View-Only Banner for Workers */}
      {!isManagement && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-xs">
          <Eye size={17} className="shrink-0 text-amber-700 mt-0.5" />
          <p className="font-medium leading-relaxed">{t.viewOnlyWorkDayNotice}</p>
        </div>
      )}

      {/* Employee Filter Pills (View Individual Worker or All Workers) */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users size={14} className="text-emerald-700" />
            <span>{t.filterWorkerLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => exportWorkDaysToCSV(monthEntries)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>{t.exportCsv}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedWorkerFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedWorkerFilter === 'all'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.allWorkersFilter}
          </button>
          {allUsers.map((u) => {
            const active = selectedWorkerFilter === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedWorkerFilter(u.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: u.avatarColor }}
                >
                  {u.initials}
                </span>
                <span>{u.name.split(' (')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. WORKING DAYS COUNTER HERO CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B4332] via-[#245740] to-[#143326] p-6 text-white shadow-xl shadow-emerald-950/15">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/10">
              <CalendarIcon size={15} className="text-emerald-300" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              {getMonthName(viewDate, lang)} {viewYear}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-100">
            {selectedWorkerFilter === 'all'
              ? t.allWorkersFilter
              : allUsers.find((u) => u.id === selectedWorkerFilter)?.name.split(' (')[0]}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <p className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-white">
            {totalDaysCount}
          </p>
          <span className="text-base font-bold text-emerald-200">{t.daysUnit}</span>
        </div>
        <p className="text-xs text-emerald-100/90 mt-0.5">{t.totalWorkDaysMonth}</p>

        {/* Breakdown of Full Days (1) vs Half Days (1/2) */}
        <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center font-black text-sm">
              1
            </div>
            <div>
              <span className="text-[11px] text-emerald-100 block">{t.fullDaysLabel}</span>
              <span className="text-sm font-extrabold text-white tabular-nums">
                {fullDaysCount} {t.daysUnit}
              </span>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/25 text-amber-200 flex items-center justify-center font-black text-sm">
              ½
            </div>
            <div>
              <span className="text-[11px] text-emerald-100 block">{t.halfDaysLabel}</span>
              <span className="text-sm font-extrabold text-amber-200 tabular-nums">
                {halfDaysCount} ({halfDaysCount * 0.5} {t.daysUnit})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MANAGEMENT-ONLY FORM: ADD 1 DAY OR 1/2 DAY + DESCRIPTION BELOW */}
      {isManagement && (
        <form
          onSubmit={handleManagementSubmit}
          className="bg-white rounded-3xl p-5 border-2 border-emerald-800/15 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <PlusCircle size={17} className="text-[#1B4332]" />
              <span>{t.addWorkDayTitle}</span>
            </h3>
            {showSavedToast && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fadeIn">
                <CheckCircle2 size={13} />
                <span>{t.workDaySaved}</span>
              </span>
            )}
          </div>

          {/* Employee & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.selectWorkerLabel}
              </label>
              <select
                value={targetWorkerId}
                onChange={(e) => setTargetWorkerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1B4332] focus:outline-hidden"
              >
                <option value="ALL_WORKERS">👥 {t.allWorkersOption}</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.expenseDate}
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1B4332] focus:outline-hidden"
              />
            </div>
          </div>

          {/* 1 DAY vs 1/2 DAY SELECTOR BUTTONS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'sq' ? 'Sasia e Ditës së Punës' : 'Working Day Duration'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedDays(1)}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-sm transition-all cursor-pointer ${
                  selectedDays === 1
                    ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332] shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sun size={18} className={selectedDays === 1 ? 'text-emerald-700' : 'text-slate-400'} />
                <span>{t.fullDayBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDays(0.5)}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-extrabold text-sm transition-all cursor-pointer ${
                  selectedDays === 0.5
                    ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CloudRain size={18} className={selectedDays === 0.5 ? 'text-amber-600' : 'text-slate-400'} />
                <span>{t.halfDayBtn}</span>
              </button>
            </div>
          </div>

          {/* DESCRIPTION / REASON SPACE BENEATH (Why 1/2 day or 1 day was worked, e.g. Rain) */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-700" />
              <span>{t.workDayDescriptionLabel}</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.workDayDescriptionPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1B4332] focus:outline-hidden resize-none"
            />

            {/* Quick Reason Chips (Rain, Half day, etc.) */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {t.workDaySuggestions.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDescription(chip);
                    if (chip.includes('½') || chip.toLowerCase().includes('shi') || chip.toLowerCase().includes('rain')) {
                      setSelectedDays(0.5);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-amber-50 hover:text-amber-900 text-slate-600 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143326] hover:to-[#245740] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles size={16} className="text-emerald-300" />
            <span>{isSubmitting ? t.saving : t.saveWorkDayBtn}</span>
          </button>
        </form>
      )}

      {/* 3. INTERACTIVE WORKING CALENDAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <h4 className="text-sm font-extrabold text-slate-900 capitalize">
              {getMonthName(viewDate, lang)} {viewYear}
            </h4>
            <p className="text-[11px] text-slate-500">
              {lang === 'sq'
                ? 'Kliko mbi një datë për të parë ose regjistruar ditën'
                : 'Tap any date to inspect or log working day'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center pt-1">
          {weekDayHeaders.map((dayName) => (
            <div key={dayName} className="text-[10px] font-bold uppercase text-slate-400 py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarGrid.map((cell, index) => {
            if (!cell.dateStr || !cell.dayNumber) {
              return <div key={`empty_${index}`} className="h-14 rounded-xl bg-slate-50/40" />;
            }

            const dayEntries = entriesByDate[cell.dateStr] || [];
            const daySum = dayEntries.reduce((s, e) => s + e.days, 0);
            const hasHalfDay = dayEntries.some((e) => e.days === 0.5);
            const hasNotes = dayEntries.some((e) => e.description && e.description.trim().length > 0);
            const isSelected = selectedCalendarDate === cell.dateStr;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleDayCellClick(cell.dateStr!)}
                className={`h-14 rounded-2xl p-1.5 flex flex-col items-center justify-between border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-2 border-[#1B4332] bg-emerald-50/50 shadow-xs'
                    : dayEntries.length > 0
                    ? hasHalfDay
                      ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
                      : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
                    : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`text-xs font-bold tabular-nums ${
                    isSelected ? 'text-[#1B4332] font-black' : 'text-slate-700'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayEntries.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md leading-tight ${
                        hasHalfDay
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#1B4332] text-white'
                      }`}
                    >
                      {selectedWorkerFilter === 'all'
                        ? `${daySum}d`
                        : dayEntries[0].days === 0.5
                        ? '½'
                        : '1'}
                    </span>
                    {hasNotes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" title="Ka përshkrim" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CHRONOLOGICAL LOG OF WORKING DAYS & DESCRIPTIONS (Why 1/2 day or 1 day was worked) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-900">
            {t.workDaysHistoryTitle} ({monthEntries.length})
          </h3>
          {selectedCalendarDate && (
            <button
              type="button"
              onClick={() => setSelectedCalendarDate('')}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              {lang === 'sq' ? 'Shiko gjithë muajin' : 'Show full month'}
            </button>
          )}
        </div>

        {monthEntries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 text-xs text-slate-500">
            {t.noWorkDaysMonth}
          </div>
        ) : (
          <div className="space-y-2.5">
            {monthEntries.map((entry) => {
              const isHalf = entry.days === 0.5;
              const isHighlighted = selectedCalendarDate === entry.date;

              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-3xl p-4 border transition-all shadow-xs space-y-2.5 ${
                    isHighlighted
                      ? 'border-[#1B4332] ring-1 ring-[#1B4332]/20'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isHalf
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-[#1B4332] border border-emerald-200'
                        }`}
                      >
                        {isHalf ? '½' : '1'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            {entry.workerName}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isHalf
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isHalf ? t.halfDayBadge : t.fullDayBadge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-slate-700 tabular-nums">
                            📅 {formatDateDDMMYYYY(entry.date)}
                          </span>
                          <span>· {entry.createdBy.split(' (')[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Management Edit / Delete Controls */}
                    {isManagement && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title={lang === 'sq' ? 'Ndrysho' : 'Edit'}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteWorkDay(entry.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title={lang === 'sq' ? 'Fshi' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Prominent Description / Reason Box Beneath */}
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                      isHalf
                        ? 'bg-amber-50/70 border-amber-200/70 text-amber-950'
                        : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-bold block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                      {t.reasonLabel}
                    </span>
                    {entry.description ? (
                      <p className="font-semibold">{entry.description}</p>
                    ) : (
                      <p className="italic text-slate-400">{t.noReasonProvided}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Management Edit Modal */}
      {editingEntry && isManagement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'sq' ? 'Ndrysho Ditën e Punës' : 'Edit Working Day'} — {editingEntry.workerName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.expenseDate}
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditDays(1)}
                className={`p-3 rounded-xl font-bold text-xs border-2 ${
                  editDays === 1
                    ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {t.fullDayBtn}
              </button>
              <button
                type="button"
                onClick={() => setEditDays(0.5)}
                className={`p-3 rounded-xl font-bold text-xs border-2 ${
                  editDays === 0.5
                    ? 'bg-amber-50 border-amber-600 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {t.halfDayBtn}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.workDayDescriptionLabel}
              </label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder={t.workDayDescriptionPlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEditModal}
                className="flex-1 py-3 rounded-2xl bg-[#1B4332] text-white font-bold text-xs"
              >
                {t.saveChanges}
              </button>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="py-3 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
