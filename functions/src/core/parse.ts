/**
 * Thai Text Parser for EzDoc
 * Parse user messages into structured DraftPayload
 *
 * Production+++ upgrades:
 * - Fix numeric parsing (avoid "บาท" -> 0 bug)
 * - Make total/discount/extra parsing actually work (extract number from text)
 * - Prevent business_hint from accidentally capturing "ลูกค้า ..."
 * - Support explicit "ประเภทเอกสาร ..." line (reduces ambiguity)
 * - Default date = today (Asia/Bangkok) if userไม่ใส่วันที่ (ลดหลุด flow)
 * - Safer bilingual split: only treat "TH / EN" when slash has spaces around it
 *
 * Colon rule (All-or-Nothing):
 * - If EVERY line contains ":" => colon-mode
 * - Otherwise => remove ":" from all lines and parse in no-colon mode
 */

import { DraftPayload, DocType, ParsedItem, PaymentMilestone, PriceType } from '../shared/types';

/**
 * Strict number parsing (token-level): "800", "800.50", "1,200", "฿800"
 * Returns null if token is not a pure number after cleaning.
 */
const toNumStrict = (s: string): number | null => {
    const cleaned = s.replace(/[฿,บาท\s]/g, '').trim();
    if (!cleaned) return null;
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
};

/**
 * Loose number parsing (line-level): "รวม 800 บาท", "ส่วนลด 100", "ค่าส่ง 50"
 * Extracts the last numeric group in the string.
 */
const toNumLoose = (s: string): number | null => {
    const cleaned = s.replace(/,/g, '');
    const matches = cleaned.match(/-?\d+(\.\d+)?/g);
    if (!matches || matches.length === 0) return null;
    const last = matches[matches.length - 1];
    const n = Number(last);
    return Number.isFinite(n) ? n : null;
};

/**
 * Normalize a line of text
 */
const normalizeLine = (line: string): string => {
    return normalizeMultiplierText(line)
        .replace(/^[\s•\-*—]+/g, '') // strip bullets/dashes
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Sanitize raw input before parsing
 */
const sanitizeInput = (input: string): string => {
    const normalized = input
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[：]/g, ':');
    return normalizeOneLineInput(normalized);
};

/**
 * Normalize multiplier formats: 2×200, 2x200, 2 x 200 -> "2 x 200"
 */
const normalizeMultiplierText = (text: string): string => {
    return text.replace(/(\d)\s*[x×]\s*(\d)/gi, '$1 x $2');
};

/**
 * Ignore pure noise lines (emoji/symbols only)
 */
const isNoiseLine = (line: string): boolean => {
    if (!/[A-Za-z0-9\u0E00-\u0E7F]/.test(line)) return true;
    return isGuidanceLine(line);
};

const isGuidanceLine = (line: string): boolean => {
    const cleaned = line.trim().toLowerCase();
    if (/^\d+\)\s*/.test(cleaned)) return true;
    if (/^สถานะ[:：]/.test(cleaned)) return true;
    if (/(ร่าง)/.test(cleaned)) return true;
    return /^(พิมพ์|พร้อมแล้วพิมพ์|ตัวอย่าง|ส่งข้อมูลได้เลย|รับทราบ|เริ่มทำ|เริ่มได้เลย|ก๊อป-แก้-ส่ง|ตอนนี้พิมพ์ได้|บอทจะสรุป|ด๊อก|ติ๊ด|บี๊บ|หรือพิมพ์|ถ้าต้องการ|เพื่อเริ่ม|เพื่อออกเอกสาร|วิธีใช้|ใบวางบิลทำต่อจาก|ใบเสร็จทำต่อจาก)/.test(cleaned);
};

const normalizeOneLineInput = (input: string): string => {
    if (!/[|｜]/.test(input)) return input;
    // Avoid breaking subject "TH | EN"
    if (/\ben\s*:/i.test(input)) return input;
    const parts = input.split(/[|｜]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return input;
    const keywordRe = /(ลูกค้า|รายการ|ประเภทเอกสาร|หมายเหตุ|วันที่|ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ทำใบ)/i;
    const score = parts.filter((p) => keywordRe.test(p) || /\d/.test(p)).length;
    return score >= 2 ? parts.join('\n') : input;
};

/**
 * Bangkok-local "today" in YYYY-MM-DD
 */
function getBangkokTodayISO(): string {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return fmt.format(new Date()); // en-CA => YYYY-MM-DD
}

/**
 * Detect doc type from value text (explicit line)
 */
function detectDocTypeFromValue(value: string): DocType | null {
    const v = value.toLowerCase();

    const has = (kw: string[]) => kw.some((k) => v.includes(k));

    if (
        has(['ใบเสนอราคา', 'เสนอราคา', 'quotation', 'quo'])
    ) return 'QUO';

    if (
        has(['ใบวางบิล', 'วางบิล', 'billing', 'bill', 'inv'])
    ) return 'BILL';

    if (
        has(['ใบเสร็จ', 'receipt', 'ชำระแล้ว', 'rec'])
    ) return 'RECEIPT';

    return null;
}

/**
 * Detect document type from overall text (fallback)
 */
function detectDocType(lines: string[]): { doc_type?: DocType; warning?: string } {
    const text = lines.join('\n').toLowerCase();

    const hit = (kw: string[]) => kw.some((k) => text.includes(k));

    const quo = hit(['ทำใบเสนอราคา', 'ใบเสนอราคา', 'เสนอราคา', 'quotation']);
    const bill = hit(['ทำใบวางบิล', 'ใบวางบิล', 'วางบิล', 'billing note', 'billing']);
    const rec = hit(['ทำใบเสร็จ', 'ใบเสร็จ', 'receipt', 'ชำระแล้ว']);

    const count = [quo, bill, rec].filter(Boolean).length;

    if (count === 0) return { warning: 'MISSING_DOC_TYPE' };
    if (count > 1) return { warning: 'AMBIGUOUS_DOC_TYPE' };

    if (quo) return { doc_type: 'QUO' };
    if (bill) return { doc_type: 'BILL' };
    return { doc_type: 'RECEIPT' };
}

/**
 * Parse Thai date format to ISO
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY
 * - YYYY-MM-DD
 * - DD เดือน YYYY (Thai month names)
 * Converts BE -> AD if year >= 2400
 */
function parseDateThai(raw: string): { iso?: string; warning?: string } {
    const s = raw.trim();

    // Pattern: YYYY-MM-DD
    const m0 = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m0) {
        const yy = Number(m0[1]);
        const mm = Number(m0[2]);
        const dd = Number(m0[3]);
        const ad = yy >= 2400 ? yy - 543 : yy;
        const iso = `${String(ad).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        return { iso };
    }

    // Pattern: DD/MM/YYYY or DD-MM-YYYY
    const m1 = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m1) {
        const dd = Number(m1[1]);
        const mm = Number(m1[2]);
        const yy = Number(m1[3]);
        const ad = yy >= 2400 ? yy - 543 : yy;
        const iso = `${String(ad).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        return { iso };
    }

    // Pattern: DD เดือน YYYY
    const months: Record<string, number> = {
        'มกราคม': 1,
        'กุมภาพันธ์': 2,
        'มีนาคม': 3,
        'เมษายน': 4,
        'พฤษภาคม': 5,
        'มิถุนายน': 6,
        'กรกฎาคม': 7,
        'สิงหาคม': 8,
        'กันยายน': 9,
        'ตุลาคม': 10,
        'พฤศจิกายน': 11,
        'ธันวาคม': 12,
    };

    const m2 = s.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
    if (m2 && months[m2[2]]) {
        const dd = Number(m2[1]);
        const mm = months[m2[2]];
        const yy = Number(m2[3]);
        const ad = yy >= 2400 ? yy - 543 : yy;
        const iso = `${String(ad).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        return { iso };
    }

    return { warning: 'UNPARSEABLE_DATE' };
}

/**
 * Parse a line of text into a ParsedItem
 */
function parseItemLine(line: string): ParsedItem | null {
    const normalizedLine = normalizeMultiplierText(line);
    const strippedLine = normalizedLine.replace(/^\s*\d+\s*[.)]\s*/g, '').trim();
    const lower = strippedLine.toLowerCase();

    // Skip pure labels/header lines
    if (/^(รายการ|รายการ[:：]?|หมายเหตุ|หมายเหตุ[:：]?|ลูกค้า[:：]?|customer|bill to)/i.test(lower)) {
        return null;
    }

    // Bilingual split ONLY if user uses " TH / EN " with spaces
    let description_th = strippedLine;
    let description_en: string | null = null;

    const slash = strippedLine.split(/\s\/\s/).map((s) => s.trim());
    if (slash.length === 2) {
        description_th = slash[0];
        description_en = slash[1];
    }

    const tokens = description_th.split(' ').filter(Boolean);
    if (tokens.length < 2) return null;

    // Pattern X: desc qty x unit_price
    const xIndex = tokens.findIndex((t) => t.toLowerCase() === 'x');
    if (xIndex > 0 && xIndex < tokens.length - 1) {
        const qty = toNumStrict(tokens[xIndex - 1] || '');
        const unit_price = toNumStrict(tokens[xIndex + 1] || '');
        if (qty !== null && unit_price !== null) {
            const desc = tokens.slice(0, xIndex - 1).join(' ');
            const amount = qty * unit_price;
            return {
                description_th: (desc || description_th).trim(),
                description_en,
                qty,
                unit: 'งาน',
                unit_price,
                amount,
            };
        }
    }

    // Amount = last numeric token (strict) or smarter extraction from price cues
    const hasPriceCue = /บาท|฿|ราคา/i.test(lower);
    const extractAmountFromPriceCue = (raw: string): number | null => {
        const explicitPriceMatch = raw.match(/ราคา\s*([0-9,]+(?:\.\d+)?)/i);
        if (explicitPriceMatch) {
            return toNumStrict(explicitPriceMatch[1] || '');
        }

        const amountBeforeBahtMatches = Array.from(raw.matchAll(/([0-9,]+(?:\.\d+)?)\s*บาท/gi));
        if (amountBeforeBahtMatches.length > 0) {
            const lastMatch = amountBeforeBahtMatches[amountBeforeBahtMatches.length - 1];
            return toNumStrict(lastMatch[1] || '');
        }

        const amountAfterCurrencyMatches = Array.from(raw.matchAll(/฿\s*([0-9,]+(?:\.\d+)?)/gi));
        if (amountAfterCurrencyMatches.length > 0) {
            const lastMatch = amountAfterCurrencyMatches[amountAfterCurrencyMatches.length - 1];
            return toNumStrict(lastMatch[1] || '');
        }

        return toNumLoose(raw);
    };

    let amount = toNumStrict(tokens[tokens.length - 1] || '');
    if (amount === null && hasPriceCue) {
        amount = extractAmountFromPriceCue(strippedLine);
    }
    if (amount === null) return null;

    // Try to detect qty + unit near the end (e.g., "20 จุด")
    const unitCandidates = new Set([
        'จุด',
        'งาน',
        'ชิ้น',
        'บ๊อก',
        'ชุด',
        'ครั้ง',
        'เมตร',
        'ตร.ม.',
        'ตรม',
    ]);
    let qty: number | null = null;
    let unit: string | null = null;
    let qtyIndex = -1;
    for (let i = 0; i < tokens.length - 1; i += 1) {
        const n = toNumStrict(tokens[i] || '');
        const rawUnit = tokens[i + 1] || '';
        const cleanedUnit = rawUnit.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, '').toLowerCase();
        if (n !== null && unitCandidates.has(cleanedUnit)) {
            qty = n;
            unit = cleanedUnit;
            qtyIndex = i;
            break;
        }
    }
    if (qty !== null && unit) {
        const desc = tokens
            .slice(0, qtyIndex)
            .join(' ')
            .replace(/\s*จำนวน$/i, '')
            .trim();
        const unit_price = qty > 0 ? amount / qty : amount;
        return {
            description_th: (desc || description_th).trim(),
            description_en,
            qty,
            unit,
            unit_price: Number.isFinite(unit_price) ? unit_price : amount,
            amount,
        };
    }

    // Pattern B: desc amount
    const desc = tokens.slice(0, -1).join(' ').trim();
    return {
        description_th: (desc || description_th).trim(),
        description_en,
        qty: 1,
        unit: 'งาน',
        unit_price: amount,
        amount,
    };
}

const parseLumpSumAmount = (line: string): number | null => {
    const match = line.match(/(?:ราคาเหมา|ราคาเหมารวม|มูลค่างานเหมารวม|มูลค่างาน|เหมารวม|ราคา\s*เหมา)\s*([0-9,]+(?:\.\d+)?)/i);
    if (!match) return null;
    return toNumLoose(match[0]);
};

const parseMilestoneLine = (line: string): PaymentMilestone | null => {
    const normalized = line.replace(/฿/g, '').trim();
    if (!normalized) return null;

    const labelMatch = normalized.match(/งวด\s*ที่?\s*(\d+)/i);
    const label = labelMatch ? `งวดที่ ${labelMatch[1]}` : null;

    const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
    const percent = percentMatch ? Number(percentMatch[1]) : null;

    const numbers = (normalized.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
    let amount: number | null = null;
    if (numbers.length > 0) {
        const candidate = numbers[numbers.length - 1];
        if (!percent || candidate !== percent) {
            amount = candidate;
        }
    }

    const note = normalized
        .replace(/งวด\s*ที่?\s*\d+/i, '')
        .replace(/(\d+(?:\.\d+)?)\s*%/g, '')
        .replace(/\d+(?:\.\d+)?/g, '')
        .replace(/[^\u0E00-\u0E7F\w\s-]/g, '')
        .trim();

    if (!label && percent === null && amount === null && !note) return null;

    return {
        label,
        percent,
        amount,
        note: note || null,
    };
};

/**
 * Helper: avoid capturing known label lines as business_hint
 */
function isReservedLabelLine(line: string): boolean {
    const l = line.toLowerCase();

    // common headers / labels in our copy-first templates
    const prefixes = [
        'ลูกค้า',
        'ชื่อลูกค้า',
        'ชื่อลูกค้านิติบุคคล',
        'ชื่อลูกค้า (นิติบุคคล)',
        'ชื่อบริษัทลูกค้า',
        'ชื่อนิติบุคคล',
        'บริษัทลูกค้า',
        'เลขผู้เสียภาษีลูกค้า',
        'เลขประจำตัวผู้เสียภาษีลูกค้า',
        'เลขภาษีลูกค้า',
        'สาขา',
        'สาขาลูกค้า',
        'ผู้ติดต่อ',
        'ที่อยู่ลูกค้า',
        'customer',
        'bill to',
        'ออกให้',
        'วันที่',
        'date',
        'เรื่อง',
        'งาน',
        'subject',
        'service',
        'รายละเอียด',
        'รายการ',
        'ประเภทเอกสาร',
        'เอกสาร',
        'doc type',
        'หมายเหตุ',
        'note',
        'รวม',
        'total',
        'ส่วนลด',
        'discount',
        'ค่าส่ง',
        'ค่าเดินทาง',
        'vat',
        'wht',
        'withholding',
        'หัก',
    ];

    return prefixes.some((p) => l.startsWith(p));
}

/**
 * Main parser: Convert Thai text input to structured DraftPayload
 *
 * @param input - Raw text from LINE message
 * @returns Structured draft payload with warnings
 */
export function parseEzDocText(input: string): DraftPayload {
    const sanitizedInput = sanitizeInput(input);
    const rawLines = sanitizedInput
        .split('\n')
        .map(normalizeLine)
        .filter((l) => l.length > 0)
        .filter((l) => !isNoiseLine(l));

    const allHaveColon =
        rawLines.length > 0 && rawLines.every((l) => l.includes(':'));

    // All-or-Nothing colon normalization
    const lines = allHaveColon
        ? rawLines
        : rawLines.map((l) => l.replace(/:/g, ''));

    const warnings: string[] = [];

    // Extract business hint from first line (only if it's NOT a known label line)
    let business_hint: string | null = null;
    if (lines[0] && !lines[0].startsWith('ทำใบ') && lines[0].length <= 30) {
        if (!isReservedLabelLine(lines[0])) {
            business_hint = lines[0];
        }
    }

    // Initialize fields
    let customer_name: string | null = null;
    let customer_legal_name: string | null = null;
    let customer_tax_id: string | null = null;
    let customer_branch: string | null = null;
    let customer_address: string | null = null;
    let customer_contact_name: string | null = null;
    let issue_date_raw: string | null = null;
    let issue_date_iso: string | null = null;
    let subject_th: string | null = null;
    let subject_en: string | null = null;
    let price_type: PriceType | null = null;
    let lump_sum_amount: number | null = null;
    const scope_of_work: string[] = [];
    const payment_milestones: PaymentMilestone[] = [];
    const notes: string[] = [];

    let discount_amount = 0;
    let extra_fee_amount = 0;
    let vat_enabled: boolean | null = null;
    let vat_rate: number | null = null;
    let wht_enabled: boolean | null = null;
    let wht_rate: number | null = null;
    let total_hint: number | null = null;

    const items: ParsedItem[] = [];

    // Explicit doc type (from a dedicated line)
    let explicit_doc_type: DocType | null = null;

    // Parse each line
    let pendingItemLine: string | null = null;
    let currentSection: 'scope' | 'milestone' | 'note' | null = null;
    const breaksStructuredSection = (rawLine: string): boolean => {
        const normalized = rawLine.trim();
        if (!normalized) return false;

        return (
            /^(หมวด\s+[A-Za-z0-9ก-ฮ]|[A-Za-z]\.\d+|\d+\s*[.)])/i.test(normalized) ||
            /(จำนวน\s*\d+.*(?:ราคา|฿|บาท)|(?:ราคา|฿)\s*[0-9,]+|[0-9,]+\s*บาท)/i.test(normalized)
        );
    };
    for (const line of lines) {
        const lower = line.toLowerCase();

        // Section headers
        if (/^(รายละเอียดงาน|ขอบเขตงาน|รายการงาน|scope of work)/i.test(line)) {
            currentSection = 'scope';
            const inlineScope = line.replace(/^(รายละเอียดงาน|ขอบเขตงาน|รายการงาน|scope of work)[:\s]*/i, '').trim();
            if (inlineScope) scope_of_work.push(inlineScope);
            continue;
        }
        if (/^(งวดเงิน|เงื่อนไขการชำระเงิน|payment milestones|payment terms|แบ่งจ่าย)/i.test(line)) {
            currentSection = 'milestone';
            const milestoneInline = parseMilestoneLine(line);
            if (milestoneInline) {
                payment_milestones.push(milestoneInline);
            }
            continue;
        }
        if (/^(หมายเหตุ|เงื่อนไขเพิ่มเติม|เงื่อนไข)/i.test(line)) {
            currentSection = 'note';
            const inlineNote = line.replace(/^(หมายเหตุ|เงื่อนไขเพิ่มเติม|เงื่อนไข)[:\s]*/i, '').trim();
            if (inlineNote) notes.push(inlineNote);
            continue;
        }

        if (currentSection === 'scope') {
            // Break out of scope section when encountering pricing/terms headers
            if (/(ราคาเหมา|ราคาเหมารวม|มูลค่างานเหมารวม|มูลค่างาน|เหมารวม|งวดเงิน|เงื่อนไขการชำระเงิน|payment milestones|payment terms|หมายเหตุ|เงื่อนไขเพิ่มเติม|รวม|total|vat|wht)/i.test(line)) {
                currentSection = null;
            } else {
                scope_of_work.push(line);
                continue;
            }
        }
        if (currentSection === 'milestone') {
            const milestone = parseMilestoneLine(line);
            if (milestone) payment_milestones.push(milestone);
            continue;
        }
        if (currentSection === 'note') {
            if (breaksStructuredSection(line)) {
                currentSection = null;
            } else {
            notes.push(line);
            continue;
            }
        }

        // 1) Explicit doc type line (works for both modes because we already normalized colons)
        {
            const m = line.match(/^(ประเภทเอกสาร|เอกสาร|doc\s*type)\s+(.+)$/i);
            if (m) {
                const dt = detectDocTypeFromValue(m[2].trim());
                if (dt) explicit_doc_type = dt;
                continue;
            }
            if (lower.includes('ประเภทเอกสาร')) {
                const dt = detectDocTypeFromValue(line);
                if (dt) {
                    explicit_doc_type = dt;
                    continue;
                }
            }
        }

        // 2) Key-value pairs (colon-mode)
        if (allHaveColon) {
            const kv = line.split(':');
            if (kv.length >= 2) {
                const key = kv[0].trim().toLowerCase();
                const value = kv.slice(1).join(':').trim();
                if (value.length === 0) {
                    continue;
                }

                // Customer name
                if (['ลูกค้า', 'ชื่อลูกค้า', 'customer', 'bill to', 'ออกให้'].includes(key)) {
                    customer_name = value;
                    continue;
                }
                if (
                    [
                        'ชื่อลูกค้านิติบุคคล',
                        'ชื่อลูกค้า (นิติบุคคล)',
                        'ชื่อบริษัทลูกค้า',
                        'ชื่อนิติบุคคล',
                        'บริษัทลูกค้า',
                    ].includes(key)
                ) {
                    customer_legal_name = value;
                    continue;
                }
                if (
                    ['เลขผู้เสียภาษีลูกค้า', 'เลขประจำตัวผู้เสียภาษีลูกค้า', 'เลขภาษีลูกค้า'].includes(key)
                ) {
                    customer_tax_id = value;
                    continue;
                }
                if (['สาขา', 'สาขาลูกค้า'].includes(key)) {
                    customer_branch = value;
                    continue;
                }
                if (['ที่อยู่ลูกค้า', 'ที่อยู่'].includes(key)) {
                    customer_address = value;
                    continue;
                }
                if (['ผู้ติดต่อ', 'ผู้ติดต่อ (ชื่อบุคคล)'].includes(key)) {
                    customer_contact_name = value;
                    continue;
                }

                // Date
                if (['วันที่', 'date'].includes(key)) {
                    issue_date_raw = value;
                    continue;
                }

                // Subject/description
                if (['เรื่อง', 'งาน', 'subject', 'service', 'รายละเอียด'].includes(key)) {
                    const parts = value.split('|').map((s) => s.trim());
                    subject_th = parts[0] || value;

                    const enPart = parts.find((p) => p.toLowerCase().startsWith('en'));
                    if (enPart) {
                        subject_en = enPart.replace(/^en\s*:\s*/i, '').trim();
                    }
                    continue;
                }

                // Doc type (explicit)
                if (['ประเภทเอกสาร', 'เอกสาร', 'doc type'].includes(key)) {
                    const dt = detectDocTypeFromValue(value);
                    if (dt) explicit_doc_type = dt;
                    continue;
                }
            }
        } else {
            // 3) No-colon mode: label + value
            const customerMatch = line.match(/^(ลูกค้า|ชื่อลูกค้า|customer|bill to|ออกให้)\s+(.+)$/i);
            if (customerMatch) {
                customer_name = customerMatch[2].trim();
                continue;
            }
            const customerLegalMatch = line.match(/^(ชื่อลูกค้านิติบุคคล|ชื่อลูกค้า\s*\(นิติบุคคล\)|ชื่อบริษัทลูกค้า|ชื่อนิติบุคคล|บริษัทลูกค้า)\s+(.+)$/i);
            if (customerLegalMatch) {
                customer_legal_name = customerLegalMatch[2].trim();
                continue;
            }
            const customerTaxMatch = line.match(/^(เลขผู้เสียภาษีลูกค้า|เลขประจำตัวผู้เสียภาษีลูกค้า|เลขภาษีลูกค้า)\s+(.+)$/i);
            if (customerTaxMatch) {
                customer_tax_id = customerTaxMatch[2].trim();
                continue;
            }
            const customerBranchMatch = line.match(/^(สาขา|สาขาลูกค้า)\s+(.+)$/i);
            if (customerBranchMatch) {
                customer_branch = customerBranchMatch[2].trim();
                continue;
            }
            const customerAddressMatch = line.match(/^(ที่อยู่ลูกค้า|ที่อยู่)\s+(.+)$/i);
            if (customerAddressMatch) {
                customer_address = customerAddressMatch[2].trim();
                continue;
            }
            const customerContactMatch = line.match(/^(ผู้ติดต่อ|ผู้ติดต่อ\s*\(ชื่อบุคคล\))\s+(.+)$/i);
            if (customerContactMatch) {
                customer_contact_name = customerContactMatch[2].trim();
                continue;
            }

            const dateMatch = line.match(/^(วันที่|date)\s+(.+)$/i);
            if (dateMatch) {
                issue_date_raw = dateMatch[2].trim();
                continue;
            }

            const subjectMatch = line.match(/^(เรื่อง|งาน|subject|service|รายละเอียด)\s+(.+)$/i);
            if (subjectMatch) {
                const value = subjectMatch[2].trim();
                const parts = value.split('|').map((s) => s.trim());
                subject_th = parts[0] || value;

                const enPart = parts.find((p) => p.toLowerCase().startsWith('en'));
                if (enPart) {
                    subject_en = enPart.replace(/^en\s*:\s*/i, '').trim();
                }
                continue;
            }

            if (line.startsWith('งาน') && line.length > 3 && !line.includes(' ')) {
                subject_th = line.replace(/^งาน/, '').trim();
                continue;
            }
        }

        // 4) Lump sum price
        if (/(ราคาเหมา|ราคาเหมารวม|มูลค่างานเหมารวม|มูลค่างาน|เหมารวม|ราคา\s*เหมา)/i.test(line)) {
            const lumpAmount = parseLumpSumAmount(line) ?? toNumLoose(line);
            if (lumpAmount !== null) {
                price_type = 'LUMP_SUM';
                lump_sum_amount = lumpAmount;
            }
            continue;
        }

        // 5) Totals / discounts / extras (use loose numeric extraction)
        if (
            lower.startsWith('รวม') ||
            lower.startsWith('total') ||
            lower.includes('รวมสุทธิ')
        ) {
            const n = toNumLoose(line);
            if (n !== null) total_hint = n;
            continue;
        }

        if (lower.startsWith('ส่วนลด') || lower.startsWith('discount')) {
            const n = toNumLoose(line);
            if (n !== null) discount_amount = n;
            continue;
        }

        if (
            lower.startsWith('ค่าส่ง') ||
            lower.startsWith('ค่าเดินทาง') ||
            lower.startsWith('extra')
        ) {
            const n = toNumLoose(line);
            if (n !== null) extra_fee_amount = n;
            continue;
        }

        // 6) VAT
        if (lower.startsWith('vat') || lower.includes('ภาษีมูลค่าเพิ่ม')) {
            vat_enabled = true;
            const m = line.match(/(\d+(\.\d+)?)\s*%/);
            if (m) {
                vat_rate = Number(m[1]);
            } else {
                const n = toNumLoose(line);
                if (n !== null && n > 0 && n <= 100) vat_rate = n;
            }
            continue;
        }

        // 7) WHT
        if (lower.includes('หัก') || lower.startsWith('wht') || lower.includes('withholding')) {
            wht_enabled = true;
            const m = line.match(/(\d+(\.\d+)?)\s*%/);
            if (m) {
                wht_rate = Number(m[1]);
            } else {
                const n = toNumLoose(line);
                if (n !== null && n > 0 && n <= 100) wht_rate = n;
            }
            continue;
        }

        // 8) Skip common headers (avoid accidental item parsing attempts)
        if (
            lower === 'รายการ' ||
            lower.startsWith('รายการ ') ||
            lower.startsWith('หมายเหตุ') ||
            lower.startsWith('note') ||
            lower === 'ลูกค้า' ||
            lower.startsWith('ลูกค้า ') ||
            lower.startsWith('ชื่อลูกค้า') ||
            lower.startsWith('ชื่อลูกค้านิติบุคคล') ||
            lower.startsWith('ที่อยู่ลูกค้า') ||
            lower.startsWith('เลขผู้เสียภาษีลูกค้า') ||
            lower.startsWith('เลขภาษีลูกค้า') ||
            lower.startsWith('สาขา') ||
            lower.startsWith('ผู้ติดต่อ') ||
            lower.startsWith('ประเภทเอกสาร') ||
            lower.startsWith('เอกสาร')
        ) {
            continue;
        }

        // 9) Try to parse as item (support "ราคา ..." on next line)
        let mergedLine = line;
        if (pendingItemLine && /^(ราคา|price)\b/i.test(lower)) {
            mergedLine = `${pendingItemLine} ${line}`;
            pendingItemLine = null;
        }

        const item = parseItemLine(mergedLine);
        if (item) {
            items.push(item);
            continue;
        }

        // If this line looks like a description-only line, hold it for the next price line
        if (!/(บาท|฿|ราคา|price)/i.test(lower)) {
            pendingItemLine = line;
        }
    }

    // Use legal name as primary display if no generic customer name was provided
    if (!customer_name && customer_legal_name) {
        customer_name = customer_legal_name;
    }

    // Doc type: explicit overrides; otherwise fallback detect
    let doc_type: DocType | undefined = undefined;
    if (explicit_doc_type) {
        doc_type = explicit_doc_type;
    } else {
        const detected = detectDocType(lines);
        doc_type = detected.doc_type;
        if (detected.warning) warnings.push(detected.warning);
    }

    // Required checks
    if (!customer_name && !customer_legal_name) warnings.push('MISSING_CUSTOMER');

    // Date: default to today (Bangkok) if missing to reduce friction
    if (issue_date_raw) {
        const { iso, warning } = parseDateThai(issue_date_raw);
        if (warning) warnings.push(warning);
        issue_date_iso = iso || null;
    } else {
        const todayIso = getBangkokTodayISO();
        issue_date_raw = todayIso;
        issue_date_iso = todayIso;
        // Intentionally NO "MISSING_DATE" warning (copy-first UX)
    }

    if (items.length === 0 && !lump_sum_amount) warnings.push('NO_ITEMS');

    // Calculate subtotal and check for mismatch
    const subtotal_candidate = lump_sum_amount
        ? lump_sum_amount
        : items.reduce((acc, it) => acc + it.amount, 0);
    const mismatch =
        total_hint !== null && Math.abs(total_hint - subtotal_candidate) > 0.01;

    if (mismatch) warnings.push('TOTAL_MISMATCH');

    return {
        doc_type,
        business_hint,
        customer_name,
        customer_legal_name,
        customer_tax_id,
        customer_branch,
        customer_address,
        customer_contact_name,
        issue_date_raw,
        issue_date_iso,
        subject_th,
        subject_en,
        items,
        price_type,
        lump_sum_amount,
        scope_of_work: scope_of_work.length > 0 ? scope_of_work : null,
        payment_milestones: payment_milestones.length > 0 ? payment_milestones : null,
        notes: notes.length > 0 ? notes.join('\n') : null,
        discount_amount,
        extra_fee_amount,
        vat_enabled,
        vat_rate,
        wht_enabled,
        wht_rate,
        total_hint,
        subtotal_candidate,
        total_mismatch: mismatch,
        warnings,
    };
}
