import { User } from '../types';

export const DEFAULT_USERS: User[] = [
  {
    id: 'user_arben',
    name: 'Arben K.',
    role: 'worker',
    pin: '1234',
    avatarColor: '#2D6A4F',
    initials: 'AK',
  },
  {
    id: 'user_genti',
    name: 'Genti M.',
    role: 'worker',
    pin: '5678',
    avatarColor: '#D97706',
    initials: 'GM',
  },
  {
    id: 'user_erolind',
    name: 'Erolind A. (Menaxhment)',
    role: 'management',
    pin: '9900',
    avatarColor: '#1B4332',
    initials: 'EA',
  },
];

const USERS_STORAGE_KEY = 'la_verda_users_list_v1';
const ACTIVE_USER_KEY = 'la_verda_active_user_id';

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users:', e);
  }
}

export function getActiveUser(): User {
  const users = getStoredUsers();
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeId) {
      const found = users.find(u => u.id === activeId);
      if (found) return found;
    }
  } catch {}
  return users[0] || DEFAULT_USERS[0];
}

export function setActiveUser(user: User): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, user.id);
  } catch {}
}

export function addCustomUser(name: string, pin: string, role: 'worker' | 'management' = 'worker'): User {
  const users = getStoredUsers();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'LV';

  const colors = ['#2D6A4F', '#1B4332', '#D97706', '#059669', '#2563EB', '#7C3AED'];
  const avatarColor = colors[users.length % colors.length];

  const newUser: User = {
    id: `user_${Date.now()}`,
    name,
    role,
    pin: pin || '1234',
    avatarColor,
    initials,
  };

  const updated = [...users, newUser];
  saveStoredUsers(updated);
  return newUser;
}

export function updateStoredUser(id: string, updatedData: Partial<User>): User[] {
  const users = getStoredUsers();
  const updated = users.map(u => {
    if (u.id === id) {
      const name = updatedData.name !== undefined ? updatedData.name : u.name;
      const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('') || u.initials;
      return {
        ...u,
        ...updatedData,
        name,
        initials,
      };
    }
    return u;
  });
  saveStoredUsers(updated);
  return updated;
}

export function deleteStoredUser(id: string): User[] {
  const users = getStoredUsers();
  if (users.length <= 1) return users; // Always keep at least 1 user
  const updated = users.filter(u => u.id !== id);
  saveStoredUsers(updated);
  return updated;
}
