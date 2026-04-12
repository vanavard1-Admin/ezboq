/**
 * Human-First Copy Service
 *
 * All user-facing messages — natural Thai, ด๊อกๆ character, no markdown artifacts
 */

import { getCopyEditTemplate } from './uxCopy';

export type DocumentType = 'QUO' | 'BILL' | 'INVOICE' | 'RECEIPT';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  QUO: 'ใบเสนอราคา',
  BILL: 'ใบวางบิล',
  INVOICE: 'ใบแจ้งหนี้',
  RECEIPT: 'ใบเสร็จ',
};

export function startDoc(docType: DocumentType): string {
  const label = DOC_TYPE_LABELS[docType];
  const templateDocType = docType === 'INVOICE' ? 'BILL' : docType;
  return `บี๊บ! เริ่มทำ${label}ให้แล้วครับ เจ้านาย

คัดลอกบล็อกนี้แล้วแก้ข้อมูลได้เลย 👇
${getCopyEditTemplate(templateDocType)}

เมื่อกรอกเสร็จ พิมพ์ "ออกเอกสาร"`;
}

export function noDraftButUserSaysDoc(text: string): string {
  void text;
  return `โอ๊ะ! ยังไม่มีเอกสารอยู่ในมือ เดี๋ยวเริ่มให้เลยนะเจ้านาย

พิมพ์ "ทำใบเสนอราคา" หรือ "ทำใบวางบิล" ได้เลย`;
}

export function askCustomer(): string {
  return `ตั้งชื่อลูกค้าได้เลยนะเจ้านาย

ตัวอย่าง
ลูกค้า แมวเป้า`;
}

export function askItem(): string {
  return `เพิ่มของได้ครับเจ้านาย ส่งแบบนี้

ตัวอย่าง
อาหารแมว 2 x 1500
หรือ อาหารแมว 3000`;
}

export function ambiguous(): string {
  return `ติ๊ดๆ ด๊อกๆ งงนิดนึงว่าอยากตั้งลูกค้าหรือเพิ่มรายการ

ลองพิมพ์แบบนี้นะเจ้านาย
ลูกค้า แมวเป้า
หรือ อาหารแมว 3000`;
}

export function confirmHint(): string {
  return `ถ้าข้อมูลครบแล้ว พิมพ์ "ออกเอกสาร" ได้เลยเจ้านาย`;
}

export function draftSummaryHeader(docType: DocumentType): string {
  const label = DOC_TYPE_LABELS[docType];
  return label;
}

export function noItemsYet(): string {
  return `เอ๊ะ… ตอนนี้รายการยังว่างอยู่ครับเจ้านาย 😅

ลองส่งแบบนี้
อาหารแมว 3000`;
}

export function noCustomerYet(): string {
  return `ยังไม่มีชื่อลูกค้าครับเจ้านาย ส่งชื่อมาได้เลย`;
}

export function itemAdded(itemName: string, qty: number, price: number): string {
  const total = qty * price;
  return `ติ๊ดๆ เพิ่มรายการแล้วครับเจ้านาย\n${itemName} ${qty} x ${price.toLocaleString()} = ${total.toLocaleString()} บาท`;
}

export function customerSet(customerName: string): string {
  return `ติ๊ดๆ ตั้งชื่อลูกค้าแล้วครับเจ้านาย ${customerName}`;
}
