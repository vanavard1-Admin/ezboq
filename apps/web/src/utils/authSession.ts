import type { AppTab } from './workspaceTabs';

export type UserRole = 'owner' | 'member' | 'client';

export interface AuthUser {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  email: string;
  phone?: string;
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

export interface AuthSession {
  user: AuthUser;
  rememberSession: boolean;
  signedInAt: string;
  workspaceMode?: 'cloud' | 'local-cache' | 'mock' | 'line';
  lineLinked?: boolean;
}
