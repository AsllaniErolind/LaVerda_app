import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import {
  googleSignIn,
  getAccessToken,
  logoutGoogle,
} from '../services/firebase';
import {
  getStoredSpreadsheetId,
  saveStoredSpreadsheetId,
  apiGetStatus,
  apiPushAllToSheets,
  apiSaveCredentials,
  BackendStatusResponse,
} from '../services/storage';
import {
  X,
  Cloud,
  CheckCircle,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  Server,
  Key,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  Copy,
  Check,
  FileJson,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => Promise<void>;
  isSyncing: boolean;
  lang: Language;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  isSyncing,
  lang,
}) => {
  const t = translations[lang];

  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => getStoredSpreadsheetId() || '');
  const [inputSheetId, setInputSheetId] = useState<string>('');
  const [isEditingSheetId, setIsEditingSheetId] = useState<boolean>(false);

  // Service Account JSON / Credential inputs
  const [credentialMode, setCredentialMode] = useState<'json' | 'fields'>('json');
  const [serviceAccountJson, setServiceAccountJson] = useState<string>('');
  const [serviceAccountEmailInput, setServiceAccountEmailInput] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [showCredentialForm, setShowCredentialForm] = useState<boolean>(false);

  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasOAuthToken, setHasOAuthToken] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatusResponse | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const refreshStatus = React.useCallback(async () => {
    const tok = await getAccessToken();
    setHasOAuthToken(!!tok);
    const st = await apiGetStatus();
    setBackendStatus(st);
    if (st.sheetId) {
      setSpreadsheetId(st.sheetId);
      saveStoredSpreadsheetId(st.sheetId);
    }
    if (!st.hasServiceAccount) {
      setShowCredentialForm(true);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setStatusMsg(null);
      refreshStatus();
    }
  }, [isOpen, refreshStatus]);

  if (!isOpen) return null;

  // Handle uploading a .json Service Account key file from disk
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setServiceAccountJson(content);
      setStatusMsg({
        text:
          lang === 'sq'
            ? `Skedari "${file.name}" u ngarkua. Klikoni "Verifiko & Ruaj Kredencialet" më poshtë.`
            : `File "${file.name}" loaded. Click "Validate & Save Credentials" below.`,
      });
    };
    reader.readAsText(file);
  };

  // Validate & Save Service Account Credentials to Backend
  const handleSaveServiceAccount = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const payload =
        credentialMode === 'json'
          ? {
              serviceAccountJson: serviceAccountJson.trim(),
              sheetId: inputSheetId.trim() || spreadsheetId,
            }
          : {
              serviceAccountEmail: serviceAccountEmailInput.trim(),
              privateKey: privateKeyInput.trim(),
              sheetId: inputSheetId.trim() || spreadsheetId,
            };

      const res = await apiSaveCredentials(payload);
      await refreshStatus();
      await onSyncComplete();

      if (res.connected) {
        setShowCredentialForm(false);
        setServiceAccountJson('');
        setPrivateKeyInput('');
        setStatusMsg({
          text:
            lang === 'sq'
              ? `Kredencialet u verifikuan me sukses! U lidh me fletën "${res.tabName || 'Expenses'}" dhe u ngarkuan ${res.uploadedCount || 0} shpenzime në pritje.`
              : `Credentials verified! Connected to tab "${res.tabName || 'Expenses'}" and uploaded ${res.uploadedCount || 0} pending expenses.`,
        });
      } else {
        setStatusMsg({
          text:
            res.credentialError ||
            (lang === 'sq'
              ? 'Kredencialet u ruajtën, por Google Sheet ende nuk ka qasje. Kontrolloni mesazhin më poshtë.'
              : 'Credentials saved, but Google Sheet access failed. Check details below.'),
          isError: true,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        text: err.message || 'Dështoi ruajtja e kredencialeve.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save custom Sheet ID / URL
  const handleSaveSheetId = async () => {
    const trimmed = inputSheetId.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/config/sheet-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: trimmed }),
      });
      const data = await res.json();
      if (data.sheetId) {
        setSpreadsheetId(data.sheetId);
        saveStoredSpreadsheetId(data.sheetId);
      }
      setInputSheetId('');
      setIsEditingSheetId(false);
      await refreshStatus();
      await onSyncComplete();
      setStatusMsg({
        text:
          lang === 'sq'
            ? `ID e Google Sheet (${data.sheetId}) dhe GID (${data.sheetGid}) u ruajtën në server!`
            : `Google Sheet ID (${data.sheetId}) and GID (${data.sheetGid}) saved to server!`,
      });
    } catch (err: any) {
      setStatusMsg({
        text: err.message || 'Dështoi ruajtja e ID të Spreadsheet.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Push all existing local expenses to Google Sheets manually
  const handlePushAllExpenses = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await apiPushAllToSheets();
      await refreshStatus();
      await onSyncComplete();
      setStatusMsg({
        text:
          lang === 'sq'
            ? `Sinkronizimi u krye me sukses! ${res.uploadedCount || 0} shpenzime të reja u shtuan në fletën "${res.tab || 'Sheet1'}".`
            : `Sync complete! ${res.uploadedCount || 0} new expenses uploaded to tab "${res.tab || 'Sheet1'}".`,
      });
    } catch (err: any) {
      setStatusMsg({
        text: err.message || 'Dështoi ngarkimi në Google Sheets.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Optional Google OAuth Sign-In fallback
  const handleGoogleConnect = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setHasOAuthToken(true);
        const pushRes = await apiPushAllToSheets();
        await refreshStatus();
        await onSyncComplete();
        setStatusMsg({
          text:
            lang === 'sq'
              ? `U lidh me Google! ${pushRes.uploadedCount || 0} shpenzime u ngarkuan në fletën "${pushRes.tab || 'Sheet1'}".`
              : `Connected with Google! ${pushRes.uploadedCount || 0} expenses uploaded to "${pushRes.tab || 'Sheet1'}".`,
        });
      } else {
        setStatusMsg({
          text:
            lang === 'sq'
              ? 'Dritarja e Google u mbyll para përfundimit.'
              : 'Google sign-in popup was closed before completing.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        text: err.message || 'Dështoi lidhja me Google.',
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t.sheetsSync}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'sq'
                  ? 'Konfigurimi i Service Account & Diagnostikimi Live'
                  : 'Service Account Setup & Live Diagnostics'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Feedback Banner */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
              statusMsg.isError
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}
          >
            {statusMsg.isError ? (
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            ) : (
              <CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-700" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Live Connection & Credential Diagnostics Card */}
        <div
          className={`p-4 rounded-2xl border space-y-2.5 text-left ${
            backendStatus?.connected
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server
                size={16}
                className={backendStatus?.connected ? 'text-emerald-800' : 'text-amber-700'}
              />
              <span className="text-xs font-bold text-slate-900">
                {backendStatus?.connected
                  ? lang === 'sq'
                    ? 'Lidhja me Google Sheets: Aktive & E Verifikuar'
                    : 'Google Sheets Connection: Active & Verified'
                  : lang === 'sq'
                  ? 'Statusi: Kërkohet Konfigurimi i Service Account'
                  : 'Status: Service Account Setup Required'}
              </span>
            </div>
            <button
              type="button"
              onClick={refreshStatus}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>{lang === 'sq' ? 'Rifresko' : 'Refresh'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-700 space-y-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                {lang === 'sq' ? 'Lloji i kredencialeve:' : 'Credential type:'}
              </span>
              <span className="font-mono font-bold text-slate-900">
                {backendStatus?.hasServiceAccount
                  ? 'Service Account JSON (Server)'
                  : hasOAuthToken
                  ? 'Browser OAuth Token'
                  : lang === 'sq'
                  ? 'Pa kredenciale aktive'
                  : 'None configured'}
              </span>
            </div>
            {backendStatus?.tabName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {lang === 'sq' ? 'Fleta aktive (Tab):' : 'Detected Tab:'}
                </span>
                <span className="font-mono font-bold text-emerald-900">
                  {backendStatus.tabName} (gid: {backendStatus.sheetGid || '1924995249'})
                </span>
              </div>
            )}
          </div>

          {/* Service Account Email + Share Instruction */}
          {backendStatus?.serviceAccountEmail && (
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Service Account Email (Share Sheet as Editor)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyEmail(backendStatus.serviceAccountEmail!)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                >
                  {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedEmail ? (lang === 'sq' ? 'U kopjua' : 'Copied') : (lang === 'sq' ? 'Kopjo' : 'Copy')}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] font-bold text-slate-900 break-all select-all">
                {backendStatus.serviceAccountEmail}
              </p>
            </div>
          )}

          {/* Specific Credential Error from Backend */}
          {backendStatus?.credentialError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-semibold flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{backendStatus.credentialError}</span>
            </div>
          )}

          {/* Quick Actions when Credentials Exist */}
          {(backendStatus?.hasServiceAccount || hasOAuthToken) && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handlePushAllExpenses}
                disabled={isProcessing || isSyncing}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <UploadCloud size={14} />
                <span>
                  {isProcessing
                    ? lang === 'sq'
                      ? 'Duke ngarkuar...'
                      : 'Uploading...'
                    : lang === 'sq'
                    ? 'Ngarko Shpenzimet në Google Sheet Tani'
                    : 'Upload All Expenses to Sheet Now'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowCredentialForm((v) => !v)}
                className="px-3 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {showCredentialForm
                  ? lang === 'sq'
                    ? 'Fshih Kredencialet'
                    : 'Hide Credentials'
                  : lang === 'sq'
                  ? 'Ndrysho JSON Key'
                  : 'Update JSON Key'}
              </button>
            </div>
          )}
        </div>

        {/* Service Account JSON Configuration Form */}
        {(showCredentialForm || !backendStatus?.hasServiceAccount) && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-800" />
                <span>
                  {lang === 'sq'
                    ? 'Vendos Kredencialet e Service Account (JSON)'
                    : 'Configure Service Account Credentials (JSON)'}
                </span>
              </span>

              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCredentialMode('json')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                    credentialMode === 'json'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  JSON Key
                </button>
                <button
                  type="button"
                  onClick={() => setCredentialMode('fields')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                    credentialMode === 'fields'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Email + Key
                </button>
              </div>
            </div>

            {credentialMode === 'json' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-600">
                    {lang === 'sq'
                      ? 'Ngjisni përmbajtjen e skedarit JSON të Service Account ose ngarkoni skedarin:'
                      : 'Paste your Service Account JSON key content or upload the .json file:'}
                  </label>
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] cursor-pointer transition-colors shrink-0">
                    <FileJson size={12} />
                    <span>{lang === 'sq' ? 'Ngarko .json' : 'Upload .json'}</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleJsonFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={5}
                  placeholder='{"type": "service_account", "project_id": "...", "private_key": "-----BEGIN PRIVATE KEY-----\n...", "client_email": "...@....iam.gserviceaccount.com"}'
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  className="w-full p-3 text-[11px] rounded-xl border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:border-emerald-700"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Service Account Email (client_email)
                  </label>
                  <input
                    type="email"
                    placeholder="la-verda-sync@project-id.iam.gserviceaccount.com"
                    value={serviceAccountEmailInput}
                    onChange={(e) => setServiceAccountEmailInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Private Key (PEM)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    className="w-full p-3 text-[11px] rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveServiceAccount}
              disabled={
                isProcessing ||
                (credentialMode === 'json'
                  ? !serviceAccountJson.trim()
                  : !serviceAccountEmailInput.trim() || !privateKeyInput.trim())
              }
              className="w-full py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
            >
              <ShieldCheck size={15} />
              <span>
                {isProcessing
                  ? lang === 'sq'
                    ? 'Duke verifikuar dhe ngarkuar shpenzimet...'
                    : 'Validating & uploading expenses...'
                  : lang === 'sq'
                  ? 'Verifiko & Ruaj Kredencialet në Server'
                  : 'Validate & Save Credentials to Server'}
              </span>
            </button>
          </div>
        )}

        {/* Target Google Sheet ID Configuration */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Key size={14} className="text-emerald-800" />
              <span>{lang === 'sq' ? 'Google Sheet i Lidhur' : 'Target Google Sheet'}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditingSheetId((v) => !v);
                setInputSheetId(spreadsheetId);
              }}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              {isEditingSheetId
                ? lang === 'sq'
                  ? 'Anulo'
                  : 'Cancel'
                : lang === 'sq'
                ? 'Ndrysho URL / ID'
                : 'Change URL / ID'}
            </button>
          </div>

          {!isEditingSheetId ? (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block font-mono text-xs text-slate-900 font-bold truncate select-all">
                  {spreadsheetId}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  GID: {backendStatus?.sheetGid || '1924995249'}
                  {backendStatus?.tabName ? ` · Tab: ${backendStatus.tabName}` : ''}
                </span>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${
                  backendStatus?.sheetGid || '1924995249'
                }`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs inline-flex items-center gap-1 shrink-0"
              >
                <span>{lang === 'sq' ? 'Hape' : 'Open'}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=1924995249"
                value={inputSheetId}
                onChange={(e) => setInputSheetId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveSheetId}
                disabled={!inputSheetId.trim() || isProcessing}
                className="w-full py-2 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {lang === 'sq' ? 'Ruaj URL / ID e Fletës' : 'Save Sheet URL / ID'}
              </button>
            </div>
          )}
        </div>

        {/* Optional Browser OAuth Alternative */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            {lang === 'sq'
              ? 'Alternativë: Lidhu drejtpërdrejt me llogarinë Google të shfletuesit'
              : 'Alternative: Connect via browser Google OAuth'}
          </span>
          {!hasOAuthToken ? (
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Cloud size={13} />
              <span>{t.connectGoogle}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await logoutGoogle();
                setHasOAuthToken(false);
                await refreshStatus();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0 cursor-pointer"
            >
              {lang === 'sq' ? 'Shkëput OAuth' : 'Disconnect OAuth'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
