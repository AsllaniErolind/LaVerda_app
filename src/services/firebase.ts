import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const effectiveFirebaseConfig = {
  ...firebaseConfigJson,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

export const FIREBASE_PROJECT_ID = effectiveFirebaseConfig.projectId;

const app = !getApps().length ? initializeApp(effectiveFirebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
});

const TOKEN_STORAGE_KEY = 'la_verda_google_access_token';
const TOKEN_EXPIRY_KEY = 'la_verda_google_access_token_expiry';

function readStoredOAuthToken(): string | null {
  try {
    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const expiryRaw = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token) return null;
    if (expiryRaw) {
      const expiry = Number(expiryRaw);
      if (!Number.isNaN(expiry) && Date.now() > expiry) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        return null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

function writeStoredOAuthToken(token: string): void {
  try {
    // Google OAuth access tokens are valid for 3600s; cache for 50 minutes
    const expiry = Date.now() + 50 * 60 * 1000;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {}
}

function clearStoredOAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
}

let cachedAccessToken: string | null = readStoredOAuthToken();
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      const tok = cachedAccessToken || readStoredOAuthToken();
      if (tok) {
        cachedAccessToken = tok;
        if (onAuthSuccess) onAuthSuccess(user, tok);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      clearStoredOAuthToken();
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
    writeStoredOAuthToken(credential.accessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' || 
      error?.code === 'auth/cancelled-popup-request'
    ) {
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
  const stored = readStoredOAuthToken();
  if (stored) {
    cachedAccessToken = stored;
    return stored;
  }
  return null;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredOAuthToken();
};
