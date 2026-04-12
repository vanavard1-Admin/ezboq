// Shared types for EzBOQ + EzDoc monorepo

/* ── User & Auth Types ─────────────────────────────── */
export type UserRole = 'owner' | 'member' | 'client' | 'viewer';

export interface AuthUser {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  company?: string;
  description?: string;
  hasFullProjectAccess: boolean;
  assignedProjectIds: string[];
  canExportAll: boolean;
  canManageProjects: boolean;
  canResetDemoData?: boolean;
  canOpenSpecialProjects?: boolean;
  allowedTabs?: string[];
}

export interface AuthSession {
  user: AuthUser;
  rememberSession: boolean;
  signedInAt: string;
  workspaceMode?: 'cloud' | 'local-cache' | 'mock' | 'line' | 'firebase';
}

/* ── Business Types ─────────────────────────────────── */
export interface Business {
  id?: string;
  name: string;
  address?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  isSetupComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/* ── Document Types ─────────────────────────────────── */
export type ProjectStatus = 'active' | 'archived' | 'draft' | 'completed';

export interface QuotationItem {
  no: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  laborCost?: number | string;
  customerUnitPrice?: number | string;
  scopeDetails?: string;
  totalPrice?: number | string;
}

export interface WorkPlanItem {
  no: string;
  task: string;
  duration: string;
  weekCells: string[];
  status: string;
}

export interface WorkPlanConfig {
  totalWeeks: number;
  startDate?: string;
  endDate?: string;
  durationLabel?: string;
  items: WorkPlanItem[];
}

export interface PaymentInstallment {
  no: number;
  description: string;
  percentage: number;
  amount?: number;
  condition?: string;
  dueDate?: string;
}

export interface DocumentPipelineData {
  id?: string;
  projectName: string;
  status: ProjectStatus;
  quotationItems: QuotationItem[];
  workPlan?: WorkPlanConfig;
  paymentInstallments?: PaymentInstallment[];
  businessId?: string;
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
  totalAmount?: number;
  notes?: string;
}

/* ── Invoice Types ─────────────────────────────────── */
export interface InvoiceCategory {
  id: string;
  name: string;
  description?: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId?: string;
  taxRate?: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  businessId: string;
  customerId?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ── Customer Types ─────────────────────────────────── */
export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  contactPerson?: string;
  businessId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ── Common API Response Types ─────────────────────── */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
