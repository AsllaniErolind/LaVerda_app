import React, { useState } from 'react';
import { Expense, ExpenseCategory, Language, User } from '../types';
import { translations, getCategoryColor } from '../i18n/translations';
import { getTodayISODate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { CheckCircle2, AlertCircle, Sparkles, Loader2, Calendar, Cloud, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddExpenseViewProps {
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'synced'>) => Promise<boolean>;
  currentUser: User;
  onOpenAuthModal: () => void;
  isSheetsConnected: boolean;
  lang: Language;
}

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  onSaveExpense,
  currentUser,
  onOpenAuthModal,
  isSheetsConnected,
  lang,
}) => {
  const t = translations[lang];

  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('fuel');
  const [date, setDate] = useState<string>(getTodayISODate());
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Quick Amount presets for landscaping workflows
  const quickAmounts = [10, 20, 50, 100];

  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toString());
  };

  const handleQuickNote = (note: string) => {
    setDescription(note);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validation
    const numericAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg(t.amountRequired);
      return;
    }

    if (!category) {
      setErrorMsg(t.categoryRequired);
      return;
    }

    // 2. Prevent duplicate clicks
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await onSaveExpense({
        date: date || getTodayISODate(),
        category: category as ExpenseCategory,
        amount: Math.round(numericAmount * 100) / 100,
        description: description.trim() || undefined,
        createdBy: currentUser.name,
      });

      if (success) {
        // Trigger celebratory confetti burst
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#1B4332', '#2D6A4F', '#52B788', '#D8F3DC']
        });

        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);

        // 4. Reset form for next entry
        setAmountStr('');
        setDescription('');
        setDate(getTodayISODate());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ndodhi një gabim gjatë ruajtjes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: ExpenseCategory[] = ['fuel', 'food', 'coffee', 'other'];

  return (
    <div className="pb-24 max-w-lg mx-auto px-4 pt-3 space-y-3">
      {/* Active Worker Selector Strip */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.initials}
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              {t.activeWorker}
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              {currentUser.name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
        >
          <UserCheck size={14} />
          <span>{t.switchWorker}</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {showSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white flex items-center gap-2.5 shadow-lg shadow-emerald-900/20 animate-fadeIn">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-200" />
          <div className="min-w-0">
            <span className="text-xs font-bold block">{t.savedSuccess}</span>
            {isSheetsConnected && (
              <span className="text-[10px] text-emerald-100 block">
                {lang === 'sq' ? 'Sinkronizuar me Google Sheets' : 'Synced with Google Sheets'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2.5">
          <AlertCircle size={20} className="shrink-0 text-red-500" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. HERO AMOUNT INPUT */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs text-center space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            {t.enterAmount}
          </label>
          <div className="relative inline-flex items-center justify-center w-full">
            <span className="text-3xl font-extrabold text-[#1B4332] mr-1.5 select-none">
              €
            </span>
            <input
              type="number"
              step="0.01"
              min="0.10"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
              required
              className="text-4xl sm:text-5xl font-black text-slate-900 w-48 text-center bg-transparent border-b-2 border-slate-200 focus:border-[#1B4332] focus:outline-hidden py-1 tabular-nums transition-colors"
            />
          </div>

          {/* Quick preset amount chips */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {quickAmounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  amountStr === val.toString()
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                €{val}
              </button>
            ))}
          </div>
        </div>

        {/* 2. CATEGORY SELECTOR TILES */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 px-1">
            {t.selectCategory}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => {
              const colors = getCategoryColor(cat);
              const isSelected = category === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-2xl flex items-center gap-3 transition-all text-left min-h-[52px] ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/70 border-2 border-[#1B4332] shadow-xs'
                      : 'bg-slate-50 border border-slate-100 hover:bg-slate-100/80'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}
                  >
                    <CategoryIcon category={cat} size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 truncate">
                      {t.categories[cat]}
                    </span>
                    <span className="block text-[10px] text-slate-600 truncate">
                      {cat === 'fuel' ? 'Naftë / Benzinë' : cat === 'food' ? 'Drekë / Ushqim' : cat === 'coffee' ? 'Kafe & Pije' : 'Vegla & Materiale'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. DATE & CONTEXT NOTE */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-700" />
              <span>{t.expenseDate}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#1B4332] transition-colors"
            />
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.description}
            </label>
            <input
              type="text"
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-[#1B4332] transition-colors"
            />

            {/* Quick Note Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {t.noteSuggestions.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickNote(suggestion)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. SAVE EXPENSE BUTTON (PROMINENT THUMB CTA) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] hover:from-[#143326] hover:to-[#245740] disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin text-white" />
              <span>{t.saving}</span>
            </>
          ) : (
            <>
              <Sparkles size={18} className="text-emerald-300" />
              <span>{t.saveExpense}</span>
            </>
          )}
        </button>

        {/* Live Sync Status Indicator */}
        <div className="text-center pt-1">
          {isSheetsConnected ? (
            <p className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1.5">
              <Cloud size={13} />
              <span>
                {lang === 'sq' ? 'Sinkronizim automatik aktiv me Google Sheets' : 'Auto-sync active with Google Sheets'}
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              {lang === 'sq' ? 'Ruhet lokalisht në telefon' : 'Saved locally on device'}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
