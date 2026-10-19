import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));

const TOKEN_STORAGE_KEY = 'la_verda_google_access_token';

let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        try {
          const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
          if (stored) {
            cachedAccessToken = stored;
            if (onAuthSuccess) onAuthSuccess(user, stored);
            return;
          }
        } catch {}
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain OAuth access token from Google.');
    }
    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
    } catch {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' || 
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // User dismissed or closed the OAuth popup; return null gracefully
      return null;
    }
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch {}
  return null;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
};

