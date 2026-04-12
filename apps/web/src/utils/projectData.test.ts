import { describe, expect, it } from 'vitest';
import { getProjectPaymentSchedule, prepareProjectDocuments, type ProjectData } from './projectData';

function createProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    id: 'project-a',
    name: 'โครงการทดสอบ',
    address: 'กรุงเทพฯ',
    phone: '0800000000',
    owner: 'Owner',
    quotationData: [
      { no: '1', description: 'งานสี', unit: '', quantity: '', unitPrice: '', laborCost: '' },
      { no: '1.1', description: 'ทาสีภายใน', unit: 'ห้อง', quantity: 2, unitPrice: 1000, laborCost: 500 },
    ],
    ...overrides,
  };
}

describe('prepareProjectDocuments', () => {
  it('preserves manual customer pricing when auto sync is disabled', () => {
    const project = createProject({
      autoSyncDocuments: false,
      customerPrice: 999999,
      operatingCost: 12345,
    });

    const prepared = prepareProjectDocuments(project);

    expect(prepared.customerPrice).toBe(999999);
    expect(prepared.operatingCost).toBe(12345);
  });

  it('regenerates pricing when explicitly requested', () => {
    const project = createProject({
      autoSyncDocuments: false,
      customerPrice: 999999,
      operatingCost: 12345,
    });

    const prepared = prepareProjectDocuments(project, { regenerate: true });

    expect(prepared.customerPrice).not.toBe(999999);
    expect(prepared.operatingCost).toBe(Math.round((prepared.customerPrice || 0) * 0.05));
  });

  it('builds document pipeline metadata from BOQ defaults', () => {
    const prepared = prepareProjectDocuments(createProject());

    expect(prepared.documentPipeline?.readyDocuments).toContain('quotation');
    expect(prepared.documentPipeline?.readyDocuments).toContain('customer-quotation');
    expect(prepared.documentPipeline?.readyDocuments).toContain('invoice');
    expect(prepared.documentPipeline?.readyDocuments).toContain('workplan');
    expect(prepared.documentPipeline?.missingInputs).toContain('ยังไม่ได้ใส่รูปสำหรับ Presentation Board');
    expect(prepared.workPlan?.items.length).toBeGreaterThan(0);
    expect(prepared.paymentSchedule?.length).toBeGreaterThan(0);
  });

  it('applies template discount rules before computing operating cost', () => {
    const prepared = prepareProjectDocuments(createProject({
      quotationData: [
        { no: 'A', description: 'ค่าออกแบบ', unit: '', quantity: '', unitPrice: '', laborCost: '' },
        { no: 'A.1', description: 'ค่าออกแบบภายใน', unit: 'ตร.ม.', quantity: 10, unitPrice: 1000, laborCost: 0 },
        { no: 'K', description: 'งานบิ้วอิน', unit: '', quantity: '', unitPrice: '', laborCost: '' },
        { no: 'K.1', description: 'ตู้เสื้อผ้าบิ้วอิน', unit: 'ชุด', quantity: 1, unitPrice: 10000, laborCost: 5000 },
      ],
      operatingRate: 0,
      discountConfig: {
        label: 'ส่วนลดค่าออกแบบ 25%',
        percent: 0.25,
        appliesToCategoryRefs: ['A'],
        requiresCategoryRefs: ['K'],
      },
    }));

    expect(prepared.customerPrice).toBe(26250);
    expect(prepared.operatingCost).toBe(0);
  });
});

describe('getProjectPaymentSchedule', () => {
  it('allocates the full total amount across installments', () => {
    const project = createProject({
      paymentSchedule: [
        { no: 1, description: 'งวด 1', percentage: 30 },
        { no: 2, description: 'งวด 2', percentage: 30 },
        { no: 3, description: 'งวด 3', percentage: 40 },
      ],
    });

    const schedule = getProjectPaymentSchedule(project, 123456);
    const total = schedule.reduce((sum, item) => sum + item.amount, 0);

    expect(total).toBe(123456);
    expect(schedule.map((item) => item.no)).toEqual([1, 2, 3]);
  });
});
