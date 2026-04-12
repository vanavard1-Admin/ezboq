import type { QuotationItem } from './projectData';

export type PricingTier = 'value' | 'standard' | 'premium';
export type PriceSourceKind = 'official-index' | 'retail-snapshot' | 'market-benchmark';

export interface PriceSource {
  id: string;
  label: string;
  url: string;
  checkedAt: string;
  kind: PriceSourceKind;
}

export interface MaterialPriceMasterRecord {
  id: string;
  label: string;
  unit: string;
  categoryLabel: string;
  shopCategoryId?: string;
  brand?: string;
  templateMatchers: string[];
  aliases?: string[];
  benchmarkMaterialPrice: number;
  benchmarkLaborPrice: number;
  purchasable?: boolean;
  featured?: boolean;
  preferredVendors?: string[];
  sourceIds: string[];
  note?: string;
}

export interface PriceReferenceSummary {
  seriesLabel: string;
  updatedAt: string;
  tier: PricingTier;
  matchedItems: number;
  totalItems: number;
  coveragePercent: number;
  sourceLabels: string[];
}

export const MARKET_PRICE_REFERENCE_SERIES = 'TH Market Reference 2026-03';
export const MARKET_PRICE_REFERENCE_UPDATED_AT = '2026-03-31';

const MATERIAL_TIER_FACTOR: Record<PricingTier, number> = {
  value: 0.92,
  standard: 1,
  premium: 1.14,
};

const LABOR_TIER_FACTOR: Record<PricingTier, number> = {
  value: 0.97,
  standard: 1,
  premium: 1.08,
};

const PRICE_SOURCES: Record<string, PriceSource> = {
  'moc-2024-01': {
    id: 'moc-2024-01',
    label: 'กระทรวงพาณิชย์ ดัชนีราคาวัสดุก่อสร้าง มกราคม 2567',
    url: 'https://www.price.moc.go.th/price/fileuploader/file_csi/Csi012567.pdf',
    checkedAt: '2024-01-31',
    kind: 'official-index',
  },
  'moc-2024-08': {
    id: 'moc-2024-08',
    label: 'กระทรวงพาณิชย์ ดัชนีราคาวัสดุก่อสร้าง สิงหาคม 2567',
    url: 'https://www.price.moc.go.th/price/fileuploader/file_csi/Csi082567.pdf',
    checkedAt: '2024-08-31',
    kind: 'official-index',
  },
  'moc-2024-11': {
    id: 'moc-2024-11',
    label: 'กระทรวงพาณิชย์ ดัชนีราคาวัสดุก่อสร้าง พฤศจิกายน 2567',
    url: 'https://www.price.moc.go.th/price/fileuploader/file_csi/Csi112567.pdf',
    checkedAt: '2024-11-30',
    kind: 'official-index',
  },
  'retail-paint': {
    id: 'retail-paint',
    label: 'HomePro ราคาอ้างอิงสีรองพื้น / สีทาอาคาร',
    url: 'https://www.homepro.co.th/p/1047608',
    checkedAt: '2026-03-31',
    kind: 'retail-snapshot',
  },
  'retail-tile': {
    id: 'retail-tile',
    label: 'HomePro ราคาอ้างอิงกระเบื้องพอร์ซเลน 60x60',
    url: 'https://www.homepro.co.th/p/174304',
    checkedAt: '2026-03-31',
    kind: 'retail-snapshot',
  },
  'retail-electrical': {
    id: 'retail-electrical',
    label: 'HomePro ราคาอ้างอิงสายไฟ / อุปกรณ์ไฟฟ้าโครงการ',
    url: 'https://www.homepro.co.th/p/1020089',
    checkedAt: '2026-03-31',
    kind: 'retail-snapshot',
  },
  'benchmark-bkk-west': {
    id: 'benchmark-bkk-west',
    label: 'Benchmark ผู้รับเหมา/ร้านวัสดุ กรุงเทพฯ-ปริมณฑลฝั่งตะวันตก',
    url: 'https://ezboq.com/shop',
    checkedAt: MARKET_PRICE_REFERENCE_UPDATED_AT,
    kind: 'market-benchmark',
  },
};

export const materialPriceMaster: MaterialPriceMasterRecord[] = [
  {
    id: 'design-architectural',
    label: 'ค่าออกแบบสถาปัตย์ + Interior',
    unit: 'ตร.ม.',
    categoryLabel: 'บริการออกแบบ',
    templateMatchers: ['ค่าออกแบบสถาปัตยกรรม', 'architectural interior', 'ค่าออกแบบสถาปัตยกรรม + interior'],
    benchmarkMaterialPrice: 620,
    benchmarkLaborPrice: 0,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'design-structural',
    label: 'ค่าแบบโครงสร้าง',
    unit: 'ตร.ม.',
    categoryLabel: 'บริการออกแบบ',
    templateMatchers: ['ค่าแบบโครงสร้าง', 'structural drawing'],
    benchmarkMaterialPrice: 280,
    benchmarkLaborPrice: 0,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'design-mep',
    label: 'ค่าแบบระบบ MEP',
    unit: 'ตร.ม.',
    categoryLabel: 'บริการออกแบบ',
    templateMatchers: ['ค่าแบบระบบ mep', 'ไฟฟ้า ประปา แอร์', 'ค่าแบบระบบไฟฟ้า'],
    benchmarkMaterialPrice: 165,
    benchmarkLaborPrice: 0,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'site-clearing',
    label: 'เคลียร์พื้นที่ / ถางหญ้า',
    unit: 'ตร.ม.',
    categoryLabel: 'งานเตรียมพื้นที่',
    templateMatchers: ['เคลียร์พื้นที่', 'ถางหญ้า', 'งานเคลียร์พื้นที่'],
    benchmarkMaterialPrice: 35,
    benchmarkLaborPrice: 55,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'soil-fill',
    label: 'ถมดินบดอัด',
    unit: 'คิว',
    categoryLabel: 'งานเตรียมพื้นที่',
    templateMatchers: ['ปรับระดับดิน', 'ถมดิน', 'งานปรับระดับดิน'],
    benchmarkMaterialPrice: 390,
    benchmarkLaborPrice: 170,
    sourceIds: ['benchmark-bkk-west', 'moc-2024-11'],
  },
  {
    id: 'demolition-existing',
    label: 'รื้อถอนสิ่งปลูกสร้างเดิม',
    unit: 'เหมา',
    categoryLabel: 'งานรื้อถอน',
    templateMatchers: ['รื้อถอนสิ่งปลูกสร้างเดิม', 'รื้อถอนอาคาร', 'รื้อถอนผนังกั้นห้อง', 'รื้อถอนงานระบบเดิม'],
    benchmarkMaterialPrice: 18000,
    benchmarkLaborPrice: 22000,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'waste-hauling',
    label: 'ขนเศษวัสดุ + ค่าทิ้ง',
    unit: 'เที่ยว',
    categoryLabel: 'งานรื้อถอน',
    templateMatchers: ['ขนย้ายเศษวัสดุ', 'ค่าทิ้ง', 'ขนเศษวัสดุ'],
    benchmarkMaterialPrice: 4200,
    benchmarkLaborPrice: 1800,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'cement-portland-50kg',
    label: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',
    unit: 'ถุง',
    categoryLabel: 'งานก่อฉาบ',
    shopCategoryId: 'cement-mortar',
    brand: 'SCG / TPI',
    templateMatchers: ['ปูนซีเมนต์ปอร์ตแลนด์', 'ปอร์ตแลนด์', 'ปูนโครงสร้าง', 'ปูนซีเมนต์ 50 กก.'],
    aliases: ['ปูนปอร์ตแลนด์', 'ปูนตราช้าง', 'cement portland', 'scg portland cement'],
    benchmarkMaterialPrice: 149,
    benchmarkLaborPrice: 0,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-siam', 'vendor-thaiwatsadu', 'vendor-homepro'],
    sourceIds: ['moc-2024-11', 'benchmark-bkk-west'],
  },
  {
    id: 'aac-block-75',
    label: 'อิฐมวลเบา 7.5 ซม.',
    unit: 'ตร.ม.',
    categoryLabel: 'งานก่อฉาบ',
    shopCategoryId: 'cement-mortar',
    templateMatchers: ['อิฐมวลเบา หนา 7.5', 'ก่อผนังอิฐมวลเบา หนา 7.5', 'อิฐมวลเบา 7.5'],
    aliases: ['q-con 7.5', 'super block 7.5', 'ก่อผนังอิฐมวลเบา'],
    benchmarkMaterialPrice: 128,
    benchmarkLaborPrice: 360,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-siam', 'vendor-thaiwatsadu', 'vendor-homepro'],
    sourceIds: ['moc-2024-11', 'benchmark-bkk-west'],
  },
  {
    id: 'aac-block-100',
    label: 'อิฐมวลเบา 10 ซม.',
    unit: 'ตร.ม.',
    categoryLabel: 'งานก่อฉาบ',
    shopCategoryId: 'cement-mortar',
    templateMatchers: ['อิฐมวลเบา หนา 10', 'ก่อผนังอิฐมวลเบา หนา 10', 'อิฐมวลเบา 10'],
    aliases: ['q-con 10', 'super block 10'],
    benchmarkMaterialPrice: 160,
    benchmarkLaborPrice: 420,
    purchasable: true,
    preferredVendors: ['vendor-siam', 'vendor-thaiwatsadu', 'vendor-homepro'],
    sourceIds: ['moc-2024-11', 'benchmark-bkk-west'],
  },
  {
    id: 'plaster-mortar',
    label: 'ปูนฉาบสำเร็จ / ฉาบผนัง',
    unit: 'ตร.ม.',
    categoryLabel: 'งานก่อฉาบ',
    shopCategoryId: 'cement-mortar',
    templateMatchers: ['ฉาบปูนผนัง', 'ปูนฉาบสำเร็จ', 'ฉาบเรียบ'],
    aliases: ['ปูนฉาบตราเสือ', 'จระเข้ ปูนฉาบ'],
    benchmarkMaterialPrice: 55,
    benchmarkLaborPrice: 320,
    purchasable: true,
    preferredVendors: ['vendor-siam', 'vendor-thaiwatsadu', 'vendor-homepro'],
    sourceIds: ['moc-2024-08', 'benchmark-bkk-west'],
  },
  {
    id: 'rc-lintel',
    label: 'เสาเอ็น / คานทับหลัง คสล.',
    unit: 'เมตร',
    categoryLabel: 'งานก่อฉาบ',
    templateMatchers: ['เสาเอ็น', 'คานทับหลัง', 'เสริมผนังก่อ'],
    benchmarkMaterialPrice: 280,
    benchmarkLaborPrice: 470,
    sourceIds: ['benchmark-bkk-west', 'moc-2024-11'],
  },
  {
    id: 'opening-frame',
    label: 'วงกบช่องเปิด / ทับหลัง',
    unit: 'ช่อง',
    categoryLabel: 'งานก่อฉาบ',
    shopCategoryId: 'hardware',
    templateMatchers: ['วงกบประตู', 'วงกบหน้าต่าง', 'ช่องเปิด'],
    aliases: ['วงกบเหล็กชุบ', 'วงกบอลูมิเนียม'],
    benchmarkMaterialPrice: 920,
    benchmarkLaborPrice: 650,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'consumer-unit',
    label: 'Consumer Unit 12-18 ช่อง',
    unit: 'ตู้',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Schneider / HACO',
    templateMatchers: ['consumer unit', 'mdb', 'ตู้ consumer unit', 'ตู้โหลดเซ็นเตอร์'],
    aliases: ['load center 12 ช่อง', 'load center 18 ช่อง'],
    benchmarkMaterialPrice: 5200,
    benchmarkLaborPrice: 2600,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'mcb-light',
    label: 'MCB 16-20A',
    unit: 'ตัว',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Schneider / ABB',
    templateMatchers: ['mcb 16-20a', 'วงจรไฟ ปลั๊ก', 'เบรกเกอร์ mcb 16-20a'],
    aliases: ['mcb 16a', 'mcb 20a', 'เบรกเกอร์ 1p 16a'],
    benchmarkMaterialPrice: 320,
    benchmarkLaborPrice: 150,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'mcb-heavy',
    label: 'MCB 32A วงจรหนัก',
    unit: 'ตัว',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Schneider / ABB',
    templateMatchers: ['mcb 32a', 'วงจรหนัก', 'แอร์ เตา', 'เครื่องทำน้ำอุ่น'],
    aliases: ['mcb 2p 32a'],
    benchmarkMaterialPrice: 480,
    benchmarkLaborPrice: 220,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'rcbo',
    label: 'RCBO / ELCB 30mA',
    unit: 'ตัว',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Schneider / ABB',
    templateMatchers: ['rcbo', 'elcb', 'กันไฟดูด 30ma'],
    aliases: ['rcbo 30ma', 'elcb 30ma'],
    benchmarkMaterialPrice: 1350,
    benchmarkLaborPrice: 320,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'wire-thw-1_5',
    label: 'สายไฟ THW 1.5 sq.mm.',
    unit: 'เมตร',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Yazaki / BCC',
    templateMatchers: ['thw 1.5', 'สายไฟ thw 1.5', 'วงจรไฟฟ้าแสงสว่าง'],
    aliases: ['thw 1.5 sq.mm', 'สายไฟ 1.5'],
    benchmarkMaterialPrice: 9,
    benchmarkLaborPrice: 15,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'moc-2024-11'],
  },
  {
    id: 'wire-thw-2_5',
    label: 'สายไฟ THW 2.5 sq.mm.',
    unit: 'เมตร',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Yazaki / BCC',
    templateMatchers: ['thw 2.5', 'สายไฟ thw 2.5', 'วงจรปลั๊ก'],
    aliases: ['thw 2.5 sq.mm', 'สายไฟ 2.5'],
    benchmarkMaterialPrice: 14,
    benchmarkLaborPrice: 15,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'moc-2024-11'],
  },
  {
    id: 'wire-heavy-4sq',
    label: 'สายไฟวงจรหนัก 4-6 sq.mm.',
    unit: 'เมตร',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Yazaki / BCC',
    templateMatchers: ['thw/vct 4-6', 'วงจรหนัก', 'สายไฟ 4 sq', 'สายไฟ 6 sq'],
    aliases: ['vct 2x4', 'thw 4 sq.mm'],
    benchmarkMaterialPrice: 24,
    benchmarkLaborPrice: 20,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'conduit-pvc',
    label: 'ท่อร้อยสาย PVC 3/8 - 1/2',
    unit: 'เมตร',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    templateMatchers: ['ท่อร้อยสาย pvc', 'conduit pvc', 'ท่อ pvc 3/8', 'ท่อ pvc 1/2'],
    aliases: ['ท่อไฟ pvc', 'ท่อร้อยสายไฟ'],
    benchmarkMaterialPrice: 14,
    benchmarkLaborPrice: 18,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'switch-outlet',
    label: 'ปลั๊ก / สวิตช์ รุ่นมาตรฐานโครงการ',
    unit: 'จุด',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    brand: 'Panasonic Wide / Schneider AvatarOn',
    templateMatchers: ['ปลั๊กไฟ', 'สวิตช์ไฟ', 'panasonic wide series', 'ปลั๊ก 3 ขา', 'สวิตช์ 1-3 gang'],
    aliases: ['switch wide series', 'outlet wide series'],
    benchmarkMaterialPrice: 220,
    benchmarkLaborPrice: 255,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'led-downlight',
    label: 'ดาวน์ไลท์ LED 7-9W',
    unit: 'ดวง',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    templateMatchers: ['ดาวน์ไลท์ led 7-9w', 'downlight led 7-9w', 'ดาวน์ไลท์ led'],
    aliases: ['ดาวน์ไลท์ 9w', 'ดาวน์ไลท์ 7w'],
    benchmarkMaterialPrice: 260,
    benchmarkLaborPrice: 150,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'grounding-set',
    label: 'ชุดสายกราวด์ + หลักดิน',
    unit: 'ชุด',
    categoryLabel: 'งานระบบไฟฟ้า',
    shopCategoryId: 'electrical',
    templateMatchers: ['สายกราวด์', 'หลักดิน', 'grounding'],
    aliases: ['copper rod', 'ground rod'],
    benchmarkMaterialPrice: 2800,
    benchmarkLaborPrice: 1500,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['retail-electrical', 'benchmark-bkk-west'],
  },
  {
    id: 'ppr-pipe',
    label: 'ท่อน้ำดี PPR 20-25 มม.',
    unit: 'เมตร',
    categoryLabel: 'งานประปา',
    shopCategoryId: 'plumbing',
    templateMatchers: ['ท่อน้ำดี ppr', 'ppr pn10', 'ท่อ ppr'],
    aliases: ['ppr 20mm', 'ppr 25mm'],
    benchmarkMaterialPrice: 52,
    benchmarkLaborPrice: 85,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['moc-2024-11', 'benchmark-bkk-west'],
  },
  {
    id: 'water-point',
    label: 'จุดจ่ายน้ำดี + วาล์ว',
    unit: 'จุด',
    categoryLabel: 'งานประปา',
    shopCategoryId: 'plumbing',
    templateMatchers: ['จุดจ่ายน้ำดี', 'บอลวาล์ว', 'ข้อต่อ ppr', 'วาล์ว'],
    aliases: ['ball valve', 'valve fitting'],
    benchmarkMaterialPrice: 380,
    benchmarkLaborPrice: 850,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west', 'moc-2024-11'],
  },
  {
    id: 'pvc-waste-pipe',
    label: 'ท่อทิ้งน้ำเสีย PVC 2-4 นิ้ว',
    unit: 'เมตร',
    categoryLabel: 'งานประปา',
    shopCategoryId: 'plumbing',
    templateMatchers: ['ท่อทิ้งน้ำเสีย pvc', 'ท่อ pvc 2', 'ท่อ pvc 4', 'น้ำเสีย pvc'],
    aliases: ['pvc waste', 'drain pipe pvc'],
    benchmarkMaterialPrice: 68,
    benchmarkLaborPrice: 105,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west', 'moc-2024-11'],
  },
  {
    id: 'floor-drain',
    label: 'Floor Drain / P-Trap',
    unit: 'ตัว',
    categoryLabel: 'งานประปา',
    shopCategoryId: 'plumbing',
    templateMatchers: ['floor drain', 'p-trap', 'ท่อน้ำทิ้ง', 'ดักกลิ่น'],
    aliases: ['ตะแกรงกันกลิ่น', 'floor drain stainless'],
    benchmarkMaterialPrice: 420,
    benchmarkLaborPrice: 220,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'water-meter',
    label: 'มิเตอร์น้ำ + วาล์วหลัก',
    unit: 'ชุด',
    categoryLabel: 'งานประปา',
    shopCategoryId: 'plumbing',
    templateMatchers: ['มิเตอร์น้ำ', 'วาล์วหลัก', 'water meter'],
    aliases: ['main valve'],
    benchmarkMaterialPrice: 1650,
    benchmarkLaborPrice: 850,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'porcelain-floor-60',
    label: 'กระเบื้องพอร์ซเลน 60x60',
    unit: 'ตร.ม.',
    categoryLabel: 'งานกระเบื้อง',
    shopCategoryId: 'tile-floor',
    brand: 'COTTO / Duragres',
    templateMatchers: ['กระเบื้องพอร์ซเลน 60×60', 'กระเบื้องพอร์ซเลน 60x60', 'ปูกระเบื้องพื้น 60×60'],
    aliases: ['cotto 60x60', 'duragres 60x60'],
    benchmarkMaterialPrice: 420,
    benchmarkLaborPrice: 260,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['retail-tile', 'moc-2024-11'],
  },
  {
    id: 'porcelain-floor-120',
    label: 'กระเบื้องพอร์ซเลน 60x120',
    unit: 'ตร.ม.',
    categoryLabel: 'งานกระเบื้อง',
    shopCategoryId: 'tile-floor',
    brand: 'COTTO / Campana',
    templateMatchers: ['กระเบื้องพอร์ซเลน 60x120', '60×120', 'กระเบื้องพื้น 60x120'],
    aliases: ['cotto 60x120'],
    benchmarkMaterialPrice: 690,
    benchmarkLaborPrice: 320,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['retail-tile', 'benchmark-bkk-west'],
  },
  {
    id: 'wall-tile-30x60',
    label: 'กระเบื้องผนัง 30x60',
    unit: 'ตร.ม.',
    categoryLabel: 'งานกระเบื้อง',
    shopCategoryId: 'tile-floor',
    templateMatchers: ['กระเบื้องผนัง 30×60', 'กระเบื้องผนัง 30x60', 'ปูผนังห้องน้ำ'],
    aliases: ['wall tile 30x60'],
    benchmarkMaterialPrice: 340,
    benchmarkLaborPrice: 280,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['retail-tile', 'benchmark-bkk-west'],
  },
  {
    id: 'toilet-set',
    label: 'โถสุขภัณฑ์ชิ้นเดียว',
    unit: 'ชุด',
    categoryLabel: 'สุขภัณฑ์',
    shopCategoryId: 'plumbing',
    brand: 'COTTO / American Standard',
    templateMatchers: ['โถสุขภัณฑ์ชิ้นเดียว', 'สุขภัณฑ์', 'dual flush'],
    aliases: ['toilet one piece'],
    benchmarkMaterialPrice: 5200,
    benchmarkLaborPrice: 850,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'gypsum-flat-ceiling',
    label: 'ฝ้าเรียบยิปซัม 9 มม.',
    unit: 'ตร.ม.',
    categoryLabel: 'งานฝ้าเพดาน',
    shopCategoryId: 'ceiling-wall',
    templateMatchers: ['ฝ้าเรียบ ยิปซั่มบอร์ด 9 มม.', 'ฝ้าเรียบยิปซัม', 'ยิปซั่มบอร์ด 9 มม.'],
    aliases: ['gypsum board 9mm', 'ฝ้าเรียบ'],
    benchmarkMaterialPrice: 260,
    benchmarkLaborPrice: 290,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['moc-2024-11', 'benchmark-bkk-west'],
  },
  {
    id: 'drop-ceiling',
    label: 'ฝ้าหลุม / ฝ้าดรอป',
    unit: 'ตร.ม.',
    categoryLabel: 'งานฝ้าเพดาน',
    shopCategoryId: 'ceiling-wall',
    templateMatchers: ['ฝ้าหลุม', 'ฝ้าดรอป', 'drop ceiling'],
    aliases: ['ฝ้าร่องไฟ'],
    benchmarkMaterialPrice: 380,
    benchmarkLaborPrice: 360,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'moisture-board',
    label: 'ฝ้าห้องน้ำ แผ่นกันชื้น',
    unit: 'ตร.ม.',
    categoryLabel: 'งานฝ้าเพดาน',
    shopCategoryId: 'ceiling-wall',
    templateMatchers: ['ฝ้าห้องน้ำ', 'แผ่นกันชื้น', 'calcium silicate'],
    aliases: ['smart board 6mm', 'แคลเซียมซิลิเกต 6 มม.'],
    benchmarkMaterialPrice: 320,
    benchmarkLaborPrice: 310,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west', 'moc-2024-11'],
  },
  {
    id: 'cornice-pu',
    label: 'บัวฝ้า / คิ้วเชิงผนัง PU',
    unit: 'เมตร',
    categoryLabel: 'งานฝ้าเพดาน',
    shopCategoryId: 'ceiling-wall',
    templateMatchers: ['บัวฝ้า', 'คิ้วเชิงผนัง pu'],
    aliases: ['pu cornice'],
    benchmarkMaterialPrice: 140,
    benchmarkLaborPrice: 90,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'spc-floor',
    label: 'พื้น SPC Click Lock 4 มม.',
    unit: 'ตร.ม.',
    categoryLabel: 'งานพื้น',
    shopCategoryId: 'tile-floor',
    templateMatchers: ['พื้น spc', 'spc click lock 4 มม.', 'vinyl plank'],
    aliases: ['spc 4mm', 'underlay pe foam'],
    benchmarkMaterialPrice: 560,
    benchmarkLaborPrice: 180,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'laminate-floor',
    label: 'พื้นลามิเนต 8 มม.',
    unit: 'ตร.ม.',
    categoryLabel: 'งานพื้น',
    shopCategoryId: 'tile-floor',
    templateMatchers: ['พื้นลามิเนต 8 มม.', 'laminate floor', 'ลามิเนต 8 มม.'],
    aliases: ['laminate 8mm'],
    benchmarkMaterialPrice: 520,
    benchmarkLaborPrice: 190,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'primer-sealer',
    label: 'สีรองพื้นปูนใหม่',
    unit: 'ตร.ม.',
    categoryLabel: 'งานสี',
    shopCategoryId: 'paint',
    brand: 'TOA / Nippon / Jotun',
    templateMatchers: ['สีรองพื้นปูนใหม่', 'primer', 'sealer'],
    aliases: ['toa supershield primer', 'paint primer'],
    benchmarkMaterialPrice: 48,
    benchmarkLaborPrice: 22,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-paint', 'moc-2024-11'],
  },
  {
    id: 'interior-paint',
    label: 'สีผนังภายใน อะคริลิค 100%',
    unit: 'ตร.ม.',
    categoryLabel: 'งานสี',
    shopCategoryId: 'paint',
    brand: 'TOA / Nippon / Beger',
    templateMatchers: ['สีผนังภายใน', 'สีน้ำอะครีลิค', 'toa 4 seasons', 'nippon matex'],
    aliases: ['interior paint', 'สีทาภายใน'],
    benchmarkMaterialPrice: 72,
    benchmarkLaborPrice: 40,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-paint', 'moc-2024-11'],
  },
  {
    id: 'ceiling-paint',
    label: 'สีทาฝ้าเพดาน',
    unit: 'ตร.ม.',
    categoryLabel: 'งานสี',
    shopCategoryId: 'paint',
    brand: 'TOA Ceiling Paint',
    templateMatchers: ['สีฝ้าเพดาน', 'สีทาฝ้า', 'ceiling paint'],
    aliases: ['toa ceiling paint'],
    benchmarkMaterialPrice: 45,
    benchmarkLaborPrice: 28,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-paint', 'benchmark-bkk-west'],
  },
  {
    id: 'waterproofing',
    label: 'กันซึมดาดฟ้า / ห้องน้ำ',
    unit: 'ตร.ม.',
    categoryLabel: 'งานสีและเคมีภัณฑ์',
    shopCategoryId: 'paint',
    templateMatchers: ['กันซึม', 'waterproof', 'น้ำยากันซึม'],
    aliases: ['waterproof membrane'],
    benchmarkMaterialPrice: 165,
    benchmarkLaborPrice: 85,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['retail-paint', 'benchmark-bkk-west'],
  },
  {
    id: 'builtin-wardrobe',
    label: 'ตู้เสื้อผ้าบิ้วอินมาตรฐาน',
    unit: 'ชุด',
    categoryLabel: 'งานบิ้วอิน',
    shopCategoryId: 'wood-builtin',
    templateMatchers: ['ตู้เสื้อผ้าบิ้วอิน', 'wardrobe', 'บานเลื่อน melamine'],
    aliases: ['builtin wardrobe', 'mdf กันชื้น 16 มม.'],
    benchmarkMaterialPrice: 24500,
    benchmarkLaborPrice: 9800,
    purchasable: false,
    sourceIds: ['benchmark-bkk-west'],
    note: 'ใช้เป็น benchmark งานบิ้วอินรวมฟิตติ้ง ไม่ใช่สินค้า retail เดี่ยว',
  },
  {
    id: 'kitchen-base-quartz',
    label: 'ตู้ครัวล่าง + Top หินควอตซ์',
    unit: 'ชุด',
    categoryLabel: 'งานครัว',
    shopCategoryId: 'wood-builtin',
    templateMatchers: ['ชุดครัว ตู้ล่าง', 'top หินควอตซ์', 'ชุดครัว'],
    aliases: ['quartz countertop kitchen'],
    benchmarkMaterialPrice: 38500,
    benchmarkLaborPrice: 12500,
    purchasable: false,
    sourceIds: ['benchmark-bkk-west'],
    note: 'benchmark รวมงานไม้บิ้วอิน + top หิน + fitting',
  },
  {
    id: 'kitchen-wall-cabinet',
    label: 'ตู้ครัวลอย',
    unit: 'ชุด',
    categoryLabel: 'งานครัว',
    shopCategoryId: 'wood-builtin',
    templateMatchers: ['ชุดครัว ตู้ลอย', 'ตู้ครัวลอย'],
    aliases: ['wall cabinet kitchen'],
    benchmarkMaterialPrice: 14500,
    benchmarkLaborPrice: 5200,
    purchasable: false,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'bathroom-door',
    label: 'ประตูห้องน้ำ PVC / อลูมิเนียม',
    unit: 'บาน',
    categoryLabel: 'ประตูหน้าต่าง',
    shopCategoryId: 'hardware',
    templateMatchers: ['ประตูห้องน้ำ pvc', 'ประตูห้องน้ำ อลูมิเนียม'],
    aliases: ['bathroom door pvc'],
    benchmarkMaterialPrice: 2950,
    benchmarkLaborPrice: 950,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'aluminum-door',
    label: 'ประตูบานเปิดอลูมิเนียม + กระจก',
    unit: 'บาน',
    categoryLabel: 'ประตูหน้าต่าง',
    shopCategoryId: 'hardware',
    templateMatchers: ['ประตูบานเปิด อลูมิเนียม', 'อลูมิเนียม + กระจก'],
    aliases: ['aluminum swing door'],
    benchmarkMaterialPrice: 8200,
    benchmarkLaborPrice: 1800,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'aluminum-sliding-door',
    label: 'ประตูบานเลื่อนอลูมิเนียม + Tempered',
    unit: 'บาน',
    categoryLabel: 'ประตูหน้าต่าง',
    shopCategoryId: 'hardware',
    templateMatchers: ['ประตูบานเลื่อน อลูมิเนียม', 'tempered', 'บานเลื่อนอลูมิเนียม'],
    aliases: ['aluminum sliding door'],
    benchmarkMaterialPrice: 13800,
    benchmarkLaborPrice: 2500,
    purchasable: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'aluminum-window',
    label: 'หน้าต่างบานเลื่อนอลูมิเนียม',
    unit: 'ชุด',
    categoryLabel: 'ประตูหน้าต่าง',
    shopCategoryId: 'hardware',
    templateMatchers: ['หน้าต่างบานเลื่อน อลูมิเนียม', 'หน้าต่างอลูมิเนียม'],
    aliases: ['aluminum sliding window'],
    benchmarkMaterialPrice: 6400,
    benchmarkLaborPrice: 1500,
    purchasable: true,
    featured: true,
    preferredVendors: ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'hdf-door',
    label: 'ประตู HDF ภายใน',
    unit: 'บาน',
    categoryLabel: 'ประตูหน้าต่าง',
    shopCategoryId: 'hardware',
    templateMatchers: ['ประตู hdf', 'ประตูไม้จริง', 'ประตูภายใน'],
    aliases: ['interior hdf door'],
    benchmarkMaterialPrice: 3600,
    benchmarkLaborPrice: 1200,
    purchasable: true,
    preferredVendors: ['vendor-homepro', 'vendor-thaiwatsadu', 'vendor-siam'],
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'aircon-12000',
    label: 'แอร์ Inverter 12,000 BTU พร้อมติดตั้ง',
    unit: 'เครื่อง',
    categoryLabel: 'เครื่องปรับอากาศ',
    templateMatchers: ['12,000 btu', 'แอร์ผนัง inverter 12,000', 'air 12000'],
    aliases: ['daikin 12000 btu', 'mitsubishi 12000 btu'],
    benchmarkMaterialPrice: 18900,
    benchmarkLaborPrice: 4500,
    purchasable: false,
    sourceIds: ['benchmark-bkk-west'],
  },
  {
    id: 'aircon-18000',
    label: 'แอร์ Inverter 18,000 BTU พร้อมติดตั้ง',
    unit: 'เครื่อง',
    categoryLabel: 'เครื่องปรับอากาศ',
    templateMatchers: ['18,000 btu', 'แอร์ผนัง inverter 18,000', 'air 18000'],
    aliases: ['daikin 18000 btu', 'mitsubishi 18000 btu'],
    benchmarkMaterialPrice: 24900,
    benchmarkLaborPrice: 5000,
    purchasable: false,
    sourceIds: ['benchmark-bkk-west'],
  },
];

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesMatcher(haystack: string, matcher: string): boolean {
  return haystack.includes(normalizeText(matcher));
}

export function getPriceSource(sourceId: string): PriceSource | undefined {
  return PRICE_SOURCES[sourceId];
}

export function getPriceSources(sourceIds: string[]): PriceSource[] {
  return sourceIds.map((sourceId) => PRICE_SOURCES[sourceId]).filter((source): source is PriceSource => Boolean(source));
}

export function resolveMaterialUnitPrice(record: MaterialPriceMasterRecord, tier: PricingTier): number {
  return Math.round(record.benchmarkMaterialPrice * MATERIAL_TIER_FACTOR[tier]);
}

export function resolveLaborUnitPrice(record: MaterialPriceMasterRecord, tier: PricingTier): number {
  return Math.round(record.benchmarkLaborPrice * LABOR_TIER_FACTOR[tier]);
}

export function findMaterialPriceReference(
  description: string,
  unit?: string,
): MaterialPriceMasterRecord | undefined {
  const haystack = normalizeText(description);
  const normalizedUnit = normalizeText(unit || '');

  const scored = materialPriceMaster
    .map((record) => {
      const searchableMatchers = [record.label, ...record.templateMatchers, ...(record.aliases || [])];
      const matched = searchableMatchers.filter((matcher) => includesMatcher(haystack, matcher));
      if (matched.length === 0) {
        return null;
      }

      const unitScore = normalizedUnit && normalizeText(record.unit) === normalizedUnit ? 0.15 : 0;
      const labelScore = includesMatcher(haystack, record.label) ? 6 : 0;
      const aliasScore = matched.some((matcher) => (record.aliases || []).includes(matcher)) ? 3 : 0;
      const matcherScore = matched.reduce((sum, matcher) => sum + normalizeText(matcher).length, 0);
      return {
        record,
        score: matcherScore + unitScore + labelScore + aliasScore,
      };
    })
    .filter((value): value is { record: MaterialPriceMasterRecord; score: number } => value !== null)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.record;
}

export function applyMarketReferenceToItem(
  item: QuotationItem,
  tier: PricingTier,
): { item: QuotationItem; matched: boolean; sourceLabels: string[] } {
  if (!item.no.includes('.') || !item.description.trim()) {
    return { item, matched: false, sourceLabels: [] };
  }

  const reference = findMaterialPriceReference(item.description, item.unit);
  if (!reference) {
    return { item, matched: false, sourceLabels: [] };
  }

  return {
    item: {
      ...item,
      unitPrice: resolveMaterialUnitPrice(reference, tier),
      laborCost: resolveLaborUnitPrice(reference, tier),
    },
    matched: true,
    sourceLabels: getPriceSources(reference.sourceIds).map((source) => source.label),
  };
}

export function buildPriceReferenceSummary(
  items: QuotationItem[],
  tier: PricingTier,
): PriceReferenceSummary {
  const billableItems = items.filter((item) => item.no.includes('.'));
  const matchedItems = billableItems.filter((item) => Boolean(findMaterialPriceReference(item.description, item.unit))).length;
  const sourceLabels = Array.from(new Set(
    billableItems.flatMap((item) => {
      const reference = findMaterialPriceReference(item.description, item.unit);
      return reference ? getPriceSources(reference.sourceIds).map((source) => source.label) : [];
    }),
  ));

  return {
    seriesLabel: MARKET_PRICE_REFERENCE_SERIES,
    updatedAt: MARKET_PRICE_REFERENCE_UPDATED_AT,
    tier,
    matchedItems,
    totalItems: billableItems.length,
    coveragePercent: billableItems.length > 0 ? Math.round((matchedItems / billableItems.length) * 100) : 0,
    sourceLabels,
  };
}
