export interface DocumentTheme {
  id: string;
  name: string;
  nameTh: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryText: string;
    accent: string;
    accentLight: string;
  };
}

export const themePresets: DocumentTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    nameTh: 'คลาสสิก',
    colors: {
      primary: '#292524',
      primaryHover: '#1c1917',
      primaryText: '#ffffff',
      accent: '#78716c',
      accentLight: '#f5f5f4',
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    nameTh: 'กรมท่า',
    colors: {
      primary: '#1e3a5f',
      primaryHover: '#152d4d',
      primaryText: '#ffffff',
      accent: '#3b82f6',
      accentLight: '#eff6ff',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    nameTh: 'เขียวป่า',
    colors: {
      primary: '#1a3c34',
      primaryHover: '#132e28',
      primaryText: '#ffffff',
      accent: '#22c55e',
      accentLight: '#f0fdf4',
    },
  },
  {
    id: 'wine',
    name: 'Wine',
    nameTh: 'ไวน์แดง',
    colors: {
      primary: '#5b1a2e',
      primaryHover: '#4a1525',
      primaryText: '#ffffff',
      accent: '#e11d48',
      accentLight: '#fff1f2',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    nameTh: 'มหาสมุทร',
    colors: {
      primary: '#164e63',
      primaryHover: '#0e3f51',
      primaryText: '#ffffff',
      accent: '#06b6d4',
      accentLight: '#ecfeff',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    nameTh: 'ชาร์โคล',
    colors: {
      primary: '#374151',
      primaryHover: '#1f2937',
      primaryText: '#ffffff',
      accent: '#6b7280',
      accentLight: '#f3f4f6',
    },
  },
];

import { scopedKey } from './userScope';

const BASE_THEME_KEY = 'ezboq_document_theme';

export function loadThemeId(): string {
  if (typeof window === 'undefined') return 'classic';
  return localStorage.getItem(scopedKey(BASE_THEME_KEY)) || 'classic';
}

export function saveThemeId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(scopedKey(BASE_THEME_KEY), id);
}

export function getThemeById(id: string): DocumentTheme {
  return themePresets.find(t => t.id === id) || themePresets[0];
}

export function applyTheme(theme: DocumentTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--doc-primary', theme.colors.primary);
  root.style.setProperty('--doc-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--doc-primary-text', theme.colors.primaryText);
  root.style.setProperty('--doc-accent', theme.colors.accent);
  root.style.setProperty('--doc-accent-light', theme.colors.accentLight);
}
