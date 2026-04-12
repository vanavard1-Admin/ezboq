import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const botDir = resolve(__dirname, '..');
const defaultDbPath = resolve(botDir, 'gemma-memory.db');
const defaultOutputDir = resolve(botDir, 'exports');

const dbPath = process.argv[2] ? resolve(process.argv[2]) : defaultDbPath;
const outputDir = process.argv[3] ? resolve(process.argv[3]) : defaultOutputDir;

mkdirSync(outputDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

const thaiPattern = /[\u0E00-\u0E7F]/;
const entityPattern = /[A-Z]{2,}|บริษัท|ร้าน|โฮมโปร|ไทวัสดุ|บุญถาวร|โกลบอลเฮ้าส์|โรงงาน|Lamptitude|HomePro|Thai Watsadu|Beger|TOA|Jotun|SCG|TPI|INSEE|COTTO/i;
const unitKeywordPattern = /(ถุง|กก\.?|ลิตร|ตร\.ม\.?|เมตร|ม้วน|แผ่น|คิว|ลบ\.ม\.?|ชุด|จุด|ตู้|บาน|เส้น|ถัง|มิลลิเมตร|มม\.?)/i;
const supplierSuspiciousPattern = /หลักการ|lighting design|ฐานข้อมูล|ข้อมูลติดต่อ|ช่องทางติดต่อ|รวม directory|directory|project rate|call center|ปี 20\d{2}|tier|รายชื่อ|ข้อมูลสำหรับ|built-?in/i;
const genericMaterialLabelPattern = /^(ราคา|ราคาปลีก|ราคาส่ง\/โครงการ|ต้นทุนเฉลี่ย|ราคางบประมาณ|\(หมายเหตุ)$/i;
const rejectedMaterialNamePattern = /^\(หมายเหตุ|^หมายเหตุ$|^คิดราคาเหมา|^ต้องการ|^ไม่เหมาะ|^ราคาของตกแต่ง|^ถุงเล็ก$|^ถุงใหญ่$|^ส่วนลด|^call center|^project sales|^งบประมาณ$|^เกรด\b|^ฐานราก|^ค่าวัสดุ$/i;
const rejectedMaterialTitlePattern = /สคริปต์ตอบลูกค้า|Customer Journey|Upsell|Cash Flow|ระบบบัญชี|Job Costing|WIP|PO flow|Invoice|งวดงาน|จดทะเบียนบริษัท|สัญญาว่าจ้าง|Proposal\/Presentation|ราคาค่าแรงช่าง|สไตล์การออกแบบภายใน/i;
const strongResearchTitlePattern = /ราคา|BOQ|template|วัสดุ|ปูน|เหล็ก|กระเบื้อง|สี|สุขภัณฑ์|ไฟฟ้า|บิ้วอิน|ประตู|หน้าต่าง|ท่อ|กันซึม|กระจก|ฉนวน|ไม้|หิน|หลังคา/i;

function normalizeText(value = '') {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r\n?/g, '\n').replace(/\uFEFF/g, '').trim();
}

function stripMarkdown(value = '') {
  return normalizeText(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHeading(value = '') {
  return stripMarkdown(value)
    .replace(/^[#*\-\s]+/, '')
    .replace(/^[0-9]+[.)]\s+/, '')
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/u, '')
    .replace(/:\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampScore(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function buildKey(value = '') {
  return normalizeText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\((.*?)\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitBilingualName(value = '') {
  const cleaned = cleanHeading(value);
  const match = cleaned.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!match) {
    if (thaiPattern.test(cleaned)) {
      return { name_th: cleaned, name_en: null, primary_name: cleaned };
    }
    return { name_th: null, name_en: cleaned || null, primary_name: cleaned };
  }

  const outer = cleanHeading(match[1]);
  const inner = cleanHeading(match[2]);
  const outerThai = thaiPattern.test(outer);
  const innerThai = thaiPattern.test(inner);

  return {
    name_th: outerThai ? outer : innerThai ? inner : null,
    name_en: outerThai ? inner || null : outer || null,
    primary_name: outer || inner,
  };
}

function normalizePhoneValue(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 4) {
    if (/^(19|20)\d{2}$/.test(digits)) return null;
    return { display: digits, normalized: digits };
  }
  if (digits.length < 9 || digits.length > 10) return null;

  let display = digits;
  if (digits.length === 10 && digits.startsWith('02')) {
    display = `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  } else if (digits.length === 10) {
    display = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 9) {
    display = `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }

  return { display, normalized: digits };
}

function normalizeWebsiteValue(raw) {
  const cleaned = normalizeText(raw).replace(/[),.;]+$/g, '');
  if (!cleaned) return null;
  const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const url = new URL(candidate);
    return {
      display: cleaned,
      normalized: url.toString().replace(/\/$/, ''),
    };
  } catch {
    return null;
  }
}

function extractEmails(text = '') {
  return uniqueStrings(
    [...normalizeText(text).matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)]
      .map((match) => match[0].toLowerCase()),
  );
}

function extractLineIds(text = '') {
  return uniqueStrings(
    [...normalizeText(text).matchAll(/@[A-Za-z0-9._-]{3,}/g)]
      .map((match) => match[0]),
  );
}

function extractPhones(text = '') {
  const matches = [...normalizeText(text).matchAll(/(?:\+?\d[\d -]{2,}\d|\b\d{4}\b)/g)];
  const phones = [];
  for (const match of matches) {
    const phone = normalizePhoneValue(match[0]);
    if (phone) phones.push(phone);
  }
  const deduped = new Map();
  for (const phone of phones) {
    deduped.set(phone.normalized, phone);
  }
  return [...deduped.values()];
}

function extractWebsites(text = '') {
  const matches = [...normalizeText(text).matchAll(/https?:\/\/\S+|www\.\S+/gi)];
  const websites = [];
  for (const match of matches) {
    const website = normalizeWebsiteValue(match[0]);
    if (website) websites.push(website);
  }
  const deduped = new Map();
  for (const website of websites) {
    deduped.set(website.normalized, website);
  }
  return [...deduped.values()];
}

function parseSupplierContacts(row) {
  const extractedContactLines = normalizeText(row.raw_section)
    .split('\n')
    .filter((line) => /โทร|phone|call center|line|email|website|contact|ฝ่ายขาย|official/i.test(line))
    .join('\n');

  const sourceText = [
    row.phone_numbers,
    row.line_ids,
    row.website_urls,
    row.contact_raw,
    row.branch_info,
    row.b2b_notes,
    extractedContactLines,
  ].filter(Boolean).join('\n');

  const lineText = [
    row.line_ids,
    row.contact_raw,
    row.branch_info,
    row.b2b_notes,
    extractedContactLines
      .split('\n')
      .filter((line) => /line|ไลน์/i.test(line))
      .join('\n'),
  ].filter(Boolean).join('\n');

  return {
    phones: extractPhones(sourceText),
    lines: extractLineIds(lineText).map((value) => ({ display: value, normalized: value.toLowerCase() })),
    emails: extractEmails(sourceText).map((value) => ({ display: value, normalized: value })),
    websites: extractWebsites(sourceText),
    sourceText,
  };
}

function inferSupplierKind(row) {
  const text = `${row.supplier_name}\n${row.kb_title}\n${row.b2b_notes}\n${row.branch_info}`;
  if (/โฮมโปร|ไทวัสดุ|บุญถาวร|global house|ร้านวัสดุ/i.test(text)) return 'retailer';
  if (/โรงงาน|ผู้ผลิต|SCG|TOA|Jotun|Beger|TPI|INSEE|COTTO/i.test(text)) return 'manufacturer';
  if (/project sales|b2b|distributor|dealer|ตัวแทน/i.test(text)) return 'distributor';
  return 'unknown';
}

function scoreSupplierCandidate(row, contacts) {
  let score = 0;
  if (entityPattern.test(row.supplier_name)) score += 0.4;
  if (contacts.phones.length > 0) score += 0.2;
  if (contacts.lines.length > 0) score += 0.18;
  if (contacts.emails.length > 0) score += 0.12;
  if (contacts.websites.length > 0) score += 0.1;
  if (cleanHeading(row.branch_info)) score += 0.08;
  if (cleanHeading(row.b2b_notes)) score += 0.08;
  if (/researcher|construction_material|interior_design|estimator/i.test(row.kb_category)) score += 0.04;
  if (supplierSuspiciousPattern.test(row.supplier_name)) score -= 0.7;
  if (contacts.phones.length === 0 && contacts.lines.length === 0 && contacts.emails.length === 0 && contacts.websites.length === 0) score -= 0.2;
  return clampScore(score);
}

function isHighConfidenceSupplier(row, contacts, score) {
  if (score < 0.75) return false;
  if (supplierSuspiciousPattern.test(row.supplier_name)) return false;
  return contacts.phones.length > 0 || contacts.lines.length > 0 || contacts.emails.length > 0 || contacts.websites.length > 0;
}

function extractLineLabel(rawLine = '') {
  const plain = stripMarkdown(rawLine);
  if (!plain.includes(':')) return '';
  const [label] = plain.split(':', 1);
  return cleanHeading(label);
}

function sanitizeUnit(value = '') {
  let cleaned = normalizeText(value).replace(/\*+$/g, '').trim();
  if (!cleaned) return null;

  cleaned = cleaned.replace(/\(([^)]*)\)/g, (match, inner) => (unitKeywordPattern.test(inner) ? `(${inner.trim()})` : ''));
  cleaned = cleaned.replace(/\((?:ราคาโดยประมาณ|ส่งถึงหน้างาน|รวมค่าออกแบบ|COTTO|SOSUCO|Dynasty|SCG|HomePro|ไทวัสดุ|บุญถาวร)[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^\/+/, '').trim();

  if (/บาท/i.test(cleaned)) {
    const unitMatch = cleaned.match(/(ถุง(?:\s*\([^)]*\))?|แผ่น|ตร\.ม\.?|เมตร|ม้วน|คิว|ลบ\.ม\.?|ชุด|จุด|ตู้|บาน|เส้น|ถัง(?:\s*\([^)]*\))?|ลิตร|กก\.?|มม\.?)/i);
    cleaned = unitMatch ? unitMatch[1].trim() : '';
  }

  if (!cleaned) return null;
  if (!unitKeywordPattern.test(cleaned)) return null;
  return cleaned;
}

function normalizeBrandToken(value = '') {
  const cleaned = cleanHeading(value);
  if (!cleaned) return null;
  const lowered = cleaned.toLowerCase();
  if (lowered.startsWith('nippon')) return 'Nippon';
  if (lowered.startsWith('toa')) return 'TOA';
  if (lowered.startsWith('beger')) return 'Beger';
  if (lowered.startsWith('jotun')) return 'Jotun';
  if (lowered.startsWith('dulux')) return 'Dulux';
  if (lowered.startsWith('scg')) return 'SCG';
  if (lowered.startsWith('tpi')) return 'TPI';
  if (lowered.startsWith('insee')) return 'INSEE';
  if (lowered.startsWith('cotto')) return 'COTTO';
  if (lowered.startsWith('cpac')) return 'CPAC';
  if (lowered.startsWith('lamptitude')) return 'Lamptitude';
  return cleaned;
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeUnitLabel(value = '') {
  const cleaned = cleanHeading(value);
  if (!cleaned) return null;
  if (/^ตร\.?ม\.?$/i.test(cleaned)) return 'ตร.ม.';
  if (/^ลบ\.?ม\.?$/i.test(cleaned)) return 'ลบ.ม.';
  if (/^กก\.?$/i.test(cleaned)) return 'กก.';
  if (/^มม\.?$/i.test(cleaned)) return 'มม.';
  if (/^ซม\.?$/i.test(cleaned)) return 'ซม.';
  if (/^คิว$/i.test(cleaned)) return 'คิว';
  if (/^ลิตร$/i.test(cleaned)) return 'ลิตร';
  if (/^เมตร$/i.test(cleaned)) return 'เมตร';
  if (/^ม้วน$/i.test(cleaned)) return 'ม้วน';
  if (/^แผ่น$/i.test(cleaned)) return 'แผ่น';
  if (/^ชุด$/i.test(cleaned)) return 'ชุด';
  if (/^จุด$/i.test(cleaned)) return 'จุด';
  if (/^ตู้$/i.test(cleaned)) return 'ตู้';
  if (/^บาน$/i.test(cleaned)) return 'บาน';
  if (/^เส้น$/i.test(cleaned)) return 'เส้น';
  if (/^ตัว$/i.test(cleaned)) return 'ตัว';
  if (/^ถุง$/i.test(cleaned)) return 'ถุง';
  if (/^ถัง$/i.test(cleaned)) return 'ถัง';
  return cleaned;
}

function splitUnitMetadata(unit = '', materialName = '') {
  const cleaned = sanitizeUnit(unit) || sanitizeUnit(materialName) || null;
  if (!cleaned) {
    return { default_unit: null, unit_spec: null };
  }

  const quantityFirstMatch = cleaned.match(/^(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(ลิตร|กก\.?|มม\.?|ซม\.?))/i);
  if (quantityFirstMatch) {
    return {
      default_unit: normalizeUnitLabel(quantityFirstMatch[2]),
      unit_spec: cleanHeading(quantityFirstMatch[1]),
    };
  }

  const baseUnitMatch = cleaned.match(/ถุง|ถัง|ตร\.ม\.?|เมตร|ม้วน|แผ่น|คิว|ลบ\.ม\.?|ชุด|จุด|ตู้|บาน|เส้น|ตัว|ลิตร|กก\.?|มม\.?|ซม\.?/i);
  if (!baseUnitMatch) {
    return { default_unit: null, unit_spec: cleanHeading(cleaned) || null };
  }

  const before = cleaned.slice(0, baseUnitMatch.index).trim();
  const after = cleaned.slice(baseUnitMatch.index + baseUnitMatch[0].length).trim();
  let unitSpec = [before, after].filter(Boolean).join(' ').trim();
  if (unitSpec.startsWith('(') && unitSpec.endsWith(')')) {
    unitSpec = unitSpec.slice(1, -1).trim();
  }

  return {
    default_unit: normalizeUnitLabel(baseUnitMatch[0]),
    unit_spec: cleanHeading(unitSpec) || null,
  };
}

function normalizeSpecValue(value = '') {
  let cleaned = cleanHeading(value);
  if (!cleaned) return null;
  if (/^(null|undefined)$/i.test(cleaned)) return null;

  cleaned = cleaned
    .replace(/^ขนาด\s*(\d+(?:\.\d+)?)\s*มม\.?\s*\((?:DB|RB)\d+\)$/i, '$1 มม.')
    .replace(/^ขนาด\s*([0-9/]+)\s*นิ้ว\s*\(([^)]+)\)$/i, '$1 นิ้ว | $2')
    .replace(/^ถัง\s+(\d+(?:\.\d+)?\s*ลิตร)$/i, '$1')
    .replace(/^ถุง\s+(\d+(?:\.\d+)?\s*กก\.?)$/i, '$1')
    .replace(/^พื้น\s+(ตร\.ม\.?)$/i, '$1')
    .replace(/^แผ่นพื้น$/i, 'พื้น')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(ถุง|ถัง|ตร\.ม\.?|เมตร|ม้วน|แผ่น|คิว|ลบ\.ม\.?|ชุด|จุด|ตู้|บาน|เส้น|ตัว|ลิตร|กก\.?|มม\.?|ซม\.?)$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function mergeSpecificationParts(parts, { displayName = '', brandName = '', defaultUnit = '' } = {}) {
  const seen = new Set();
  const merged = [];

  for (const part of parts) {
    const cleaned = normalizeSpecValue(part);
    if (!cleaned) continue;

    const segments = cleaned.includes('|')
      ? cleaned.split('|').map((segment) => normalizeSpecValue(segment))
      : [cleaned];

    for (const segment of segments) {
      if (!segment) continue;
      const key = buildKey(segment);
      if (!key || /^(null|undefined)$/i.test(segment)) continue;
      if (defaultUnit && buildKey(segment) === buildKey(defaultUnit)) continue;
      if (brandName && buildKey(segment) === buildKey(brandName)) continue;
      if (displayName && buildKey(segment) === buildKey(displayName)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(segment);
    }
  }

  return merged.length > 0 ? merged.join(' | ') : null;
}

function specificationRichness(value = '') {
  const cleaned = normalizeText(value);
  if (!cleaned) return 0;
  return cleaned.split('|').map((segment) => segment.trim()).filter(Boolean).length * 100 + cleaned.length;
}

function shouldUseSpecificationInMaterialKey(displayName = '', materialGroup = '') {
  if (materialGroup === 'steel' && /\b(?:DB|RB)\d+\b/i.test(displayName)) return false;
  if (materialGroup === 'pipe' && /^ท่อ PVC\s+[0-9/]+\s*นิ้ว$/i.test(displayName)) return false;
  return true;
}

function extractUnitHint(text = '') {
  const cleaned = normalizeText(text);
  if (!cleaned) return null;

  const perUnitMatch = cleaned.match(/(?:\/|ต่อ)\s*(ถุง(?:\s*\([^)]*\))?|แผ่น|ตร\.ม\.?|เมตร|ม้วน|คิว|ลบ\.ม\.?|ชุด|จุด|ตู้|บาน|เส้น|ถัง(?:\s*\([^)]*\))?|ลิตร|กก\.?|มม\.?)/i);
  if (perUnitMatch) return sanitizeUnit(perUnitMatch[1]);

  const parenMatch = cleaned.match(/\(([^)]*(?:ถุง|กก\.?|ลิตร|ตร\.ม\.?|เมตร|ม้วน|คิว|ลบ\.ม\.?|แผ่น|ถัง|มม\.?)[^)]*)\)/i);
  if (parenMatch) return sanitizeUnit(parenMatch[1]);

  return null;
}

function inferMaterialGroup(materialName = '', sourceTitle = '') {
  const nameValue = normalizeText(materialName);
  const titleValue = normalizeText(sourceTitle);
  const combinedValue = `${nameValue}\n${titleValue}`;

  if (/บานพับ|รางลิ้นชัก|hardware|soft-close/i.test(nameValue)) return 'hardware';
  if (/ลามิเนต|HPL|veneer|ผิว/i.test(nameValue)) return 'surface_finish';
  if (/ประตู|หน้าต่าง|uPVC|WPC|HDF|อลูมิเนียม/i.test(nameValue)) return 'doors_windows';
  if (/เหล็ก|steel|DB\d|RB\d|round bar|deformed bar/i.test(nameValue)) return 'steel';
  if (/ฉนวน|insulation|foil|rockwool|fiberglass|eps|spf|foam/i.test(nameValue)) return 'insulation';
  if (/กระจก|glass|low-e|เทมเปอร์|ลามิเนต/i.test(nameValue)) return 'glass';
  if (/อิฐ|brick|มวลเบา/i.test(nameValue)) return 'masonry';
  if (/ไฟฟ้า|สายไฟ|consumer unit|mcb|ปลั๊ก|สวิตช์|lamp|light/i.test(nameValue)) return 'electrical';
  if (/ท่อ|pipe|pvc|ppr|น้ำดี|น้ำทิ้ง/i.test(nameValue)) return 'pipe';
  if (/กระเบื้อง|tile|grout|ยาแนว|ปูนกาว/i.test(nameValue)) return 'tile';
  if (/ปูน|cement|ready-?mix|คอนกรีต/i.test(nameValue)) return 'cement';
  if (/สี|paint|toa|jotun|beger|nippon|dulux/i.test(nameValue)) return 'paint';
  if (/สุขภัณฑ์|sanitary|toilet|basin|ก๊อก|shower/i.test(nameValue)) return 'sanitary';
  if (/ไม้|wood|mdf|hmr|plywood|particle board|melamine/i.test(nameValue)) return 'wood';
  if (/กันซึม|waterproof/i.test(nameValue)) return 'waterproofing';
  if (/หลังคา|roof|metal sheet/i.test(nameValue)) return 'roofing';

  if (/เหล็ก|steel|DB\d|RB\d/i.test(combinedValue)) return 'steel';
  if (/ฉนวน|insulation|rockwool|fiberglass|eps|spf|foam/i.test(combinedValue)) return 'insulation';
  if (/กระจก|glass/i.test(combinedValue)) return 'glass';
  if (/อิฐ|brick|มวลเบา/i.test(combinedValue)) return 'masonry';
  if (/ประตู|หน้าต่าง|uPVC|WPC|HDF|อลูมิเนียม/i.test(combinedValue)) return 'doors_windows';
  if (/ไฟฟ้า|สายไฟ|consumer unit|mcb|ปลั๊ก|สวิตช์|lamp|light/i.test(combinedValue)) return 'electrical';
  if (/ท่อ|pipe|pvc|ppr|น้ำดี|น้ำทิ้ง/i.test(combinedValue)) return 'pipe';
  if (/กระเบื้อง|tile|grout|ยาแนว|ปูนกาว/i.test(combinedValue)) return 'tile';
  if (/ปูน|cement|ready-?mix|คอนกรีต/i.test(combinedValue)) return 'cement';
  if (/สี|paint|toa|jotun|beger|nippon|dulux/i.test(combinedValue)) return 'paint';
  if (/สุขภัณฑ์|sanitary|toilet|basin|ก๊อก|shower/i.test(combinedValue)) return 'sanitary';
  if (/ไม้|wood|mdf|hmr|plywood|particle board/i.test(combinedValue)) return 'wood';
  if (/กันซึม|waterproof/i.test(combinedValue)) return 'waterproofing';
  if (/หลังคา|roof/i.test(combinedValue)) return 'roofing';
  return 'other';
}

function inferBrandName(materialName = '', supplierDisplayName = '', preferredBrand = null) {
  if (preferredBrand) return normalizeBrandToken(preferredBrand);

  const candidate = cleanHeading(materialName);
  const leadingBrandMatch = candidate.match(/^(TOA|Jotun|Beger|Nippon(?: Paint)?|Dulux|SCG|TPI|INSEE|COTTO|CPAC|Lamptitude)\b/i);
  if (leadingBrandMatch) return normalizeBrandToken(leadingBrandMatch[1]);

  const supplierName = cleanHeading(supplierDisplayName);
  if (supplierName) {
    const supplierMatch = supplierName.match(/^(TOA|Jotun|Beger|Nippon(?: Paint)?|Dulux|SCG|TPI|INSEE|COTTO|CPAC|Lamptitude|โฮมโปร|ไทวัสดุ|บุญถาวร)\b/i);
    if (supplierMatch) return normalizeBrandToken(supplierMatch[1]);
  }

  return null;
}

function extractSpecification(materialName = '') {
  const cleaned = cleanHeading(materialName);
  const steelDbMatch = cleaned.match(/\bDB(\d+)\b/i);
  if (steelDbMatch) return `${steelDbMatch[1]} มม.`;

  const steelRbMatch = cleaned.match(/\bRB(\d+)\b/i);
  if (steelRbMatch) return `${steelRbMatch[1]} มม.`;

  const inchMmMatch = cleaned.match(/(\d+(?:\/\d+)?)\s*นิ้ว.*?(\d+\s*มม\.?)/i);
  if (inchMmMatch) return `${cleanHeading(inchMmMatch[1])} นิ้ว | ${cleanHeading(inchMmMatch[2])}`;

  const fractionInchMatch = cleaned.match(/(\d+(?:\/\d+)?)\s*นิ้ว/i);
  if (fractionInchMatch) return `${cleanHeading(fractionInchMatch[1])} นิ้ว`;

  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  if (parenMatch) return cleanHeading(parenMatch[1]);

  const sizeMatch = cleaned.match(/(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:sq\.?mm|มม\.?|ซม\.?|นิ้ว|x\d+\s*ซม\.?|กก\.?|ลิตร))/i);
  if (sizeMatch) return cleanHeading(sizeMatch[1]);

  return null;
}

function extractSeriesName(displayName = '', brandName = '', materialGroup = '') {
  const cleaned = cleanHeading(displayName);
  if (!cleaned) return null;

  const parentheticalMatch = cleaned.match(/^[^(]+\(([^)]+)\)\s*(?:[A-Z]{1,}-?[A-Z0-9]+|\d+(?:\.\d+)?\s*มม\.?)?$/i);
  if (parentheticalMatch) {
    const seriesFromParen = cleanHeading(parentheticalMatch[1]);
    if (
      seriesFromParen
      && !/^\d/.test(seriesFromParen)
      && !/^(?:DB|RB|SD)\d+/i.test(seriesFromParen)
      && !/^(?:18\s*ลิตร|[0-9/]+\s*นิ้ว|\d+(?:\.\d+)?\s*มม\.?)$/i.test(seriesFromParen)
    ) {
      return seriesFromParen;
    }
  }

  if (!brandName) {
    if (materialGroup === 'paint') return null;
    return null;
  }

  const withoutBrand = cleaned.replace(new RegExp(`^${escapeRegExp(brandName)}\\s+`, 'i'), '').trim();
  if (!withoutBrand || withoutBrand === cleaned) return null;
  if (/^\d/.test(withoutBrand)) return null;
  if (/^(?:18\s*ลิตร|[0-9/]+\s*นิ้ว|\d+(?:\.\d+)?\s*มม\.?)$/i.test(withoutBrand)) return null;
  if (/^(?:DB|RB|SD)\d+\b/i.test(withoutBrand)) return null;
  return cleanHeading(withoutBrand) || null;
}

function extractGradeCode(displayName = '', specification = '', materialGroup = '') {
  const combined = `${cleanHeading(displayName)} ${normalizeText(specification)}`.trim();
  if (!combined) return null;
  if (materialGroup !== 'steel') return null;

  const matches = [...combined.matchAll(/\b(?:SD\d+|DB\d+|RB\d+)\b/gi)].map((match) => match[0].toUpperCase());
  const uniqueMatches = uniqueStrings(matches);
  return uniqueMatches.length > 0 ? uniqueMatches.join(' ') : null;
}

function extractSizeMm(displayName = '', specification = '', materialGroup = '') {
  const combined = `${cleanHeading(displayName)} | ${normalizeText(specification)}`.trim();
  if (!combined) return null;
  if (materialGroup === 'electrical' && /sq\.?mm/i.test(combined)) return null;

  const steelCodeMatch = combined.match(/\b(?:DB|RB)(\d+(?:\.\d+)?)\b/i);
  if (steelCodeMatch) {
    return Number.parseFloat(steelCodeMatch[1]);
  }

  if (/\d+\s*x\s*\d+(?:\s*x\s*\d+(?:\.\d+)?)?\s*มม\.?/i.test(combined)) {
    return null;
  }

  const mmMatches = [...combined.matchAll(/(\d+(?:\.\d+)?)\s*มม\.?/gi)].map((match) => Number.parseFloat(match[1]));
  const validMmMatches = [...new Set(mmMatches.filter((value) => Number.isFinite(value) && value > 0))];
  if (validMmMatches.length === 0) return null;

  if (materialGroup === 'pipe') return validMmMatches[0];
  if (validMmMatches.length === 1) return validMmMatches[0];
  return null;
}

function extractSizeInch(displayName = '', specification = '') {
  const combined = `${cleanHeading(displayName)} | ${normalizeText(specification)}`.trim();
  if (!combined) return null;

  const inchMatch = combined.match(/(\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)\s*นิ้ว/i);
  if (!inchMatch) return null;

  return cleanHeading(inchMatch[1]).replace(/\s*\/\s*/g, '/');
}

function extractCatalogEnrichment({ displayName = '', brandName = '', materialGroup = '', specification = '' } = {}) {
  return {
    series_name: extractSeriesName(displayName, brandName, materialGroup),
    size_mm: extractSizeMm(displayName, specification, materialGroup),
    size_inch: extractSizeInch(displayName, specification),
    grade_code: extractGradeCode(displayName, specification, materialGroup),
  };
}

function normalizeMetricUnit(value = '') {
  const cleaned = cleanHeading(value).toLowerCase();
  if (!cleaned) return null;
  if (/^(มม\.?|mm)$/.test(cleaned)) return 'mm';
  if (/^(ซม\.?|cm)$/.test(cleaned)) return 'cm';
  if (/^(ม\.?|เมตร|meter|meters|m)$/.test(cleaned)) return 'm';
  return null;
}

function convertToMillimeters(value, unit) {
  const numericValue = Number.parseFloat(String(value));
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  const normalizedUnit = normalizeMetricUnit(unit);
  if (normalizedUnit === 'mm') return Number.parseFloat(numericValue.toFixed(3));
  if (normalizedUnit === 'cm') return Number.parseFloat((numericValue * 10).toFixed(3));
  if (normalizedUnit === 'm') return Number.parseFloat((numericValue * 1000).toFixed(3));
  return null;
}

function inferImplicitDimensionUnit(materialGroup = '', combined = '') {
  if (materialGroup === 'tile') return 'cm';
  if (materialGroup === 'steel' && /(channel|c-channel|เหล็กกล่อง|เหล็กแผ่น)/i.test(combined)) return 'mm';
  return null;
}

function extractDimensionEnrichment({ displayName = '', specification = '', materialGroup = '' } = {}) {
  const combined = [cleanHeading(displayName), normalizeText(specification)].filter(Boolean).join(' | ');
  if (!combined) {
    return {
      width_mm: null,
      height_mm: null,
      thickness_mm: null,
      thickness_mm_min: null,
      thickness_mm_max: null,
      cross_section_sqmm_min: null,
      cross_section_sqmm_max: null,
      strength_kg_per_cm2: null,
    };
  }

  let widthMm = null;
  let heightMm = null;
  let thicknessMm = null;
  let thicknessMmMin = null;
  let thicknessMmMax = null;

  const explicitTripleMatch = combined.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(มม\.?|mm|ซม\.?|cm|ม\.?|เมตร|m)\b/i);
  if (explicitTripleMatch) {
    widthMm = convertToMillimeters(explicitTripleMatch[1], explicitTripleMatch[4]);
    heightMm = convertToMillimeters(explicitTripleMatch[2], explicitTripleMatch[4]);
    thicknessMm = convertToMillimeters(explicitTripleMatch[3], explicitTripleMatch[4]);
  } else {
    const explicitPairMatch = combined.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(มม\.?|mm|ซม\.?|cm|ม\.?|เมตร|m)\b/i);
    if (explicitPairMatch) {
      widthMm = convertToMillimeters(explicitPairMatch[1], explicitPairMatch[3]);
      heightMm = convertToMillimeters(explicitPairMatch[2], explicitPairMatch[3]);
    } else {
      const implicitTripleMatch = combined.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?=$|\s|\|)/i);
      const implicitUnit = inferImplicitDimensionUnit(materialGroup, combined);
      if (implicitTripleMatch && implicitUnit) {
        widthMm = convertToMillimeters(implicitTripleMatch[1], implicitUnit);
        heightMm = convertToMillimeters(implicitTripleMatch[2], implicitUnit);
        thicknessMm = convertToMillimeters(implicitTripleMatch[3], implicitUnit);
      } else {
        const implicitPairMatch = combined.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?=$|\s|\|)/i);
        if (implicitPairMatch && implicitUnit) {
          widthMm = convertToMillimeters(implicitPairMatch[1], implicitUnit);
          heightMm = convertToMillimeters(implicitPairMatch[2], implicitUnit);
        }
      }
    }
  }

  const thicknessAllowed =
    widthMm !== null
    || heightMm !== null
    || /(?:หนา\s*\d|\bMDF\b|\bPlywood\b|\bParticle Board\b|กระจก|ฉนวน|เหล็กแผ่น|เหล็กกล่อง|อลูมิเนียม|ไม้อัด)/i.test(combined);
  const thicknessRangeMatch = combined.match(/(?:หนา\s*)?(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(มม\.?|mm)\b/i);
  if (thicknessRangeMatch) {
    thicknessMmMin = convertToMillimeters(thicknessRangeMatch[1], thicknessRangeMatch[3]);
    thicknessMmMax = convertToMillimeters(thicknessRangeMatch[2], thicknessRangeMatch[3]);
  }

  if (thicknessMm === null && thicknessAllowed) {
    const thicknessMatch = combined.match(/(?:หนา\s*)?(\d+(?:\.\d+)?)\s*มม\.?/i);
    if (thicknessMatch) {
      thicknessMm = convertToMillimeters(thicknessMatch[1], 'mm');
    }
  }

  if (thicknessMm !== null && thicknessMmMin === null && thicknessMmMax === null) {
    thicknessMmMin = thicknessMm;
    thicknessMmMax = thicknessMm;
  }

  let crossSectionSqmmMin = null;
  let crossSectionSqmmMax = null;
  const crossSectionRangeMatch = combined.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*sq\.?mm/i);
  if (crossSectionRangeMatch) {
    crossSectionSqmmMin = Number.parseFloat(crossSectionRangeMatch[1]);
    crossSectionSqmmMax = Number.parseFloat(crossSectionRangeMatch[2]);
  } else {
    const crossSectionSingleMatch = combined.match(/(\d+(?:\.\d+)?)\s*sq\.?mm/i);
    if (crossSectionSingleMatch) {
      crossSectionSqmmMin = Number.parseFloat(crossSectionSingleMatch[1]);
      crossSectionSqmmMax = Number.parseFloat(crossSectionSingleMatch[1]);
    }
  }

  let strengthKgPerCm2 = null;
  const strengthMatch = combined.match(/(\d+(?:\.\d+)?)\s*กก\.?\s*\/\s*ซม(?:2|²)/i);
  if (strengthMatch) {
    strengthKgPerCm2 = Number.parseFloat(strengthMatch[1]);
  }

  return {
    width_mm: widthMm,
    height_mm: heightMm,
    thickness_mm: thicknessMm,
    thickness_mm_min: Number.isFinite(thicknessMmMin) ? thicknessMmMin : null,
    thickness_mm_max: Number.isFinite(thicknessMmMax) ? thicknessMmMax : null,
    cross_section_sqmm_min: Number.isFinite(crossSectionSqmmMin) ? crossSectionSqmmMin : null,
    cross_section_sqmm_max: Number.isFinite(crossSectionSqmmMax) ? crossSectionSqmmMax : null,
    strength_kg_per_cm2: Number.isFinite(strengthKgPerCm2) ? strengthKgPerCm2 : null,
  };
}

function isMaterialFocusedSource(row) {
  if (rejectedMaterialTitlePattern.test(row.kb_title)) return false;
  if (/writer|marketer/i.test(row.kb_category)) return false;
  if (/construction_material|interior_design/i.test(row.kb_category)) return true;
  if (/estimator/i.test(row.kb_category)) return /BOQ|ราคา|งานบิ้วอิน|งานประตู|งานไฟฟ้า|งานรั้ว|งานถังเก็บน้ำ|กระเบื้อง|วัสดุ/i.test(row.kb_title);
  if (/researcher/i.test(row.kb_category)) return strongResearchTitlePattern.test(row.kb_title);
  if (/planner|analyst/i.test(row.kb_category)) return /BOQ|template|ราคาวัสดุ/i.test(row.kb_title);
  return false;
}

function isMeaningfulSectionTitle(sectionTitle, kbTitle) {
  const section = cleanHeading(sectionTitle);
  if (!section) return false;
  if (section === cleanHeading(kbTitle)) return false;
  if (genericMaterialLabelPattern.test(section)) return false;
  if (rejectedMaterialNamePattern.test(section)) return false;
  return true;
}

function deriveMaterialCandidate(row) {
  const lineLabel = extractLineLabel(row.raw_line);
  const originalMaterialName = cleanHeading(row.material_name);
  const sectionTitle = cleanHeading(row.section_title);
  let displayName = originalMaterialName;
  let priceLabel = null;
  let aliasSpec = null;
  let preferredBrand = null;

  if (lineLabel && !genericMaterialLabelPattern.test(lineLabel)) {
    displayName = lineLabel;
  }

  const prefixedMatch = displayName.match(/^ราคา\s+(.+)$/i);
  if (prefixedMatch) {
    displayName = cleanHeading(prefixedMatch[1]);
  }

  if (genericMaterialLabelPattern.test(displayName)) {
    priceLabel = displayName;
    if (isMeaningfulSectionTitle(sectionTitle, row.kb_title)) {
      displayName = sectionTitle;
    }
  }

  if (/^x\d/i.test(displayName) && /กระเบื้อง/i.test(row.kb_title)) {
    displayName = `กระเบื้อง ${displayName}`;
  }

  if (/^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*sq\.?mm/i.test(displayName) && /(ไฟฟ้า|สายไฟ|แสงสว่าง|เต้ารับ|แอร์|เครื่องทำน้ำอุ่น)/i.test(`${row.kb_title} ${row.section_title}`)) {
    displayName = `สายไฟ ${displayName}`;
  }

  if (/^uPVC/i.test(displayName) && /(ประตู|หน้าต่าง)/i.test(`${row.kb_title} ${row.section_title}`)) {
    displayName = `ระบบ ${displayName}`;
  }

  if (/^ready-?mix/i.test(displayName)) {
    displayName = `คอนกรีต ${displayName}`;
  }

  if (/^ปูนกาวกระเบื้อง/i.test(displayName)) {
    displayName = 'ปูนกาวกระเบื้อง';
  }

  if (/^ยาแนวซีเมนต์/i.test(displayName)) {
    displayName = 'ยาแนวซีเมนต์';
  }

  const bareDbMatch = displayName.match(/^(DB\d+)$/i);
  if (bareDbMatch) {
    displayName = `เหล็กข้ออ้อย ${bareDbMatch[1].toUpperCase()}`;
    aliasSpec = bareDbMatch[1].slice(2).toUpperCase() + ' มม.';
  }

  const bareRbMatch = displayName.match(/^(RB\d+)$/i);
  if (bareRbMatch) {
    displayName = `เหล็กเส้นกลม ${bareRbMatch[1].toUpperCase()}`;
    aliasSpec = bareRbMatch[1].slice(2).toUpperCase() + ' มม.';
  }

  const sizedDbMatch = displayName.match(/^ขนาด\s*(\d+(?:\.\d+)?)\s*มม\.?\s*\((DB\d+)\)$/i);
  if (sizedDbMatch) {
    displayName = `เหล็กข้ออ้อย ${sizedDbMatch[2].toUpperCase()}`;
    aliasSpec = `${sizedDbMatch[1]} มม.`;
  }

  const sizedRbMatch = displayName.match(/^ขนาด\s*(\d+(?:\.\d+)?)\s*มม\.?\s*\((RB\d+)\)$/i);
  if (sizedRbMatch) {
    displayName = `เหล็กเส้นกลม ${sizedRbMatch[2].toUpperCase()}`;
    aliasSpec = `${sizedRbMatch[1]} มม.`;
  }

  const pvcSizeMatch = displayName.match(/^ขนาด\s*([0-9/]+)\s*นิ้ว(?:\s*\(([^)]+)\))?$/i);
  if (pvcSizeMatch && /PVC|ท่อ/i.test(row.kb_title)) {
    displayName = `ท่อ PVC ${pvcSizeMatch[1]} นิ้ว`;
    aliasSpec = cleanHeading(pvcSizeMatch[2] || '');
  }

  const cementBrandMatch = displayName.match(/^(SCG|TPI|INSEE)\s*\(([^)]+)\)$/i);
  if (cementBrandMatch && /ปูน|cement/i.test(row.kb_title)) {
    preferredBrand = normalizeBrandToken(cementBrandMatch[1]);
    displayName = `ปูนซีเมนต์ ${preferredBrand}`;
    aliasSpec = cleanHeading(cementBrandMatch[2]);
  }

  const paintPackMatch = displayName.match(/^(TOA|Jotun|Beger|Nippon(?: Paint)?|Dulux)\s+(.+?)\s*\((?:ถัง\s*)?(\d+(?:\.\d+)?\s*ลิตร)\)$/i);
  if (paintPackMatch) {
    preferredBrand = normalizeBrandToken(paintPackMatch[1]);
    displayName = `${preferredBrand} ${cleanHeading(paintPackMatch[2])}`;
    aliasSpec = cleanHeading(paintPackMatch[3]);
  }

  const genericParenMatch = displayName.match(/^(.*)\s*\(([^)]+)\)$/);
  if (genericParenMatch) {
    const outer = cleanHeading(genericParenMatch[1]);
    const inner = cleanHeading(genericParenMatch[2]);
    if (!/^(SCG|TPI|INSEE|TOA|Jotun|Beger|Nippon(?: Paint)?|Dulux|COTTO|CPAC|Lamptitude)$/i.test(inner)) {
      displayName = outer;
      if (!aliasSpec) aliasSpec = normalizeSpecValue(inner);
    }
  }

  displayName = cleanHeading(displayName);

  if (!displayName) return null;
  if (genericMaterialLabelPattern.test(displayName)) return null;
  if (rejectedMaterialNamePattern.test(displayName)) return null;

  return {
    display_name: displayName,
    price_label: priceLabel,
    alias_spec: aliasSpec,
    preferred_brand: preferredBrand,
  };
}

function scoreMaterialCandidate(row, derivedMaterial, unit, supplierId) {
  let score = 0;
  if (derivedMaterial?.display_name) score += 0.35;
  if (unit) score += 0.2;
  if (isMaterialFocusedSource(row)) score += 0.2;
  if (row.price_value !== null || (row.price_min !== null && row.price_max !== null)) score += 0.15;
  if (inferMaterialGroup(derivedMaterial?.display_name, row.kb_title) !== 'other') score += 0.05;
  if (supplierId) score += 0.05;
  if (derivedMaterial?.price_label) score -= 0.03;
  return clampScore(score);
}

function isValidPriceShape(row) {
  if (row.price_value !== null) return row.price_value > 0 && row.price_value < 1000000;
  if (row.price_min !== null && row.price_max !== null) {
    return row.price_min > 0 && row.price_max >= row.price_min && row.price_max < 1000000;
  }
  return false;
}

function ensureNormalizedTablesExist() {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('normalized_suppliers', 'normalized_material_prices')
  `).all().map((row) => row.name);

  if (!tables.includes('normalized_suppliers') || !tables.includes('normalized_material_prices')) {
    throw new Error('normalized tables not found; run export-normalize-db.mjs first');
  }
}

ensureNormalizedTablesExist();

db.exec(`
  DROP TABLE IF EXISTS material_price_quotes;
  DROP TABLE IF EXISTS material_catalog;
  DROP TABLE IF EXISTS supplier_contacts;
  DROP TABLE IF EXISTS suppliers;

  CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    name_th TEXT,
    name_en TEXT,
    supplier_kind TEXT NOT NULL DEFAULT 'unknown' CHECK (supplier_kind IN ('manufacturer', 'retailer', 'distributor', 'unknown')),
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_kb_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_row_id INTEGER NOT NULL REFERENCES normalized_suppliers(id) ON DELETE CASCADE,
    raw_supplier_name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE supplier_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_key TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'line', 'email', 'website')),
    contact_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    contact_label TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_kb_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_row_id INTEGER NOT NULL REFERENCES normalized_suppliers(id) ON DELETE CASCADE,
    raw_contact_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE material_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    material_group TEXT NOT NULL DEFAULT 'other',
    brand_name TEXT,
    series_name TEXT,
    specification TEXT,
    size_mm REAL,
    size_inch TEXT,
    grade_code TEXT,
    width_mm REAL,
    height_mm REAL,
    thickness_mm REAL,
    thickness_mm_min REAL,
    thickness_mm_max REAL,
    cross_section_sqmm_min REAL,
    cross_section_sqmm_max REAL,
    strength_kg_per_cm2 REAL,
    default_unit TEXT,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_kb_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_row_id INTEGER NOT NULL REFERENCES normalized_material_prices(id) ON DELETE CASCADE,
    raw_material_name TEXT NOT NULL,
    raw_variant_label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE material_price_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_key TEXT NOT NULL UNIQUE,
    material_id INTEGER NOT NULL REFERENCES material_catalog(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    price_type TEXT NOT NULL CHECK (price_type IN ('single', 'range')),
    price_label TEXT,
    unit TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
    price_value REAL,
    price_min REAL,
    price_max REAL,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_kb_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_row_id INTEGER NOT NULL REFERENCES normalized_material_prices(id) ON DELETE CASCADE,
    raw_price_text TEXT NOT NULL,
    raw_line TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
      (price_type = 'single' AND price_value IS NOT NULL AND price_min IS NULL AND price_max IS NULL)
      OR
      (price_type = 'range' AND price_value IS NULL AND price_min IS NOT NULL AND price_max IS NOT NULL AND price_max >= price_min)
    )
  );

  CREATE INDEX idx_suppliers_normalized_name ON suppliers(normalized_name);
  CREATE INDEX idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
  CREATE INDEX idx_material_catalog_normalized_name ON material_catalog(normalized_name);
  CREATE INDEX idx_material_catalog_group ON material_catalog(material_group);
  CREATE INDEX idx_material_catalog_series_name ON material_catalog(series_name);
  CREATE INDEX idx_material_catalog_size_mm ON material_catalog(size_mm);
  CREATE INDEX idx_material_catalog_grade_code ON material_catalog(grade_code);
  CREATE INDEX idx_material_catalog_width_mm ON material_catalog(width_mm);
  CREATE INDEX idx_material_catalog_height_mm ON material_catalog(height_mm);
  CREATE INDEX idx_material_catalog_thickness_mm ON material_catalog(thickness_mm);
  CREATE INDEX idx_material_catalog_thickness_mm_min ON material_catalog(thickness_mm_min);
  CREATE INDEX idx_material_catalog_thickness_mm_max ON material_catalog(thickness_mm_max);
  CREATE INDEX idx_material_catalog_cross_section_sqmm_min ON material_catalog(cross_section_sqmm_min);
  CREATE INDEX idx_material_catalog_strength_kg_per_cm2 ON material_catalog(strength_kg_per_cm2);
  CREATE INDEX idx_material_price_quotes_material_id ON material_price_quotes(material_id);
  CREATE INDEX idx_material_price_quotes_supplier_id ON material_price_quotes(supplier_id);
`);

const normalizedSupplierRows = db.prepare(`
  SELECT
    id,
    kb_id,
    kb_category,
    kb_title,
    supplier_name,
    section_heading,
    strengths,
    contact_raw,
    phone_numbers,
    line_ids,
    website_urls,
    branch_info,
    b2b_notes,
    source,
    priority,
    raw_section
  FROM normalized_suppliers
  ORDER BY id
`).all();

const normalizedMaterialRows = db.prepare(`
  SELECT
    id,
    kb_id,
    kb_category,
    kb_title,
    section_title,
    supplier_name,
    material_name,
    variant_label,
    unit,
    price_min,
    price_max,
    price_value,
    currency,
    raw_price_text,
    raw_line,
    source,
    priority
  FROM normalized_material_prices
  ORDER BY id
`).all();

const supplierCandidates = new Map();
let supplierRejectedCount = 0;

for (const row of normalizedSupplierRows) {
  const contacts = parseSupplierContacts(row);
  const score = scoreSupplierCandidate(row, contacts);
  if (!isHighConfidenceSupplier(row, contacts, score)) {
    supplierRejectedCount += 1;
    continue;
  }

  const names = splitBilingualName(row.supplier_name);
  const canonicalName = cleanHeading(names.primary_name || row.supplier_name);
  const supplierKey = buildKey(canonicalName);
  if (!supplierKey) {
    supplierRejectedCount += 1;
    continue;
  }

  const notes = uniqueStrings([cleanHeading(row.strengths), cleanHeading(row.b2b_notes), cleanHeading(row.branch_info)]).join(' | ') || null;
  const candidate = supplierCandidates.get(supplierKey) || {
    supplier_key: supplierKey,
    display_name: cleanHeading(row.supplier_name),
    normalized_name: supplierKey.replace(/_/g, ' '),
    name_th: names.name_th,
    name_en: names.name_en,
    supplier_kind: inferSupplierKind(row),
    confidence_score: score,
    source_kb_id: row.kb_id,
    source_title: row.kb_title,
    source_row_id: row.id,
    raw_supplier_name: row.supplier_name,
    notes,
    contacts: new Map(),
  };

  if (score > candidate.confidence_score) {
    candidate.display_name = cleanHeading(row.supplier_name);
    candidate.name_th = names.name_th;
    candidate.name_en = names.name_en;
    candidate.supplier_kind = inferSupplierKind(row);
    candidate.confidence_score = score;
    candidate.source_kb_id = row.kb_id;
    candidate.source_title = row.kb_title;
    candidate.source_row_id = row.id;
    candidate.raw_supplier_name = row.supplier_name;
    candidate.notes = notes;
  } else if (!candidate.notes && notes) {
    candidate.notes = notes;
  }

  const contactBuckets = [
    ['phone', contacts.phones, 0.96],
    ['line', contacts.lines, 0.94],
    ['email', contacts.emails, 0.92],
    ['website', contacts.websites, 0.9],
  ];

  for (const [contactType, values, baseConfidence] of contactBuckets) {
    values.forEach((value, index) => {
      const contactKey = `${supplierKey}:${contactType}:${value.normalized}`;
      const existingContact = candidate.contacts.get(contactKey);
      const contactRecord = {
        contact_key: contactKey,
        contact_type: contactType,
        contact_value: value.display,
        normalized_value: value.normalized,
        contact_label: contactType === 'phone' && cleanHeading(row.branch_info) ? cleanHeading(row.branch_info) : null,
        is_primary: index === 0 ? 1 : 0,
        confidence_score: clampScore(Math.min(score, baseConfidence)),
        source_kb_id: row.kb_id,
        source_title: row.kb_title,
        source_row_id: row.id,
        raw_contact_text: contacts.sourceText,
      };

      if (!existingContact || contactRecord.confidence_score > existingContact.confidence_score) {
        candidate.contacts.set(contactKey, contactRecord);
      }
    });
  }

  supplierCandidates.set(supplierKey, candidate);
}

const insertSupplier = db.prepare(`
  INSERT INTO suppliers (
    supplier_key,
    display_name,
    normalized_name,
    name_th,
    name_en,
    supplier_kind,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_supplier_name,
    notes
  ) VALUES (
    @supplier_key,
    @display_name,
    @normalized_name,
    @name_th,
    @name_en,
    @supplier_kind,
    @confidence_score,
    @source_kb_id,
    @source_title,
    @source_row_id,
    @raw_supplier_name,
    @notes
  )
`);

const insertSupplierContact = db.prepare(`
  INSERT INTO supplier_contacts (
    contact_key,
    supplier_id,
    contact_type,
    contact_value,
    normalized_value,
    contact_label,
    is_primary,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_contact_text
  ) VALUES (
    @contact_key,
    @supplier_id,
    @contact_type,
    @contact_value,
    @normalized_value,
    @contact_label,
    @is_primary,
    @confidence_score,
    @source_kb_id,
    @source_title,
    @source_row_id,
    @raw_contact_text
  )
`);

const supplierIdByKey = new Map();
const acceptedSuppliers = [...supplierCandidates.values()].sort((left, right) => left.display_name.localeCompare(right.display_name, 'th'));

db.transaction(() => {
  for (const candidate of acceptedSuppliers) {
    const result = insertSupplier.run(candidate);
    supplierIdByKey.set(candidate.supplier_key, Number(result.lastInsertRowid));
  }

  for (const candidate of acceptedSuppliers) {
    const supplierId = supplierIdByKey.get(candidate.supplier_key);
    for (const contact of candidate.contacts.values()) {
      insertSupplierContact.run({
        ...contact,
        supplier_id: supplierId,
      });
    }
  }
})();

let materialRejectedCount = 0;

const insertMaterialCatalog = db.prepare(`
  INSERT INTO material_catalog (
    material_key,
    display_name,
    normalized_name,
    material_group,
    brand_name,
    series_name,
    specification,
    size_mm,
    size_inch,
    grade_code,
    width_mm,
    height_mm,
    thickness_mm,
    thickness_mm_min,
    thickness_mm_max,
    cross_section_sqmm_min,
    cross_section_sqmm_max,
    strength_kg_per_cm2,
    default_unit,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_material_name,
    raw_variant_label
  ) VALUES (
    @material_key,
    @display_name,
    @normalized_name,
    @material_group,
    @brand_name,
    @series_name,
    @specification,
    @size_mm,
    @size_inch,
    @grade_code,
    @width_mm,
    @height_mm,
    @thickness_mm,
    @thickness_mm_min,
    @thickness_mm_max,
    @cross_section_sqmm_min,
    @cross_section_sqmm_max,
    @strength_kg_per_cm2,
    @default_unit,
    @confidence_score,
    @source_kb_id,
    @source_title,
    @source_row_id,
    @raw_material_name,
    @raw_variant_label
  )
`);

const updateMaterialCatalog = db.prepare(`
  UPDATE material_catalog
  SET series_name = @series_name,
      specification = @specification,
      size_mm = @size_mm,
      size_inch = @size_inch,
      grade_code = @grade_code,
      width_mm = @width_mm,
      height_mm = @height_mm,
      thickness_mm = @thickness_mm,
      thickness_mm_min = @thickness_mm_min,
      thickness_mm_max = @thickness_mm_max,
      cross_section_sqmm_min = @cross_section_sqmm_min,
      cross_section_sqmm_max = @cross_section_sqmm_max,
      strength_kg_per_cm2 = @strength_kg_per_cm2,
      source_kb_id = @source_kb_id,
      source_title = @source_title,
      source_row_id = @source_row_id,
      raw_material_name = @raw_material_name,
      raw_variant_label = @raw_variant_label
  WHERE id = @id
`);

const insertMaterialQuote = db.prepare(`
  INSERT INTO material_price_quotes (
    quote_key,
    material_id,
    supplier_id,
    price_type,
    price_label,
    unit,
    currency,
    price_value,
    price_min,
    price_max,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_price_text,
    raw_line
  ) VALUES (
    @quote_key,
    @material_id,
    @supplier_id,
    @price_type,
    @price_label,
    @unit,
    @currency,
    @price_value,
    @price_min,
    @price_max,
    @confidence_score,
    @source_kb_id,
    @source_title,
    @source_row_id,
    @raw_price_text,
    @raw_line
  )
`);

const materialIdByKey = new Map();
const materialRecordByKey = new Map();

db.transaction(() => {
  for (const row of normalizedMaterialRows) {
    if (!isMaterialFocusedSource(row)) {
      materialRejectedCount += 1;
      continue;
    }

    if (!isValidPriceShape(row)) {
      materialRejectedCount += 1;
      continue;
    }

    const derivedMaterial = deriveMaterialCandidate(row);
    if (!derivedMaterial) {
      materialRejectedCount += 1;
      continue;
    }

    const unitHint = extractUnitHint(row.raw_price_text)
      || extractUnitHint(row.material_name)
      || extractUnitHint(derivedMaterial.display_name)
      || sanitizeUnit(row.unit)
      || sanitizeUnit(derivedMaterial.alias_spec);
    if (!unitHint) {
      materialRejectedCount += 1;
      continue;
    }

    const supplierKey = buildKey(splitBilingualName(row.supplier_name).primary_name || row.supplier_name);
    const supplierId = supplierIdByKey.get(supplierKey) || null;
    const score = scoreMaterialCandidate(row, derivedMaterial, unitHint, supplierId);
    if (score < 0.75) {
      materialRejectedCount += 1;
      continue;
    }

    const materialGroup = inferMaterialGroup(derivedMaterial.display_name, row.kb_title);
    const unitParts = splitUnitMetadata(unitHint, derivedMaterial.display_name);
    let defaultUnit = unitParts.default_unit;
    const brandName = inferBrandName(derivedMaterial.display_name, row.supplier_name, derivedMaterial.preferred_brand);

    if (materialGroup === 'paint' && (!defaultUnit || defaultUnit === 'ลิตร') && /\d+(?:\.\d+)?\s*ลิตร/i.test(`${derivedMaterial.alias_spec || ''} ${unitParts.unit_spec || ''} ${derivedMaterial.display_name}`)) {
      defaultUnit = 'ถัง';
    }

    const specification = mergeSpecificationParts([
      derivedMaterial.alias_spec,
      extractSpecification(derivedMaterial.display_name),
      cleanHeading(row.variant_label),
      unitParts.unit_spec,
    ], {
      displayName: derivedMaterial.display_name,
      brandName,
      defaultUnit,
    });

    if (!defaultUnit) {
      materialRejectedCount += 1;
      continue;
    }

    const enrichment = extractCatalogEnrichment({
      displayName: derivedMaterial.display_name,
      brandName,
      materialGroup,
      specification,
    });
    const dimensionEnrichment = extractDimensionEnrichment({
      displayName: derivedMaterial.display_name,
      specification,
      materialGroup,
    });

    const materialKey = buildKey([
      derivedMaterial.display_name,
      brandName || '',
      shouldUseSpecificationInMaterialKey(derivedMaterial.display_name, materialGroup) ? (specification || '') : '',
      defaultUnit,
    ].join(' | '));

    let materialId = materialIdByKey.get(materialKey);
    if (!materialId) {
      const result = insertMaterialCatalog.run({
        material_key: materialKey,
        display_name: derivedMaterial.display_name,
        normalized_name: buildKey(derivedMaterial.display_name).replace(/_/g, ' '),
        material_group: materialGroup,
        brand_name: brandName,
        series_name: enrichment.series_name,
        specification,
        size_mm: enrichment.size_mm,
        size_inch: enrichment.size_inch,
        grade_code: enrichment.grade_code,
        width_mm: dimensionEnrichment.width_mm,
        height_mm: dimensionEnrichment.height_mm,
        thickness_mm: dimensionEnrichment.thickness_mm,
        thickness_mm_min: dimensionEnrichment.thickness_mm_min,
        thickness_mm_max: dimensionEnrichment.thickness_mm_max,
        cross_section_sqmm_min: dimensionEnrichment.cross_section_sqmm_min,
        cross_section_sqmm_max: dimensionEnrichment.cross_section_sqmm_max,
        strength_kg_per_cm2: dimensionEnrichment.strength_kg_per_cm2,
        default_unit: defaultUnit,
        confidence_score: score,
        source_kb_id: row.kb_id,
        source_title: row.kb_title,
        source_row_id: row.id,
        raw_material_name: row.material_name,
        raw_variant_label: row.variant_label,
      });
      materialId = Number(result.lastInsertRowid);
      materialIdByKey.set(materialKey, materialId);
      materialRecordByKey.set(materialKey, {
        id: materialId,
        series_name: enrichment.series_name,
        specification,
        size_mm: enrichment.size_mm,
        size_inch: enrichment.size_inch,
        grade_code: enrichment.grade_code,
        width_mm: dimensionEnrichment.width_mm,
        height_mm: dimensionEnrichment.height_mm,
        thickness_mm: dimensionEnrichment.thickness_mm,
        thickness_mm_min: dimensionEnrichment.thickness_mm_min,
        thickness_mm_max: dimensionEnrichment.thickness_mm_max,
        cross_section_sqmm_min: dimensionEnrichment.cross_section_sqmm_min,
        cross_section_sqmm_max: dimensionEnrichment.cross_section_sqmm_max,
        strength_kg_per_cm2: dimensionEnrichment.strength_kg_per_cm2,
      });
    } else {
      const existingRecord = materialRecordByKey.get(materialKey);
      if (existingRecord) {
        const mergedSpecification = specificationRichness(specification) > specificationRichness(existingRecord.specification)
          ? specification
          : existingRecord.specification;
        const mergedSeriesName = existingRecord.series_name || enrichment.series_name;
        const mergedSizeMm = existingRecord.size_mm ?? enrichment.size_mm;
        const mergedSizeInch = existingRecord.size_inch || enrichment.size_inch;
        const mergedGradeCode = existingRecord.grade_code || enrichment.grade_code;
        const mergedWidthMm = existingRecord.width_mm ?? dimensionEnrichment.width_mm;
        const mergedHeightMm = existingRecord.height_mm ?? dimensionEnrichment.height_mm;
        const mergedThicknessMm = existingRecord.thickness_mm ?? dimensionEnrichment.thickness_mm;
        const mergedThicknessMmMin = existingRecord.thickness_mm_min ?? dimensionEnrichment.thickness_mm_min;
        const mergedThicknessMmMax = existingRecord.thickness_mm_max ?? dimensionEnrichment.thickness_mm_max;
        const mergedCrossSectionSqmmMin = existingRecord.cross_section_sqmm_min ?? dimensionEnrichment.cross_section_sqmm_min;
        const mergedCrossSectionSqmmMax = existingRecord.cross_section_sqmm_max ?? dimensionEnrichment.cross_section_sqmm_max;
        const mergedStrengthKgPerCm2 = existingRecord.strength_kg_per_cm2 ?? dimensionEnrichment.strength_kg_per_cm2;
        const shouldUpdate =
          mergedSpecification !== existingRecord.specification
          || mergedSeriesName !== existingRecord.series_name
          || mergedSizeMm !== existingRecord.size_mm
          || mergedSizeInch !== existingRecord.size_inch
          || mergedGradeCode !== existingRecord.grade_code
          || mergedWidthMm !== existingRecord.width_mm
          || mergedHeightMm !== existingRecord.height_mm
          || mergedThicknessMm !== existingRecord.thickness_mm
          || mergedThicknessMmMin !== existingRecord.thickness_mm_min
          || mergedThicknessMmMax !== existingRecord.thickness_mm_max
          || mergedCrossSectionSqmmMin !== existingRecord.cross_section_sqmm_min
          || mergedCrossSectionSqmmMax !== existingRecord.cross_section_sqmm_max
          || mergedStrengthKgPerCm2 !== existingRecord.strength_kg_per_cm2;

        if (shouldUpdate) {
          updateMaterialCatalog.run({
            id: materialId,
            series_name: mergedSeriesName,
            specification: mergedSpecification,
            size_mm: mergedSizeMm,
            size_inch: mergedSizeInch,
            grade_code: mergedGradeCode,
            width_mm: mergedWidthMm,
            height_mm: mergedHeightMm,
            thickness_mm: mergedThicknessMm,
            thickness_mm_min: mergedThicknessMmMin,
            thickness_mm_max: mergedThicknessMmMax,
            cross_section_sqmm_min: mergedCrossSectionSqmmMin,
            cross_section_sqmm_max: mergedCrossSectionSqmmMax,
            strength_kg_per_cm2: mergedStrengthKgPerCm2,
            source_kb_id: row.kb_id,
            source_title: row.kb_title,
            source_row_id: row.id,
            raw_material_name: row.material_name,
            raw_variant_label: row.variant_label,
          });
          existingRecord.series_name = mergedSeriesName;
          existingRecord.specification = mergedSpecification;
          existingRecord.size_mm = mergedSizeMm;
          existingRecord.size_inch = mergedSizeInch;
          existingRecord.grade_code = mergedGradeCode;
          existingRecord.width_mm = mergedWidthMm;
          existingRecord.height_mm = mergedHeightMm;
          existingRecord.thickness_mm = mergedThicknessMm;
          existingRecord.thickness_mm_min = mergedThicknessMmMin;
          existingRecord.thickness_mm_max = mergedThicknessMmMax;
          existingRecord.cross_section_sqmm_min = mergedCrossSectionSqmmMin;
          existingRecord.cross_section_sqmm_max = mergedCrossSectionSqmmMax;
          existingRecord.strength_kg_per_cm2 = mergedStrengthKgPerCm2;
        }
      }
    }

    const priceType = row.price_value !== null ? 'single' : 'range';
    const quoteKey = buildKey([
      materialKey,
      supplierKey || 'none',
      derivedMaterial.price_label || '',
      defaultUnit,
      row.price_value ?? '',
      row.price_min ?? '',
      row.price_max ?? '',
      row.id,
    ].join(' | '));

    insertMaterialQuote.run({
      quote_key: quoteKey,
      material_id: materialId,
      supplier_id: supplierId,
      price_type: priceType,
      price_label: derivedMaterial.price_label,
      unit: defaultUnit,
      currency: row.currency || 'THB',
      price_value: row.price_value,
      price_min: row.price_min,
      price_max: row.price_max,
      confidence_score: score,
      source_kb_id: row.kb_id,
      source_title: row.kb_title,
      source_row_id: row.id,
      raw_price_text: row.raw_price_text,
      raw_line: row.raw_line,
    });
  }
})();

const deleteMaterialCatalog = db.prepare(`
  DELETE FROM material_catalog
  WHERE id = ?
`);

db.transaction(() => {
  db.prepare(`
    UPDATE material_catalog
    SET material_group = 'electrical'
    WHERE display_name LIKE 'สายไฟ %'
  `).run();

  db.prepare(`
    UPDATE material_catalog
    SET material_group = 'pipe'
    WHERE display_name LIKE 'ท่อ %PVC%'
       OR display_name LIKE 'ท่อน้ำ%'
       OR display_name LIKE 'ท่อทิ้ง%'
  `).run();

  db.prepare(`
    UPDATE material_catalog
    SET material_group = 'doors_windows'
    WHERE source_title LIKE 'งานประตู-หน้าต่าง%'
       OR display_name LIKE 'ประตู %'
       OR display_name LIKE 'ระบบ uPVC%'
       OR display_name LIKE 'อลูมิเนียม %'
  `).run();

  db.prepare(`
    UPDATE material_catalog
    SET material_group = 'hardware'
    WHERE display_name LIKE '%Soft-close%'
  `).run();

  db.prepare(`
    UPDATE material_catalog
    SET material_group = 'surface_finish'
    WHERE display_name LIKE '%HPL%'
       OR display_name LIKE 'ปิดผิวลามิเนต%'
  `).run();

  db.prepare(`
    DELETE FROM material_catalog
    WHERE display_name LIKE 'เกรด %'
  `).run();

  const cleanupRows = db.prepare(`
    SELECT id, display_name, source_title
    FROM material_catalog
  `).all();

  for (const row of cleanupRows) {
    const displayName = cleanHeading(row.display_name);
    if (rejectedMaterialNamePattern.test(displayName) || rejectedMaterialTitlePattern.test(row.source_title)) {
      deleteMaterialCatalog.run(row.id);
    }
  }
})();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(','));
  }
  writeFileSync(filePath, `\uFEFF${lines.join('\n')}`, 'utf8');
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

const exportedSuppliers = db.prepare(`
  SELECT
    id,
    supplier_key,
    display_name,
    normalized_name,
    name_th,
    name_en,
    supplier_kind,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_supplier_name,
    notes,
    created_at
  FROM suppliers
  ORDER BY display_name, id
`).all();

const exportedSupplierContacts = db.prepare(`
  SELECT
    id,
    supplier_id,
    contact_type,
    contact_value,
    normalized_value,
    contact_label,
    is_primary,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    created_at
  FROM supplier_contacts
  ORDER BY supplier_id, contact_type, is_primary DESC, id
`).all();

const exportedMaterialCatalog = db.prepare(`
  SELECT
    id,
    material_key,
    display_name,
    normalized_name,
    material_group,
    brand_name,
    series_name,
    specification,
    size_mm,
    size_inch,
    grade_code,
    width_mm,
    height_mm,
    thickness_mm,
    thickness_mm_min,
    thickness_mm_max,
    cross_section_sqmm_min,
    cross_section_sqmm_max,
    strength_kg_per_cm2,
    default_unit,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_material_name,
    raw_variant_label,
    created_at
  FROM material_catalog
  ORDER BY material_group, display_name, id
`).all();

const exportedMaterialQuotes = db.prepare(`
  SELECT
    id,
    material_id,
    supplier_id,
    price_type,
    price_label,
    unit,
    currency,
    price_value,
    price_min,
    price_max,
    confidence_score,
    source_kb_id,
    source_title,
    source_row_id,
    raw_price_text,
    raw_line,
    created_at
  FROM material_price_quotes
  ORDER BY material_id, supplier_id, id
`).all();

writeJson(resolve(outputDir, 'suppliers.json'), exportedSuppliers);
writeCsv(resolve(outputDir, 'suppliers.csv'), exportedSuppliers, [
  'id',
  'supplier_key',
  'display_name',
  'normalized_name',
  'name_th',
  'name_en',
  'supplier_kind',
  'confidence_score',
  'source_kb_id',
  'source_title',
  'source_row_id',
  'raw_supplier_name',
  'notes',
  'created_at',
]);

writeJson(resolve(outputDir, 'supplier_contacts.json'), exportedSupplierContacts);
writeCsv(resolve(outputDir, 'supplier_contacts.csv'), exportedSupplierContacts, [
  'id',
  'supplier_id',
  'contact_type',
  'contact_value',
  'normalized_value',
  'contact_label',
  'is_primary',
  'confidence_score',
  'source_kb_id',
  'source_title',
  'source_row_id',
  'created_at',
]);

writeJson(resolve(outputDir, 'material_catalog.json'), exportedMaterialCatalog);
writeCsv(resolve(outputDir, 'material_catalog.csv'), exportedMaterialCatalog, [
  'id',
  'material_key',
  'display_name',
  'normalized_name',
  'material_group',
  'brand_name',
  'series_name',
  'specification',
  'size_mm',
  'size_inch',
  'grade_code',
  'width_mm',
  'height_mm',
  'thickness_mm',
  'thickness_mm_min',
  'thickness_mm_max',
  'cross_section_sqmm_min',
  'cross_section_sqmm_max',
  'strength_kg_per_cm2',
  'default_unit',
  'confidence_score',
  'source_kb_id',
  'source_title',
  'source_row_id',
  'raw_material_name',
  'raw_variant_label',
  'created_at',
]);

writeJson(resolve(outputDir, 'material_price_quotes.json'), exportedMaterialQuotes);
writeCsv(resolve(outputDir, 'material_price_quotes.csv'), exportedMaterialQuotes, [
  'id',
  'material_id',
  'supplier_id',
  'price_type',
  'price_label',
  'unit',
  'currency',
  'price_value',
  'price_min',
  'price_max',
  'confidence_score',
  'source_kb_id',
  'source_title',
  'source_row_id',
  'raw_price_text',
  'raw_line',
  'created_at',
]);

const summary = {
  dbPath,
  outputDir,
  normalized_suppliers_rows: normalizedSupplierRows.length,
  normalized_material_rows: normalizedMaterialRows.length,
  suppliers_rows: exportedSuppliers.length,
  supplier_contacts_rows: exportedSupplierContacts.length,
  material_catalog_rows: exportedMaterialCatalog.length,
  material_price_quotes_rows: exportedMaterialQuotes.length,
  material_catalog_series_rows: exportedMaterialCatalog.filter((row) => row.series_name).length,
  material_catalog_size_mm_rows: exportedMaterialCatalog.filter((row) => row.size_mm !== null).length,
  material_catalog_size_inch_rows: exportedMaterialCatalog.filter((row) => row.size_inch).length,
  material_catalog_grade_code_rows: exportedMaterialCatalog.filter((row) => row.grade_code).length,
  material_catalog_width_rows: exportedMaterialCatalog.filter((row) => row.width_mm !== null).length,
  material_catalog_height_rows: exportedMaterialCatalog.filter((row) => row.height_mm !== null).length,
  material_catalog_thickness_rows: exportedMaterialCatalog.filter((row) => row.thickness_mm !== null).length,
  material_catalog_thickness_bound_rows: exportedMaterialCatalog.filter((row) => row.thickness_mm_min !== null || row.thickness_mm_max !== null).length,
  material_catalog_thickness_actual_range_rows: exportedMaterialCatalog.filter((row) => row.thickness_mm_min !== null && row.thickness_mm_max !== null && row.thickness_mm_min !== row.thickness_mm_max).length,
  material_catalog_cross_section_rows: exportedMaterialCatalog.filter((row) => row.cross_section_sqmm_min !== null).length,
  material_catalog_strength_rows: exportedMaterialCatalog.filter((row) => row.strength_kg_per_cm2 !== null).length,
  suppliers_rejected_rows: supplierRejectedCount,
  material_rejected_rows: materialRejectedCount,
};

writeJson(resolve(outputDir, 'strict-schema-summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));

db.close();
