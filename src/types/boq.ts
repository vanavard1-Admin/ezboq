export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  material: number;
  labor: number;
}

export interface BOQItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  material: number;
  labor: number;
  quantity: number;
  notes?: string;
}

export interface Profile {
  wastePct: number;
  opexPct: number;
  errorPct: number;
  markupPct: number;
  vatPct: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  phone: string;
  email: string;
  website?: string;
}

export interface CustomerInfo {
  id?: string;
  type: "individual" | "company";
  name: string;
  address: string;
  phone: string;
  email?: string;
  taxId?: string;
}

export interface ProjectSettings {
  paperSize: "A3" | "A4";
  orientation: "portrait" | "landscape";
  showLogo: boolean;
  showTaxId: boolean;
  logoUrl?: string;
}

export interface Signature {
  type: "proposer" | "customer" | "witness";
  name: string;
  position?: string;
  signatureUrl?: string;
  date?: string;
}

export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  createdAt: number;
  company: CompanyInfo;
  customer: CustomerInfo;
  settings: ProjectSettings;
  signatures: Signature[];
}

export interface BOQSummary {
  // Base totals
  subtotalMaterial: number;
  subtotalLabor: number;
  subtotal: number;
  
  // Adjustments
  waste: number;
  opex: number;
  error: number;
  
  // Calculations
  totalBeforeMarkup: number;
  markup: number;
  totalBeforeVat: number;
  vat: number;
  grandTotal: number;
  
  // Aliases for backward compatibility
  totalMaterial?: number; // = subtotalMaterial
  totalLabor?: number; // = subtotalLabor
  wastage?: number; // = waste
  operational?: number; // = opex
  contingency?: number; // = error
  profit?: number; // = markup
}

export type DocumentType = "boq" | "quotation" | "invoice" | "receipt";

export interface Discount {
  type: "percent" | "fixed";
  value: number;
  description?: string;
}

export interface PaymentTerm {
  id: string;
  installment: number;
  percentage?: number;
  amount?: number;
  description: string;
  dueDate?: string;
  status?: 'pending' | 'paid'; // สถานะการชำระ
  paidDate?: string; // วันที่ชำระ
  receiptNumber?: string; // เลขที่ใบเสร็จ
  isPaid?: boolean; // สถานะชำระแล้ว (alternative to status)
  paidAmount?: number; // ยอดเงินที่ชำระจริง (อาจไม่เท่ากับ amount ถ้าชำระบางส่วน)
}

export interface PaymentTerms {
  totalInstallments: number;
  terms: PaymentTerm[];
}

export interface ItemDiscount {
  itemId: string;
  type: "percent" | "fixed";
  value: number;
}

export interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  qrCodeUrl?: string;
}

export interface TaxInvoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  paymentMethod: "cash" | "transfer" | "check" | "other";
  paidAmount?: number;
  receiptNumber?: string;
  notes?: string;
}

export type WorkflowStep = "boq" | "quotation" | "invoice" | "receipt";

export interface WorkflowData {
  currentStep: WorkflowStep;
  boqCompleted: boolean;
  quotationCompleted: boolean;
  invoiceCompleted: boolean;
  receiptCompleted: boolean;
}

// Customer Management Types
export interface Customer {
  id: string;
  type: "individual" | "company";
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address: string;
  taxId?: string;
  createdAt: number;
  updatedAt: number;
  totalProjects: number;
  totalRevenue: number;
  lastProjectDate?: number;
  notes?: string;
  tags?: string[];
}

// Document History Types
export interface Document {
  id: string;
  type: DocumentType;
  projectId?: string;
  projectTitle: string;
  projectDescription?: string;
  projectLocation?: string;
  
  // Recipient type
  recipientType?: 'customer' | 'partner'; // ประเภทผู้รับ
  
  // For customer documents
  customerId?: string;
  customerName?: string;
  
  // For partner documents
  partnerId?: string;
  partnerName?: string;
  mainProjectTag?: string; // Tag โครงการหลัก (เช่น "โครงการบ้านคุณสมชาย")
  
  documentNumber: string;
  issueDate?: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  createdAt: number;
  updatedAt: number;
  pdfUrl?: string;
  
  // Withholding Tax (for partners)
  withholdingTaxRate?: number;
  withholdingTaxType?: string;
  withholdingTaxAmount?: number;
  netPayable?: number;
  
  // Full data for template/preview
  boqItems?: BOQItem[];
  profile?: Profile;
  company?: CompanyInfo;
  customer?: CustomerInfo;
  partner?: any;
  discount?: Discount | null;
  bankInfo?: BankInfo | null;
  paymentTerms?: PaymentTerms | null;
  taxInvoice?: TaxInvoice;
}

// Analytics & Reports Types
export interface RevenueByMonth {
  month: string;
  revenue: number; // ยอดขาย (กำไร)
  cost: number; // ต้นทุน (พาร์ทเนอร์)
  netIncome: number; // รายได้สุทธิ
  projects: number;
}

export interface RevenueByCustomer {
  customerId: string;
  customerName: string;
  revenue: number;
  projects: number;
}

export interface RevenueByCategory {
  category: string;
  revenue: number;
  percentage: number;
}

export interface AnalyticsData {
  totalRevenue: number; // กำไร (ยอดขาย)
  totalCost: number; // ต้นทุน (พาร์ทเนอร์)
  netIncome: number; // รายได้สุทธิ
  totalProjects: number;
  totalCustomers: number;
  averageProjectValue: number;
  revenueByMonth: RevenueByMonth[];
  revenueByCustomer: RevenueByCustomer[];
  revenueByCategory: RevenueByCategory[];
  topCustomers: Customer[];
  recentDocuments: Document[];
}

// User Profile & Settings Types
export type ProposerType = 
  // 1) บริษัทผู้รับเหมา (นิติบุคคล)
  | 'general_contractor'        // ผู้รับเหมาหลัก (General/Main Contractor)
  | 'design_build'              // Design-Build / EPC / Turnkey
  | 'construction_management'   // Construction Management (CM)
  | 'structure_contractor'      // ผู้รับเหมางานโครงสร้างรวม
  | 'mep_contractor'            // ผู้รับเหมา MEP ครบวงจร
  | 'interior_contractor'       // ผู้รับเหมา Interior/Fit-out
  | 'exterior_contractor'       // ผู้รับเหมางานภายนอก (ถนน/ภูมิทัศน์)
  | 'special_system_contractor' // ผู้รับเหมาระบบพิเศษ (คลีนรูม/ห้องเย็น)
  | 'maintenance_contractor'    // ผู้รับเหมาบำรุงรักษา (AMC)
  
  // 2) ช่าง/ทีมเฉพาะทาง (Subcontractors/Trades)
  // 2.1 โครงสร้าง/ดิน
  | 'surveyor'                  // สำรวจ/ตั้งแนว
  | 'pile_contractor'           // เสาเข็ม/ทดสอบ
  | 'concrete_contractor'       // คอนกรีต/แบบหล่อ/เหล็กเสริม
  | 'steel_contractor'          // โครงสร้างเหล็ก/เชื่อม
  | 'waterproof_contractor'     // กันซึม/ซ่อมคอนกรีต
  
  // 2.2 สถาปัตย์
  | 'mason'                     // ผนังอิฐ/คอนกรีตมวลเบา
  | 'ceiling_contractor'        // ฝ้าเพดาน
  | 'tile_contractor'           // ปูกระเบื้อง/หิน/พื้น
  | 'wood_contractor'           // งานไม้/ปาร์เกต์
  | 'painter'                   // งานสี/กันไฟ
  | 'furniture_contractor'      // บิ้วอิน/เฟอร์นิเจอร์
  | 'door_window_contractor'    // ประตู-หน้าต่าง
  | 'aluminum_glass_contractor' // อะลูมิเนียมและกระจก
  | 'roof_contractor'           // หลังคา/เมทัลชีท
  | 'facade_contractor'         // ฟาซาด/ครีบระแนง
  
  // 2.3 งานภายนอก/ภูมิทัศน์
  | 'road_contractor'           // ถนน/แอสฟัลต์
  | 'landscape_contractor'      // แลนด์สเคป/สนามหญ้า
  | 'pool_contractor'           // สระว่ายน้ำ/น้ำพุ
  
  // 2.4 MEP
  | 'electrician'               // ไฟฟ้า/แสงสว่าง
  | 'elv_contractor'            // ELV/ICT/กล้อง CCTV
  | 'solar_contractor'          // โซลาร์รูฟ/EV Charger
  | 'fire_protection'           // ระบบดับเพลิง
  | 'plumber'                   // ประปา/สุขาภิบาล
  | 'kitchen_gas_contractor'    // ระบบครัว/แก๊ส
  | 'hvac_contractor'           // แอร์และระบายอากาศ
  | 'coldroom_contractor'       // ห้องเย็น/คลีนรูม
  | 'bms_contractor'            // BMS/Automation
  
  // 2.5 รื้อถอน/ความปลอดภัย
  | 'demolition_contractor'     // รื้อถอน
  | 'scaffolding_contractor'    // นั่งร้าน/กันตก
  | 'equipment_rental'          // เครน/เครื่องมือ
  
  // 3) ร้านขายวัสดุ/ซัพพลายเออร์
  | 'cement_supplier'           // ปูนซีเมนต์/คอนกรีต
  | 'steel_supplier'            // เหล็ก/สแตนเลส/อลูมิเนียม
  | 'formwork_supplier'         // แบบหล่อ/อุปกรณ์ชอร์ริง
  | 'brick_supplier'            // อิฐ/บล็อก/ปูน
  | 'tile_supplier'             // กระเบื้อง/หิน/พื้น
  | 'paint_supplier'            // สี/กันไฟ/กันซึม
  | 'wood_supplier'             // ไม้/ไม้อัด/วีเนียร์
  | 'door_window_supplier'      // ประตู-หน้าต่าง
  | 'glass_supplier'            // กระจก/ฟาซาด
  | 'roof_supplier'             // หลังคา/ฉนวน
  | 'electrical_supplier'       // สายไฟ/เคเบิล/ตู้ไฟ
  | 'lighting_supplier'         // โคมไฟ/อุปกรณ์แสงสว่าง
  | 'sanitary_supplier'         // สุขภัณฑ์/ก๊อก
  | 'pipe_supplier'             // ท่อ/ข้อต่อ/ปั๊มน้ำ
  | 'hvac_supplier'             // เครื่องปรับอากาศ/ดักท์
  | 'fire_supplier'             // ดับเพลิง/วาล์ว
  | 'solar_supplier'            // โซลาร์/อินเวอร์เตอร์
  | 'tool_supplier'             // เครื่องมือช่าง/PPE
  
  | 'material_store'            // ร้านค้าวัสดุทั่วไป
  | 'other';                    // อื่นๆ

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  proposerType: ProposerType;
  proposerName: string;
  company?: CompanyInfo;
  phone?: string;
  address?: string;
  createdAt: number;
  updatedAt: number;
}

// Partner Management Types
export interface Partner {
  id: string;
  name: string;
  type: ProposerType;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  commission?: number; // % commission
  totalProjects: number;
  totalRevenue: number;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

// VIP Membership Types
export type MembershipTier = 
  | 'free'              // ฟรี (1 BOQ)
  | 'individual_month'  // รายเดือน - เดี่ยว (129 บาท/เดือน)
  | 'individual_year'   // รายปี - เดี่ยว (1,290 บาท/ปี, ประหยัด 17%)
  | 'team_month'        // รายเดือน - ทีม (499 บาท/เดือน, 5 ที่นั่ง)
  | 'team_year';        // รายปี - ทีม (4,990 บาท/ปี, ประหยัด 17%, 5 ที่นั่ง)

export type BillingCycle = 'monthly' | 'yearly';

export interface MembershipPlan {
  tier: MembershipTier;
  name: string;
  price: number;
  billingCycle: BillingCycle | null; // null for free tier
  features: string[];
  limits: {
    boqPerMonth: number | 'unlimited';
    users: number; // จำนวนผู้ใช้งานในทีม
    storage: string;
    support: 'email' | 'priority' | 'dedicated';
  };
  popular?: boolean;
  savings?: number; // % ที่ประหยัดได้เมื่อเทียบกับรายเดือน
}

export interface Membership {
  userId: string;
  tier: MembershipTier;
  freeBoqUsed: boolean; // ใช้ BOQ ฟรีไปแล้วหรือยัง (สำหรับ free tier)
  subscriptionStart?: number;
  subscriptionEnd?: number;
  autoRenew: boolean;
  paymentHistory: PaymentRecord[];
  // Team features
  teamMembers?: string[]; // Array of user IDs in team
  teamOwnerId?: string; // ID of team owner
  boqUsedThisMonth?: number; // จำนวน BOQ ที่สร้างในเดือนนี้
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: number;
  method: 'promptpay' | 'credit_card' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed';
  receiptUrl?: string;
  planName?: string;
  billingCycle?: BillingCycle;
}
