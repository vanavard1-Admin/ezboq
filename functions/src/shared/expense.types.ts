/**
 * Expense Types
 * Defines the structure for expense recording
 */

export enum ExpenseCategory {
    COST_OF_GOODS = 'COST_OF_GOODS', // ต้นทุนสินค้า
    OPERATION = 'OPERATION',         // ค่าดำเนินงาน
    MARKETING = 'MARKETING',         // ค่าการตลาด
    TRANSPORT = 'TRANSPORT',         // ค่าเดินทาง/ขนส่ง
    SALARY = 'SALARY',               // เงินเดือน
    RENT = 'RENT',                   // ค่าเช่า
    UTILITIES = 'UTILITIES',         // ค่าน้ำ/ไฟ/เน็ต
    TAX = 'TAX',                     // ภาษี
    OTHER = 'OTHER',                 // อื่นๆ
}

export const ExpenseCategories = [
    ExpenseCategory.COST_OF_GOODS,
    ExpenseCategory.OPERATION,
    ExpenseCategory.MARKETING,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.SALARY,
    ExpenseCategory.RENT,
    ExpenseCategory.UTILITIES,
    ExpenseCategory.TAX,
    ExpenseCategory.OTHER,
] as const;

export enum ExpenseStatus {
    PAID = 'PAID',
    UNPAID = 'UNPAID',     // รอจ่าย (Credit term)
    CANCELLED = 'CANCELLED'
}

export interface Expense {
    id: string;
    userId: string;

    // Details
    category: string;
    description: string;
    date: string; // ISO Date YYYY-MM-DD

    // Vendor/Supplier info
    supplierName?: string;
    supplierTaxId?: string;
    supplierAddress?: string;

    // Payment
    amount: number; // Excl. VAT
    vatAmount: number;
    totalAmount: number; // Incl. VAT
    whtAmount?: number; // หัก ณ ที่จ่าย (ถ้ามี)

    status: ExpenseStatus;

    // Evidence
    receiptUrl?: string; // Slip or Photo URL

    createdAt: string; // ISO Timestamp
    updatedAt: string; // ISO Timestamp
}
