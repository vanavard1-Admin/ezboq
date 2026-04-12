import type { ProjectData } from './projectData';
import type { AuthUser } from './authSession';

const BLOCKED_PROJECT_ID_HASHES = new Set([
  518806707,
]);

function hashProjectId(projectId: string): number {
  let hash = 5381;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = ((hash << 5) + hash) ^ projectId.charCodeAt(index);
  }
  return hash >>> 0;
}

function isBlockedProject(projectId: string): boolean {
  return BLOCKED_PROJECT_ID_HASHES.has(hashProjectId(projectId));
}

export function canCurrentUserIdAccessProject(_userId: string | null, projectId: string): boolean {
  return !isBlockedProject(projectId);
}

export function canUserAccessProject(_user: Pick<AuthUser, 'id' | 'email'>, projectId: string): boolean {
  return !isBlockedProject(projectId);
}

export function filterProjectsByCurrentUserId(projects: ProjectData[], userId: string | null): ProjectData[] {
  return projects.filter((project) => canCurrentUserIdAccessProject(userId, project.id));
}

export function filterProjectsByUser(projects: ProjectData[], user: Pick<AuthUser, 'id' | 'email'>): ProjectData[] {
  return projects.filter((project) => canUserAccessProject(user, project.id));
}
