import { BOQItem } from "./boq";

// Template System Types - เวอร์ชันใหม่ที่เรียบง่าย
export type TemplateMainCategory = 
  | "house"        // บ้านเดี่ยว (ทั้งหลัง)
  | "room"         // ห้องต่างๆ (ห้องน้ำ, ครัว, นอน)
  | "renovation"   // งานรีโนเวท/ต่อเติม
  | "builtin"      // งานบิ้วอิน
  | "landscape"    // งานภูมิทัศน์
  | "commercial";  // ร้านค้า/คาเฟ่/ร้านอาหาร

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  mainCategory: TemplateMainCategory;
  
  // Specifications
  area?: number;              // พื้นที่ (ตร.ม.)
  estimatedCost?: number;     // ราคาประมาณ (บาท)
  estimatedDays?: number;     // ระยะเวลาประมาณ (วัน)
  
  // Tags
  tags: string[];
  difficulty?: "easy" | "medium" | "hard";
  
  // Template items
  items: BOQItem[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  usageCount?: number;
}

export interface TemplateSearchFilter {
  mainCategory?: TemplateMainCategory;
  budgetMin?: number;
  budgetMax?: number;
  areaMin?: number;
  areaMax?: number;
  tags?: string[];
  sortBy?: "popular" | "newest" | "price_low" | "price_high";
}
