import type { ProjectData } from './projectData';
import { filterProjectsByUser } from './projectPrivacy';
import type { AuthUser } from './authSession';
import type { AppTab } from './workspaceTabs';

export function getAllowedTabsForUser(user: AuthUser): AppTab[] {
  return [...user.allowedTabs];
}

export function canAccessTab(user: AuthUser, tab: AppTab): boolean {
  return user.allowedTabs.includes(tab);
}

export function filterProjectsForUser(projects: ProjectData[], user: AuthUser): ProjectData[] {
  const assignedIds = new Set(user.assignedProjectIds);
  const candidateProjects = user.hasFullProjectAccess
    ? projects
    : projects.filter((project) => {
        if (assignedIds.has(project.id)) return true;
        return Array.isArray(project.assignedUserIds) && project.assignedUserIds.includes(user.id);
      });

  return filterProjectsByUser(candidateProjects, user);
}
