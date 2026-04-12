import { allAppTabs, type AppTab } from './workspaceTabs';
import type { AuthSession, AuthUser, UserRole } from './authSession';

const PERSISTENT_SESSION_KEY = 'ezboq_auth_session';
const TEMP_SESSION_KEY = 'ezboq_auth_session_temp';

interface MockUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  title: string;
  company: string;
  description: string;
  hasFullProjectAccess: boolean;
  assignedProjectIds: string[];
  allowedTabs: AppTab[];
  canExportAll: boolean;
  canResetDemoData: boolean;
  canManageProjects: boolean;
  canOpenSpecialProjects: boolean;
}


interface StoredSession {
  userId: string;
  signedInAt: string;
}

export interface SignInResult {
  session?: AuthSession;
  error?: string;
}

const memberTabs: AppTab[] = [
  'dashboard',
  'customer-quotation',
  'presentation-board',
  'invoice',
  'summary-invoice',
  'workplan',
  'contract',
  'receipt',
  'vat-invoice',
  'withholding-tax',
];

const clientTabs: AppTab[] = [
  'dashboard',
  'customer-quotation',
  'presentation-board',
  'invoice',
  'workplan',
  'contract',
  'receipt',
];

const mockUsers: MockUserRecord[] = [
  {
    id: 'owner-main',
    name: 'เจ้าของระบบเดโม',
    email: 'owner@demo.ezboq.local',
    passwordHash: '0a0e5a037bedf7f97a539d687051088ee953b06f1f196fad59f1de7c8ec7f90d',
    role: 'owner',
    title: 'Owner / Internal Director',
    company: 'EzBOQ Demo',
    description: 'เห็นครบทั้งโครงการทดสอบ พร้อมเมนูต้นทุน แก้ไข BOQ และจัดการข้อมูลทั้งหมด',
    hasFullProjectAccess: true,
    assignedProjectIds: [],
    allowedTabs: allAppTabs,
    canExportAll: true,
    canResetDemoData: true,
    canManageProjects: true,
    canOpenSpecialProjects: true,
  },
  {
    id: 'member-pm',
    name: 'ผู้จัดการโครงการเดโม',
    email: 'pm@demo.ezboq.local',
    passwordHash: '8200554230b89f392b36832a1403dbf72410fcb3e15ead74eef6eeaec7a243e3',
    role: 'member',
    title: 'Project Manager',
    company: 'EzBOQ Demo',
    description: 'เห็นเฉพาะโครงการทดสอบที่รับผิดชอบและเอกสารใช้งานจริงหน้างาน โดยไม่เปิดต้นทุนภายใน',
    hasFullProjectAccess: false,
    assignedProjectIds: [
      'villa-ratchathewi-room175',
      'phase3-electrical-ceiling-plumbing',
      'phase4-builtin-furniture',
      'phase5-final-finishing',
    ],
    allowedTabs: memberTabs,
    canExportAll: false,
    canResetDemoData: false,
    canManageProjects: false,
    canOpenSpecialProjects: false,
  },
  {
    id: 'client-centro',
    name: 'ลูกค้าเดโม',
    email: 'client@demo.ezboq.local',
    passwordHash: 'e4feadbd4a166c57ad76ce4e0ec8697ddb72b3f1608539167b33fe4a6c494dfe',
    role: 'client',
    title: 'Client Portal',
    company: 'EzBOQ Demo Client',
    description: 'ดูเฉพาะเอกสารฝั่งลูกค้าและสถานะงานของโครงการที่ถูก assign ให้เท่านั้น',
    hasFullProjectAccess: false,
    assignedProjectIds: ['centro-ratchaphruek-suanphak'],
    allowedTabs: clientTabs,
    canExportAll: false,
    canResetDemoData: false,
    canManageProjects: false,
    canOpenSpecialProjects: false,
  },
];

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function sanitizeUser(user: MockUserRecord): AuthUser {
  const {
    passwordHash: _passwordHash,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    workspaceId: safeUser.id,
    workspaceName: 'Mock Workspace',
    allowedTabs: [...safeUser.allowedTabs],
    assignedProjectIds: [...safeUser.assignedProjectIds],
  };
}

function getUserById(userId: string): MockUserRecord | undefined {
  return mockUsers.find((user) => user.id === userId);
}

async function findUserByCredentials(email: string, password: string): Promise<MockUserRecord | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const inputHash = await hashPassword(password);
  return mockUsers.find(
    (user) => user.email.toLowerCase() === normalizedEmail && user.passwordHash === inputHash
  );
}

function readStoredSession(): { session: StoredSession; rememberSession: boolean } | null {
  if (typeof window === 'undefined') return null;

  const persistentSession = localStorage.getItem(PERSISTENT_SESSION_KEY);
  if (persistentSession) {
    try {
      return {
        session: JSON.parse(persistentSession) as StoredSession,
        rememberSession: true,
      };
    } catch {
      localStorage.removeItem(PERSISTENT_SESSION_KEY);
    }
  }

  const tempSession = sessionStorage.getItem(TEMP_SESSION_KEY);
  if (tempSession) {
    try {
      return {
        session: JSON.parse(tempSession) as StoredSession,
        rememberSession: false,
      };
    } catch {
      sessionStorage.removeItem(TEMP_SESSION_KEY);
    }
  }

  return null;
}

function persistSession(session: StoredSession, rememberSession: boolean): void {
  if (typeof window === 'undefined') return;

  const serializedSession = JSON.stringify(session);

  if (rememberSession) {
    localStorage.setItem(PERSISTENT_SESSION_KEY, serializedSession);
    sessionStorage.removeItem(TEMP_SESSION_KEY);
    return;
  }

  sessionStorage.setItem(TEMP_SESSION_KEY, serializedSession);
  localStorage.removeItem(PERSISTENT_SESSION_KEY);
}

export function loadAuthSession(): AuthSession | null {
  const stored = readStoredSession();
  if (!stored) return null;

  const user = getUserById(stored.session.userId);
  if (!user) {
    clearAuthSession();
    return null;
  }

  return {
    user: sanitizeUser(user),
    rememberSession: stored.rememberSession,
    signedInAt: stored.session.signedInAt,
    workspaceMode: 'mock',
  };
}

export async function signInWithMockAuth(
  email: string,
  password: string,
  rememberSession: boolean
): Promise<SignInResult> {
  const user = await findUserByCredentials(email, password);

  if (!user) {
    return {
      error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    };
  }

  const session: AuthSession = {
    user: sanitizeUser(user),
    rememberSession,
    signedInAt: new Date().toISOString(),
    workspaceMode: 'mock',
  };

  persistSession(
    {
      userId: user.id,
      signedInAt: session.signedInAt,
    },
    rememberSession
  );

  return { session };
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(PERSISTENT_SESSION_KEY);
  sessionStorage.removeItem(TEMP_SESSION_KEY);
}
