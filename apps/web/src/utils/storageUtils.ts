import { ProjectData, QuotationItem, prepareProjectDocuments, projects as defaultProjects } from './projectData';
import { getCurrentUserId, scopedKey } from './userScope';
import { filterProjectsByCurrentUserId } from './projectPrivacy';
import { ENABLE_LEGACY_DEFAULT_PROJECTS } from './runtimeFlags';

const BASE_STORAGE_KEY = 'ezboq_projects';
const BASE_VERSION_KEY = 'ezboq_data_version';
const BASE_BACKUP_KEY = 'ezboq_projects_backup';
const BASE_BACKUP_AT_KEY = 'ezboq_projects_backup_at';
const BASE_SELECTED_KEY = 'selectedProjectId';
const BASE_SPECIAL_KEY = 'showSpecialPage';

// Legacy keys are no longer migrated — each user starts fresh with scoped storage

export const SELECTED_PROJECT_ID_KEY = BASE_SELECTED_KEY;
export const SHOW_SPECIAL_PAGE_KEY = BASE_SPECIAL_KEY;

export interface WorkspaceUiState {
  selectedProjectId: string | null;
  showSpecialPage: boolean;
}

const CURRENT_VERSION = '7.9';

function hashProjectId(projectId: string): number {
  let hash = 5381;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = ((hash << 5) + hash) ^ projectId.charCodeAt(index);
  }
  return hash >>> 0;
}

// Hashes of blocked projects that must never be revived from localStorage.
const BLOCKED_PROJECT_ID_HASHES = new Set([
  3020754013,
  850189554,
  813074261,
  3252208095,
  3564694575,
  978376640,
  293367747,
  1225747930,
  518806707,
]);

function normalizeQuotationItem(item: unknown): QuotationItem {
  const normalized = item && typeof item === 'object'
    ? { ...(item as Record<string, unknown>) }
    : {};

  normalized.no = typeof normalized.no === 'string' ? normalized.no : '';
  normalized.description = typeof normalized.description === 'string' ? normalized.description : '';
  normalized.unit = typeof normalized.unit === 'string' ? normalized.unit : '';
  normalized.quantity = normalized.quantity ?? '';
  normalized.unitPrice = normalized.unitPrice ?? '';
  normalized.laborCost = normalized.laborCost ?? '';
  normalized.customerUnitPrice = normalized.customerUnitPrice ?? '';

  // Migration: ล้าง totalPrice เมื่อมี unitPrice หรือ laborCost จริง
  // เพื่อให้ calculation ใช้ unitPrice + laborCost แทน totalPrice เก่าที่ค้าง
  if (normalized.totalPrice !== undefined && normalized.totalPrice !== null && normalized.totalPrice !== '') {
    const up = Number(normalized.unitPrice) || 0;
    const lc = Number(normalized.laborCost) || 0;
    if (up > 0 || lc > 0) {
      delete normalized.totalPrice;
    }
  }

  if (typeof normalized.scopeDetails !== 'string') {
    delete normalized.scopeDetails;
  }

  return normalized as unknown as QuotationItem;
}

function normalizeProject(project: unknown): ProjectData {
  const normalized = project && typeof project === 'object'
    ? { ...(project as Record<string, unknown>) }
    : {};

  normalized.id = typeof normalized.id === 'string' ? normalized.id : `project-${Date.now()}`;
  normalized.name = typeof normalized.name === 'string' ? normalized.name : 'โครงการใหม่';
  normalized.address = typeof normalized.address === 'string' ? normalized.address : '';
  normalized.phone = typeof normalized.phone === 'string' ? normalized.phone : '';
  normalized.owner = typeof normalized.owner === 'string' ? normalized.owner : '';

  const quotationData = Array.isArray(normalized.quotationData)
    ? normalized.quotationData.map(normalizeQuotationItem)
    : [];

  normalized.quotationData = quotationData;

  if (typeof normalized.scopeDetails !== 'string') {
    delete normalized.scopeDetails;
  }

  if (typeof normalized.autoSyncDocuments !== 'boolean') {
    delete normalized.autoSyncDocuments;
  }

  if (!['value', 'standard', 'premium'].includes(String(normalized.templatePricingTier || ''))) {
    delete normalized.templatePricingTier;
  }

  if (!normalized.priceReferenceSummary || typeof normalized.priceReferenceSummary !== 'object') {
    delete normalized.priceReferenceSummary;
  }

  if (!normalized.documentPipeline || typeof normalized.documentPipeline !== 'object') {
    delete normalized.documentPipeline;
  }

  ['designFee', 'totalCost', 'customerPrice', 'operatingCost', 'operatingRate', 'markupRate'].forEach((key) => {
    const value = normalized[key];
    if (typeof value !== 'number') {
      delete normalized[key];
    }
  });

  if (!normalized.discountConfig || typeof normalized.discountConfig !== 'object') {
    delete normalized.discountConfig;
  }

  return prepareProjectDocuments(normalized as unknown as ProjectData);
}

function backupProjects(rawProjects: string): void {
  if (typeof window === 'undefined' || !rawProjects) return;

  localStorage.setItem(scopedKey(BASE_BACKUP_KEY), rawProjects);
  localStorage.setItem(scopedKey(BASE_BACKUP_AT_KEY), new Date().toISOString());
}

function mergeProject(storedProject: ProjectData, defaultProject: ProjectData): ProjectData {
  const normalizedStored = normalizeProject(storedProject);
  const normalizedDefault = normalizeProject(defaultProject);

  return normalizeProject({
    ...normalizedDefault,
    ...normalizedStored,
    quotationData: normalizedStored.quotationData.length > 0
      ? normalizedStored.quotationData
      : normalizedDefault.quotationData,
  });
}

function migrateProjects(rawProjects: unknown): ProjectData[] {
  const storedProjects = Array.isArray(rawProjects)
    ? rawProjects.map(normalizeProject)
    : [];

  const currentUserId = getCurrentUserId();
  const visibleDefaultProjects = filterProjectsByCurrentUserId(
    defaultProjects.map(normalizeProject),
    currentUserId,
  );
  const defaultProjectMap = new Map(visibleDefaultProjects.map((project) => [project.id, normalizeProject(project)]));
  const mergedProjects = storedProjects.map((storedProject) => {
    const defaultProject = defaultProjectMap.get(storedProject.id);
    return defaultProject ? mergeProject(storedProject, defaultProject) : storedProject;
  });

  const storedIds = new Set(storedProjects.map((project) => project.id));
  const missingDefaultProjects = visibleDefaultProjects
    .filter((project) => !storedIds.has(project.id))
    .map(normalizeProject);

  return filterProjectsByCurrentUserId([...mergedProjects, ...missingDefaultProjects], currentUserId);
}

function getDefaultProjects(): ProjectData[] {
  if (!ENABLE_LEGACY_DEFAULT_PROJECTS) {
    return [];
  }

  return filterProjectsByCurrentUserId(
    defaultProjects.map(normalizeProject),
    getCurrentUserId(),
  );
}

function stripBlockedProjects(projects: ProjectData[]): ProjectData[] {
  return projects.filter((project) => !BLOCKED_PROJECT_ID_HASHES.has(hashProjectId(project.id)));
}

function refreshTemplateProjects(projects: ProjectData[]): ProjectData[] {
  return stripBlockedProjects(projects);
}

function readSelectedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(scopedKey(BASE_SELECTED_KEY));
}

function readShowSpecialPage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(scopedKey(BASE_SPECIAL_KEY)) === 'true';
}

export function loadWorkspaceUiState(projects: ProjectData[] = loadProjects()): WorkspaceUiState {
  const selectedProjectId = readSelectedProjectId();
  const fallbackProjectId = projects[0]?.id || null;

  return {
    selectedProjectId: selectedProjectId && projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : fallbackProjectId,
    showSpecialPage: readShowSpecialPage(),
  };
}

export function saveWorkspaceUiState(nextState: Partial<WorkspaceUiState>): WorkspaceUiState {
  if (typeof window === 'undefined') {
    return {
      selectedProjectId: nextState.selectedProjectId ?? null,
      showSpecialPage: nextState.showSpecialPage ?? false,
    };
  }

  const currentState = loadWorkspaceUiState();
  const mergedState: WorkspaceUiState = {
    selectedProjectId: nextState.selectedProjectId ?? currentState.selectedProjectId,
    showSpecialPage: nextState.showSpecialPage ?? currentState.showSpecialPage,
  };

  if (mergedState.selectedProjectId) {
    localStorage.setItem(scopedKey(BASE_SELECTED_KEY), mergedState.selectedProjectId);
  } else {
    localStorage.removeItem(scopedKey(BASE_SELECTED_KEY));
  }
  localStorage.setItem(scopedKey(BASE_SPECIAL_KEY), String(mergedState.showSpecialPage));

  return mergedState;
}

export function selectWorkspaceProject(projectId: string, options?: { showSpecialPage?: boolean }): WorkspaceUiState {
  return saveWorkspaceUiState({
    selectedProjectId: projectId,
    showSpecialPage: options?.showSpecialPage ?? false,
  });
}

export function setSpecialPageState(showSpecialPage: boolean): WorkspaceUiState {
  return saveWorkspaceUiState({ showSpecialPage });
}

// Load projects from user-scoped localStorage or use default
export function loadProjects(): ProjectData[] {
  if (typeof window === 'undefined') return getDefaultProjects();

  const STORAGE_KEY = scopedKey(BASE_STORAGE_KEY);
  const VERSION_KEY = scopedKey(BASE_VERSION_KEY);

  try {
    // No user-scoped data yet — start fresh (no migration from global keys)
    if (!localStorage.getItem(STORAGE_KEY)) {
      const defaults = getDefaultProjects();
      if (defaults.length > 0) {
        saveProjects(defaults);
      }
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      return defaults;
    }

    const storedVersion = localStorage.getItem(VERSION_KEY);
    const storedRaw = localStorage.getItem(STORAGE_KEY)!;

    const parsed = JSON.parse(storedRaw);
    const migratedProjects = stripBlockedProjects(migrateProjects(parsed));
    const refreshedTemplates = refreshTemplateProjects(migratedProjects);

    if (storedVersion !== CURRENT_VERSION) {
      const purged = stripBlockedProjects(refreshedTemplates);
      backupProjects(storedRaw);
      saveProjects(purged);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      return purged;
    }

    const serialized = JSON.stringify(refreshedTemplates);
    if (storedRaw !== serialized) {
      backupProjects(storedRaw);
      localStorage.setItem(STORAGE_KEY, serialized);
    }

    return refreshedTemplates;
  } catch (error) {
    console.error('Failed to load local project cache:', error);
  }

  const defaults = getDefaultProjects();
  if (defaults.length > 0) {
    saveProjects(defaults);
  }
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  return defaults;
}

// Save projects to user-scoped localStorage
export function saveProjects(projects: ProjectData[]): ProjectData[] {
  if (typeof window === 'undefined') return projects.map(normalizeProject);

  try {
    const visibleProjects = filterProjectsByCurrentUserId(
      stripBlockedProjects(projects.map(normalizeProject)),
      getCurrentUserId(),
    );
    localStorage.setItem(scopedKey(BASE_STORAGE_KEY), JSON.stringify(visibleProjects));
    return visibleProjects;
  } catch (error) {
    console.error('Failed to save local project cache:', error);
  }

  return projects.map(normalizeProject);
}

export function loadProjectById(projectId: string): ProjectData | null {
  const projects = loadProjects();
  const matchedProject = projects.find((project) => project.id === projectId);
  return matchedProject ?? null;
}

export function clearProjectUiState(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(scopedKey(BASE_SELECTED_KEY));
  localStorage.removeItem(scopedKey(BASE_SPECIAL_KEY));
}

// Add new project
export function addProject(project: ProjectData): ProjectData[] {
  const projects = loadProjects();
  projects.push(normalizeProject(project));
  saveProjects(projects);
  return projects;
}

// Update existing project
export function updateProject(updatedProject: ProjectData): ProjectData[] {
  const projects = loadProjects();
  const index = projects.findIndex((project) => project.id === updatedProject.id);

  if (index !== -1) {
    projects[index] = normalizeProject(updatedProject);
    saveProjects(projects);
  }

  return projects;
}

// Delete project
export function deleteProject(projectId: string): ProjectData[] {
  const projects = loadProjects();
  const filtered = projects.filter((project) => project.id !== projectId);
  saveProjects(filtered);
  return filtered;
}

// Copy project with new ID
export function copyProject(projectId: string, newName: string): ProjectData[] {
  const projects = loadProjects();
  const original = projects.find((project) => project.id === projectId);

  if (!original) return projects;

  const timestamp = Date.now();
  const newProject: ProjectData = {
    ...original,
    id: `${original.id}-copy-${timestamp}`,
    name: newName,
  };

  return addProject(newProject);
}

// Reset to default projects
export function resetToDefault(): ProjectData[] {
  const defaults = getDefaultProjects();

  if (typeof window !== 'undefined') {
    const storedRaw = localStorage.getItem(scopedKey(BASE_STORAGE_KEY));
    if (storedRaw) {
      backupProjects(storedRaw);
    }
  }

  saveProjects(defaults);

  if (typeof window !== 'undefined') {
    localStorage.setItem(scopedKey(BASE_VERSION_KEY), CURRENT_VERSION);
  }

  return defaults;
}
