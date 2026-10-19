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
  Users,
  UserPlus,
  Edit3,
  Trash2,
  KeyRound,
  ShieldCheck,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Save,
  User as UserIcon
} from 'lucide-react';

interface UserManagementProps {
  onUsersChange?: (updatedUsers: User[]) => void;
  currentUser: User;
  onActiveUserChange: (user: User) => void;
  lang: Language;
  onClose?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  onUsersChange,
  currentUser,
  onActiveUserChange,
  lang,
  onClose,
}) => {
  const t = translations[lang];

  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'worker' | 'management'>('worker');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<'worker' | 'management'>('worker');

  // PIN visibility toggle
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const refreshUsers = () => {
    const fresh = getStoredUsers();
    setUsers(fresh);
    if (onUsersChange) onUsersChange(fresh);
  };

  // Add user handler
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const pin = newPin.trim() || '1234';
    const created = addCustomUser(newName.trim(), pin, newRole);
    refreshUsers();
    setNewName('');
    setNewPin('');
    setShowAddForm(false);
  };

  // Start editing
  const handleStartEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPin(u.pin);
    setEditRole(u.role);
  };

  // Save edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim()) return;

    const updated = updateStoredUser(editingUser.id, {
      name: editName.trim(),
      pin: editPin.trim() || '1234',
      role: editRole,
    });
    setUsers(updated);
    if (onUsersChange) onUsersChange(updated);

    // If active user was modified, sync active user state
    if (editingUser.id === currentUser.id) {
      const freshActive = updated.find(u => u.id === editingUser.id);
      if (freshActive) onActiveUserChange(freshActive);
    }

    setEditingUser(null);
  };

  // Delete user
  const handleConfirmDelete = () => {
    if (!deletingUserId) return;
    const updated = deleteStoredUser(deletingUserId);
    setUsers(updated);
    if (onUsersChange) onUsersChange(updated);

    // If active user was deleted, fallback to first user
    if (deletingUserId === currentUser.id && updated.length > 0) {
      setActiveUser(updated[0]);
      onActiveUserChange(updated[0]);
    }

    setDeletingUserId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'sq' ? 'Menaxhimi i Punëtorëve' : 'User Management'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {lang === 'sq'
                ? 'Ndrysho emrat realë, rolet dhe PIN-et e stafit'
                : 'Manage real staff names, roles, and PINs'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingUser(null);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          {showAddForm ? <X size={14} /> : <UserPlus size={14} />}
          <span>{showAddForm ? (lang === 'sq' ? 'Mbyll' : 'Close') : (lang === 'sq' ? '+ Shto Punëtor' : '+ Add User')}</span>
        </button>
      </div>

      {/* Add New User Collapsible Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddUser}
          className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3 animate-fadeIn text-left"
        >
          <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <UserPlus size={14} className="text-emerald-800" />
              <span>{lang === 'sq' ? 'Regjistro Punëtor të Ri' : 'Register New Employee'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {lang === 'sq' ? 'Emri & Mbiemri' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                placeholder="P.sh. Besnik Berisha"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound size={12} className="text-emerald-700" />
                <span>PIN (4 Shifra)</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {lang === 'sq' ? 'Roli në Kompani' : 'Company Role'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewRole('worker')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  newRole === 'worker'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang === 'sq' ? 'Kopshtar (Terren)' : 'Field Crew'}
              </button>
              <button
                type="button"
                onClick={() => setNewRole('management')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  newRole === 'management'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang === 'sq' ? 'Menaxhim / Pronar' : 'Management / Owner'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white text-xs font-bold shadow-xs"
            >
              {lang === 'sq' ? 'Ruaj Punëtorin' : 'Save Employee'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Form Modal/Drawer */}
      {editingUser && (
        <form
          onSubmit={handleSaveEdit}
          className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn text-left"
        >
          <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Edit3 size={14} className="text-amber-800" />
              <span>{lang === 'sq' ? 'Modifiko Punëtorin' : 'Edit Employee'}</span>
            </span>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              {t.cancel}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {lang === 'sq' ? 'Emri & Mbiemri' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound size={12} className="text-amber-800" />
                <span>PIN (4 Shifra)</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                pattern="[0-9]{4}"
                value={editPin}
                onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {lang === 'sq' ? 'Roli në Kompani' : 'Role'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditRole('worker')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border ${
                  editRole === 'worker'
                    ? 'bg-amber-800 text-white border-amber-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {lang === 'sq' ? 'Kopshtar' : 'Field Crew'}
              </button>
              <button
                type="button"
                onClick={() => setEditRole('management')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border ${
                  editRole === 'management'
                    ? 'bg-amber-800 text-white border-amber-900'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {lang === 'sq' ? 'Menaxhim' : 'Management'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-xs flex items-center gap-1"
            >
              <Save size={13} />
              <span>{lang === 'sq' ? 'Ruaj Ndryshimet' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Alert */}
      {deletingUserId && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2.5 animate-fadeIn text-left">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="font-bold text-xs">
              {lang === 'sq' ? 'A jeni të sigurt për fshirjen e punëtorit?' : 'Confirm employee deletion?'}
            </span>
          </div>
          <p className="text-xs text-red-600">
            {lang === 'sq'
              ? 'Ky punëtor nuk do të shfaqet më në listën e shpenzimeve ditore.'
              : 'This employee will be removed from future daily expense entries.'}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {lang === 'sq' ? 'Po, Fshi Punëtorin' : 'Yes, Delete'}
            </button>
            <button
              type="button"
              onClick={() => setDeletingUserId(null)}
              className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Persistent Employee List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
        {users.map((user) => {
          const isCurrent = user.id === currentUser.id;
          const isPinVisible = visiblePins[user.id] || false;

          return (
            <div
              key={user.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.initials}
                </div>

                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {user.name}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                        {lang === 'sq' ? 'Aktiv tani' : 'Active'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="capitalize">
                      {user.role === 'management' ? (lang === 'sq' ? 'Menaxhim' : 'Management') : (lang === 'sq' ? 'Kopshtar' : 'Field Crew')}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                      <span>PIN:</span>
                      <span>{isPinVisible ? user.pin : '••••'}</span>
                      <button
                        type="button"
                        onClick={() => togglePinVisibility(user.id)}
                        className="text-slate-400 hover:text-slate-600 ml-0.5 cursor-pointer"
                        title={isPinVisible ? 'Hide PIN' : 'Show PIN'}
                      >
                        {isPinVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveUser(user);
                      onActiveUserChange(user);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-700 transition-colors"
                    title={lang === 'sq' ? 'Zgjidh si punëtor aktiv' : 'Select as active user'}
                  >
                    {lang === 'sq' ? 'Aktivizo' : 'Select'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartEdit(user)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title={lang === 'sq' ? 'Edito të dhënat' : 'Edit details'}
                >
                  <Edit3 size={14} />
                </button>

                {users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeletingUserId(user.id)}
                    className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    title={lang === 'sq' ? 'Fshi punëtorin' : 'Delete user'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
