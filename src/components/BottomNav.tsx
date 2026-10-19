import React from 'react';
import { Language, User } from '../types';
import { translations } from '../i18n/translations';
import { LayoutDashboard, PlusCircle, CalendarCheck, History } from 'lucide-react';

export type NavTab = 'dashboard' | 'add' | 'workdays' | 'history';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  lang: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  lang,
}) => {
  const t = translations[lang];
  const isManagement = currentUser.role === 'management';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe shadow-lg">
      <div
        className={`max-w-md mx-auto grid ${
          isManagement ? 'grid-cols-4' : 'grid-cols-3'
        } items-center h-16 px-3`}
      >
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[#1B4332]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-emerald-50 scale-105' : ''
            }`}
          >
            <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </div>
          <span
            className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
              activeTab === 'dashboard' ? 'font-bold text-[#1B4332]' : ''
            }`}
          >
            {t.dashboard}
          </span>
          {activeTab === 'dashboard' && (
            <span className="w-1 h-1 rounded-full bg-[#1B4332] absolute bottom-1" />
          )}
        </button>

        {/* Tab 2: Working Days Calendar & Counter */}
        <button
          type="button"
          onClick={() => onSelectTab('workdays')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative cursor-pointer ${
            activeTab === 'workdays'
              ? 'text-[#1B4332]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'workdays' ? 'bg-emerald-50 scale-105' : ''
            }`}
          >
            <CalendarCheck size={20} strokeWidth={activeTab === 'workdays' ? 2.5 : 2} />
          </div>
          <span
            className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
              activeTab === 'workdays' ? 'font-bold text-[#1B4332]' : ''
            }`}
          >
            {t.workDaysTab}
          </span>
          {activeTab === 'workdays' && (
            <span className="w-1 h-1 rounded-full bg-[#1B4332] absolute bottom-1" />
          )}
        </button>

        {/* Tab 3: Add Expense (Management Only) */}
        {isManagement && (
          <button
            type="button"
            onClick={() => onSelectTab('add')}
            className="flex flex-col items-center justify-center h-full min-h-[44px] group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform shadow-md ${
                activeTab === 'add'
                  ? 'bg-[#1B4332] text-white scale-110 shadow-emerald-950/20'
                  : 'bg-[#2D6A4F] text-white hover:bg-[#1B4332]'
              }`}
            >
              <PlusCircle size={22} strokeWidth={2.5} />
            </div>
            <span
              className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
                activeTab === 'add' ? 'font-bold text-[#1B4332]' : 'text-slate-600'
              }`}
            >
              {t.addExpenseShort}
            </span>
          </button>
        )}

        {/* Tab 4: History */}
        <button
          type="button"
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative cursor-pointer ${
            activeTab === 'history'
              ? 'text-[#1B4332]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-emerald-50 scale-105' : ''
            }`}
          >
            <History size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          </div>
          <span
            className={`text-[11px] font-semibold mt-0.5 tracking-tight ${
              activeTab === 'history' ? 'font-bold text-[#1B4332]' : ''
            }`}
          >
            {t.history}
          </span>
          {activeTab === 'history' && (
            <span className="w-1 h-1 rounded-full bg-[#1B4332] absolute bottom-1" />
          )}
        </button>
      </div>
    </nav>
  );
};

