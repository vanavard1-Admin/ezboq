// functions/src/line/parser.ts
export type Intent =
  | 'CREATE_RECEIPT'
  | 'CREATE_INVOICE'
  | 'ADD_ITEM'
  | 'SET_CUSTOMER'
  | 'SET_DATE'
  | 'CONFIRM'
  | 'CANCEL'
  | 'UNKNOWN';

export type ParsedMessage = {
  intent: Intent;
  confidence: number; // 0-1
  entities: {
    amount?: number;
    currency?: 'THB';
    customerName?: string;
    items?: { name: string; qty?: number; price?: number }[];
    date?: string; // ISO YYYY-MM-DD
  };
  rawText: string;
};

export type Draft = {
  type?: 'RECEIPT' | 'INVOICE';
  customerName?: string;
  items: { name: string; qty: number; price: number }[];
  total?: number;
  date?: string; // ISO
  status: 'DRAFT' | 'READY';
};

function normalizeText(t: string) {
  return t.trim().replace(/\s+/g, ' ');
}

export function extractNumber(text: string): number | null {
  const cleaned = text.replace(/[,，]/g, '');
  const m = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (m) return Number(m[1]);
  return null;
}

export function parseDateSimple(text: string): string | null {
  const t = text.trim();
  const now = new Date();
  if (/วันนี้/.test(t)) {
    return now.toISOString().slice(0, 10);
  }
  if (/พรุ่งนี้/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const m = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const iso = new Date(year, month - 1, day);
    return iso.toISOString().slice(0, 10);
  }
  return null;
}

export function parseMessage(text: string): ParsedMessage {
  const t = normalizeText(text);
  if (/ยืนยัน|confirm/i.test(t)) {
    return { intent: 'CONFIRM', confidence: 0.95, entities: {}, rawText: t };
  }
  if (/ยกเลิก|ยก เลิก|cancel/i.test(t)) {
    return { intent: 'CANCEL', confidence: 0.95, entities: {}, rawText: t };
  }
  const cust = t.match(/ลูกค้า(?:ชื่อ|:)\s*(.+)$/);
  if (cust) {
    return {
      intent: 'SET_CUSTOMER',
      confidence: 0.9,
      entities: { customerName: cust[1].trim() },
      rawText: t,
    };
  }
  if (/วันนี้|พรุ่งนี้|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(t)) {
    const dt = parseDateSimple(t);
    return {
      intent: 'SET_DATE',
      confidence: dt ? 0.9 : 0.6,
      entities: dt ? { date: dt } : {},
      rawText: t,
    };
  }
  if (/ออกใบเสร็จ|ทำใบเสร็จ|ออกใบเสน|ออกใบวางบิล|ทำใบเสนอ/i.test(t)) {
    const amt = extractNumber(t);
    const isReceipt = /เสร็จ/i.test(t);
    return {
      intent: isReceipt ? 'CREATE_RECEIPT' : 'CREATE_INVOICE',
      confidence: amt ? 0.85 : 0.6,
      entities: amt ? { amount: amt, currency: 'THB' } : {},
      rawText: t,
    };
  }
  {
    const m = t.match(/^(?:เพิ่ม|add)\s+(.+?)\s+(\d+)?\s*(?:หน่วย|ชิ้น|วัน)?\s*([0-9]+(?:\.[0-9]+)?)?\s*$/i);
    if (m) {
      const name = m[1].trim();
      const qty = m[2] ? Number(m[2]) : undefined;
      const price = m[3] ? Number(m[3]) : undefined;
      return {
        intent: 'ADD_ITEM',
        confidence: 0.85,
        entities: { items: [{ name, qty: qty ?? 1, price }] },
        rawText: t,
      };
    }
  }
  const maybeAmt = extractNumber(t);
  if (maybeAmt) {
    return {
      intent: 'CREATE_RECEIPT',
      confidence: 0.5,
      entities: { amount: maybeAmt, currency: 'THB' },
      rawText: t,
    };
  }
  return { intent: 'UNKNOWN', confidence: 0.2, entities: {}, rawText: t };
}

export function applyParsedToDraft(draft: Draft, parsed: ParsedMessage): { draft: Draft; changed: boolean } {
  let changed = false;
  switch (parsed.intent) {
    case 'CREATE_RECEIPT':
      if (!draft.type) { draft.type = 'RECEIPT'; changed = true; }
      if (parsed.entities.amount != null) {
        if (draft.items.length === 0) {
          draft.items.push({ name: 'ยอดรวม', qty: 1, price: parsed.entities.amount });
          changed = true;
        } else {
          changed = true;
        }
      }
      break;
    case 'CREATE_INVOICE':
      if (!draft.type) { draft.type = 'INVOICE'; changed = true; }
      if (parsed.entities.amount != null && draft.items.length === 0) {
        draft.items.push({ name: 'ยอดรวม', qty: 1, price: parsed.entities.amount });
        changed = true;
      }
      break;
    case 'ADD_ITEM':
      if (parsed.entities.items) {
        for (const it of parsed.entities.items) {
          const qty = it.qty ?? 1;
          const price = it.price ?? 0;
          draft.items.push({ name: it.name, qty, price });
          changed = true;
        }
      }
      break;
    case 'SET_CUSTOMER':
      if (parsed.entities.customerName) {
        draft.customerName = parsed.entities.customerName;
        changed = true;
      }
      break;
    case 'SET_DATE':
      if (parsed.entities.date) {
        draft.date = parsed.entities.date;
        changed = true;
      }
      break;
    case 'CONFIRM':
    case 'CANCEL':
    case 'UNKNOWN':
      break;
  }
  const total = draft.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
  draft.total = total;
  draft.status = total && draft.items.length > 0 ? 'READY' : 'DRAFT';
  return { draft, changed };
}

export function generateDraftSummary(draft: Draft): string {
  const lines: string[] = [];
  const typeText = draft.type === 'RECEIPT' ? 'ใบเสร็จ' : draft.type === 'INVOICE' ? 'ใบแจ้งหนี้' : 'ร่างเอกสาร';
  lines.push(`🧾 ${typeText} (ร่าง)`);
  if (draft.customerName) lines.push(`ลูกค้า ${draft.customerName}`);
  if (draft.date) lines.push(`วันที่ ${draft.date}`);
  if (draft.items.length) {
    lines.push(`รายการ`);
    for (const it of draft.items) {
      lines.push(`  - ${it.name} x${it.qty} @ ${it.price ?? 0} = ${(it.price ?? 0) * (it.qty ?? 1)}`);
    }
  }
  lines.push(`ยอดรวม ${draft.total ?? 0} บาท`);
  return lines.join('\n');
}
