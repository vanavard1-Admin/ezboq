/**
 * AppShell — shared types and constants
 * Extracted from AppShell.tsx to keep the main component lean.
 */
import type { LucideIcon } from 'lucide-react';
import { FileText, HardHat, Home, ShoppingCart, Wallet } from 'lucide-react';
import type { ViewableDocument } from '../features/pipeline/components/DocumentViewer';

export type MainTab = 'dashboard' | 'customer' | 'procurement' | 'contractor' | 'finance';
export type AppView = 'main' | 'new-project' | 'settings';
export type PlanTier = 'free' | 'paid';
export type SettingsTab = 'profile' | 'company' | 'subscription' | 'team';

export const TABS: { key: MainTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'หน้าหลัก', shortLabel: 'หน้าหลัก', icon: Home },
  { key: 'customer', label: 'เอกสาร', shortLabel: 'เอกสาร', icon: FileText },
  { key: 'procurement', label: 'จัดซื้อ', shortLabel: 'จัดซื้อ', icon: ShoppingCart },
  { key: 'contractor', label: 'ช่าง', shortLabel: 'ช่าง', icon: HardHat },
  { key: 'finance', label: 'การเงิน', shortLabel: 'การเงิน', icon: Wallet },
];

export const CLOUD_SYNC_DEBOUNCE_MS = 900;
export const PAID_ONLY_MAIN_TABS = new Set<MainTab>(['finance']);
export const PAID_ONLY_DOCUMENTS = new Set<ViewableDocument>([
  'invoice',
  'contractor-invoice',
  'receipt',
  'vat-invoice',
  'withholding-tax',
  'summary-invoice',
]);
