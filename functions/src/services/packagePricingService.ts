import {
  PACKAGE_TYPE_PRO,
  PACKAGE_TYPE_PRO_YEAR,
  PACKAGE_TYPE_TEAM,
  PACKAGE_TYPE_TEAM_YEAR,
  getPackageDefinition,
} from './purchaseService';
import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';
import { normalizeInput } from '../utils/inputNormalization';

const EXACT_GENERIC_PRICING_RE = /^(?:ค่าบริการ|ค่าใช้จ่าย|ราคา)(?:\s*(?:เท่าไหร่|เท่าไร|เท่าไหร่ครับ|เท่าไรครับ|ยังไง|ยังไงบ้าง))?$/i;
const PACKAGE_KEYWORD_RE = /(แพ็ก|แพ็ค|แพ็กเกจ|แพ็คเกจ|สมาชิก|subscription|สมัคร|pro|team|ezdoc)/i;
const PRICING_KEYWORD_RE = /(ราคา|ค่าบริการ|ค่าใช้จ่าย|ค่าสมาชิก|เสียเงินไหม|เสียตังไหม|ฟรีไหม|ทดลองใช้|เท่าไหร่|เท่าไร|กี่บาท|จ่ายเท่าไหร่|จ่ายเท่าไร)/i;
const DOCUMENT_LIKE_RE = /(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสนอราคา|ใบวางบิล|ใบแจ้งหนี้|ใบเสร็จ|quotation|invoice|receipt)/i;

function formatAmount(amount: number): string {
  return amount.toLocaleString('th-TH');
}

function getOfferLines(): string[] {
  const offers = [
    { type: PACKAGE_TYPE_PRO, label: 'Pro รายเดือน', suffix: '(1 คน)' },
    { type: PACKAGE_TYPE_PRO_YEAR, label: 'Pro รายปี', suffix: '(1 คน)' },
    { type: PACKAGE_TYPE_TEAM, label: 'Team รายเดือน', suffix: '(3 คน)' },
    { type: PACKAGE_TYPE_TEAM_YEAR, label: 'Team รายปี', suffix: '(3 คน)' },
  ] as const;

  return offers
    .map((offer) => {
      const pkg = getPackageDefinition(offer.type);
      if (!pkg) return null;
      const unit = pkg.durationMonths >= 12 ? 'บาท/ปี' : 'บาท/เดือน';
      return `${offer.label} ${formatAmount(pkg.amount)} ${unit} ${offer.suffix}`;
    })
    .filter((line): line is string => Boolean(line));
}

export function isPackagePricingQuestion(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  const normalized = normalizeInput(text);
  if (DOCUMENT_LIKE_RE.test(normalized)) return false;
  if (EXACT_GENERIC_PRICING_RE.test(text)) return true;
  return PACKAGE_KEYWORD_RE.test(text) && PRICING_KEYWORD_RE.test(text);
}

export function buildPackagePricingMessage(): string {
  return [
    '📦 แพ็กเกจ EzDOC ตอนนี้',
    '',
    `ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรก และเอกสารฟรีจะมีลายน้ำ EzDOC`,
    '',
    ...getOfferLines(),
    '',
    'EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด',
    'EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด',
    '',
    'ถ้าจะให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณ พิมพ์ "เชื่อมต่อ" ได้เลยครับ',
  ].join('\n');
}

export function buildPackageRecommendationMessage(): string {
  return [
    `📦 ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรกก่อนครับ`,
    '',
    ...getOfferLines(),
    '',
    'ใช้คนเดียวเริ่ม Pro 99 บาท ออกเอกสารได้ไม่จำกัด',
    'ถ้าใช้หลายคนเลือก Team 279 บาท ได้เลยครับ',
  ].join('\n');
}

export function buildPackageTrialMessage(): string {
  return [
    `ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรกครับ`,
    '',
    'เอกสารฟรีจะมีลายน้ำ EzDOC',
    'ถ้าจะให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณ พิมพ์ "เชื่อมต่อ"',
    'ถ้าจะใช้งานต่อแบบไม่จำกัด เริ่มที่ EzDOC Pro 99 บาท',
  ].join('\n');
}
