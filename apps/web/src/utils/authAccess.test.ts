import { describe, expect, it } from 'vitest';
import { filterProjectsForUser } from './authAccess';
import type { AuthUser } from './authSession';
import type { ProjectData } from './projectData';

const memberUser: AuthUser = {
  id: 'user-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Workspace',
  name: 'Member',
  email: 'member@example.com',
  role: 'member',
  title: 'Member',
  company: '',
  description: '',
  hasFullProjectAccess: false,
  assignedProjectIds: [],
  allowedTabs: ['dashboard'],
  canExportAll: false,
  canResetDemoData: false,
  canManageProjects: false,
  canOpenSpecialProjects: false,
};

const projects: ProjectData[] = [
  {
    id: 'project-1',
    name: 'A',
    address: '',
    phone: '',
    owner: '',
    quotationData: [],
    assignedUserIds: ['user-1'],
  },
  {
    id: 'project-2',
    name: 'B',
    address: '',
    phone: '',
    owner: '',
    quotationData: [],
    assignedUserIds: ['user-2'],
  },
];

describe('filterProjectsForUser', () => {
  it('respects assignedUserIds when assignedProjectIds is empty', () => {
    expect(filterProjectsForUser(projects, memberUser).map((project) => project.id)).toEqual(['project-1']);
  });
});
