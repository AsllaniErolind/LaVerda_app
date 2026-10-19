import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n/translations';
import { 
  getStoredUsers, 
  addCustomUser, 
  updateStoredUser, 
  deleteStoredUser, 
  setActiveUser 
} from '../utils/users';
import { 
  X, 
  Lock, 
  Delete, 
  Check, 
  UserPlus, 
  Users, 
  KeyRound, 
  Edit3, 
  Trash2, 
  Save 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectUser: (user: User) => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  lang,
}) => {
  const t = translations[lang];

  const [usersList, setUsersList] = useState<User[]>(() => getStoredUsers());
  const [selectedCandidate, setSelectedCandidate] = useState<User>(currentUser);
  const [pinInput, setPinInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Tab: 'switch' | 'manage' | 'add'
  const [activeTab, setActiveTab] = useState<'switch' | 'manage' | 'add'>('switch');

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState<'worker' | 'management'>('worker');

  // Editing existing user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<'worker' | 'management'>('worker');

  const isManagement = currentUser.role === 'management';

  React.useEffect(() => {
    if (isOpen) {
      const stored = getStoredUsers();
      setUsersList(stored);
      setSelectedCandidate(currentUser);
      setPinInput('');
      setError(null);
      setEditingUserId(null);
      setActiveTab('switch');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    setError(null);

    // Auto verify when 4 digits reached
    if (newPin.length === 4) {
      if (newPin === selectedCandidate.pin) {
        completeUserSwitch(selectedCandidate);
      } else {
        setError(t.wrongPin);
        setTimeout(() => setPinInput(''), 600);
      }
    }
  };

  const completeUserSwitch = (u: User) => {
    setActiveUser(u);
    onSelectUser(u);
    setPinInput('');
    onClose();
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleSelectCandidate = (u: User) => {
    setSelectedCandidate(u);
    setPinInput('');
    setError(null);
  };

  // Add new user
  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagement || !newUserName.trim()) return;
    const pin = newUserPin.trim() || '1234';
    const created = addCustomUser(newUserName.trim(), pin, newUserRole);
    setUsersList(getStoredUsers());
    setNewUserName('');
    setNewUserPin('');
    completeUserSwitch(created);
  };

  // Start editing a user
  const handleStartEdit = (user: User) => {
    if (!isManagement) return;
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditPin(user.pin);
    setEditRole(user.role);
    setActiveTab('manage');
  };

  // Save edited user
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagement || !editingUserId || !editName.trim()) return;

    const updated = updateStoredUser(editingUserId, {
      name: editName.trim(),
      pin: editPin.trim() || '1234',
      role: editRole,
    });
    setUsersList(updated);

    // If active user was edited, update state
    const found = updated.find(u => u.id === editingUserId);
    if (found && found.id === currentUser.id) {
      onSelectUser(found);
    }

    setEditingUserId(null);
    setActiveTab('switch');
  };

  // Delete user
  const handleDeleteUser = (id: string) => {
    if (!isManagement || usersList.length <= 1) return;
    const updated = deleteStoredUser(id);
    setUsersList(updated);
    if (id === currentUser.id && updated.length > 0) {
      completeUserSwitch(updated[0]);
    }
    setEditingUserId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 text-center space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Users size={16} className="text-emerald-800" />
            <span>{t.switchWorker}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* 3-Way Tab Switcher (Management Only) */}
        {isManagement && (
          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('switch');
                setEditingUserId(null);
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all ${
                activeTab === 'switch' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {lang === 'sq' ? 'Zgjidh' : 'Switch'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === 'manage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Edit3 size={11} />
              <span>{lang === 'sq' ? 'Ndrysho Emrat' : 'Edit Names'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('add');
                setEditingUserId(null);
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                activeTab === 'add' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <UserPlus size={11} />
              <span>{lang === 'sq' ? '+ Shto' : '+ Add'}</span>
            </button>
          </div>
        )}

        {/* TAB 1: SWITCH ACTIVE WORKER */}
        {activeTab === 'switch' && (
          <>
            <div className="space-y-2">
              {usersList.map((user) => {
                const isSelected = selectedCandidate.id === user.id;
                const isCurrent = currentUser.id === user.id;

                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectCandidate(user)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-[#1B4332] shadow-xs'
                        : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.initials}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {user.name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-bold rounded-md shrink-0">
                              {lang === 'sq' ? 'Aktiv' : 'Active'}
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-500 capitalize">
                          {user.role === 'management'
                            ? lang === 'sq'
                              ? 'Menaxhim'
                              : 'Management'
                            : lang === 'sq'
                            ? 'Kopshtar'
                            : 'Field Crew'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#1B4332] text-white'
                            : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                        <span>{lang === 'sq' ? 'Zgjidh' : 'Select'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PIN Keypad */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Lock size={13} className="text-emerald-800" />
                <span>
                  {t.employeePinPrompt} ({selectedCandidate.name})
                </span>
              </div>

              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      pinInput.length > idx
                        ? 'bg-[#1B4332] scale-110'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 animate-shake mt-1">
                  {error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-lg text-slate-900 transition-colors shadow-xs"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-lg text-slate-900 transition-colors shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors shadow-xs"
              >
                <Delete size={18} />
              </button>
            </div>
          </>
        )}

        {/* TAB 2: MANAGE & EDIT EMPLOYEE NAMES */}
        {isManagement && activeTab === 'manage' && (
          <div className="space-y-3 pt-1 text-left">
            {editingUserId ? (
              /* Inline Edit Form for Selected Employee */
              <form onSubmit={handleSaveEdit} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">
                    {lang === 'sq' ? 'Ndrysho të Dhënat' : 'Edit Details'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    {t.cancel}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'sq' ? 'Emri i Vërtetë' : 'Real Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    PIN (4 Shifra)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {lang === 'sq' ? 'Roli' : 'Role'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole('worker')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border ${
                        editRole === 'worker'
                          ? 'bg-emerald-800 text-white border-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {lang === 'sq' ? 'Kopshtar' : 'Field Crew'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('management')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border ${
                        editRole === 'management'
                          ? 'bg-emerald-800 text-white border-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {lang === 'sq' ? 'Menaxhim' : 'Management'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Save size={13} />
                    <span>{lang === 'sq' ? 'Ruaj Emrin' : 'Save Name'}</span>
                  </button>
                  {usersList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(editingUserId)}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs border border-red-200"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* List of all employees with Edit button */
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 pb-1">
                  {lang === 'sq' 
                    ? 'Kliko "Ndrysho" pranë çdo emri për të vendosur emrat e vërtetë të punëtorëve tuaj:' 
                    : 'Click "Edit" next to any employee to set their real names:'}
                </p>

                {usersList.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {user.name}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {user.role === 'management'
                            ? lang === 'sq'
                              ? 'Menaxhim'
                              : 'Management'
                            : lang === 'sq'
                            ? 'Kopshtar'
                            : 'Field Crew'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(user)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors shadow-xs"
                    >
                      <Edit3 size={12} className="text-emerald-700" />
                      <span>{lang === 'sq' ? 'Ndrysho' : 'Edit'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADD NEW EMPLOYEE */}
        {isManagement && activeTab === 'add' && (
          <form onSubmit={handleAddNewUser} className="space-y-3 pt-1 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'sq' ? 'Emri i Punëtorit' : 'Employee Name'}
              </label>
              <input
                type="text"
                required
                placeholder="P.sh. Besnik R."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound size={12} className="text-emerald-700" />
                <span>PIN (4 Shifra)</span>
              </label>
              <input
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="1234"
                value={newUserPin}
                onChange={(e) => setNewUserPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'sq' ? 'Roli' : 'Role'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewUserRole('worker')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                    newUserRole === 'worker' 
                      ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332]' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {lang === 'sq' ? 'Kopshtar' : 'Field Crew'}
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserRole('management')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                    newUserRole === 'management' 
                      ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332]' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {lang === 'sq' ? 'Menaxhim' : 'Management'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs shadow-md transition-colors"
            >
              {lang === 'sq' ? 'Krijo & Zgjidh Punëtorin' : 'Create & Select Worker'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
