import React from 'react';
import { Language, User } from '../types';
import { translations } from '../i18n/translations';
import { Cloud, CloudOff, Download, UserCheck, RefreshCw, Settings } from 'lucide-react';

interface TopBarProps {
  lang: Language;
  onToggleLang: () => void;
  currentUser: User;
  onOpenAuthModal: () => void;
  onOpenSheetsModal: () => void;
  onOpenPwaModal: () => void;
  onOpenSettingsModal: () => void;
  isSheetsConnected: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  isPwaInstallable: boolean;
  isInstalled: boolean;
  pendingSyncCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  lang,
  onToggleLang,
  currentUser,
  onOpenAuthModal,
  onOpenSheetsModal,
  onOpenPwaModal,
  onOpenSettingsModal,
  isSheetsConnected,
  isSyncing,
  isOnline,
  isPwaInstallable,
  isInstalled,
  pendingSyncCount = 0,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/70 pt-safe">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-white shadow-xs">
            {/* Minimal Leaf Glyph */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-6-7.5-6-11a6 6 0 1112 0c0 3.5-2 7-6 11z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v7" />
            </svg>
          </div>
          <div className="leading-tight">
            <span className="text-base font-extrabold tracking-tight text-slate-900 block">
              La Verda
            </span>
          </div>
        </div>

        {/* Zone 2: Sync Status, Settings & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sheets Sync Pill/Button (Interactive only for Management) */}
          <button
            type="button"
            onClick={currentUser.role === 'management' ? onOpenSheetsModal : undefined}
            title={
              pendingSyncCount > 0
                ? `${pendingSyncCount} ${t.pendingSyncBadge}`
                : isSheetsConnected
                ? t.sheetsConnected
                : t.sheetsNotConnected
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentUser.role === 'management' ? 'cursor-pointer' : 'cursor-default'
            } ${
              pendingSyncCount > 0
                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                : isSheetsConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={13} className="animate-spin text-emerald-600" />
            ) : pendingSyncCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            ) : isSheetsConnected ? (
              <Cloud size={13} className="text-emerald-600" />
            ) : (
              <CloudOff size={13} className="text-slate-500" />
            )}
            <span className="hidden sm:inline">
              {pendingSyncCount > 0
                ? `${pendingSyncCount} ${t.pendingSyncBadge}`
                : isSheetsConnected
                ? 'Sheets'
                : currentUser.role === 'management'
                ? lang === 'sq'
                  ? 'Lidh Sheets'
                  : 'Connect'
                : 'Local'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="sm:hidden text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1 rounded-sm">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Settings Menu Button (Management Only) */}
          {currentUser.role === 'management' && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              title={lang === 'sq' ? 'Cilësimet' : 'Settings'}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <Settings size={15} />
            </button>
          )}


          {/* Language Toggle: SQ / EN */}
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors uppercase tracking-wider cursor-pointer"
          >
            {lang === 'sq' ? 'EN' : 'SQ'}
          </button>

          {/* Active Employee Switcher Button */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            title={t.switchWorker}
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200/80 text-xs shadow-xs cursor-pointer"
          >
            <span 
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: currentUser.avatarColor }}
            >
              {currentUser.initials}
            </span>
            <span className="font-bold text-emerald-950 max-w-[80px] sm:max-w-[100px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
            <span className="hidden sm:inline text-[10px] text-emerald-800 font-bold bg-white/80 px-1.5 py-0.5 rounded-md border border-emerald-200/50">
              {lang === 'sq' ? 'Ndërro' : 'Switch'}
            </span>
            <UserCheck size={12} className="text-emerald-700" />
          </button>
        </div>
      </div>
    </header>
  );
};
