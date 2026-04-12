/**
 * UX Copy Service
 *
 * Centralized Thai UX copy — natural, conversational, no markdown artifacts
 *
 * Tone: Calm, professional, reassuring
 * No sales language, no urgency, no hype
 */

import type { QuickReplyAction } from '../shared/lineQuickReply';
import type { DraftPayload } from '../shared/types';
import type { Plan } from '../core/planService';
import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';

const WEB_URL = 'https://doc.ezboq.com';
const SUBSCRIPTION_STATUS_COMMAND = 'สถานะแพ็ค';
type WelcomeUxOptions = {
  linked?: boolean;
};

const getPlanSupportLines = (plan: Plan = 'FREE'): string => {
  const lines = [`🌐 ใช้งานบนเว็บ: ${WEB_URL}`];

  if (plan === 'FREE') {
    lines.push('🔗 ถ้าจะให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณ พิมพ์ "เชื่อมต่อ"');
    lines.push('💳 ใช้งานไม่จำกัด 1 ผู้ใช้ พิมพ์ "ซื้อแพ็ค 99"');
    lines.push('👥 ใช้หลายคนในทีม พิมพ์ "ซื้อแพ็ค 279"');
    return lines.join('\n');
  }

  lines.push(`📦 ถ้าจะดูแพ็กหรือเช็กรอบต่ออายุ พิมพ์ "${SUBSCRIPTION_STATUS_COMMAND}"`);
  return lines.join('\n');
};

const getPlanPackageQuickReply = (plan: Plan = 'FREE'): QuickReplyAction => {
  if (plan === 'FREE') {
    return {
      type: 'action',
      action: { type: 'message', label: '💳 ซื้อแพ็ค 99', text: 'ซื้อแพ็ค 99' },
    };
  }

  return {
    type: 'action',
    action: { type: 'message', label: '📦 สถานะแพ็ค', text: SUBSCRIPTION_STATUS_COMMAND },
  };
};

const buildFooterButton = (
  label: string,
  action: { type: 'message'; text: string } | { type: 'uri'; uri: string },
  style: 'primary' | 'secondary' = 'secondary',
  color?: string
): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    type: 'button',
    style,
    height: 'sm',
    action: {
      type: action.type,
      label,
      ...(action.type === 'message' ? { text: action.text } : { uri: action.uri }),
    },
  };

  if (color) {
    base.color = color;
  }

  return base;
};

/**
 * Copy-ready template (NO COLON)
 */
export function getCopyEditTemplate(docType: 'QUO' | 'BILL' | 'RECEIPT' = 'QUO'): string {
  void docType;
  return `ลูกค้า แมวเป้า
รายการ
อาหารแมว 2 x 1500
ค่าขนส่ง 300
หมายเหตุ -`;
}

export function getCopyPasteTemplateBlock(): string {
  return getCopyEditTemplate();
}

/**
 * Welcome message
 */
export function getWelcomeMessage(plan: Plan = 'FREE'): string {
  return `บี๊บ! ด๊อกๆ พร้อมช่วยออกเอกสารครับ 🐾

🎁 ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรก
💧 เอกสารฟรีจะมีลายน้ำ EzDOC

เริ่มง่ายๆ
1. พิมพ์ "ทำใบเสนอราคา"
2. ส่งข้อมูล เช่น ลูกค้า แมวเป้า / อาหารแมว 2 x 1500
3. พิมพ์ "ออกเอกสาร"

📄 อยากดูตัวอย่าง PDF จริง พิมพ์ "ตัวอย่างเอกสาร"
🏢 อยากตั้งค่าโลโก้ ที่อยู่ ภาษี หรือธนาคาร พิมพ์ "ตั้งค่าธุรกิจแบบฟอร์ม"

${getPlanSupportLines(plan)}`;
}

export function getVersionAnnouncementMessage(version = '1.1'): string {
  return `📣 EzDOC อัปเดตเป็นเวอร์ชัน ${version} แล้วครับ

รอบนี้ด๊อกๆ เก็บงานแก้บัคจากช่วงก่อนหน้า และปรับการใช้งานให้ลื่นขึ้นหลายจุด
• เปิด PDF และลิงก์เอกสารได้เสถียรขึ้น
• flow เชื่อมบัญชี เข้าสู่ระบบ และออกเอกสารลื่นขึ้น
• ปรับประสบการณ์ใน LINE ให้เริ่มใช้งานง่ายขึ้น

ถ้าเคยสะดุดก่อนหน้านี้ ตอนนี้ลองใหม่ได้เลยครับ
ด้านล่างนี้มี Welcome Card และตัวอย่างเอกสารจริงให้กดดูได้ทันที`;
}

export function buildWelcomeFlexMessage(plan: Plan = 'FREE', options: WelcomeUxOptions = {}): Record<string, unknown> {
  const { linked = false } = options;
  // Mascot hero image — DOKDOK C4 "ยินดีให้บริการกั๊บผม"
  const MASCOT_HERO_URL =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC4%E0%B8%A2%E0%B8%B4%E0%B8%99%E0%B8%94%E0%B8%B5%E0%B9%83%E0%B8%AB%E0%B9%89%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%81%E0%B8%B1%E0%B9%8A%E0%B8%9A%E0%B8%9C%E0%B8%A1.png?alt=media&token=ea588e0e-8854-47b2-9aa8-0afd58ed23fc';

  // Step row helper
  const stepRow = (emoji: string, text: string): Record<string, unknown> => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    paddingAll: '10px',
    backgroundColor: '#F9FAFB',
    cornerRadius: '8px',
    contents: [
      { type: 'text', text: emoji, size: 'md', flex: 0 },
      { type: 'text', text, size: 'sm', color: '#374151', wrap: true, flex: 1 },
    ],
  });

  // Tappable shortcut box
  const shortcutBox = (emoji: string, label: string, tapText: string): Record<string, unknown> => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    paddingAll: '12px',
    backgroundColor: '#F0FDF4',
    cornerRadius: '10px',
    action: { type: 'message', text: tapText },
    contents: [
      { type: 'text', text: emoji, size: 'lg', flex: 0 },
      {
        type: 'box', layout: 'vertical', flex: 1, contents: [
          { type: 'text', text: label, weight: 'bold', size: 'sm', color: '#065F46' },
          { type: 'text', text: `พิมพ์ "${tapText}"`, size: 'xxs', color: '#047857', margin: 'xs' },
        ],
      },
    ],
  });

  // Plan-aware hint box
  const hintBox =
    plan === 'FREE' && linked
      ? {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          paddingAll: '12px',
          backgroundColor: '#ECFDF5',
          cornerRadius: '12px',
          contents: [
            {
              type: 'text',
              text: '🎉 เชื่อมบัญชีเรียบร้อยแล้ว',
              weight: 'bold',
              size: 'sm',
              color: '#065F46',
              wrap: true,
            },
            {
              type: 'text',
              text: 'ด๊อกๆ จะช่วยจำเอกสาร ลูกค้า และข้อมูลงานของคุณไว้ให้ต่อเนื่องครับ',
              size: 'xs',
              color: '#047857',
              margin: 'sm',
              wrap: true,
            },
          ],
        }
      : plan === 'FREE'
      ? {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          paddingAll: '12px',
          backgroundColor: '#ECFDF5',
          cornerRadius: '12px',
          contents: [
            {
              type: 'text',
              text: `🎁 ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรก`,
              weight: 'bold',
              size: 'sm',
              color: '#065F46',
              wrap: true,
            },
            {
              type: 'text',
              text: '💧 เอกสารฟรีจะมีลายน้ำ EzDOC',
              size: 'xs',
              color: '#047857',
              margin: 'sm',
              wrap: true,
            },
          ],
        }
      : {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          paddingAll: '12px',
          backgroundColor: '#EFF6FF',
          cornerRadius: '12px',
          contents: [
            {
              type: 'text',
              text: '📦 ใช้งานต่อได้เลยจากปุ่มด้านล่าง',
              weight: 'bold',
              size: 'sm',
              color: '#1D4ED8',
              wrap: true,
            },
            {
              type: 'text',
              text: 'ดูแพ็ก เช็กรอบต่ออายุ หรือปรับการตั้งค่าธุรกิจได้ทันที',
              size: 'xs',
              color: '#1E40AF',
              margin: 'sm',
              wrap: true,
            },
          ],
        };

  // Plan-aware footer buttons
  const footerContents: Record<string, unknown>[] =
    plan === 'FREE'
      ? [
          // Row 1: utility buttons side by side
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              buildFooterButton('เปิดเว็บ', { type: 'uri', uri: WEB_URL }, 'secondary'),
              linked
                ? buildFooterButton('ตั้งค่าธุรกิจ', { type: 'message', text: 'ตั้งค่าธุรกิจแบบฟอร์ม' }, 'secondary')
                : buildFooterButton('เชื่อมต่อ', { type: 'message', text: 'เชื่อมต่อ' }, 'secondary'),
            ],
          },
          // Row 2: primary CTA
          buildFooterButton('ซื้อแพ็ค 99', { type: 'message', text: 'ซื้อแพ็ค 99' }, 'primary', '#0F766E'),
          buildFooterButton('ซื้อแพ็ค 279', { type: 'message', text: 'ซื้อแพ็ค 279' }, 'secondary'),
        ]
      : [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              buildFooterButton('เปิดเว็บ', { type: 'uri', uri: WEB_URL }, 'secondary'),
              buildFooterButton('ตั้งค่าธุรกิจ', { type: 'message', text: 'ตั้งค่าธุรกิจแบบฟอร์ม' }, 'secondary'),
            ],
          },
          buildFooterButton('สถานะแพ็ค', { type: 'message', text: SUBSCRIPTION_STATUS_COMMAND }, 'primary', '#1D4ED8'),
        ];

  return {
    type: 'flex',
    altText: 'เริ่มใช้ EzDOC ได้เลย',
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: MASCOT_HERO_URL,
        size: 'full',
        aspectRatio: '3:1',
        aspectMode: 'fit',
        backgroundColor: '#F0FDF4',
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        paddingBottom: '14px',
        background: {
          type: 'linearGradient',
          angle: '135deg',
          startColor: '#0F766E',
          endColor: '#1E3A5F',
        },
        contents: [
          {
            type: 'text',
            text: 'ด๊อกๆ พร้อมช่วยออกเอกสารครับ',
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
            wrap: true,
          },
          {
            type: 'text',
            text: 'ใบเสนอราคา ใบวางบิล ใบเสร็จ ครบจบใน LINE',
            size: 'xs',
            color: '#D1FAE5',
            margin: 'sm',
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          hintBox,
          // Steps section
          {
            type: 'text',
            text: 'เริ่มง่ายๆ 3 ขั้นตอน',
            weight: 'bold',
            size: 'sm',
            color: '#111827',
            margin: 'md',
          },
          stepRow('📝', 'พิมพ์ "ทำใบเสนอราคา"'),
          stepRow('📋', 'ส่งข้อมูลลูกค้าและรายการสินค้า'),
          stepRow('✅', 'พิมพ์ "ออกเอกสาร" รับ PDF ทันที'),
          // Separator
          { type: 'separator', margin: 'lg', color: '#E5E7EB' },
          // Shortcut tappable boxes
          shortcutBox('📄', 'ดูตัวอย่างเอกสาร', 'ตัวอย่างเอกสาร'),
          shortcutBox('🏢', 'ตั้งค่าธุรกิจ', 'ตั้งค่าธุรกิจแบบฟอร์ม'),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerContents,
      },
    },
  };
}

/**
 * Welcome quick reply
 */
export function getWelcomeQuickReply(plan: Plan = 'FREE', options: WelcomeUxOptions = {}): QuickReplyAction[] {
  const { linked = false } = options;
  const buttons: QuickReplyAction[] = [
    {
      type: 'action',
      action: { type: 'message', label: '📝 ทำใบเสนอราคา', text: 'ทำใบเสนอราคา' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📄 ตัวอย่างเอกสาร', text: 'ตัวอย่างเอกสาร' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '🏢 ตั้งค่าธุรกิจ', text: 'ตั้งค่าธุรกิจแบบฟอร์ม' },
    },
  ];

  if (!linked) {
    buttons.push({
      type: 'action',
      action: { type: 'message', label: '🔗 เชื่อมต่อ', text: 'เชื่อมต่อ' },
    });
  }

  if (plan === 'FREE') {
    buttons.push(getPlanPackageQuickReply(plan));
  } else {
    buttons.push({
      type: 'action',
      action: { type: 'message', label: '📦 สถานะแพ็ค', text: SUBSCRIPTION_STATUS_COMMAND },
    });
  }

  return buttons;
}

/**
 * Fallback message
 */
export function getFallbackMessage(hasActiveDraft: boolean, plan: Plan = 'FREE'): string {
  if (hasActiveDraft) {
    return `โอ๊ะ! ด๊อกๆ หลงนิดนึง แต่ร่างยังอยู่ครบครับเจ้านาย

ส่งรายการเพิ่มได้ หรือพิมพ์ "ออกเอกสาร"`;
  }

  return `อุ๊ย…สมองด๊อกๆ ตีความไม่ออก (ติ๊ดๆ เอ๋อ)
ลองส่งแบบนี้นะเจ้านาย

อาหารแมว 3000

หรือก๊อปบล็อกนี้ไปแก้ได้เลย
${getCopyEditTemplate()}

${getPlanSupportLines(plan)}`;
}

export function getNonTextMessage(hasActiveDraft: boolean): string {
  if (hasActiveDraft) {
    return `ติ๊ดๆ รับไฟล์แล้วครับ 📎
ส่งเป็นข้อความได้นะเจ้านาย เพื่อให้ด๊อกๆ เข้าใจต่อ`;
  }
  return `ติ๊ดๆ รับไฟล์แล้วครับ 📎
เริ่มทำเอกสาร ส่งข้อความแบบนี้ได้เลยเจ้านาย

ลูกค้า แมวเป้า
อาหารแมว 3000`;
}

/**
 * Item added confirmation
 */
export function getItemAddedMessage(itemName: string): string {
  return `ติ๊ดๆ เพิ่มรายการแล้วครับ ${itemName}

ส่งรายการเพิ่มได้เจ้านาย หรือพิมพ์ "ออกเอกสาร"`;
}

/**
 * Item removed confirmation
 */
export function getItemRemovedMessage(itemName: string): string {
  return `โอ๊ะ! ลบรายการแล้วครับ ${itemName}`;
}

/**
 * Item edited confirmation
 */
export function getItemEditedMessage(itemName: string): string {
  return `ติ๊ดๆ แก้ไขรายการแล้วครับ ${itemName}`;
}

/**
 * Customer set confirmation
 */
export function getCustomerSetMessage(customerName: string): string {
  return `ติ๊ดๆ ตั้งชื่อลูกค้าแล้วครับ ${customerName}`;
}

/**
 * Undo success
 */
export function getUndoSuccessMessage(): string {
  return `โอเค ด๊อกๆ ย้อนรายการล่าสุดแล้วครับเจ้านาย`;
}

/**
 * Copy-loop mode
 */
export function getCopyEditBlockMessage(block: string): string {
  return `คัดลอกบล็อกนี้แล้วแก้ข้อมูลได้เลย 👇

${block}`;
}

/**
 * Document issued message
 */
export function getDocumentIssuedMessage(docNo: string, docType: string): string {
  const docTypeNames: Record<string, string> = {
    QUO: 'ใบเสนอราคา',
    INV: 'ใบวางบิล',
    BILL: 'ใบวางบิล',
    REC: 'ใบเสร็จรับเงิน',
    RECEIPT: 'ใบเสร็จรับเงิน',
  };

  const docTypeName = docTypeNames[docType] || 'เอกสาร';
  return `ตึ๊ง! ออก${docTypeName}สำเร็จแล้วครับเจ้านาย
${docNo}
กำลังส่งไฟล์ให้ทาง LINE`;
}

/**
 * Buttons after item added (with undo)
 */
export function getButtonsAfterItemAdded(hasUndo: boolean): QuickReplyAction[] {
  const { getDraftEditorButtons } = require('../ui/quickReplies');
  return getDraftEditorButtons(hasUndo);
}

/**
 * Buttons for empty draft
 */
export function getButtonsForEmptyDraft(): QuickReplyAction[] {
  const { getEmptyDraftButtons } = require('../ui/quickReplies');
  return getEmptyDraftButtons();
}

/**
 * Buttons for draft with items
 */
export function getButtonsForDraftWithItems(hasUndo: boolean): QuickReplyAction[] {
  const { getDraftWithItemsButtons } = require('../ui/quickReplies');
  return getDraftWithItemsButtons(hasUndo);
}

/**
 * Usage guide (simple)
 */
export function getUsageGuideSimple(plan: Plan = 'FREE'): string {
  return `วิธีใช้แบบไว 📋

ก๊อปบล็อกนี้ไปแก้แล้วส่งกลับมา
${getCopyEditTemplate()}

พิมพ์ติดกันก็ได้ เช่น ลูกค้าแมวจร อาหารแมว3000
พร้อมแล้วพิมพ์ "ออกเอกสาร"

${getPlanSupportLines(plan)}`;
}

/**
 * Help summary
 */
export function getHelpSummary(plan: Plan = 'FREE'): string {
  const packageLine = plan === 'FREE'
    ? 'แพ็ก  เชื่อมต่อ / ซื้อแพ็ค 99 / ซื้อแพ็ค 279'
    : 'แพ็ค  สถานะแพ็ค / เช็คสลิป';

  return `ติ๊ดๆ ด๊อกๆ สรุปคำสั่งหลักให้เจ้านาย 📌

สร้างเอกสาร  ทำใบเสนอราคา / ทำใบวางบิล / ทำใบเสร็จ
แก้ไข  เพิ่มรายการ / ลบรายการ / แก้ไข / ยืนยัน / ยกเลิก
ธีม  ตั้งค่าธีม เขียว แดง น้ำเงิน ขาวดำ
อื่นๆ  เอกสารล่าสุด / รายงาน / สถานะแพ็ค
${packageLine}
โปรโมชัน  ใช้โค้ด / คูปอง / แนะนำเพื่อน

พิมพ์ติดกันได้ เช่น ลูกค้าแมวจร อาหารแมว3000
${getPlanSupportLines(plan)}`;
}

const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('th-TH');
};

const warningMap: Record<string, string> = {
  MISSING_CUSTOMER: 'ยังไม่ได้ระบุชื่อลูกค้า',
  NO_ITEMS: 'ยังไม่มีรายการ',
  MISSING_DOC_TYPE: 'ยังไม่ได้ระบุประเภทเอกสาร',
  AMBIGUOUS_DOC_TYPE: 'ประเภทเอกสารไม่ชัดเจน',
  TOTAL_MISMATCH: 'ยอดรวมไม่ตรงกับรายการ',
  UNPARSEABLE_DATE: 'รูปแบบวันที่ไม่ชัดเจน',
};

export function renderPostParseSummary(
  payload: DraftPayload,
  options?: {
    totalOverride?: number;
    itemCountOverride?: number;
    customerOverride?: string | null;
  }
): string {
  const customer = options?.customerOverride ?? payload.customer_name;
  const itemCount = options?.itemCountOverride ?? payload.items?.length ?? 0;
  const total = options?.totalOverride ?? payload.subtotal_candidate ?? null;
  const warnings = (payload.warnings || [])
    .map((w) => warningMap[w])
    .filter(Boolean);

  const warningText = warnings.length > 0
    ? `\n${warnings.join(', ')}`
    : '';

  const customerText = customer ? customer : '(ยังไม่ได้ระบุ)';
  const itemText = itemCount > 0 ? `${itemCount} รายการ` : '(ยังไม่มีรายการ)';

  return `สแกนเสร็จ! ด๊อกๆ เข้าใจแบบนี้นะเจ้านาย
ลูกค้า ${customerText}  ${itemText}  รวม ${formatMoney(total)}฿${warningText}

พร้อมแล้วพิมพ์ "ออกเอกสาร"`;
}

/**
 * Business setup start
 */
export function getBusinessSetupStartMessage(): string {
  return `โอเค โหมดตั้งค่าเปิดแล้ว (ติ๊ดๆ จริงจัง) เจ้านาย

ส่งข้อมูลตามลำดับนี้ (พิมพ์ทีละบรรทัดได้)
1. ชื่อธุรกิจ
2. ที่อยู่
3. เบอร์โทร
4. เลขผู้เสียภาษี (ถ้ามี)
5. อีเมล (ถ้ามี)`;
}

/**
 * Incomplete business setup
 */
export function getIncompleteBusinessSetupMessage(missingFields: string[]): { message: string } {
  const fieldNames: Record<string, string> = {
    business_name: 'ชื่อธุรกิจ',
    address: 'ที่อยู่',
    phone: 'เบอร์โทร',
  };

  const missing = missingFields.map((f) => fieldNames[f] || f).join(', ');

  return {
    message: `ติ๊ดๆ ข้อมูลธุรกิจยังไม่ครบเจ้านาย ขาด ${missing}

พิมพ์ "ตั้งค่าธุรกิจ" เพื่อกรอกต่อ`,
  };
}

/**
 * Business setup complete
 */
export function getBusinessSetupCompleteMessage(): string {
  return `บี๊บ! ด๊อกๆ ตั้งค่าธุรกิจเรียบร้อยแล้วครับเจ้านาย

ก๊อปไปแก้แล้วส่งได้เลย
${getCopyPasteTemplateBlock()}`;
}

/**
 * Business setup cancel
 */
export function getBusinessSetupCancelMessage(): string {
  return `โอเค ยกเลิกการตั้งค่าแล้วครับเจ้านาย`;
}

/**
 * Wizard validation error
 */
export function getWizardValidationError(field: string, error: string): string {
  return `ข้อมูลไม่ถูกต้อง ${error}\n\nลองระบุ${field}ใหม่นะ`;
}

/**
 * Field saved
 */
export function getFieldSavedMessage(field: string): string {
  return `ติ๊ดๆ ด๊อกๆ บันทึก${field}แล้วครับเจ้านาย ส่งข้อมูลต่อได้เลย`;
}

/**
 * Unknown command
 */
export function getUnknownCommandMessage(): string {
  return `อุ๊ย…สมองด๊อกๆ ตีความไม่ออก (ติ๊ดๆ เอ๋อ)\nลองพิมพ์ "ทำใบเสนอราคา" หรือ "เมนู" ดูนะเจ้านาย`;
}
