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

const supplierLabelPatterns = [
  /ช่องทางติดต่อ/i,
  /ข้อมูลติดต่อ/i,
  /ราคาวัสดุ/i,
  /ราคาตลาด/i,
  /ราคาอ้างอิง/i,
  /ส่วนลด/i,
  /จุดเด่น/i,
  /ฐานข้อมูล/i,
  /หมวด/i,
  /project sales/i,
  /project rate/i,
  /^b2b$/i,
  /call center/i,
  /website/i,
  /line official/i,
  /^action$/i,
  /^line oa$/i,
  /^tier\b/i,
  /^รายชื่อซัพพลายเออร์/i,
  /^ฝ่ายขายโครงการ/i,
  /^ข้อมูลติดต่อตัวแทน/i,
];

const materialHintPatterns = [
  /วัสดุ/i,
  /ปูน/i,
  /cement/i,
  /เหล็ก/i,
  /steel/i,
  /กระเบื้อง/i,
  /tile/i,
  /สี/i,
  /paint/i,
  /สุขภัณฑ์/i,
  /sanitary/i,
  /ท่อ/i,
  /pipe/i,
  /ไม้/i,
  /wood/i,
  /หิน/i,
  /stone/i,
  /กระจก/i,
  /glass/i,
  /อิฐ/i,
  /brick/i,
  /ยิปซัม/i,
  /gypsum/i,
  /ฉนวน/i,
  /insulation/i,
  /แอร์/i,
  /air/i,
  /ไฟฟ้า/i,
  /consumer unit/i,
  /สายไฟ/i,
  /หลังคา/i,
  /roof/i,
  /อลูมิเนียม/i,
  /built-?in/i,
  /หน้าต่าง/i,
  /ประตู/i,
  /mdf/i,
  /pvc/i,
  /ppr/i,
];

const nonMaterialPatterns = [
  /ภาษี/i,
  /vat/i,
  /ประกันสังคม/i,
  /เงินได้/i,
  /จดทะเบียนบริษัท/i,
  /ทุนจดทะเบียน/i,
  /บัญชี/i,
  /กฎหมาย/i,
  /tax/i,
];

const nonMaterialCategories = new Set([
  'pet_business',
  'sales_marketing',
  'social_media_management',
  'lifestyle_health',
]);

const supplierEntityPatterns = [
  /[A-Z]{2,}/,
  /บริษัท/i,
  /ร้าน/i,
  /โฮมโปร/i,
  /ไทวัสดุ/i,
  /บุญถาวร/i,
  /โกลบอลเฮ้าส์/i,
  /โรงงาน/i,
];

function looksLikeSupplierEntity(value = '') {
  return supplierEntityPatterns.some((pattern) => pattern.test(value));
}

function normalizeText(value = '') {
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
    .replace(/^[0-9]+[.)]?\s*/, '')
    .replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/u, '')
    .replace(/:\s*$/, '')
    .trim();
}

function isLikelySupplierName(value = '') {
  const cleaned = cleanHeading(value);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 120) return false;
  if (!/[A-Za-zก-ฮ]/.test(cleaned)) return false;
  return !supplierLabelPatterns.some((pattern) => pattern.test(cleaned));
}

function looksSupplierLikeRow(kbRow) {
  const text = `${kbRow.title}\n${kbRow.content}`;
  return /directory|ซัพพลายเออร์|ข้อมูลติดต่อ|ช่องทางติดต่อ|project rate|project sales|call center/i.test(text);
}

function extractBulletHeading(line) {
  const match = line.match(/^\s*(?:[*-]\s+)?\*\*(.+?)\*\*:?\s*(.*)$/);
  if (!match) return null;
  const heading = cleanHeading(match[1]);
  return isLikelySupplierName(heading) ? heading : null;
}

function splitBySupplierBullets(text) {
  const lines = normalizeText(text).split('\n');
  const sections = [];
  let current = { heading: null, lines: [] };

  const flush = () => {
    const sectionText = current.lines.join('\n').trim();
    if (current.heading || sectionText) {
      sections.push({ heading: current.heading, text: sectionText });
    }
  };

  for (const line of lines) {
    const heading = extractBulletHeading(line);
    if (heading) {
      flush();
      current = { heading, lines: [line] };
      continue;
    }
    current.lines.push(line);
  }

  flush();
  return sections.filter((section) => section.heading);
}

function extractSections(text) {
  const lines = normalizeText(text).split('\n');
  const sections = [];
  let current = { heading: null, lines: [] };

  const flush = () => {
    const sectionText = current.lines.join('\n').trim();
    if (current.heading || sectionText) {
      sections.push({ heading: current.heading, text: sectionText });
    }
  };

  for (const line of lines) {
    if (/^\s*###\s*/.test(line)) {
      flush();
      current = { heading: cleanHeading(line.replace(/^\s*###\s*/, '')), lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  flush();

  if (sections.length === 1 && !sections[0].heading) {
    const nested = splitBySupplierBullets(sections[0].text);
    if (nested.length > 0) return nested;
  }

  return sections;
}

function findFirstLine(text, patterns) {
  const lines = normalizeText(text).split('\n');
  for (const line of lines) {
    const plain = stripMarkdown(line);
    if (patterns.some((pattern) => pattern.test(plain))) {
      return plain;
    }
  }
  return '';
}

function findAllMatches(text, regex) {
  const matches = [];
  for (const match of text.matchAll(regex)) {
    if (match[0]) matches.push(match[0].trim());
  }
  return [...new Set(matches)];
}

function inferSingleSupplierFromTitle(title) {
  const parts = title.split('—').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const candidate = parts.slice(1).join(' — ');
  if (candidate.includes(',')) return null;
  return isLikelySupplierName(candidate) ? candidate : null;
}

function dedupeRows(rows, keyBuilder) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyBuilder(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksMaterialEntry(kbRow) {
  if (nonMaterialCategories.has(kbRow.category)) return false;
  const text = `${kbRow.category}\n${kbRow.title}\n${kbRow.content}`;
  if (nonMaterialPatterns.some((pattern) => pattern.test(text))) return false;
  return materialHintPatterns.some((pattern) => pattern.test(text));
}

function parseSupplierRows(kbRow) {
  if (!looksSupplierLikeRow(kbRow)) return [];

  const sections = extractSections(kbRow.content);
  const baseRows = [];

  if (sections.some((section) => section.heading && isLikelySupplierName(section.heading))) {
    for (const section of sections) {
      if (!section.heading || !isLikelySupplierName(section.heading)) continue;
      baseRows.push({
        kb_id: kbRow.id,
        kb_category: kbRow.category,
        kb_title: kbRow.title,
        supplier_name: section.heading,
        section_heading: section.heading,
        section_text: section.text,
        source: kbRow.source,
        priority: kbRow.priority,
      });
    }
  } else {
    const fallbackName = inferSingleSupplierFromTitle(kbRow.title);
    if (fallbackName) {
      baseRows.push({
        kb_id: kbRow.id,
        kb_category: kbRow.category,
        kb_title: kbRow.title,
        supplier_name: fallbackName,
        section_heading: fallbackName,
        section_text: kbRow.content,
        source: kbRow.source,
        priority: kbRow.priority,
      });
    }
  }

  return dedupeRows(baseRows, (row) => `${row.kb_id}:${row.supplier_name}`).map((row) => {
    const contactLine = findFirstLine(row.section_text, [/ช่องทางติดต่อ/i, /ข้อมูลติดต่อ/i, /call center/i, /line:/i, /website/i]);
    const strengthLine = findFirstLine(row.section_text, [/จุดเด่น/i]);
    const b2bLine = findFirstLine(row.section_text, [/ส่วนลดผู้รับเหมา/i, /project sales/i, /project rate/i, /b2b/i]);
    const branchInfo = findFirstLine(row.section_text, [/สาขา/i]);
    const contactContext = [contactLine, branchInfo, b2bLine].filter(Boolean).join(' | ');

    return {
      kb_id: row.kb_id,
      kb_category: row.kb_category,
      kb_title: row.kb_title,
      supplier_name: row.supplier_name,
      section_heading: row.section_heading,
      strengths: strengthLine,
      contact_raw: contactLine,
      phone_numbers: findAllMatches(contactContext, /(?:\+?\d[\d -]{5,}\d|\b\d{3,4}\b)/g).join(' | '),
      line_ids: findAllMatches(contactContext, /@[A-Za-z0-9._-]+/g).join(' | '),
      website_urls: findAllMatches(contactContext, /https?:\/\/\S+|www\.\S+/g).join(' | '),
      branch_info: branchInfo,
      b2b_notes: b2bLine,
      source: row.source,
      priority: row.priority,
      raw_section: row.section_text.trim(),
    };
  }).filter((row) => {
    const anchor = cleanHeading(row.supplier_name).replace(/\(.*?\)/g, '').split(/[\/,|-]/)[0].trim().toLowerCase();
    const titleMentionsSupplier = anchor.length >= 2 && stripMarkdown(row.kb_title).toLowerCase().includes(anchor);
    const hasContactValueSignal = Boolean(row.phone_numbers || row.line_ids || row.website_urls || row.branch_info);
    const looksLikeEntity = looksLikeSupplierEntity(row.supplier_name);
    return hasContactValueSignal || (titleMentionsSupplier && looksLikeEntity);
  });
}

function parseNumeric(value) {
  if (!value) return null;
  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceFromLine(line, currentMaterialName = '') {
  const plain = stripMarkdown(line);
  if (!plain || !/บาท/.test(plain) || !plain.includes(':')) return null;

  const colonIndex = plain.indexOf(':');
  let lhs = plain.slice(0, colonIndex).trim();
  const rhs = plain.slice(colonIndex + 1).trim();

  const genericMaterialLabel = /^(ราคา|ประมาณราคา|ค่าวัสดุ|price|ต้นทุนเฉลี่ย|ต้นทุน)$/i;
  const variantLabel = /เกรด|standard|premium|value/i.test(lhs) ? lhs : '';

  if (genericMaterialLabel.test(lhs) && currentMaterialName) {
    lhs = currentMaterialName;
  }

  const rangeMatch = rhs.match(/([0-9][0-9,]*(?:\.\d+)?)\s*-\s*([0-9][0-9,]*(?:\.\d+)?)\s*บาท(?:\s*\/\s*|\s+ต่อ\s+)?(.+)?$/i);
  if (rangeMatch) {
    return {
      material_name: lhs,
      variant_label: variantLabel,
      price_min: parseNumeric(rangeMatch[1]),
      price_max: parseNumeric(rangeMatch[2]),
      price_value: null,
      unit: (rangeMatch[3] || '').trim(),
      raw_price_text: rhs,
    };
  }

  const singleMatch = rhs.match(/(?:ประมาณ\s*)?([0-9][0-9,]*(?:\.\d+)?)\s*บาท(?:\s*\/\s*|\s+ต่อ\s+)?(.+)?$/i);
  if (singleMatch) {
    return {
      material_name: lhs,
      variant_label: variantLabel,
      price_min: null,
      price_max: null,
      price_value: parseNumeric(singleMatch[1]),
      unit: (singleMatch[2] || '').trim(),
      raw_price_text: rhs,
    };
  }

  return null;
}

function parseMaterialRows(kbRow) {
  if (!looksMaterialEntry(kbRow)) return [];

  const sections = extractSections(kbRow.content);
  const results = [];
  const supplierDirectoryRow = looksSupplierLikeRow(kbRow);

  for (const section of sections) {
    const lines = normalizeText(section.text).split('\n');
    let currentGroup = section.heading && !isLikelySupplierName(section.heading) ? section.heading : kbRow.title;
    let currentMaterialName = !supplierDirectoryRow && section.heading ? section.heading : '';
    const currentSupplierName = supplierDirectoryRow && section.heading && isLikelySupplierName(section.heading) && looksLikeSupplierEntity(section.heading)
      ? section.heading
      : (supplierDirectoryRow ? inferSingleSupplierFromTitle(kbRow.title) : '');

    for (const rawLine of lines) {
      const plain = stripMarkdown(rawLine);
      if (!plain) continue;

      const supplierBulletHeading = extractBulletHeading(rawLine);
      if (supplierBulletHeading && isLikelySupplierName(supplierBulletHeading)) {
        currentMaterialName = '';
        continue;
      }

      if (!/บาท/.test(plain) && !plain.includes(':')) {
        const heading = cleanHeading(rawLine);
        if (heading) currentGroup = heading;
        continue;
      }

      const headingMatch = rawLine.match(/^\s*(?:[*-]\s+)?\*\*(.+?)\*\*:?\s*(.*)$/);
      if (headingMatch) {
        const heading = cleanHeading(headingMatch[1]);
        if (heading && !supplierLabelPatterns.some((pattern) => pattern.test(heading))) {
          currentMaterialName = heading;
        }
      }

      const parsed = parsePriceFromLine(rawLine, currentMaterialName);
      if (!parsed) continue;
      if (/ค่าแรง|รวมติดตั้ง|ภาษี|ภาษีสูงสุด|ทุนจดทะเบียน/i.test(parsed.raw_price_text)) continue;

      const materialName = parsed.material_name === 'ราคา' && currentMaterialName ? currentMaterialName : parsed.material_name;
      if (!materialName || supplierLabelPatterns.some((pattern) => pattern.test(materialName))) continue;

      let finalMaterialName = cleanHeading(materialName).replace(/^["'-]+/, '').trim();
      let finalVariantLabel = parsed.variant_label;
      if (/^(ราคา|ต้นทุนเฉลี่ย|ต้นทุน)$/i.test(finalMaterialName) && currentMaterialName) {
        finalVariantLabel = finalVariantLabel || finalMaterialName;
        finalMaterialName = currentMaterialName;
      }
      if (/^ขนาด/i.test(materialName) || /^size/i.test(materialName)) {
        finalVariantLabel = materialName;
        finalMaterialName = currentMaterialName || currentGroup || kbRow.title;
      }

      if (/designer|ผู้ออกแบบ|ช่าง|ค่าแรง|ติดตั้ง/i.test(finalMaterialName)) continue;

      results.push({
        kb_id: kbRow.id,
        kb_category: kbRow.category,
        kb_title: kbRow.title,
        section_title: currentGroup,
        supplier_name: currentSupplierName || '',
        material_name: finalMaterialName,
        variant_label: finalVariantLabel,
        unit: parsed.unit,
        price_min: parsed.price_min,
        price_max: parsed.price_max,
        price_value: parsed.price_value,
        currency: 'THB',
        raw_price_text: parsed.raw_price_text,
        raw_line: plain,
        source: kbRow.source,
        priority: kbRow.priority,
      });
    }
  }

  return dedupeRows(
    results.filter((row) => row.material_name && (row.price_value !== null || row.price_min !== null || row.price_max !== null)),
    (row) => [
      row.kb_id,
      row.section_title,
      row.supplier_name,
      row.material_name,
      row.variant_label,
      row.unit,
      row.price_value ?? '',
      row.price_min ?? '',
      row.price_max ?? '',
    ].join(':'),
  );
}

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

db.exec(`
  DROP TABLE IF EXISTS normalized_suppliers;
  DROP TABLE IF EXISTS normalized_material_prices;

  CREATE TABLE normalized_suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_id INTEGER NOT NULL,
    kb_category TEXT NOT NULL,
    kb_title TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    section_heading TEXT,
    strengths TEXT,
    contact_raw TEXT,
    phone_numbers TEXT,
    line_ids TEXT,
    website_urls TEXT,
    branch_info TEXT,
    b2b_notes TEXT,
    source TEXT,
    priority INTEGER,
    raw_section TEXT,
    extracted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE normalized_material_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_id INTEGER NOT NULL,
    kb_category TEXT NOT NULL,
    kb_title TEXT NOT NULL,
    section_title TEXT,
    supplier_name TEXT,
    material_name TEXT NOT NULL,
    variant_label TEXT,
    unit TEXT,
    price_min REAL,
    price_max REAL,
    price_value REAL,
    currency TEXT DEFAULT 'THB',
    raw_price_text TEXT,
    raw_line TEXT,
    source TEXT,
    priority INTEGER,
    extracted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_normalized_suppliers_kb_id ON normalized_suppliers(kb_id);
  CREATE INDEX idx_normalized_suppliers_name ON normalized_suppliers(supplier_name);
  CREATE INDEX idx_normalized_material_prices_kb_id ON normalized_material_prices(kb_id);
  CREATE INDEX idx_normalized_material_prices_material_name ON normalized_material_prices(material_name);
  CREATE INDEX idx_normalized_material_prices_supplier_name ON normalized_material_prices(supplier_name);
`);

const knowledgeBaseRows = db.prepare(`
  SELECT
    id,
    category,
    title,
    content,
    keywords,
    source,
    priority,
    created_at,
    updated_at
  FROM knowledge_base
  ORDER BY id
`).all();

const supplierRows = knowledgeBaseRows.flatMap(parseSupplierRows);
const materialRows = knowledgeBaseRows.flatMap(parseMaterialRows);

const insertSupplier = db.prepare(`
  INSERT INTO normalized_suppliers (
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
  ) VALUES (
    @kb_id,
    @kb_category,
    @kb_title,
    @supplier_name,
    @section_heading,
    @strengths,
    @contact_raw,
    @phone_numbers,
    @line_ids,
    @website_urls,
    @branch_info,
    @b2b_notes,
    @source,
    @priority,
    @raw_section
  )
`);

const insertMaterial = db.prepare(`
  INSERT INTO normalized_material_prices (
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
  ) VALUES (
    @kb_id,
    @kb_category,
    @kb_title,
    @section_title,
    @supplier_name,
    @material_name,
    @variant_label,
    @unit,
    @price_min,
    @price_max,
    @price_value,
    @currency,
    @raw_price_text,
    @raw_line,
    @source,
    @priority
  )
`);

const insertAll = db.transaction(() => {
  for (const row of supplierRows) insertSupplier.run(row);
  for (const row of materialRows) insertMaterial.run(row);
});

insertAll();

const exportedKnowledgeBase = db.prepare(`
  SELECT
    id,
    category,
    title,
    content,
    keywords,
    source,
    priority,
    created_at,
    updated_at
  FROM knowledge_base
  ORDER BY id
`).all();

const exportedSuppliers = db.prepare(`
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
    extracted_at
  FROM normalized_suppliers
  ORDER BY supplier_name, kb_id, id
`).all();

const exportedMaterialPrices = db.prepare(`
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
    source,
    priority,
    extracted_at
  FROM normalized_material_prices
  ORDER BY material_name, supplier_name, kb_id, id
`).all();

writeJson(resolve(outputDir, 'knowledge_base.json'), exportedKnowledgeBase);
writeCsv(resolve(outputDir, 'knowledge_base.csv'), exportedKnowledgeBase, [
  'id',
  'category',
  'title',
  'content',
  'keywords',
  'source',
  'priority',
  'created_at',
  'updated_at',
]);

writeJson(resolve(outputDir, 'normalized_suppliers.json'), exportedSuppliers);
writeCsv(resolve(outputDir, 'normalized_suppliers.csv'), exportedSuppliers, [
  'id',
  'kb_id',
  'kb_category',
  'kb_title',
  'supplier_name',
  'section_heading',
  'strengths',
  'contact_raw',
  'phone_numbers',
  'line_ids',
  'website_urls',
  'branch_info',
  'b2b_notes',
  'source',
  'priority',
  'extracted_at',
]);

writeJson(resolve(outputDir, 'normalized_material_prices.json'), exportedMaterialPrices);
writeCsv(resolve(outputDir, 'normalized_material_prices.csv'), exportedMaterialPrices, [
  'id',
  'kb_id',
  'kb_category',
  'kb_title',
  'section_title',
  'supplier_name',
  'material_name',
  'variant_label',
  'unit',
  'price_min',
  'price_max',
  'price_value',
  'currency',
  'raw_price_text',
  'source',
  'priority',
  'extracted_at',
]);

const summary = {
  dbPath,
  outputDir,
  knowledge_base_rows: exportedKnowledgeBase.length,
  normalized_suppliers_rows: exportedSuppliers.length,
  normalized_material_prices_rows: exportedMaterialPrices.length,
};

writeJson(resolve(outputDir, 'export-summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));

db.close();
