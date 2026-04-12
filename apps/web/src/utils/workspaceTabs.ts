export type AppTab =
  | 'home'
  | 'quotation'
  | 'purchase-order'
  | 'customer-quotation'
  | 'presentation-board'
  | 'invoice'
  | 'contractor-invoice'
  | 'summary-invoice'
  | 'vat-invoice'
  | 'withholding-tax'
  | 'workplan'
  | 'comparison'
  | 'receipt'
  | 'dashboard'
  | 'contract'
  | 'manage'
  | 'edit'
  | 'pipeline'
  | 'company-settings';

export type WorkspaceDocumentTab = Exclude<AppTab, 'home' | 'dashboard' | 'pipeline' | 'company-settings'>;

export const allAppTabs: AppTab[] = [
  'home',
  'dashboard',
  'quotation',
  'purchase-order',
  'customer-quotation',
  'presentation-board',
  'comparison',
  'invoice',
  'contractor-invoice',
  'summary-invoice',
  'vat-invoice',
  'withholding-tax',
  'receipt',
  'workplan',
  'contract',
  'manage',
  'edit',
  'pipeline',
  'company-settings',
];
