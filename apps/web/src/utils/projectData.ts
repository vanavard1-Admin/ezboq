import { addWeeks, formatThaiDate, getCurrentThaiDate } from './dateUtils';
import type { PricingTier, PriceReferenceSummary } from './materialPriceMaster';
import type { ProjectAccounting } from '../types/accounting';

export interface QuotationItem {
  no: string;
  description: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  laborCost: number | string;
  customerUnitPrice?: number | string;
  scopeDetails?: string; // รายละเอียดสโคปงาน
  totalPrice?: number | string;
}

export type ProjectStatus = 'active' | 'archived';

export interface WorkPlanItem {
  no: string;
  task: string;
  duration: string;
  weekCells: string[]; // '■' (โรงงาน), '□' (หน้างาน), '' (ว่าง)
  status: string;
}

export interface WorkPlanConfig {
  totalWeeks: number;
  startDate?: string;
  endDate?: string;
  durationLabel?: string;
  items: WorkPlanItem[];
}

export interface PaymentInstallmentConfig {
  no: number;
  description: string;
  percentage: number;
  condition?: string;
}

export interface PaymentInstallment extends PaymentInstallmentConfig {
  amount: number;
}

export interface TaxData {
  includeVat: boolean;
  includeWithholding: boolean;
  vatRate: number;            // default 0.07
  withholdingRate: number;    // default 0.03
  taxInvoiceNumber?: string;
  whtCertNumber?: string;
}

export interface ProjectDiscountConfig {
  label: string;
  percent?: number; // decimal, e.g. 0.25 = 25%
  amount?: number;
  appliesToCategoryRefs?: string[];
  requiresCategoryRefs?: string[];
  condition?: string;
}

export interface PresentationBoardData {
  title?: string;
  subtitle?: string;
  brandLabel?: string;
  featureImage?: string;
  heroImage?: string;
}

export interface DocumentPipelineData {
  sourceFingerprint: string;
  lastPreparedAt: string;
  status: 'ready' | 'attention';
  readyDocuments: string[];
  missingInputs: string[];
}

export interface ProjectData {
  id: string;
  name: string;
  address: string;
  phone: string;
  owner: string;
  quotationData: QuotationItem[];
  scopeDetails?: string;
  designFee?: number;
  totalCost?: number;
  customerPrice?: number;
  operatingCost?: number;
  operatingRate?: number;
  markupRate?: number;
  discountConfig?: ProjectDiscountConfig;
  status?: ProjectStatus; // default 'active'
  // Template generation metadata
  templateId?: string;
  templateArea?: number;
  templateBudget?: number;
  templateRooms?: number;
  templateBathrooms?: number;
  templatePricingTier?: PricingTier;
  priceReferenceSummary?: PriceReferenceSummary;
  // Tax document data
  taxData?: TaxData;
  // Work plan data
  workPlan?: WorkPlanConfig;
  paymentSchedule?: PaymentInstallmentConfig[];
  // Presentation board data
  presentationBoard?: PresentationBoardData;
  autoSyncDocuments?: boolean;
  documentPipeline?: DocumentPipelineData;
  assignedUserIds?: string[];
  accounting?: ProjectAccounting;
}

function getProjectLineCost(
  item: Pick<QuotationItem, 'quantity' | 'unitPrice' | 'laborCost' | 'totalPrice'>,
): number {
  if (!item.quantity || item.quantity === '') return 0;
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const laborCost = Number(item.laborCost) || 0;
  // ใช้ unitPrice + laborCost เป็นหลัก, fallback เป็น totalPrice เมื่อไม่มี breakdown
  if (unitPrice > 0 || laborCost > 0) return qty * (unitPrice + laborCost);
  if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
    return qty * (Number(item.totalPrice) || 0);
  }
  return 0;
}

export function getProjectMarkupRate(project: Pick<ProjectData, 'markupRate'>, itemNo: string): number {
  const mainCategory = itemNo.split('.')[0];
  if (mainCategory === 'A') return 0;
  return typeof project.markupRate === 'number' ? project.markupRate : 0.25;
}

export function getProjectMarkupMultiplier(project: Pick<ProjectData, 'markupRate'>, itemNo: string): number {
  return 1 + getProjectMarkupRate(project, itemNo);
}

export function getProjectCustomerUnitPrice(
  project: Pick<ProjectData, 'markupRate'>,
  item: Pick<QuotationItem, 'no' | 'unitPrice' | 'laborCost' | 'totalPrice' | 'customerUnitPrice'>,
): number {
  if (item.customerUnitPrice !== undefined && item.customerUnitPrice !== null && item.customerUnitPrice !== '') {
    return Number(item.customerUnitPrice) || 0;
  }

  const baseUnitPrice = item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== ''
    ? Number(item.totalPrice) || 0
    : (Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0);

  return baseUnitPrice * getProjectMarkupMultiplier(project, item.no);
}

export function getProjectCustomerAmount(
  project: Pick<ProjectData, 'markupRate'>,
  item: Pick<QuotationItem, 'no' | 'quantity' | 'unitPrice' | 'laborCost' | 'totalPrice' | 'customerUnitPrice'>,
): number {
  if (!item.quantity || item.quantity === '') return 0;
  return (Number(item.quantity) || 0) * getProjectCustomerUnitPrice(project, item);
}

function getProjectCategoryRef(itemNo: string): string {
  return itemNo.split('.')[0] || '';
}

function hasProjectCategory(
  project: Pick<ProjectData, 'quotationData'>,
  categoryRef: string,
): boolean {
  return project.quotationData.some((item) => item.quantity !== '' && getProjectCategoryRef(item.no) === categoryRef);
}

export function getProjectCustomerSubtotalBeforeDiscount(
  project: Pick<ProjectData, 'quotationData' | 'markupRate'>,
): number {
  return Math.round(project.quotationData.reduce((sum, item) => sum + getProjectCustomerAmount(project, item), 0));
}

export function getProjectDiscountAmount(
  project: Pick<ProjectData, 'quotationData' | 'markupRate' | 'discountConfig'>,
): number {
  const discountConfig = project.discountConfig;
  if (!discountConfig) return 0;

  const requiredCategories = (discountConfig.requiresCategoryRefs || []).filter(Boolean);
  if (requiredCategories.length > 0 && !requiredCategories.every((categoryRef) => hasProjectCategory(project, categoryRef))) {
    return 0;
  }

  if (typeof discountConfig.amount === 'number' && discountConfig.amount > 0) {
    return Math.round(discountConfig.amount);
  }

  const percent = typeof discountConfig.percent === 'number' ? discountConfig.percent : 0;
  if (percent <= 0) return 0;

  const appliedCategories = (discountConfig.appliesToCategoryRefs || []).filter(Boolean);
  const baseAmount = Math.round(project.quotationData.reduce((sum, item) => {
    if (item.quantity === '') return sum;
    if (appliedCategories.length > 0 && !appliedCategories.includes(getProjectCategoryRef(item.no))) {
      return sum;
    }
    return sum + getProjectCustomerAmount(project, item);
  }, 0));

  return Math.max(0, Math.round(baseAmount * percent));
}

export function getProjectCustomerSubtotal(
  project: Pick<ProjectData, 'quotationData' | 'markupRate' | 'discountConfig'>,
): number {
  const subtotalBeforeDiscount = getProjectCustomerSubtotalBeforeDiscount(project);
  const discountAmount = getProjectDiscountAmount(project);
  return Math.max(0, subtotalBeforeDiscount - discountAmount);
}

export function getProjectOperatingCost(
  project: Pick<ProjectData, 'operatingCost' | 'operatingRate'>,
  customerSubtotal: number,
): number {
  if (typeof project.operatingCost === 'number') {
    return project.operatingCost;
  }

  const operatingRate = typeof project.operatingRate === 'number' ? project.operatingRate : 0.05;
  return Math.round(customerSubtotal * operatingRate);
}

export function getProjectGrandTotal(
  project: Pick<ProjectData, 'quotationData' | 'markupRate' | 'discountConfig' | 'operatingCost' | 'operatingRate'>,
): number {
  const subtotal = getProjectCustomerSubtotal(project);
  return subtotal + getProjectOperatingCost(project, subtotal);
}

function hasProjectTextValue(value?: string): boolean {
  return Boolean(value && value.trim() && value.trim() !== '-');
}

function createProjectFingerprint(project: ProjectData, markupRate: number): string {
  const payload = JSON.stringify({
    name: project.name,
    address: project.address,
    phone: project.phone,
    owner: project.owner,
    markupRate,
    operatingRate: project.operatingRate,
    discountConfig: project.discountConfig,
    templateId: project.templateId,
    templateArea: project.templateArea,
    templateRooms: project.templateRooms,
    templateBathrooms: project.templateBathrooms,
    quotationData: project.quotationData.map((item) => ({
      no: item.no,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      laborCost: item.laborCost,
      customerUnitPrice: item.customerUnitPrice,
      totalPrice: item.totalPrice,
      scopeDetails: item.scopeDetails,
    })),
  });

  let hash = 5381;
  for (let index = 0; index < payload.length; index += 1) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(index);
  }

  return `pipe-${hash >>> 0}`;
}

function hasPurchasableItems(quotationData: QuotationItem[]): boolean {
  return quotationData.some((item) => {
    if (!item.no.includes('.') || !item.quantity || item.quantity === '') return false;
    const materialUnitCost = item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== ''
      ? Number(item.totalPrice) || 0
      : Number(item.unitPrice) || 0;
    return materialUnitCost > 0;
  });
}

function buildPresentationBoardDefaults(project: ProjectData): PresentationBoardData {
  const locationHint = hasProjectTextValue(project.address)
    ? project.address
    : project.templateArea
      ? `${project.templateArea} ตร.ม.`
      : 'Project Presentation';

  return {
    title: project.presentationBoard?.title || project.name,
    subtitle: project.presentationBoard?.subtitle || locationHint,
    brandLabel: project.presentationBoard?.brandLabel || 'EZBOQ PRESENTATION',
    heroImage: project.presentationBoard?.heroImage || '',
    featureImage: project.presentationBoard?.featureImage || '',
  };
}

function buildDocumentPipeline(
  project: ProjectData,
  sourceFingerprint: string,
  preparedAt: string,
): DocumentPipelineData {
  const hasLineItems = project.quotationData.some((item) => item.quantity !== '' && item.quantity !== undefined);
  const hasWorkPlan = Boolean(project.workPlan?.items?.length);
  const hasPaymentSchedule = Boolean(project.paymentSchedule?.length);
  const hasTaxDefaults = Boolean(project.taxData);
  const hasPresentationDefaults = Boolean(project.presentationBoard?.title && project.presentationBoard?.brandLabel);

  const readyDocuments = new Set<string>();
  if (hasLineItems) {
    readyDocuments.add('quotation');
    readyDocuments.add('customer-quotation');
    readyDocuments.add('comparison');
    readyDocuments.add('invoice');
    readyDocuments.add('contractor-invoice');
    readyDocuments.add('summary-invoice');
    readyDocuments.add('receipt');
    readyDocuments.add('contract');
  }
  if (hasPurchasableItems(project.quotationData)) {
    readyDocuments.add('purchase-order');
  }
  if (hasWorkPlan) {
    readyDocuments.add('workplan');
  }
  if (hasTaxDefaults) {
    readyDocuments.add('vat-invoice');
    readyDocuments.add('withholding-tax');
  }
  if (hasPresentationDefaults) {
    readyDocuments.add('presentation-board');
  }

  const missingInputs: string[] = [];
  if (!hasLineItems) {
    missingInputs.push('ยังไม่มี BOQ หรือรายการงานที่คำนวณได้');
  }
  if (!hasProjectTextValue(project.owner)) {
    missingInputs.push('ยังไม่ได้ใส่ชื่อเจ้าของโครงการ');
  }
  if (!hasProjectTextValue(project.address)) {
    missingInputs.push('ยังไม่ได้ใส่ที่อยู่โครงการ');
  }
  if (!hasProjectTextValue(project.phone)) {
    missingInputs.push('ยังไม่ได้ใส่เบอร์โทรโครงการ');
  }
  if (!project.presentationBoard?.heroImage || !project.presentationBoard?.featureImage) {
    missingInputs.push('ยังไม่ได้ใส่รูปสำหรับ Presentation Board');
  }

  return {
    sourceFingerprint,
    lastPreparedAt: preparedAt,
    status: hasLineItems && hasWorkPlan && hasPaymentSchedule && hasTaxDefaults ? (missingInputs.length > 0 ? 'attention' : 'ready') : 'attention',
    readyDocuments: Array.from(readyDocuments),
    missingInputs,
  };
}

export function generateDefaultWorkPlan(
  project: Pick<ProjectData, 'quotationData'>,
): WorkPlanConfig {
  const categories = project.quotationData.filter(item => !item.no.includes('.') && item.quantity === '');
  const startDate = new Date();

  if (categories.length === 0) {
    const totalWeeks = 8;
    return {
      totalWeeks,
      startDate: getCurrentThaiDate(),
      endDate: formatThaiDate(addWeeks(startDate, totalWeeks)),
      durationLabel: '2 เดือน',
      items: [
        { no: '1', task: 'งานเตรียมพื้นที่ / รื้อถอน', duration: '7 วัน', weekCells: ['□', '', '', '', '', '', '', ''], status: 'รอเริ่มงาน' },
        { no: '2', task: 'งานโครงสร้าง / ก่อฉาบ', duration: '14 วัน', weekCells: ['', '□', '□', '', '', '', '', ''], status: 'รอเริ่มงาน' },
        { no: '3', task: 'งานระบบไฟฟ้า / ประปา', duration: '10 วัน', weekCells: ['', '', '□', '□', '', '', '', ''], status: 'รอเริ่มงาน' },
        { no: '4', task: 'งานฝ้าเพดาน / พื้น', duration: '10 วัน', weekCells: ['', '', '', '□', '□', '', '', ''], status: 'รอเริ่มงาน' },
        { no: '5', task: 'งานทาสี / ตกแต่ง', duration: '7 วัน', weekCells: ['', '', '', '', '□', '□', '', ''], status: 'รอเริ่มงาน' },
        { no: '6', task: 'งานบิ้วอิน (โรงงาน)', duration: '21 วัน', weekCells: ['■', '■', '■', '', '', '', '', ''], status: 'รอเริ่มงาน' },
        { no: '7', task: 'งานติดตั้งบิ้วอิน (หน้างาน)', duration: '7 วัน', weekCells: ['', '', '', '', '', '□', '□', ''], status: 'รอเริ่มงาน' },
        { no: '8', task: 'งานเก็บงาน / ทำความสะอาด', duration: '5 วัน', weekCells: ['', '', '', '', '', '', '□', '□'], status: 'รอเริ่มงาน' },
      ],
    };
  }

  const totalWeeks = Math.max(4, Math.min(16, Math.ceil(categories.length * 0.8)));
  const durationMonths = Math.max(1, Math.round(totalWeeks / 4.33));
  const items: WorkPlanItem[] = categories.map((cat, index) => {
    const weekCells = Array.from({ length: totalWeeks }, (_, i) => {
      const startWeek = Math.floor((index / categories.length) * totalWeeks);
      const endWeek = Math.min(
        totalWeeks - 1,
        startWeek + Math.max(1, Math.ceil(totalWeeks / categories.length)),
      );
      return (i >= startWeek && i <= endWeek) ? '□' : '';
    });

    return {
      no: cat.no,
      task: cat.description,
      duration: `${Math.max(3, Math.ceil(7 * (totalWeeks / categories.length)))} วัน`,
      weekCells,
      status: 'รอเริ่มงาน',
    };
  });

  return {
    totalWeeks,
    startDate: getCurrentThaiDate(),
    endDate: formatThaiDate(addWeeks(startDate, totalWeeks)),
    durationLabel: `${durationMonths} เดือน`,
    items,
  };
}

function generateSuggestedPaymentSchedule(
  project: Pick<ProjectData, 'quotationData' | 'workPlan'>,
): PaymentInstallmentConfig[] {
  const categoryCount = project.quotationData.filter((item) => !item.no.includes('.') && item.quantity === '').length;
  const totalWeeks = project.workPlan?.totalWeeks || generateDefaultWorkPlan(project).totalWeeks;

  if (totalWeeks >= 12 || categoryCount >= 6) {
    return [
      { no: 1, description: 'งวดที่ 1 - มัดจำเริ่มงาน', percentage: 20, condition: 'ชำระก่อนเริ่มงานและส่งมอบพื้นที่พร้อมดำเนินการ' },
      { no: 2, description: 'งวดที่ 2 - เตรียมพื้นที่และงานระบบ', percentage: 25, condition: `ชำระเมื่อจบงานช่วงต้นตามแผน (ประมาณสัปดาห์ที่ ${Math.max(2, Math.round(totalWeeks * 0.25))})` },
      { no: 3, description: 'งวดที่ 3 - งานหลักระหว่างดำเนินการ', percentage: 25, condition: `ชำระเมื่อหมวดงานหลักดำเนินการได้ตามแผน (ประมาณสัปดาห์ที่ ${Math.max(4, Math.round(totalWeeks * 0.55))})` },
      { no: 4, description: 'งวดที่ 4 - ติดตั้งและเก็บรายละเอียด', percentage: 20, condition: `ชำระเมื่อเข้าสู่ช่วงติดตั้ง/เก็บรายละเอียด (ประมาณสัปดาห์ที่ ${Math.max(6, Math.round(totalWeeks * 0.8))})` },
      { no: 5, description: 'งวดที่ 5 - ส่งมอบงาน', percentage: 10, condition: 'ชำระหลังตรวจรับ เก็บ Defect และส่งมอบงานเรียบร้อย' },
    ];
  }

  if (totalWeeks >= 8 || categoryCount >= 4) {
    return [
      { no: 1, description: 'งวดที่ 1 - มัดจำเริ่มงาน', percentage: 30, condition: 'ชำระก่อนเริ่มงานและส่งมอบพื้นที่พร้อมดำเนินการ' },
      { no: 2, description: 'งวดที่ 2 - ระหว่างดำเนินงาน', percentage: 30, condition: `ชำระเมื่อดำเนินงานตามแผนได้ประมาณ 50% (ประมาณสัปดาห์ที่ ${Math.max(3, Math.round(totalWeeks * 0.45))})` },
      { no: 3, description: 'งวดที่ 3 - ติดตั้งและเก็บรายละเอียด', percentage: 30, condition: `ชำระเมื่อเข้าสู่ช่วงติดตั้ง/เก็บรายละเอียด (ประมาณสัปดาห์ที่ ${Math.max(5, Math.round(totalWeeks * 0.8))})` },
      { no: 4, description: 'งวดที่ 4 - ส่งมอบงาน', percentage: 10, condition: 'ชำระหลังตรวจรับและส่งมอบงานเรียบร้อย' },
    ];
  }

  return [
    { no: 1, description: 'งวดที่ 1 - มัดจำเริ่มงาน', percentage: 40, condition: 'ชำระก่อนเริ่มงานและส่งมอบพื้นที่พร้อมดำเนินการ' },
    { no: 2, description: 'งวดที่ 2 - ระหว่างดำเนินงาน', percentage: 40, condition: `ชำระเมื่อดำเนินงานตามแผนได้ประมาณ 70% (ประมาณสัปดาห์ที่ ${Math.max(2, Math.round(totalWeeks * 0.65))})` },
    { no: 3, description: 'งวดที่ 3 - ส่งมอบงาน', percentage: 20, condition: 'ชำระหลังตรวจรับและส่งมอบงานเรียบร้อย' },
  ];
}

export function prepareProjectDocuments(
  project: ProjectData,
  options: { regenerate?: boolean; defaultVatRate?: number } = {},
): ProjectData {
  const regenerate = options.regenerate === true;
  const hasLineItems = project.quotationData.some((item) => item.quantity !== '' && item.quantity !== undefined);

  if (!hasLineItems) {
    return project;
  }

  const autoSyncDocuments = project.autoSyncDocuments !== false;
  const markupRate = typeof project.markupRate === 'number' ? project.markupRate : 0.25;
  const operatingRate = typeof project.operatingRate === 'number' ? project.operatingRate : 0.05;
  const totalCost = Math.round(
    project.quotationData.reduce((sum, item) => sum + getProjectLineCost(item), 0),
  );
  const pricingProject = {
    ...project,
    markupRate,
  };
  const computedCustomerSubtotal = getProjectCustomerSubtotal(pricingProject);
  const customerPrice = regenerate || autoSyncDocuments || !(typeof project.customerPrice === 'number' && project.customerPrice > 0)
    ? computedCustomerSubtotal
    : project.customerPrice;
  const operatingCost = regenerate || autoSyncDocuments || typeof project.operatingCost !== 'number'
    ? Math.round(customerPrice * operatingRate)
    : project.operatingCost;
  const generatedWorkPlan = generateDefaultWorkPlan(project);
  const workPlan = regenerate || !project.workPlan?.items?.length
    ? generatedWorkPlan
    : {
        ...generatedWorkPlan,
        ...project.workPlan,
        items: project.workPlan.items.length > 0 ? project.workPlan.items : generatedWorkPlan.items,
      };
  const paymentSchedule = regenerate || !project.paymentSchedule?.length
    ? generateSuggestedPaymentSchedule({ quotationData: project.quotationData, workPlan })
    : project.paymentSchedule;
  const presentationBoard = {
    ...buildPresentationBoardDefaults(project),
    ...(project.presentationBoard || {}),
  };
  const sourceFingerprint = createProjectFingerprint(project, markupRate);
  const preparedAt = project.documentPipeline?.sourceFingerprint === sourceFingerprint
    ? (project.documentPipeline.lastPreparedAt || new Date().toISOString())
    : new Date().toISOString();

  return {
    ...project,
    autoSyncDocuments,
    markupRate,
    operatingRate,
    totalCost,
    customerPrice,
    operatingCost,
    workPlan,
    paymentSchedule,
    presentationBoard,
    taxData: {
      includeVat: true,
      includeWithholding: true,
      vatRate: options.defaultVatRate ?? 0.07,
      withholdingRate: 0.03,
      ...(project.taxData || {}),
    },
    documentPipeline: buildDocumentPipeline(
      {
        ...project,
        markupRate,
        customerPrice,
        operatingCost,
        workPlan,
        paymentSchedule,
        presentationBoard,
        taxData: {
          includeVat: true,
          includeWithholding: true,
          vatRate: options.defaultVatRate ?? 0.07,
          withholdingRate: 0.03,
          ...(project.taxData || {}),
        },
      },
      sourceFingerprint,
      preparedAt,
    ),
  };
}

export function getProjectPaymentSchedule(
  project: Pick<ProjectData, 'paymentSchedule' | 'name'>,
  totalAmount: number,
): PaymentInstallment[] {
  const customSchedule = project.paymentSchedule && project.paymentSchedule.length > 0
    ? [...project.paymentSchedule].sort((a, b) => a.no - b.no)
    : null;

  if (customSchedule) {
    let allocated = 0;
    return customSchedule.map((item, index) => {
      const isLast = index === customSchedule.length - 1;
      const amount = isLast
        ? Math.round(totalAmount - allocated)
        : Math.round(totalAmount * (item.percentage / 100));
      allocated += amount;
      return { ...item, amount };
    });
  }

  if (project.name.includes('Phase 4')) {
    const first = 200000;
    const second = 200000;
    const third = Math.round(totalAmount - first - second);
    return [
      { no: 1, description: 'งวดที่ 1 - มัดจำ', percentage: 33.33, amount: first },
      { no: 2, description: 'งวดที่ 2 - เข้าติดตั้ง', percentage: 33.33, amount: second },
      { no: 3, description: 'งวดที่ 3 - ส่งงาน', percentage: 33.34, amount: third },
    ];
  }

  const first = Math.round(totalAmount * 0.6);
  const second = Math.round(totalAmount - first);
  return [
    { no: 1, description: 'งวดที่ 1 - มัดจำเริ่มงาน (60%)', percentage: 60, amount: first },
    { no: 2, description: 'งวดที่ 2 - ส่งมอบงานเรียบร้อย (40%)', percentage: 40, amount: second },
  ];
}

export const projects: ProjectData[] = [];
