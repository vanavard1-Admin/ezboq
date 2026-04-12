/**
 * 💎 Gemma Discord Bot — Live Material Catalog Builder
 * Builds multi-file construction material catalogs from real retailer sources.
 */

import { promises as fs } from 'fs';
import { basename, dirname, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_FILES_DIR = resolve(__dirname, 'generated-files');

const HOMEPRO_BASE_URL = 'https://www.homepro.co.th';
const DOHOME_BASE_URL = 'https://www.dohome.co.th';
const SCG_BASE_URL = 'https://www.scghome.com';
const THAIWATSADU_BASE_URL = 'https://www.thaiwatsadu.com';

const SUPPORTED_PROVIDERS = ['homepro', 'dohome', 'scg', 'thaiwatsadu'];
const PROVIDER_NAMES = {
  homepro: 'HomePro',
  dohome: 'DoHome',
  scg: 'SCG HOME',
  thaiwatsadu: 'Thai Watsadu',
};

const PROVIDER_SOURCE_MODES = {
  homepro: 'official-search-html',
  dohome: 'official-sitemap-product-html',
  scg: 'official-subcategory-next-data',
  thaiwatsadu: 'official-readable-mirror',
};

const CATALOG_CATEGORIES = [
  {
    key: 'cement-mortar',
    label: 'ปูนและมอร์ตาร์',
    queries: ['ปูนซีเมนต์', 'กาวซีเมนต์', 'กาวยาแนว'],
    dohomeTerms: ['cement', 'mortar', 'grout'],
    scgSubcategories: ['cement_adhesive', 'cement_mortar_mix', 'structural_cement', 'decorative_cement_plaster', 'ready_mix_mortar'],
    thaiwatsaduUrls: ['https://www.thaiwatsadu.com/th/category/%E0%B8%9B%E0%B8%B9%E0%B8%99-|-%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B8%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99-5301'],
  },
  {
    key: 'tiles-flooring',
    label: 'กระเบื้องและพื้น',
    queries: ['กระเบื้อง', 'พื้น SPC'],
    dohomeTerms: ['tile', 'floor', 'spc'],
    scgSubcategories: ['floor_tiles', 'wall_tiles', 'tile_adhesives_tools', 'smartboard_fiber_cement_flooring', 'fiber_cement_flooring'],
    thaiwatsaduUrls: [
      'https://www.thaiwatsadu.com/th/category/%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%9A%E0%B8%B7%E0%B9%89%E0%B8%AD%E0%B8%87-%7C-%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C-56',
      'https://www.thaiwatsadu.com/th/category/%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99%E0%B9%84%E0%B8%A1%E0%B9%89%E0%B8%A5%E0%B8%B2%E0%B8%A1%E0%B8%B4%E0%B9%80%E0%B8%99%E0%B8%95-%7C-%E0%B8%9E%E0%B8%A3%E0%B8%A1-%7C-%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B8%E0%B8%9B%E0%B8%B9%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99-57',
    ],
  },
  {
    key: 'paint-waterproofing',
    label: 'สีและกันซึม',
    queries: ['สีทาบ้าน', 'กันซึม'],
    dohomeTerms: ['paint', 'waterproof'],
    scgSubcategories: ['roof_insulation_waterproofing'],
    thaiwatsaduUrls: ['https://www.thaiwatsadu.com/th/category/%E0%B8%AA%E0%B8%B5%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%97%E0%B8%B2%E0%B8%AA%E0%B8%B5-60'],
  },
  {
    key: 'roofing-ceiling',
    label: 'หลังคาและฝ้าเพดาน',
    queries: ['หลังคา', 'ฝ้าเพดาน'],
    dohomeTerms: ['roof', 'ceiling'],
    scgSubcategories: ['concrete_roof_tiles', 'fiber_cement_roofing', 'ceramic_roofing', 'roof_purlins_fasteners', 'smartboard_ceiling', 'gypsum_ceiling_panels', 'gypsum_ceiling_panels_accessories', 'aluminum_ceiling_frames', 'vinyl_soffit_panels'],
    thaiwatsaduUrls: [
      'https://www.thaiwatsadu.com/th/category/%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%B2-|-%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%B2-5303',
      'https://www.thaiwatsadu.com/th/category/%E0%B8%89%E0%B8%99%E0%B8%A7%E0%B8%99-|-%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B8%9D%E0%B9%89%E0%B8%B2%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%9C%E0%B8%99%E0%B8%B1%E0%B8%87-5304',
    ],
  },
  {
    key: 'plumbing-sanitary',
    label: 'ประปาและสุขภัณฑ์',
    queries: ['ท่อ PVC', 'ก๊อกน้ำ', 'สุขภัณฑ์'],
    dohomeTerms: ['pvc', 'faucet', 'toilet', 'sink', 'sanitary'],
    scgSubcategories: ['toilets', 'toilet_parts', 'kitchen_sinks', 'kitchen_sink_faucets', 'sink_faucet_parts'],
    thaiwatsaduUrls: [
      'https://www.thaiwatsadu.com/th/category/%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%9B%E0%B8%B2-%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%81%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B8%99%E0%B9%89%E0%B8%B3-54',
      'https://www.thaiwatsadu.com/th/category/%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%99%E0%B9%89%E0%B8%B3-|-%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87%E0%B8%99%E0%B9%89%E0%B8%B3-64',
    ],
  },
  {
    key: 'electrical',
    label: 'ไฟฟ้า',
    queries: ['สายไฟ', 'เบรกเกอร์', 'ปลั๊กไฟ'],
    dohomeTerms: ['wire', 'breaker', 'socket', 'switch', 'electric'],
    scgSubcategories: ['electrical_wires', 'breaker_boxes'],
    thaiwatsaduUrls: ['https://www.thaiwatsadu.com/th/category/%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2-61'],
  },
  {
    key: 'doors-windows',
    label: 'ประตูและหน้าต่าง',
    queries: ['ประตู', 'หน้าต่าง'],
    dohomeTerms: ['door', 'window'],
    scgSubcategories: ['windows', 'hdf_doors', 'wpc_doors', 'pvc_doors', 'upvc_doors', 'bathroom_doors', 'polystyrene_doors', 'door_hardware_parts', 'door_window_accessories', 'other_doors_frames'],
    thaiwatsaduUrls: ['https://www.thaiwatsadu.com/th/category/%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%95%E0%B8%B9-%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%95%E0%B9%88%E0%B8%B2%E0%B8%87-%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B9%84%E0%B8%94-%E0%B8%A3%E0%B8%B1%E0%B9%89%E0%B8%A7-%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B8%E0%B8%95%E0%B8%81%E0%B9%81%E0%B8%95%E0%B9%88%E0%B8%87-55'],
  },
  {
    key: 'masonry-blocks',
    label: 'อิฐและวัสดุก่อผนัง',
    queries: ['อิฐบล็อก', 'อิฐมวลเบา', 'ปูนฉาบ'],
    dohomeTerms: ['block', 'brick', 'aac', 'concrete'],
    scgSubcategories: ['autoclaved_aerated_concrete', 'precast_elements', 'cement_board_walls'],
    thaiwatsaduUrls: ['https://www.thaiwatsadu.com/th/category/%E0%B8%AD%E0%B8%B4%E0%B8%90-|-%E0%B8%9A%E0%B8%A5%E0%B9%87%E0%B8%AD%E0%B8%81%E0%B8%9B%E0%B8%B9%E0%B8%9E%E0%B8%B7%E0%B9%89%E0%B8%99-5302'],
  },
];

const PROVIDERS = {
  homepro: { provider: 'homepro', providerName: PROVIDER_NAMES.homepro, sourceMode: PROVIDER_SOURCE_MODES.homepro, collectCategoryRows: collectHomeProCategoryRows },
  dohome: { provider: 'dohome', providerName: PROVIDER_NAMES.dohome, sourceMode: PROVIDER_SOURCE_MODES.dohome, collectCategoryRows: collectDoHomeCategoryRows },
  scg: { provider: 'scg', providerName: PROVIDER_NAMES.scg, sourceMode: PROVIDER_SOURCE_MODES.scg, collectCategoryRows: collectScgCategoryRows },
  thaiwatsadu: { provider: 'thaiwatsadu', providerName: PROVIDER_NAMES.thaiwatsadu, sourceMode: PROVIDER_SOURCE_MODES.thaiwatsadu, collectCategoryRows: collectThaiWatsaduCategoryRows },
};

let dohomeProductUrlsPromise;

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value = '') {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '));
}

function decodeJsonString(value = '') {
  const text = String(value || '');
  if (!text) return '';
  try {
    return JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
  } catch {
    return decodeHtmlEntities(text.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
}

function firstMatch(text, patterns = []) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return '';
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/[^\d.-]/g, '').trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parsePriceDisplay(rawPrice = '') {
  const cleaned = stripTags(rawPrice).replace(/[฿]/g, '').trim();
  const numbers = cleaned.match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => toNumber(value)).filter((value) => value !== null) || [];
  return {
    priceDisplayThb: cleaned || '',
    priceMinThb: numbers.length > 0 ? Math.min(...numbers) : null,
    priceMaxThb: numbers.length > 0 ? Math.max(...numbers) : null,
  };
}

function formatPriceValue(value) {
  if (value === null || value === undefined) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildRangePriceDisplay(min, max, unit = '') {
  const normalizedUnit = String(unit || '').trim();
  if (min === null && max === null) return '';
  if (min !== null && max !== null && min !== max) {
    return `฿${formatPriceValue(min)}-${formatPriceValue(max)}${normalizedUnit ? `/${normalizedUnit}` : ''}`;
  }
  const single = min ?? max;
  return `฿${formatPriceValue(single)}${normalizedUnit ? `/${normalizedUnit}` : ''}`;
}

function normalizeUrl(url = '', baseUrl = '') {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url.replace(/^\/+/, '')}`;
}

function normalizeThaiWatsaduUrl(url = '') {
  return normalizeUrl(String(url || '').replace(/^http:\/\//i, 'https://'), THAIWATSADU_BASE_URL).replace(/^http:\/\//i, 'https://');
}

function buildThaiWatsaduMirrorUrl(url = '') {
  const officialUrl = normalizeThaiWatsaduUrl(url);
  const stripped = officialUrl.replace(/^https?:\/\//i, '');
  return `https://r.jina.ai/http://${stripped}`;
}

async function fetchText(url, {
  timeoutMs = 25000,
  accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
} = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 GemmaBot/2.0',
      Accept: accept,
      'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }

  return await res.text();
}

async function fetchBuffer(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 GemmaBot/2.0',
      Accept: '*/*',
      'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(options.timeoutMs || 30000),
  });

  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function fetchThaiWatsaduMirrorText(url, { timeoutMs = 35000 } = {}) {
  return await fetchText(buildThaiWatsaduMirrorUrl(url), {
    timeoutMs,
    accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
  });
}

function chunk(array, size) {
  const items = Array.isArray(array) ? array : [];
  const chunkSize = Math.max(1, Number(size) || 1);
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function mapWithConcurrency(items, limit, mapper) {
  const queue = Array.isArray(items) ? [...items] : [];
  const results = new Array(queue.length);
  const workerCount = Math.max(1, Math.min(Number(limit) || 1, queue.length || 1));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const nextIndex = items.length - queue.length;
        const item = queue.shift();
        results[nextIndex] = await mapper(item, nextIndex);
      }
    }),
  );

  return results;
}

function extractXmlLocs(xml = '') {
  return Array.from(String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/gi)).map((match) => decodeHtmlEntities(match[1]));
}

function buildRowKey(row) {
  return `${row.provider}:${row.sku || row.productUrl || row.title}`;
}

function sortRows(rows = []) {
  return [...rows].sort((a, b) =>
    String(a.providerName).localeCompare(String(b.providerName), 'th') ||
    String(a.categoryLabel).localeCompare(String(b.categoryLabel), 'th') ||
    String(a.brand).localeCompare(String(b.brand), 'th') ||
    String(a.title).localeCompare(String(b.title), 'th'));
}

function normalizeCategorySlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveRequestedCategories(categories = []) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return CATALOG_CATEGORIES;
  }

  const requested = new Set(
    categories
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean),
  );

  const selected = CATALOG_CATEGORIES.filter((category) => {
    const label = category.label.toLowerCase();
    return requested.has(category.key) || requested.has(label) || requested.has(normalizeCategorySlug(label));
  });

  return selected.length > 0 ? selected : CATALOG_CATEGORIES;
}

function normalizeProviderKey(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'thai-watsadu' || normalized === 'thai_watsadu') return 'thaiwatsadu';
  return normalized;
}

function resolveRequestedProviders(provider = 'homepro', providers = []) {
  const selected = new Set();
  const requested = Array.isArray(providers) && providers.length > 0 ? providers : [provider];

  for (const raw of requested) {
    const key = normalizeProviderKey(raw);
    if (!key) continue;
    if (key === 'all') {
      for (const providerKey of SUPPORTED_PROVIDERS) {
        selected.add(providerKey);
      }
      continue;
    }
    if (SUPPORTED_PROVIDERS.includes(key)) {
      selected.add(key);
    }
  }

  return selected.size > 0 ? Array.from(selected) : ['homepro'];
}

function sanitizeFilename(filename = 'export') {
  const safe = String(filename || 'export')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return safe || 'export';
}

async function writeGeneratedFile(filename, content, {
  format = 'csv',
  description = '',
} = {}) {
  await fs.mkdir(GENERATED_FILES_DIR, { recursive: true });

  const extension = extname(filename) || `.${format}`;
  const safeName = sanitizeFilename(extname(filename) ? filename : `${filename}${extension}`);
  const absolutePath = resolve(GENERATED_FILES_DIR, `${Date.now()}-${basename(safeName)}`);
  const shouldBom = ['csv', 'tsv'].includes(format);
  const finalContent = shouldBom ? `\uFEFF${String(content).replace(/^\uFEFF/, '')}` : String(content);

  await fs.writeFile(absolutePath, finalContent, 'utf8');
  const stats = await fs.stat(absolutePath);
  const normalized = finalContent.replace(/^\uFEFF/, '');
  const nonEmptyLines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const lineCount = nonEmptyLines.length;
  const isTabular = ['csv', 'tsv'].includes(format);

  return {
    filename: basename(safeName),
    absolutePath,
    requestedFormat: format,
    actualFormat: format,
    mimeType: format === 'md' ? 'text/markdown; charset=utf-8' : 'text/csv; charset=utf-8',
    sizeBytes: stats.size,
    lineCount,
    dataRows: isTabular ? Math.max(0, lineCount - 1) : undefined,
    description: description || undefined,
  };
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows) {
  const headers = [
    'provider',
    'provider_name',
    'source_mode',
    'category_key',
    'category_label',
    'matched_query',
    'matched_source',
    'brand',
    'title',
    'sku',
    'unit',
    'price_display_thb',
    'price_min_thb',
    'price_max_thb',
    'price_reference_thb',
    'seller',
    'availability',
    'sold_count',
    'source_category_path',
    'product_url',
    'search_url',
    'image_url',
    'source_checked_at',
  ];

  if (!rows || rows.length === 0) {
    return headers.join(',');
  }

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push([
      row.provider,
      row.providerName,
      row.sourceMode,
      row.categoryKey,
      row.categoryLabel,
      row.matchedQuery,
      row.matchedSource,
      row.brand,
      row.title,
      row.sku,
      row.unit,
      row.priceDisplayThb,
      row.priceMinThb,
      row.priceMaxThb,
      row.priceReferenceThb,
      row.seller,
      row.availability,
      row.soldCount,
      row.sourceCategoryPath,
      row.productUrl,
      row.searchUrl,
      row.imageUrl,
      row.sourceCheckedAt,
    ].map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

function buildSummaryMarkdown({ providerSummaries, generatedAt, categorySummaries, totalRows, files, notes }) {
  const providerLabel = providerSummaries.map((provider) => provider.providerName).join(', ');
  const lines = [
    '# EzBOQ Material Catalog',
    '',
    `- Providers: ${providerLabel || 'N/A'}`,
    `- Generated At: ${generatedAt}`,
    `- Total Rows: ${totalRows}`,
    `- Total Files: ${files.length}`,
    '',
    '## Provider Summary',
  ];

  for (const provider of providerSummaries) {
    lines.push(`- ${provider.providerName} (${provider.provider}): ${provider.rows} rows`);
    for (const category of provider.categories.filter((item) => item.rows > 0)) {
      lines.push(`  - ${category.label}: ${category.rows} rows`);
    }
  }

  lines.push('');
  lines.push('## Combined Categories');
  for (const category of categorySummaries) {
    const providerBits = Array.isArray(category.providers)
      ? category.providers.filter((item) => item.rows > 0).map((item) => `${item.providerName}=${item.rows}`).join(' | ')
      : '';
    lines.push(`- ${category.label} (${category.key}): ${category.rows} rows${providerBits ? ` | ${providerBits}` : ''}`);
  }

  if (notes.length > 0) {
    lines.push('');
    lines.push('## Notes');
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push('');
  lines.push('## Files');
  for (const file of files) {
    lines.push(`- ${file.filename}${typeof file.dataRows === 'number' ? ` (${file.dataRows} rows)` : ''}`);
  }

  lines.push('');
  lines.push('ทุกแถวมี product_url สำหรับย้อนดู source จริง ส่วน search_url จะเป็นหน้าค้นหาหรือหน้าหมวดที่ใช้ดึงข้อมูลในรอบนั้น');

  return lines.join('\n');
}

function buildHomeProSearchUrl(query) {
  return `${HOMEPRO_BASE_URL}/search?q=${encodeURIComponent(query)}`;
}

function parseHomeProSearchResults(html, { query, searchUrl, categoryKey, categoryLabel, fetchedAt }) {
  const blocks = html.split('<div class="product-plp-card').slice(1);
  const results = [];

  for (const segment of blocks) {
    const block = `<div class="product-plp-card${segment}`;
    const sku = firstMatch(block, [
      /id="product-(\d+)"/i,
      /<div class="sku">SKU:&nbsp;(\d+)<\/div>/i,
    ]);
    if (!sku) continue;

    const title = firstMatch(block, [
      new RegExp(`id="gtmName-${sku}" value="([^"]+)"`, 'i'),
      /<div class="item-title">([\s\S]*?)<\/div>/i,
    ]);
    const brand = firstMatch(block, [
      new RegExp(`id="gtmBrand-${sku}" value="([^"]+)"`, 'i'),
      /<div class="brand">([\s\S]*?)<\/div>/i,
    ]);
    const productUrl = normalizeUrl(firstMatch(block, [
      /<a href="([^"]*\/p\/\d+)"/i,
    ]), HOMEPRO_BASE_URL);
    const categoryPath = firstMatch(block, [
      new RegExp(`id="gtmCategoryAll-${sku}" value="([^"]+)"`, 'i'),
    ]);
    const seller = firstMatch(block, [
      /<span class="seller-name"><u>([\s\S]*?)<\/u><\/span>/i,
    ]);
    const priceDisplayRaw = firstMatch(block, [
      /<div class="price">\s*<span>([\s\S]*?)<\/span>/i,
    ]);
    const priceOriginalThb = toNumber(firstMatch(block, [
      new RegExp(`id="gtmPriceOriginal-${sku}" value="([^"]+)"`, 'i'),
      new RegExp(`id="gtmPrice-${sku}" value="([^"]+)"`, 'i'),
    ]));
    const soldCount = toNumber(firstMatch(block, [
      /ขายแล้ว&nbsp;([\d,]+)&nbsp;ชิ้น/i,
    ]));
    const availability = firstMatch(block, [
      new RegExp(`id="gtmAvailability-${sku}" value="([^"]+)"`, 'i'),
    ]);
    const imageUrl = normalizeUrl(firstMatch(block, [
      new RegExp(`id="mImg-${sku}" data-value1="([^"]+)"`, 'i'),
      /background-image:\s*url\('([^']+)'\)/i,
    ]), HOMEPRO_BASE_URL);
    const { priceDisplayThb, priceMinThb, priceMaxThb } = parsePriceDisplay(priceDisplayRaw);

    if (!title || !productUrl || (!priceDisplayThb && priceOriginalThb === null)) {
      continue;
    }

    results.push({
      provider: 'homepro',
      providerName: PROVIDER_NAMES.homepro,
      sourceMode: PROVIDER_SOURCE_MODES.homepro,
      categoryKey,
      categoryLabel,
      matchedQuery: query,
      matchedSource: query,
      brand,
      title,
      sku,
      unit: '',
      priceDisplayThb,
      priceMinThb,
      priceMaxThb,
      priceReferenceThb: priceOriginalThb,
      seller,
      availability,
      soldCount,
      sourceCategoryPath: categoryPath,
      productUrl,
      searchUrl,
      imageUrl,
      sourceCheckedAt: fetchedAt,
    });
  }

  return results;
}

async function collectHomeProCategoryRows(category, { generatedAt, maxItemsPerCategory, notes }) {
  const rowsByKey = new Map();
  const querySummaries = [];

  for (const query of category.queries) {
    const searchUrl = buildHomeProSearchUrl(query);
    try {
      const html = await fetchText(searchUrl);
      const parsed = parseHomeProSearchResults(html, {
        query,
        searchUrl,
        categoryKey: category.key,
        categoryLabel: category.label,
        fetchedAt: generatedAt,
      });

      for (const item of parsed) {
        const key = buildRowKey(item);
        if (!rowsByKey.has(key)) {
          rowsByKey.set(key, item);
        }
      }

      querySummaries.push({ query, rows: parsed.length, searchUrl });
      if (rowsByKey.size >= maxItemsPerCategory) break;
    } catch (err) {
      querySummaries.push({ query, rows: 0, searchUrl, error: err.message });
      notes.push(`HomePro query "${query}" failed: ${err.message}`);
    }
  }

  return {
    rows: sortRows(Array.from(rowsByKey.values())).slice(0, maxItemsPerCategory),
    summary: {
      key: category.key,
      label: category.label,
      rows: rowsByKey.size,
      queries: querySummaries,
    },
  };
}

async function getDoHomeProductUrls() {
  if (!dohomeProductUrlsPromise) {
    dohomeProductUrlsPromise = (async () => {
      const sitemapXml = await fetchText(`${DOHOME_BASE_URL}/sitemap.xml`, { accept: 'application/xml,text/xml,text/plain,*/*' });
      const sitemapUrls = extractXmlLocs(sitemapXml).filter((url) => /sitemap-products-\d+\.xml\.gz$/i.test(url));
      const allUrls = [];

      for (const sitemapUrl of sitemapUrls) {
        const compressed = await fetchBuffer(sitemapUrl, { timeoutMs: 40000 });
        const xml = gunzipSync(compressed).toString('utf8');
        allUrls.push(...extractXmlLocs(xml));
      }

      return Array.from(new Set(allUrls.filter((url) => url.includes('/product/'))));
    })();
  }

  return await dohomeProductUrlsPromise;
}

function findMatchedTerm(url = '', terms = []) {
  const tokens = new Set(
    String(url || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  for (const term of terms) {
    if (tokens.has(String(term).toLowerCase())) {
      return term;
    }
  }
  return '';
}

function matchJsonField(text, fieldName) {
  const patterns = [
    new RegExp(`\\\\"${fieldName}\\\\":\\\\"((?:\\\\\\\\.|[^"])*)\\\\"`, 'i'),
    new RegExp(`"${fieldName}":"((?:\\\\.|[^"])*)"`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return decodeJsonString(match[1]);
  }
  return '';
}

function matchJsonBoolean(text, fieldName) {
  const patterns = [
    new RegExp(`\\\\"${fieldName}\\\\":(true|false)`, 'i'),
    new RegExp(`"${fieldName}":(true|false)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1] === 'true';
  }
  return null;
}

function matchJsonNumber(text, fieldName) {
  const patterns = [
    new RegExp(`\\\\"${fieldName}\\\\":(\\d+)`, 'i'),
    new RegExp(`"${fieldName}":(\\d+)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function parseDoHomeProductPage(html, { productUrl, matchedTerm, categoryKey, categoryLabel, fetchedAt }) {
  const title = matchJsonField(html, 'displayName');
  const brand = matchJsonField(html, 'brandName');
  const sku = matchJsonField(html, 'productSkuId') || firstMatch(productUrl, [/-(\d{5,})$/]);
  const marketPrice = matchJsonField(html, 'marketPrice');
  const salePrice = matchJsonField(html, 'salePrice');
  const unit = matchJsonField(html, 'unit');
  const soldCount = toNumber(matchJsonField(html, 'soldCount'));
  const stockCount = matchJsonNumber(html, 'productStockCount');
  const isOutOfStock = matchJsonBoolean(html, 'isOutOfStock');
  const imageMatch = html.match(/\\"imageProducts\\":\[\\"((?:\\\\.|[^"])*)\\"/i) || html.match(/"imageProducts":\["((?:\\.|[^"])*)"/i);
  const imageUrl = imageMatch?.[1] ? normalizeUrl(decodeJsonString(imageMatch[1]), DOHOME_BASE_URL) : '';
  const level1Match = html.match(/\\"level1\\":\{[\s\S]*?\\"name\\":\\"((?:\\\\.|[^"])*)\\"/i) || html.match(/"level1":\{[\s\S]*?"name":"((?:\\.|[^"])*)"/i);
  const level2Match = html.match(/\\"level2\\":\{[\s\S]*?\\"name\\":\\"((?:\\\\.|[^"])*)\\"/i) || html.match(/"level2":\{[\s\S]*?"name":"((?:\\.|[^"])*)"/i);
  const level3Match = html.match(/\\"level3\\":\{[\s\S]*?\\"name\\":\\"((?:\\\\.|[^"])*)\\"/i) || html.match(/"level3":\{[\s\S]*?"name":"((?:\\.|[^"])*)"/i);
  const level1 = level1Match?.[1] ? decodeJsonString(level1Match[1]) : '';
  const level2 = level2Match?.[1] ? decodeJsonString(level2Match[1]) : '';
  const level3 = level3Match?.[1] ? decodeJsonString(level3Match[1]) : '';
  const categoryPath = [level1, level2, level3].filter(Boolean).join(' > ');
  const selectedPrice = salePrice || marketPrice;
  const { priceDisplayThb, priceMinThb, priceMaxThb } = parsePriceDisplay(selectedPrice);

  if (!title || (!priceDisplayThb && priceMinThb === null && priceMaxThb === null)) {
    return null;
  }

  return {
    provider: 'dohome',
    providerName: PROVIDER_NAMES.dohome,
    sourceMode: PROVIDER_SOURCE_MODES.dohome,
    categoryKey,
    categoryLabel,
    matchedQuery: matchedTerm || categoryLabel,
    matchedSource: matchedTerm || '',
    brand,
    title,
    sku,
    unit,
    priceDisplayThb: priceDisplayThb || buildRangePriceDisplay(priceMinThb, priceMaxThb, unit),
    priceMinThb,
    priceMaxThb,
    priceReferenceThb: priceMinThb ?? priceMaxThb,
    seller: PROVIDER_NAMES.dohome,
    availability: typeof stockCount === 'number' ? stockCount : (isOutOfStock === true ? 'OUT_OF_STOCK' : 'IN_STOCK'),
    soldCount,
    sourceCategoryPath: categoryPath,
    productUrl,
    searchUrl: DOHOME_BASE_URL,
    imageUrl,
    sourceCheckedAt: fetchedAt,
  };
}

async function collectDoHomeCategoryRows(category, { generatedAt, maxItemsPerCategory, notes }) {
  const productUrls = await getDoHomeProductUrls();
  const candidates = productUrls
    .map((url) => ({ url, matchedTerm: findMatchedTerm(url, category.dohomeTerms || []) }))
    .filter((item) => item.matchedTerm);

  const selectedCandidates = candidates.slice(0, Math.max(maxItemsPerCategory * 3, 60));
  const rowsByKey = new Map();
  let failCount = 0;

  for (const batch of chunk(selectedCandidates, 6)) {
    const settled = await Promise.allSettled(batch.map(async ({ url, matchedTerm }) => {
      const html = await fetchText(url, { timeoutMs: 20000 });
      return parseDoHomeProductPage(html, {
        productUrl: url,
        matchedTerm,
        categoryKey: category.key,
        categoryLabel: category.label,
        fetchedAt: generatedAt,
      });
    }));

    for (const result of settled) {
      if (result.status === 'rejected') {
        failCount += 1;
        continue;
      }
      const row = result.value;
      if (!row) continue;
      const key = buildRowKey(row);
      if (!rowsByKey.has(key)) {
        rowsByKey.set(key, row);
      }
    }

    if (rowsByKey.size >= maxItemsPerCategory) {
      break;
    }
  }

  if (failCount > 0) {
    notes.push(`DoHome category "${category.label}" skipped ${failCount} product pages that failed to parse or fetch`);
  }

  return {
    rows: sortRows(Array.from(rowsByKey.values())).slice(0, maxItemsPerCategory),
    summary: {
      key: category.key,
      label: category.label,
      rows: rowsByKey.size,
      queries: (category.dohomeTerms || []).map((term) => ({ query: term, rows: candidates.filter((item) => item.matchedTerm === term).length, searchUrl: DOHOME_BASE_URL })),
    },
  };
}

function buildScgSubcategoryUrl(slug, page = 1) {
  const pageSuffix = page > 1 ? `?page=${page}&sort=isPopular` : '';
  return `${SCG_BASE_URL}/products/subcategory/${slug}${pageSuffix}`;
}

function extractThaiWatsaduPageTitle(markdown = '') {
  return firstMatch(markdown, [
    /^Title:\s*(.+)$/m,
    /^#\s*(.+?)\s*-\s*ไทวัสดุ\s*$/m,
  ]).replace(/\s*-\s*ไทวัสดุ\s*$/i, '').trim();
}

function extractThaiWatsaduLinks(markdown = '', type = 'product') {
  const normalizedType = type === 'category' ? 'category' : 'product';
  const pattern = new RegExp(`https?:\\/\\/www\\.thaiwatsadu\\.com\\/th\\/${normalizedType}\\/[^\n\\s)]+`, 'gi');
  return Array.from(new Set(
    Array.from(String(markdown || '').matchAll(pattern))
      .map((match) => normalizeThaiWatsaduUrl(match[0]))
      .filter(Boolean),
  ));
}

function extractThaiWatsaduCategoryId(url = '') {
  return String(url || '').match(/-(\d+)$/)?.[1] || '';
}

function isThaiWatsaduDescendantCategoryUrl(parentUrl = '', candidateUrl = '') {
  const parentId = extractThaiWatsaduCategoryId(parentUrl);
  const candidateId = extractThaiWatsaduCategoryId(candidateUrl);
  if (!parentId || !candidateId) return false;
  return candidateId.length > parentId.length && candidateId.startsWith(parentId);
}

function parseThaiWatsaduListingDescriptor(descriptor = '') {
  const normalized = stripTags(descriptor).replace(/\s+/g, ' ').trim();
  const sku = firstMatch(normalized, [/รหัสสินค้า\s*:\s*รหัส:\s*(\d{5,})/i]);
  const title = normalized.split(/รหัสสินค้า\s*:\s*รหัส:\s*\d{5,}/i)[0].trim();
  const salePairMatch = normalized.match(/฿\s*฿\s*(\d[\d,]*(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d+)?)\s*\/\s*([A-Z]+)/i);
  const priceMatches = Array.from(normalized.matchAll(/(?:฿\s*)?(\d[\d,]*(?:\.\d+)?)\s*\/\s*([A-Z]+)/gi));
  const explicitOriginal = toNumber(firstMatch(normalized, [/ราคาเดิม\s*([\d,]+(?:\.\d+)?)/i]));
  const availability = /ใส่รถเข็น/i.test(normalized)
    ? 'IN_STOCK'
    : (/หมดชั่วคราว|สินค้าหมด|แจ้งเตือนเมื่อมีสินค้า/i.test(normalized) ? 'OUT_OF_STOCK' : (/สาขาที่มีสินค้า/i.test(normalized) ? 'CHECK_BRANCH' : ''));

  let unit = '';
  let priceMinThb = null;
  let priceMaxThb = null;
  let priceReferenceThb = explicitOriginal;

  if (salePairMatch) {
    const original = toNumber(salePairMatch[1]);
    const current = toNumber(salePairMatch[2]);
    unit = String(salePairMatch[3] || '').toUpperCase();
    priceMinThb = current;
    priceMaxThb = current;
    priceReferenceThb = original ?? current;
  } else if (priceMatches.length > 0) {
    const values = priceMatches.map((match) => toNumber(match[1])).filter((value) => value !== null);
    unit = String(priceMatches[priceMatches.length - 1]?.[2] || '').toUpperCase();
    if (values.length === 1) {
      priceMinThb = values[0];
      priceMaxThb = values[0];
      priceReferenceThb = priceReferenceThb ?? values[0];
    } else if (values.length > 1) {
      priceMinThb = Math.min(...values);
      priceMaxThb = Math.max(...values);
      priceReferenceThb = priceReferenceThb ?? Math.max(...values);
    }
  }

  return {
    title,
    sku,
    unit,
    availability,
    priceMinThb,
    priceMaxThb,
    priceReferenceThb,
    priceDisplayThb: buildRangePriceDisplay(priceMinThb, priceMaxThb, unit),
  };
}

function parseThaiWatsaduCategoryPage(markdown, {
  pageUrl,
  categoryKey,
  categoryLabel,
  fetchedAt,
}) {
  const pageTitle = extractThaiWatsaduPageTitle(markdown) || categoryLabel;
  const categoryLinks = extractThaiWatsaduLinks(markdown, 'category');
  const rowsByKey = new Map();
  const listingPattern = /\[([^\]]+)\]\(https?:\/\/www\.thaiwatsadu\.com\/th\/brand\/[^)]+\)\[([^\]]+)\]\((https?:\/\/www\.thaiwatsadu\.com\/th\/product\/[^)]+)\)/gi;

  for (const match of String(markdown || '').matchAll(listingPattern)) {
    const brand = stripTags(match[1]);
    const descriptor = stripTags(match[2]);
    const productUrl = normalizeThaiWatsaduUrl(match[3]);
    const parsed = parseThaiWatsaduListingDescriptor(descriptor);
    if (!parsed.title || (parsed.priceMinThb === null && parsed.priceMaxThb === null)) continue;

    const row = {
      provider: 'thaiwatsadu',
      providerName: PROVIDER_NAMES.thaiwatsadu,
      sourceMode: PROVIDER_SOURCE_MODES.thaiwatsadu,
      categoryKey,
      categoryLabel,
      matchedQuery: pageTitle,
      matchedSource: pageUrl,
      brand,
      title: parsed.title,
      sku: parsed.sku || firstMatch(productUrl, [/-(\d{5,})$/]),
      unit: parsed.unit,
      priceDisplayThb: parsed.priceDisplayThb,
      priceMinThb: parsed.priceMinThb,
      priceMaxThb: parsed.priceMaxThb,
      priceReferenceThb: parsed.priceReferenceThb ?? parsed.priceMaxThb ?? parsed.priceMinThb,
      seller: PROVIDER_NAMES.thaiwatsadu,
      availability: parsed.availability,
      soldCount: null,
      sourceCategoryPath: pageTitle,
      productUrl,
      searchUrl: pageUrl,
      imageUrl: '',
      sourceCheckedAt: fetchedAt,
    };

    const rowKey = buildRowKey(row);
    if (!rowsByKey.has(rowKey)) {
      rowsByKey.set(rowKey, row);
    }
  }

  return {
    pageTitle,
    categoryLinks,
    productLinks: extractThaiWatsaduLinks(markdown, 'product'),
    rows: sortRows(Array.from(rowsByKey.values())),
  };
}

function parseNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match?.[1]) {
    throw new Error('missing __NEXT_DATA__ payload');
  }
  return JSON.parse(match[1]);
}

function mapScgItemToRow(item, { pageProps, slug, pageUrl, categoryKey, categoryLabel, fetchedAt }) {
  const priceRange = item?.priceRange || {};
  const min = toNumber(priceRange.min);
  const max = toNumber(priceRange.max);
  const unit = priceRange.unitLabel || '';
  const sku = item.barcode || item.sapId || item.sapProductId || item.matNo || '';
  const productCode = item.barcode || item.sapId || item.sapProductId || item.matNo || '';
  const productUrl = productCode ? `${SCG_BASE_URL}/products/${encodeURIComponent(productCode)}` : '';
  const title = String(item.displayName || '').trim();

  if (!title || (!productUrl && !sku) || (min === null && max === null)) {
    return null;
  }

  return {
    provider: 'scg',
    providerName: PROVIDER_NAMES.scg,
    sourceMode: PROVIDER_SOURCE_MODES.scg,
    categoryKey,
    categoryLabel,
    matchedQuery: pageProps?.label || slug,
    matchedSource: slug,
    brand: item.brand || '',
    title,
    sku,
    unit,
    priceDisplayThb: buildRangePriceDisplay(min, max, unit),
    priceMinThb: min,
    priceMaxThb: max,
    priceReferenceThb: toNumber(item.standardPrice) ?? toNumber(priceRange.standardPrice) ?? max ?? min,
    seller: PROVIDER_NAMES.scg,
    availability: priceRange.status || (item.isOutOfStock ? 'OUT_OF_STOCK' : 'IN_STOCK'),
    soldCount: toNumber(item.historicalSold),
    sourceCategoryPath: [pageProps?.categoryLabel, pageProps?.label].filter(Boolean).join(' > '),
    productUrl,
    searchUrl: pageUrl,
    imageUrl: item?.image?.Attachment_URL || '',
    sourceCheckedAt: fetchedAt,
  };
}

async function collectScgCategoryRows(category, { generatedAt, maxItemsPerCategory, notes }) {
  const rowsByKey = new Map();
  const querySummaries = [];

  for (const slug of category.scgSubcategories || []) {
    let pageProps;
    let pageCount = 0;

    try {
      const firstPageUrl = buildScgSubcategoryUrl(slug, 1);
      const firstHtml = await fetchText(firstPageUrl);
      const payload = parseNextData(firstHtml);
      pageProps = payload?.props?.pageProps || {};
      pageCount = Number(pageProps?.products?.pageCount || 0);

      const firstItems = Array.isArray(pageProps?.products?.items) ? pageProps.products.items : [];
      for (const item of firstItems) {
        const row = mapScgItemToRow(item, {
          pageProps,
          slug,
          pageUrl: firstPageUrl,
          categoryKey: category.key,
          categoryLabel: category.label,
          fetchedAt: generatedAt,
        });
        if (!row) continue;
        const key = buildRowKey(row);
        if (!rowsByKey.has(key)) {
          rowsByKey.set(key, row);
        }
      }

      for (let page = 2; page <= pageCount && rowsByKey.size < maxItemsPerCategory; page += 1) {
        const pageUrl = buildScgSubcategoryUrl(slug, page);
        const html = await fetchText(pageUrl);
        const pagePayload = parseNextData(html);
        const pageData = pagePayload?.props?.pageProps || {};
        const items = Array.isArray(pageData?.products?.items) ? pageData.products.items : [];

        for (const item of items) {
          const row = mapScgItemToRow(item, {
            pageProps: pageData,
            slug,
            pageUrl,
            categoryKey: category.key,
            categoryLabel: category.label,
            fetchedAt: generatedAt,
          });
          if (!row) continue;
          const key = buildRowKey(row);
          if (!rowsByKey.has(key)) {
            rowsByKey.set(key, row);
          }
        }
      }

      querySummaries.push({
        query: pageProps?.label || slug,
        rows: Number(pageProps?.products?.totalCount || 0),
        searchUrl: buildScgSubcategoryUrl(slug, 1),
      });
    } catch (err) {
      notes.push(`SCG HOME subcategory "${slug}" failed: ${err.message}`);
      querySummaries.push({ query: slug, rows: 0, searchUrl: buildScgSubcategoryUrl(slug, 1), error: err.message });
    }

    if (rowsByKey.size >= maxItemsPerCategory) {
      break;
    }
  }

  return {
    rows: sortRows(Array.from(rowsByKey.values())).slice(0, maxItemsPerCategory),
    summary: {
      key: category.key,
      label: category.label,
      rows: rowsByKey.size,
      queries: querySummaries,
    },
  };
}

async function collectThaiWatsaduCategoryRows(category, { generatedAt, maxItemsPerCategory, notes }) {
  notes.push('Thai Watsadu ใช้ readable mirror ของ official pages ใน server-side runtime นี้เพื่อเลี่ยง Cloudflare แต่ product_url ยังชี้กลับหน้า official เดิม');

  const rowsByKey = new Map();
  const querySummaries = [];
  const queue = [...new Set(category.thaiwatsaduUrls || [])];
  const visitedPages = new Set();
  const maxDescendantPagesPerRoot = 6;

  while (queue.length > 0 && rowsByKey.size < maxItemsPerCategory) {
    const pageUrl = normalizeThaiWatsaduUrl(queue.shift());
    if (!pageUrl || visitedPages.has(pageUrl)) continue;
    visitedPages.add(pageUrl);

    try {
      const markdown = await fetchThaiWatsaduMirrorText(pageUrl);
      const parsed = parseThaiWatsaduCategoryPage(markdown, {
        pageUrl,
        categoryKey: category.key,
        categoryLabel: category.label,
        fetchedAt: generatedAt,
      });

      querySummaries.push({
        query: parsed.pageTitle || category.label,
        rows: parsed.rows.length,
        searchUrl: pageUrl,
      });

      for (const row of parsed.rows) {
        const rowKey = buildRowKey(row);
        if (!rowsByKey.has(rowKey)) {
          rowsByKey.set(rowKey, row);
        }
        if (rowsByKey.size >= maxItemsPerCategory) break;
      }

      if (rowsByKey.size < maxItemsPerCategory) {
        const descendantUrls = parsed.categoryLinks
          .filter((candidateUrl) => isThaiWatsaduDescendantCategoryUrl(pageUrl, candidateUrl))
          .slice(0, maxDescendantPagesPerRoot);

        for (const descendantUrl of descendantUrls) {
          const normalizedDescendantUrl = normalizeThaiWatsaduUrl(descendantUrl);
          if (!visitedPages.has(normalizedDescendantUrl)) {
            queue.push(normalizedDescendantUrl);
          }
        }
      }
    } catch (err) {
      notes.push(`Thai Watsadu page "${pageUrl}" failed: ${err.message}`);
      querySummaries.push({
        query: pageUrl,
        rows: 0,
        searchUrl: pageUrl,
        error: err.message,
      });
    }
  }

  if (rowsByKey.size === 0) {
    notes.push(`Thai Watsadu readable mirror ยังไม่คืนรายการสำหรับหมวด "${category.label}" ในรอบนี้`);
  }

  return {
    rows: sortRows(Array.from(rowsByKey.values())).slice(0, maxItemsPerCategory),
    summary: {
      key: category.key,
      label: category.label,
      rows: rowsByKey.size,
      queries: querySummaries,
    },
  };
}

function buildProviderSummary(providerKey, providerRows, categorySummaries) {
  return {
    provider: providerKey,
    providerName: PROVIDER_NAMES[providerKey] || providerKey,
    sourceMode: PROVIDER_SOURCE_MODES[providerKey] || '',
    rows: providerRows.length,
    categories: categorySummaries.map((category) => ({
      key: category.key,
      label: category.label,
      rows: category.rows,
      queries: category.queries || [],
      rowsData: category.rowsData || [],
    })),
  };
}

export async function buildMaterialCatalog({
  categories = [],
  max_items_per_category = 180,
  provider = 'homepro',
  providers = [],
  filename_prefix = 'ezboq-material-catalog',
} = {}) {
  const selectedProviders = resolveRequestedProviders(provider, providers);
  const selectedCategories = resolveRequestedCategories(categories);
  const generatedAt = new Date().toISOString();
  const safeLimit = Math.max(1, Number(max_items_per_category) || 180);
  const notes = [];
  const providerConcurrency = Math.min(2, selectedProviders.length || 1);
  const categoryConcurrency = Math.min(2, selectedCategories.length || 1);

  const masterRowsByKey = new Map();
  const providerSummaries = [];
  const categoryAggregate = new Map(
    selectedCategories.map((category) => [category.key, {
      key: category.key,
      label: category.label,
      rows: 0,
      providers: [],
    }]),
  );

  const providerResults = await mapWithConcurrency(selectedProviders, providerConcurrency, async (providerKey) => {
    const providerConfig = PROVIDERS[providerKey];
    const providerRowsByKey = new Map();
    const providerCategorySummaries = [];

    const categoryResults = await mapWithConcurrency(selectedCategories, categoryConcurrency, async (category) => {
      try {
        const { rows, summary } = await providerConfig.collectCategoryRows(category, {
          generatedAt,
          maxItemsPerCategory: safeLimit,
          notes,
        });

        return {
          category,
          rows: sortRows(rows).slice(0, safeLimit),
          summary,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notes.push(`${providerConfig.providerName} category "${category.label}" failed: ${message}`);
        return {
          category,
          rows: [],
          summary: {
            key: category.key,
            label: category.label,
            rows: 0,
            queries: [{ query: category.label, rows: 0, error: message }],
          },
        };
      }
    });

    for (const { category, rows: sortedRows, summary } of categoryResults) {
      for (const row of sortedRows) {
        const rowKey = buildRowKey(row);
        if (!providerRowsByKey.has(rowKey)) providerRowsByKey.set(rowKey, row);
      }

      providerCategorySummaries.push({
        key: category.key,
        label: category.label,
        rows: sortedRows.length,
        queries: summary?.queries || [],
        rowsData: sortedRows,
      });
    }

    return {
      providerKey,
      providerConfig,
      providerRows: Array.from(providerRowsByKey.values()),
      providerCategorySummaries,
    };
  });

  for (const { providerKey, providerConfig, providerRows, providerCategorySummaries } of providerResults) {
    for (const row of providerRows) {
      const rowKey = buildRowKey(row);
      if (!masterRowsByKey.has(rowKey)) masterRowsByKey.set(rowKey, row);
    }

    for (const category of providerCategorySummaries) {
      const aggregate = categoryAggregate.get(category.key);
      aggregate.rows += category.rows;
      aggregate.providers.push({
        provider: providerKey,
        providerName: providerConfig.providerName,
        rows: category.rows,
      });
    }

    providerSummaries.push(buildProviderSummary(
      providerKey,
      providerRows,
      providerCategorySummaries,
    ));
  }

  const masterRows = sortRows(Array.from(masterRowsByKey.values()));
  const categorySummaries = Array.from(categoryAggregate.values());

  if (masterRows.length === 0) {
    return {
      error: notes[0] || 'ไม่พบข้อมูล catalog จาก source จริงในรอบนี้',
      provider: selectedProviders.length === 1 ? selectedProviders[0] : 'multi',
      providerName: selectedProviders.length === 1
        ? (PROVIDER_NAMES[selectedProviders[0]] || selectedProviders[0])
        : selectedProviders.map((key) => PROVIDER_NAMES[key] || key).join(', '),
      providers: providerSummaries,
      categories: categorySummaries,
      notes: Array.from(new Set(notes)),
    };
  }

  const uniqueNotes = Array.from(new Set(notes));
  const files = [];
  const dateStamp = generatedAt.slice(0, 10);

  const masterFile = await writeGeneratedFile(
    `${filename_prefix}-${dateStamp}-all.csv`,
    rowsToCsv(masterRows),
    { format: 'csv', description: 'Master catalog from all selected live providers' },
  );
  files.push(masterFile);

  for (const providerSummary of providerSummaries) {
    const providerRows = masterRows.filter((row) => row.provider === providerSummary.provider);
    if (providerRows.length === 0) continue;

    const providerFile = await writeGeneratedFile(
      `${filename_prefix}-${dateStamp}-${providerSummary.provider}-all.csv`,
      rowsToCsv(providerRows),
      { format: 'csv', description: `${providerSummary.providerName} live catalog` },
    );
    files.push(providerFile);

    for (const category of providerSummary.categories) {
      if (!Array.isArray(category.rowsData) || category.rowsData.length === 0) continue;
      const file = await writeGeneratedFile(
        `${filename_prefix}-${dateStamp}-${providerSummary.provider}-${category.key}.csv`,
        rowsToCsv(category.rowsData),
        { format: 'csv', description: `${providerSummary.providerName} • ${category.label}` },
      );
      files.push(file);
    }
  }

  const summaryFilename = `${filename_prefix}-${dateStamp}-index.md`;
  const summaryFile = await writeGeneratedFile(
    summaryFilename,
    buildSummaryMarkdown({
      providerSummaries,
      generatedAt,
      categorySummaries,
      totalRows: masterRows.length,
      files: [...files, { filename: summaryFilename }],
      notes: uniqueNotes,
    }),
    { format: 'md', description: 'Catalog summary, provider counts, and notes' },
  );
  files.push(summaryFile);

  return {
    status: selectedProviders.length > 1
      ? 'สร้าง catalog ราคาวัสดุหลาย provider จาก source จริงเรียบร้อย'
      : 'สร้าง catalog ราคาวัสดุจาก source จริงเรียบร้อย',
    provider: selectedProviders.length === 1 ? selectedProviders[0] : 'multi',
    providerName: selectedProviders.length === 1
      ? (PROVIDER_NAMES[selectedProviders[0]] || selectedProviders[0])
      : selectedProviders.map((key) => PROVIDER_NAMES[key] || key).join(', '),
    providerCount: selectedProviders.length,
    providers: providerSummaries.map((providerSummary) => ({
      provider: providerSummary.provider,
      providerName: providerSummary.providerName,
      sourceMode: providerSummary.sourceMode,
      rows: providerSummary.rows,
      categories: providerSummary.categories.map((category) => ({
        key: category.key,
        label: category.label,
        rows: category.rows,
        queries: category.queries || [],
      })),
    })),
    generatedAt,
    totalRows: masterRows.length,
    totalCategories: categorySummaries.length,
    categories: categorySummaries,
    files,
    notes: uniqueNotes,
  };
}

export function getMaterialCatalogCategories() {
  return CATALOG_CATEGORIES.map(({ key, label, queries, dohomeTerms, scgSubcategories, thaiwatsaduUrls }) => ({
    key,
    label,
    queries: [...queries],
    dohomeTerms: [...(dohomeTerms || [])],
    scgSubcategories: [...(scgSubcategories || [])],
    thaiwatsaduUrls: [...(thaiwatsaduUrls || [])],
  }));
}
