import React from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { X, Smartphone, Share, PlusSquare, Download } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
  lang: Language;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isIOS,
  onInstall,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 text-left">
              {t.installPwaTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Icon Preview */}
        <div className="flex justify-center py-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-white shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-9 h-9 text-emerald-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-6-7.5-6-11a6 6 0 1112 0c0 3.5-2 7-6 11z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v7" />
            </svg>
          </div>
        </div>

        {/* iOS Guided Steps vs Direct Install */}
        {isIOS ? (
          <div className="text-left space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                1
              </div>
              <p>
                {lang === 'sq' 
                  ? 'Shtypni butonin ' 
                  : 'Tap the '}
                <strong className="inline-flex items-center gap-0.5 font-bold text-blue-600">
                  <Share size={12} /> Share
                </strong>
                {lang === 'sq' 
                  ? ' në shiritin e Safari-t në fund të ekranit.' 
                  : ' button in Safari\'s bottom toolbar.'}
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                2
              </div>
              <p>
                {lang === 'sq' 
                  ? 'Lëvizni poshtë dhe zgjidhni ' 
                  : 'Scroll down and tap '}
                <strong className="inline-flex items-center gap-0.5 font-bold text-slate-900">
                  <PlusSquare size={12} /> Add to Home Screen
                </strong>
                {lang === 'sq' 
                  ? ' (Shto në Ekranin Kryesor).' 
                  : '.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.installPwaAndroidDesc}
            </p>
            <button
              type="button"
              onClick={async () => {
                await onInstall();
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Download size={16} />
              <span>{t.installNow}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
