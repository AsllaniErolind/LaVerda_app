import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { UserManagement } from './UserManagement';
import { exportExpensesToCSV, getStoredExpenses } from '../services/storage';
import {
  X,
  Settings,
  Users,
  FileSpreadsheet,
  Download,
  Smartphone,
  Globe,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onActiveUserChange: (user: User) => void;
  onOpenSheetsModal: () => void;
  onOpenPwaModal: () => void;
  isSheetsConnected: boolean;
  lang: Language;
  onToggleLang: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onActiveUserChange,
  onOpenSheetsModal,
  onOpenPwaModal,
  isSheetsConnected,
  lang,
  onToggleLang,
}) => {
  const t = translations[lang];

  // Active section inside Settings: 'menu' | 'users'
  const [section, setSection] = useState<'menu' | 'users'>('menu');

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const list = getStoredExpenses();
    exportExpensesToCSV(list);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'sq' ? 'Cilësimet e Aplikacionit' : 'App Settings'}
              </h3>
              <p className="text-[11px] text-slate-500">
                La Verda · {lang === 'sq' ? 'Menaxhimi i Biznesit' : 'Business Management'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Navigation: Menu View vs Embedded User Management */}
        {section === 'users' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSection('menu')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 pb-1"
            >
              <span>← {lang === 'sq' ? 'Kthehu te Cilësimet' : 'Back to Settings'}</span>
            </button>
            <UserManagement
              currentUser={currentUser}
              onActiveUserChange={onActiveUserChange}
              lang={lang}
              onClose={onClose}
            />
          </div>
        ) : (
          /* Main Settings Menu Items */
          <div className="space-y-2.5">
            {/* 1. User Management Menu Tile */}
            <button
              type="button"
              onClick={() => setSection('users')}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {lang === 'sq' ? 'Menaxhimi i Punëtorëve (Stafit)' : 'Staff & User Management'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {lang === 'sq'
                      ? 'Ndrysho emrat realë, PIN-et 4-shifrore dhe shto punëtorë të rinj'
                      : 'Add, edit, or delete employee names and 4-digit PINs'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {/* 2. Google Sheets Cloud Connection */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSheetsModal();
              }}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {lang === 'sq' ? 'Lidhja me Google Sheets' : 'Google Sheets Connection'}
                    </span>
                    {isSheetsConnected && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-md">
                        {lang === 'sq' ? 'Aktive' : 'Connected'}
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {lang === 'sq'
                      ? 'Konfigurimi i fletës së llogaritjes dhe integrimi me n8n'
                      : 'Spreadsheet ID setup, sync status, and n8n guides'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {/* 3. CSV Backup & Data Export */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Download size={20} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {lang === 'sq' ? 'Eksporto Të Dhënat (CSV / Excel)' : 'Export Expenses (CSV / Excel)'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {lang === 'sq'
                      ? 'Shkarko të gjitha shpenzimet në format CSV'
                      : 'Download all recorded transactions as a CSV file'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {/* 4. Install App (PWA) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPwaModal();
              }}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone size={20} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {lang === 'sq' ? 'Instalimi në Telefon (PWA)' : 'Install on Smartphone (PWA)'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {lang === 'sq'
                      ? 'Udhëzues për shtimin në ekranin kryesor të iPhone dhe Android'
                      : 'Instructions for iPhone Safari and Android homescreen'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            {/* 5. Language Switcher */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {lang === 'sq' ? 'Gjuha e Ndërfaqes' : 'Interface Language'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {lang === 'sq' ? 'Shqip (Kryesore) ose English' : 'Albanian (Default) or English'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleLang}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors shadow-xs uppercase tracking-wider"
              >
                {lang === 'sq' ? 'English (EN)' : 'Shqip (SQ)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
