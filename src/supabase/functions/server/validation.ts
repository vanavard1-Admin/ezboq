/**
 * Input Validation Schemas (Zod)
 * 
 * ✅ Validates all API inputs to prevent:
 * - SQL injection
 * - XSS attacks
 * - Invalid data types
 * - Missing required fields
 */

import { z } from 'npm:zod@3.23.8';

// ========== COMMON SCHEMAS ==========

export const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const nameSchema = z.string().min(1).max(200).trim();
export const emailSchema = z.string().email().max(200);
export const phoneSchema = z.string().max(50).optional();
export const taxIdSchema = z.string().max(50).optional();
export const addressSchema = z.string().max(1000).optional();
export const urlSchema = z.string().url().max(500).optional();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
export const timestampSchema = z.number().int().positive();
export const amountSchema = z.number().min(0).max(1000000000); // Max 1 billion

// Document types
export const documentTypeSchema = z.enum(['boq', 'quotation', 'invoice', 'receipt']);

// Document status - รวมทั้ง payment และ approval workflow
export const documentStatusSchema = z.enum([
  'draft',      // ฉบับร่าง
  'sent',       // ส่งไปแล้ว
  'approved',   // อนุมัติแล้ว
  'completed',  // เสร็จสมบูรณ์
  'paid',       // ชำระแล้ว
  'overdue',    // เกินกำหนด
  'cancelled'   // ยกเลิก
]);

// Recipient type
export const recipientTypeSchema = z.enum(['customer', 'partner']);

// Discount type
export const discountTypeSchema = z.enum(['percent', 'fixed']);

// ========== BOQ ITEM SCHEMA ==========

export const boqItemSchema = z.object({
  id: z.string(),
  description: z.string().max(500).optional(), // Made optional - can be empty for catalog items
  quantity: z.number().min(0).max(1000000),
  unit: z.string().max(50).optional(),
  material: z.number().min(0).max(1000000000).default(0),
  labor: z.number().min(0).max(1000000000).default(0),
  category: z.string().max(100).optional(),
});

// ========== PROFILE SCHEMA ==========

export const profileSchema = z.object({
  wastePct: z.number().min(0).max(100).default(3),
  opexPct: z.number().min(0).max(100).default(5),
  errorPct: z.number().min(0).max(100).default(2),
  markupPct: z.number().min(0).max(100).default(10),
  vatPct: z.number().min(0).max(100).default(7),
});

// ========== COMPANY INFO SCHEMA ==========

export const companyInfoSchema = z.object({
  name: nameSchema,
  taxId: taxIdSchema,
  address: addressSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  website: z.string().max(500).optional(), // Changed from urlSchema to string - can be any format
  logo: z.string().max(200).optional(),
});

// ========== CUSTOMER SCHEMA ==========

export const customerSchema = z.object({
  id: idSchema,
  name: nameSchema,
  taxId: taxIdSchema.optional(),
  address: addressSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  contactPerson: nameSchema.optional(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});

// ========== PARTNER SCHEMA ==========

export const partnerSchema = z.object({
  id: idSchema,
  name: nameSchema,
  companyName: nameSchema.optional(),
  taxId: taxIdSchema.optional(),
  address: addressSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  contactPerson: nameSchema.optional(),
  totalProjects: z.number().int().min(0).default(0),
  totalRevenue: z.number().min(0).default(0),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});

// ========== DISCOUNT SCHEMA ==========

export const discountSchema = z.object({
  type: discountTypeSchema,
  value: z.number().min(0).max(100), // percent: 0-100, fixed: any amount
  reason: z.string().max(500).optional(),
});

// ========== DOCUMENT SCHEMA ==========

export const documentSchema = z.object({
  id: idSchema,
  documentNumber: z.string().max(50).optional(),
  type: documentTypeSchema,
  status: documentStatusSchema,
  projectTitle: z.string().min(1).max(500),
  projectDescription: z.string().max(2000).optional(),
  projectLocation: z.string().max(500).optional(),
  customerId: idSchema.optional(),
  customerName: nameSchema.optional(),
  partnerId: idSchema.optional(),
  partnerName: nameSchema.optional(),
  recipientType: recipientTypeSchema.optional(),
  mainProjectTag: z.string().max(100).optional(),
  totalAmount: amountSchema.optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  boqItems: z.array(boqItemSchema).optional(),
  profile: profileSchema.optional(),
  company: companyInfoSchema.partial().optional(),
  customer: customerSchema.partial().optional(),
  partner: partnerSchema.partial().nullable().optional(), // Made nullable - can be null
  discount: discountSchema.nullable().optional(), // Made nullable - can be null
  notes: z.string().max(2000).optional(),
  paymentConditions: z.string().max(2000).optional(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});

// ========== TAX RECORD SCHEMA ==========

export const taxRecordSchema = z.object({
  id: idSchema,
  documentId: idSchema.optional(),
  invoiceNumber: z.string().max(50).optional(),
  receiptNumber: z.string().max(50).optional(),
  customerName: nameSchema.optional(),
  partnerName: nameSchema.optional(),
  issueDate: z.string().optional(),
  totalBeforeVat: amountSchema.optional(),
  vatAmount: amountSchema.optional(),
  grandTotal: amountSchema.optional(),
  withholdingTaxAmount: amountSchema.optional(),
  netPayable: amountSchema.optional(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});

// ========== MEMBERSHIP SCHEMA ==========

export const membershipSchema = z.object({
  userId: idSchema,
  tier: z.enum(['free', 'individual_month', 'individual_year', 'team_month', 'team_year']),
  freeBoqUsed: z.boolean().default(false),
  autoRenew: z.boolean().default(false),
  subscriptionStart: timestampSchema.optional(),
  subscriptionEnd: timestampSchema.optional(),
  paymentHistory: z.array(z.any()).default([]),
  boqUsedThisMonth: z.number().int().min(0).default(0),
});

// ========== TEAM MEMBER SCHEMA ==========

export const teamMemberSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  status: z.enum(['pending', 'active', 'suspended']).default('pending'),
  joinedAt: timestampSchema.optional(),
});

// ========== QUERY PARAMS SCHEMAS ==========

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export const filterByRecipientTypeSchema = z.object({
  recipientType: recipientTypeSchema.optional(),
});

// ========== VALIDATION HELPER ==========

/**
 * Validate data against schema and return errors if any
 * 
 * @returns { success: true, data } or { success: false, errors }
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    const validated = schema.parse(data);
    return { success: true as const, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      console.error('❌ Validation failed:', errors);
      return { success: false as const, errors };
    }
    return { success: false as const, errors: [{ path: 'unknown', message: String(error) }] };
  }
}

/**
 * Sanitize string to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

// ========== EXPORTS ==========

export const schemas = {
  // Entities
  customer: customerSchema,
  partner: partnerSchema,
  document: documentSchema,
  taxRecord: taxRecordSchema,
  membership: membershipSchema,
  teamMember: teamMemberSchema,
  
  // Components
  boqItem: boqItemSchema,
  profile: profileSchema,
  companyInfo: companyInfoSchema,
  discount: discountSchema,
  
  // Queries
  pagination: paginationSchema,
  filterByRecipientType: filterByRecipientTypeSchema,
};
