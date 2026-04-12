/**
 * Human-First UX Draft Renderer
 *
 * Goals:
 * - Human-first: ผู้ใช้พิมพ์อะไรก็ได้ ระบบพยายาม parse และตอบกลับด้วยความมั่นใจ
 * - ลดความงง: มี "สอนแบบละเอียด" ในจังหวะที่เหมาะสม (เริ่มเอกสาร / ambiguous / ยังไม่พร้อม)
 * - ข้อความสรุปชัด: customer, items (last N), total, readiness hints
 *
 * Notes:
 * - Renderer นี้ "ไม่รู้" เรื่อง parsing/intent โดยตรง
 * - ให้ caller ส่ง context ที่จำเป็น (state, isAmbiguous, lastActionHint ฯลฯ)
 */

import type { LineDraft } from './draftStore';
import { HumanFirstState } from './humanFirstStateMachine';

export type HumanFirstDocType = 'QUO' | 'BILL' | 'RECEIPT';

export type RenderPolicy = {
  /**
   * จำนวนรายการที่แสดงใน summary (ท้ายสุด)
   * default: 5
   */
  maxItemsToShow?: number;

  /**
   * แสดงคำสอนแบบละเอียดเมื่อ:
   * - start document (state=IDLE)
   * - isAmbiguous=true
   * - draft ไม่พร้อม (ขาดลูกค้า หรือ ขาดรายการ)
   *
   * ถ้าต้องการ override policy ทั้งหมด:
   * - forceDetailed=true จะบังคับแสดง detailed
   * - forceShort=true จะบังคับแสดง short hint
   */
  forceDetailed?: boolean;
  forceShort?: boolean;

  /**
   * ข้อความแนะนำ "ตัวอย่าง" จะเลือกตาม docType
   * แต่คุณสามารถ override ได้ด้วย customExamples
   */
  customExamples?: Partial<Record<HumanFirstDocType, string[]>>;

  /**
   * ถ้าต้องการจำกัดความยาวข้อความส่วน guidance (กันยาวเกิน)
   * default: 900 chars (โดยประมาณ ไม่ตัดคำแบบ smart)
   */
  maxGuidanceChars?: number;
};

export type RenderContext = {
  docType: HumanFirstDocType;
  state: HumanFirstState;

  /**
   * บอก renderer ว่าข้อความล่าสุด ambiguous / confidence ต่ำหรือไม่
   * เพื่อเปิดโหมดสอนละเอียด + ตัวเลือกที่ชัด
   */
  isAmbiguous?: boolean;

  /**
   * Optional: ใช้ปรับ hint ให้ตรงกับสิ่งที่ระบบทำล่าสุด
   * เช่น "เพิ่มรายการแล้ว", "ตั้งลูกค้าแล้ว", "ลบรายการล่าสุดแล้ว"
   */
  lastActionHint?: string;

  /**
   * Optional: ใช้ระบุว่า user เพิ่งเริ่มเอกสารหรือไม่ (บางระบบ state อาจยังไม่ IDLE)
   * ถ้า true จะทำให้ shouldShowDetailed เป็นจริง
   */
  isStartMessage?: boolean;
};

export type RenderResult = {
  text: string;

  /** ว่าครั้งนี้ renderer เลือกแสดงคำสอนแบบละเอียดหรือไม่ */
  showDetailed: boolean;

  /** list สิ่งที่ยังขาดก่อน "ออกเอกสาร" */
  missing: Array<'CUSTOMER' | 'ITEMS'>;
};

const DEFAULT_POLICY: Required<Pick<RenderPolicy, 'maxItemsToShow' | 'maxGuidanceChars'>> = {
  maxItemsToShow: 5,
  maxGuidanceChars: 900,
};

// ---------- Formatting helpers ----------

const moneyTH = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
function formatMoneyTH(value: number | undefined | null): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${moneyTH.format(Math.round(n))} บาท`;
}

function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  // กัน newline ป่วน summary
  return String(input).replace(/\s+/g, ' ').trim();
}

function getDocTypeLabel(docType: HumanFirstDocType): string {
  switch (docType) {
    case 'QUO':
      return '📋 ใบเสนอราคา (ร่าง)';
    case 'BILL':
      return '🧾 ใบวางบิล (ร่าง)';
    case 'RECEIPT':
      return '💰 ใบเสร็จ (ร่าง)';
    default:
      return '📄 เอกสาร (ร่าง)';
  }
}

function getReadiness(draft: LineDraft): { hasCustomer: boolean; hasItems: boolean; missing: RenderResult['missing'] } {
  const hasCustomer = Boolean(draft.customerName && sanitizeText(draft.customerName).length > 0);
  const hasItems = Array.isArray(draft.items) && draft.items.length > 0;

  const missing: RenderResult['missing'] = [];
  if (!hasCustomer) missing.push('CUSTOMER');
  if (!hasItems) missing.push('ITEMS');

  return { hasCustomer, hasItems, missing };
}

function renderItemsBlock(draft: LineDraft, maxItemsToShow: number): string[] {
  const lines: string[] = [];
  const items = Array.isArray(draft.items) ? draft.items : [];

  if (items.length === 0) {
    lines.push('รายการ: (ยังไม่มีรายการ)');
    return lines;
  }

  lines.push('รายการ:');

  const slice = items.slice(-Math.max(1, maxItemsToShow));
  for (const item of slice) {
    const name = sanitizeText(item.name) || '(ไม่มีชื่อรายการ)';
    const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1;
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;

    if (qty > 1) {
      const lineTotal = price * qty;
      lines.push(`- ${name} x${qty} = ${formatMoneyTH(lineTotal)}`);
    } else {
      lines.push(`- ${name} ${formatMoneyTH(price)}`);
    }
  }

  if (items.length > slice.length) {
    lines.push(`... และอีก ${items.length - slice.length} รายการ`);
  }

  return lines;
}

function getExamples(docType: HumanFirstDocType, policy?: RenderPolicy): string[] {
  const custom = policy?.customExamples?.[docType];
  if (Array.isArray(custom) && custom.length > 0) return custom;

  if (docType === 'QUO') {
    return [
      'ลูกค้า บจก. ABC',
      'บริการออกแบบ 1 5000',
      'ออกเอกสาร',
    ];
  }
  if (docType === 'BILL') {
    return [
      'ลูกค้า บจก. ABC',
      'งวดงาน 1 25000',
      'ออกเอกสาร',
    ];
  }
  // RECEIPT
  return [
    'ใบเสร็จจากใบวางบิล INV-xxxx',
    'รับเงินแล้ว 25000',
    'ออกเอกสาร',
  ];
}

/**
 * ✅ Get document chain guidance text based on docType
 */
function getChainGuidance(docType: HumanFirstDocType, isReady: boolean): string[] {
  const lines: string[] = [];
  
  if (!isReady) {
    // Not ready yet - show chain info in one line
    lines.push('💡 ใบวางบิลทำต่อจากใบเสนอราคา, ใบเสร็จทำต่อจากใบวางบิล');
    return lines;
  }
  
  if (docType === 'QUO') {
    lines.push('พิมพ์ "ออกเอกสาร" เพื่อออกใบเสนอราคา');
    lines.push('หรือพิมพ์ "ทำใบวางบิลจากใบเสนอราคา" เมื่อต้องการวางบิลต่อ');
  } else if (docType === 'BILL') {
    lines.push('พิมพ์ "ออกเอกสาร" เพื่อออกใบวางบิล');
    lines.push('หรือพิมพ์ "ทำใบเสร็จจากใบวางบิล" เมื่อต้องการออกใบเสร็จ');
  }
  // RECEIPT: No chain guidance (end of chain)
  
  return lines;
}

// ---------- Summary renderer ----------

/**
 * Render draft summary (human-first format)
 * Always shows: type, customer, items (last N), total
 */
export function renderDraftSummary(draft: LineDraft, policy?: RenderPolicy): string {
  const { maxItemsToShow } = { ...DEFAULT_POLICY, ...policy };

  const lines: string[] = [];
  lines.push(getDocTypeLabel(draft.docType as HumanFirstDocType));
  lines.push('');

  // Customer
  const customer = sanitizeText(draft.customerName);
  lines.push(customer ? `ลูกค้า: ${customer}` : 'ลูกค้า: (ยังไม่ได้ระบุ)');

  // Items
  lines.push(...renderItemsBlock(draft, maxItemsToShow));

  lines.push('');

  // Total
  lines.push(`รวม: ${formatMoneyTH(draft.total)}`);

  return lines.join('\n');
}

// ---------- Guidance renderer ----------

/**
 * Decide whether to show detailed guidance
 */
export function shouldShowDetailedGuidance(
  ctx: RenderContext,
  draft?: LineDraft | null,
  policy?: RenderPolicy
): boolean {
  if (policy?.forceDetailed) return true;
  if (policy?.forceShort) return false;

  // Start doc: either explicit or state=IDLE
  if (ctx.isStartMessage || ctx.state === HumanFirstState.IDLE) return true;

  // Ambiguous parse -> show detailed guidance
  if (ctx.isAmbiguous) return true;

  // If we have a draft, show detailed when not ready
  if (draft) {
    const { hasCustomer, hasItems } = getReadiness(draft);
    if (!hasCustomer || !hasItems) return true;
  }

  return false;
}

/**
 * Render next steps guidance (human-first teaching format)
 * - Detailed: "ทำได้ 3 อย่าง" + examples + reassurance
 * - Short: one-line hint only
 */
export function renderNextSteps(
  draft: LineDraft | null,
  ctx: RenderContext,
  policy?: RenderPolicy
): { text: string; showDetailed: boolean; missing: RenderResult['missing'] } {
  const merged = { ...DEFAULT_POLICY, ...policy };
  const docType = (draft?.docType ?? ctx.docType) as HumanFirstDocType;

  const readiness = draft ? getReadiness(draft) : { hasCustomer: false, hasItems: false, missing: ['CUSTOMER', 'ITEMS'] as RenderResult['missing'] };
  const showDetailed = shouldShowDetailedGuidance(ctx, draft, policy);

  const lines: string[] = [];

  // Optional: last action hint (ช่วยลดงงว่าระบบทำอะไรให้แล้ว)
  const actionHint = sanitizeText(ctx.lastActionHint);
  if (actionHint) {
    lines.push(actionHint);
    lines.push('');
  }

  if (showDetailed) {
    // If ambiguous, lead with a tighter disambiguation header (แต่ไม่ทำให้ผู้ใช้รู้สึกผิด)
    if (ctx.isAmbiguous) {
      lines.push('ด๊อกๆ ยังไม่มั่นใจว่าหมายถึงอะไร ลองพิมพ์แบบใดแบบหนึ่งด้านล่างนี้ได้เลย:');
      lines.push('');
    } else {
      lines.push('ตอนนี้พิมพ์ได้ 3 แบบ:');
      lines.push('');
    }

    lines.push('1) ตั้งลูกค้า');
    lines.push('2) เพิ่มรายการ');
    lines.push('3) ออกเอกสาร');
    lines.push('');

    // Readiness checklist (บอกให้รู้ว่าขาดอะไร)
    if (draft) {
      const missingBits: string[] = [];
      if (!readiness.hasCustomer) missingBits.push('ยังไม่มีลูกค้า');
      if (!readiness.hasItems) missingBits.push('ยังไม่มีรายการ');
      if (missingBits.length > 0) {
        lines.push(`สถานะ: ${missingBits.join(' / ')}`);
        lines.push('');
      }
    }

    lines.push('ตัวอย่าง:');
    lines.push(...getExamples(docType, policy));
    lines.push('');

    // Reassurance: ยัง human-first ไม่บังคับ syntax
    lines.push('พิมพ์แบบธรรมดาก็ได้ เช่น "บริษัท ABC" หรือ "อาหารแมว 3000" ระบบจะพยายามจัดให้เอง');
    
    // ✅ Add chain guidance in ALL states (not just when ready)
    lines.push('');
    if (draft && readiness.hasCustomer && readiness.hasItems) {
      lines.push(...getChainGuidance(docType, true));
    } else {
      // Show chain info even when not ready (so users know the workflow)
      lines.push(...getChainGuidance(docType, false));
    }
  } else {
    // Short hints only
    if (draft) {
      if (readiness.hasCustomer && readiness.hasItems) {
        lines.push('พิมพ์ "ออกเอกสาร" เมื่อพร้อม');
        // ✅ Add chain guidance for ready drafts
        const chainLines = getChainGuidance(docType, true);
        if (chainLines.length > 0) {
          lines.push('');
          lines.push(...chainLines);
        }
      } else if (!readiness.hasCustomer) {
        lines.push('พิมพ์ชื่อลูกค้า หรือพิมพ์รายการ + ราคา');
        // ✅ Show chain info even when not ready
        lines.push('');
        lines.push(...getChainGuidance(docType, false));
      } else {
        lines.push('พิมพ์รายการ + ราคา เช่น "บริการ 5000"');
        // ✅ Show chain info even when not ready
        lines.push('');
        lines.push(...getChainGuidance(docType, false));
      }
    } else {
      lines.push('พิมพ์ "ทำใบเสนอราคา" / "ทำใบวางบิล" / "ทำใบเสร็จ" เพื่อเริ่มต้น');
      // ✅ Add chain info for idle state
      lines.push('');
      lines.push(...getChainGuidance(docType, false));
    }
  }

  // Soft trim guidance length (กันหลุดยาวเกิน)
  let text = lines.join('\n');
  if (text.length > merged.maxGuidanceChars) {
    text = text.slice(0, merged.maxGuidanceChars - 1).trimEnd() + '…';
  }

  return { text, showDetailed, missing: readiness.missing };
}

/**
 * Render ambiguity-specific guidance (ใช้เมื่อ parser confidence ต่ำมาก)
 * ให้เป็น "ตัวเลือก" ชัด ๆ แต่สั้น และไม่ถามซ้อนหลายข้อ
 */
export function renderAmbiguousGuidance(docType: HumanFirstDocType, policy?: RenderPolicy): string {
  const lines: string[] = [];
  lines.push('ไม่แน่ใจว่าคุณหมายถึงอะไร เลือกพิมพ์แบบใดแบบหนึ่ง:');
  lines.push('');
  lines.push('- ตั้งลูกค้า: ลูกค้า <ชื่อ>');
  lines.push('- เพิ่มรายการ: <ชื่อรายการ> <ราคา> เช่น อาหารแมว 3000');
  if (docType === 'RECEIPT') {
    lines.push('- ทำใบเสร็จจากใบวางบิล: ใบเสร็จจากใบวางบิล INV-xxxx');
  }
  lines.push('- พร้อมแล้ว: ออกเอกสาร');

  // Optional: trim
  const merged = { ...DEFAULT_POLICY, ...policy };
  let text = lines.join('\n');
  if (text.length > merged.maxGuidanceChars) {
    text = text.slice(0, merged.maxGuidanceChars - 1).trimEnd() + '…';
  }
  return text;
}

/**
 * Convenience API:
 * Compose a full human-first reply body:
 * - Summary
 * - Spacer
 * - Next steps guidance
 */
export function renderHumanFirstReply(
  draft: LineDraft | null,
  ctx: RenderContext,
  policy?: RenderPolicy
): RenderResult {
  const parts: string[] = [];

  if (draft) {
    parts.push(renderDraftSummary(draft, policy));
  } else {
    // No draft yet: keep it minimal but helpful
    parts.push('ยังไม่มีเอกสารร่างในตอนนี้');
  }

  parts.push('');
  const next = renderNextSteps(draft, ctx, policy);
  parts.push(next.text);

  return {
    text: parts.join('\n'),
    showDetailed: next.showDetailed,
    missing: next.missing,
  };
}
