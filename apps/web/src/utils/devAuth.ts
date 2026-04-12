import type { AuthSession } from './authSession';
import { ENABLE_MOCK_AUTH } from './runtimeFlags';

interface DevAuthModule {
  clearAuthSession: () => void;
  loadAuthSession: () => AuthSession | null;
  signInWithMockAuth: (
    email: string,
    password: string,
    rememberSession: boolean,
  ) => Promise<{ session?: AuthSession; error?: string }>;
}

async function loadDevAuthModule(): Promise<DevAuthModule | null> {
  if (!ENABLE_MOCK_AUTH) return null;
  return import('./mockAuth');
}

export async function loadStoredDevAuthSession(): Promise<AuthSession | null> {
  const devAuthModule = await loadDevAuthModule();
  return devAuthModule?.loadAuthSession() ?? null;
}

export async function signInWithDevAuth(
  email: string,
  password: string,
  rememberSession: boolean,
): Promise<{ session?: AuthSession; error?: string } | null> {
  const devAuthModule = await loadDevAuthModule();
  if (!devAuthModule) return null;
  return devAuthModule.signInWithMockAuth(email, password, rememberSession);
}

export async function clearDevAuthSession(): Promise<void> {
  const devAuthModule = await loadDevAuthModule();
  devAuthModule?.clearAuthSession();
}
