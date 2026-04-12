import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';

const EXACT_PAYMENT_HELP_RE = /^(?:จ่าย|ชำระ)(?:เงิน)?(?:\s*(?:ยังไง|ยังไงบ้าง|ยังไงอะ|ยังไงครับ|ทางไหน|วิธีไหน|ยังไงดี))?$/i;
const PACKAGE_PAYMENT_RE = /(?:(?:ซื้อ|สมัคร|อัปเกรด|upgrade).*(?:แพ็ก|แพ็ค|สมาชิก)|(?:แพ็ก|แพ็ค|สมาชิก).*(?:จ่าย|ชำระ|ซื้อ|สมัคร)|(?:จ่าย|ชำระ).*(?:แพ็ก|แพ็ค|สมาชิก)|ทางไลน์.*(?:จ่าย|ชำระ)|(?:จ่าย|ชำระ).*(?:ทางไลน์|ไลน์))/i;
const DIRECT_PACKAGE_COMMAND_RE = /^(?:ซื้อ\s*)?(?:แพ็ก|แพ็ค)\s*(99|199|279|299|399|2790|3990)$|^(99|199|279|299|399|2790|3990)$/i;

export function isSubscriptionPaymentHelpQuestion(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  if (DIRECT_PACKAGE_COMMAND_RE.test(text.replace(/\s+/g, ' '))) return false;
  if (EXACT_PAYMENT_HELP_RE.test(text)) return true;
  return PACKAGE_PAYMENT_RE.test(text);
}

export function buildSubscriptionPaymentHelpMessage(): string {
  return `ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรกก่อนครับ\n\n` +
    'ถ้าจะให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณ พิมพ์ "เชื่อมต่อ" ได้เลยครับ\n\n' +
    '💳 สมัครแพ็กและจ่ายเงินผ่าน LINE ได้เลยครับเจ้านาย\n\n' +
    'พิมพ์ "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279" ตรงนี้ได้เลย\n' +
    'ระบบจะส่ง PromptPay QR มาในแชท โอนแล้วส่งสลิปกลับมาครับ\n' +
    'EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด\n' +
    'EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด\n\n' +
    'ตอนนี้ยังไม่มีบัตรเครดิตในระบบครับ';
}
