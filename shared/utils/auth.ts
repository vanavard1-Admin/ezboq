// Shared Auth Service for EzBOQ + EzDoc monorepo
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

// Common user type for both apps
export interface AuthUser {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  email: string;
  role: 'owner' | 'member' | 'viewer';
  title?: string;
  company?: string;
  description?: string;
  hasFullProjectAccess: boolean;
  assignedProjectIds: string[];
  canExportAll: boolean;
  canManageProjects: boolean;
}

// Auth session type
export interface AuthSession {
  user: AuthUser;
  rememberSession: boolean;
  signedInAt: string;
  workspaceMode: 'firebase' | 'local-cache';
}

// Google provider setup
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/* ── Core Auth Functions ─────────────────────────── */

export async function signInWithGoogle(auth: any): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signInWithEmailPassword(
  auth: any,
  email: string,
  password: string,
  rememberSession: boolean = false,
): Promise<void> {
  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence,
  );
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOut(auth: any): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChanged(
  auth: any,
  callback: (session: AuthSession | null) => void,
): Unsubscribe {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const session = await createAuthSessionFromFirebaseUser(firebaseUser);
        callback(session);
      } catch (error) {
        console.error('Failed to create auth session:', error);
        const fallbackSession = createFallbackSession(firebaseUser);
        callback(fallbackSession);
      }
      return;
    }
    callback(null);
  });
}

/* ── Helper Functions ────────────────────────────── */

async function createAuthSessionFromFirebaseUser(firebaseUser: FirebaseUser): Promise<AuthSession> {
  const user: AuthUser = {
    id: firebaseUser.uid,
    workspaceId: firebaseUser.uid,
    workspaceName: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'My Workspace',
    name: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'User',
    email: firebaseUser.email?.trim() || '',
    role: 'owner',
    title: 'Workspace Owner',
    company: '',
    description: 'Shared workspace user',
    hasFullProjectAccess: true,
    assignedProjectIds: [],
    canExportAll: true,
    canManageProjects: true,
  };

  return {
    user,
    rememberSession: true,
    signedInAt: new Date().toISOString(),
    workspaceMode: 'firebase',
  };
}

function createFallbackSession(firebaseUser: FirebaseUser): AuthSession {
  const user: AuthUser = {
    id: firebaseUser.uid,
    workspaceId: firebaseUser.uid,
    workspaceName: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'My Workspace',
    name: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'User',
    email: firebaseUser.email?.trim() || '',
    role: 'owner',
    title: 'Workspace Owner',
    company: '',
    description: 'Local cache mode - limited functionality',
    hasFullProjectAccess: false,
    assignedProjectIds: [],
    canExportAll: false,
    canManageProjects: false,
  };

  return {
    user,
    rememberSession: true,
    signedInAt: new Date().toISOString(),
    workspaceMode: 'local-cache',
  };
}
