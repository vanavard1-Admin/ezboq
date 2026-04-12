/**
 * Help Copy Service
 *
 * ด๊อกๆ character, natural Thai — no dividers, no bullet lists
 */

import type { Plan } from '../core/planService';
import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';

const { getCopyEditTemplate } = require('./uxCopy');
const COPY_TEMPLATE = getCopyEditTemplate();
const WEB_URL = 'https://doc.ezboq.com';
const SUBSCRIPTION_STATUS_COMMAND = 'สถานะแพ็ค';

function getPlanSupportLines(plan: Plan = 'FREE'): string {
  if (plan === 'FREE') {
    return `ใช้งานบนเว็บ ${WEB_URL}
ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรก และเอกสารฟรีจะมีลายน้ำ EzDOC
ถ้าจะให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณ พิมพ์ "เชื่อมต่อ"
ถ้าจะใช้งานไม่จำกัด พิมพ์ "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279"`;
  }

  return `ใช้งานบนเว็บ ${WEB_URL}
ถ้าจะดูแพ็กหรือเช็กรอบต่ออายุ พิมพ์ "${SUBSCRIPTION_STATUS_COMMAND}"`;
}

/**
 * Get help message with real examples
 */
export function getHelpMessage(plan: Plan = 'FREE'): string {
  const packageLine = plan === 'FREE'
    ? 'อื่นๆ  เอกสารล่าสุด / เชื่อมต่อบัญชี / รายงาน / สถานะแพ็ค / เช็คสลิป / ซื้อแพ็ค 99 / ซื้อแพ็ค 279'
    : 'อื่นๆ  เอกสารล่าสุด / รายงาน / สถานะแพ็ค / เช็คสลิป';

  return `บี๊บ! ด๊อกๆ ส่งคู่มือให้เจ้านาย (เร็วสุด) 📌

ก๊อปบล็อกนี้ไปแก้แล้วส่งกลับมา
${COPY_TEMPLATE}

พิมพ์ติดกันก็ได้ เช่น ลูกค้าแมวจร อาหารแมว3000
ถ้าจะใช้ ":" ให้ใส่ทุกบรรทัด (ถ้าไม่ใส่ ให้เอาออกทุกบรรทัด)

หลังส่งแล้ว ด๊อกๆ จะสรุปให้เจ้านาย จากนั้นพิมพ์
"ออกเอกสาร" หรือ "แก้ไข"

รูปแบบรายการ (จำนวนก่อนราคา)
อาหารแมว 2 x 1500

คำสั่งที่ใช้บ่อย
สร้างเอกสาร  ทำใบเสนอราคา / ทำใบวางบิล / ทำใบเสร็จ
แก้ไข  เพิ่มรายการ / ลบรายการ / ยืนยัน / ยกเลิก
ต่อเอกสาร  ใบวางบิลจาก QUO-xxxx / ยืนยันรับเงิน INV-xxxx
ธีม  ตั้งค่าธีม เขียว แดง น้ำเงิน ขาวดำ
${packageLine}

${getPlanSupportLines(plan)}`;
}

/**
 * Get help message (shorter version)
 */
export function getHelpMessageShort(plan: Plan = 'FREE'): string {
  return `ติ๊ดๆ ด๊อกๆ ส่งช่วยเหลือแบบไวให้เจ้านาย

ก๊อปไปแก้แล้วส่งกลับมา
${COPY_TEMPLATE}

พิมพ์ติดกันก็ได้ เช่น ลูกค้าแมวจร อาหารแมว3000
พร้อมแล้วพิมพ์ "ออกเอกสาร"

${getPlanSupportLines(plan)}`;
}
