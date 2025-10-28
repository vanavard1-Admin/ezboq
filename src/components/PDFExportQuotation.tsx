import { BOQItem, CompanyInfo, CustomerInfo, Profile, BOQSummary as BOQSummaryType, Discount } from '../types/boq';

interface PDFExportQuotationProps {
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  profile: Profile;
  boqItems: BOQItem[];
  summary: BOQSummaryType;
  discount: Discount | null;
  documentNumber?: string;
  signatureUrl?: string;
  validityDays?: number;
}

export function PDFExportQuotation({
  projectTitle,
  projectDescription,
  projectLocation,
  company,
  customer,
  profile,
  boqItems,
  summary,
  discount,
  documentNumber,
  signatureUrl,
  validityDays = 30,
}: PDFExportQuotationProps) {
  // Ensure company has minimum required data
  const safeCompany = {
    name: company?.name || 'ชื่อบริษัท',
    address: company?.address || 'ที่อยู่บริษัท',
    phone: company?.phone || '-',
    email: company?.email || '-',
    taxId: company?.taxId || undefined,
    website: company?.website || undefined,
  };

  const formatCurrency = (amount: number) => {
    // Safe handling for NaN, undefined, or null
    const safeAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(safeAmount);
  };

  const calculateFinalAmount = () => {
    let finalAmount = summary.grandTotal || 0;
    
    if (discount) {
      if (discount.type === 'percentage' || discount.type === 'percent') {
        finalAmount = finalAmount * (1 - discount.value / 100);
      } else {
        finalAmount = finalAmount - discount.value;
      }
    }
    
    return finalAmount;
  };

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + validityDays);

  const generateVerificationCode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QT${year}${month}${day}${random}`;
  };

  // Group items by category and calculate totals
  const groupByCategory = () => {
    const categoryMap = new Map<string, { items: BOQItem[], total: number }>();
    
    boqItems.forEach(item => {
      const category = item.category || 'ไม่ระบุหมวดหมู่';
      const itemTotal = ((item.material || 0) + (item.labor || 0)) * (item.quantity || 0);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { items: [], total: 0 });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.items.push(item);
      categoryData.total += itemTotal;
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      itemCount: data.items.length,
      total: data.total
    }));
  };

  const categoryGroups = groupByCategory();

  return (
    <div
      id="quotation-export-section"
      style={{
        backgroundColor: '#ffffff',
        width: '210mm',
        minHeight: '297mm',
        color: '#000000',
        fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        position: 'relative',
        pageBreakAfter: 'always',
      }}
    >
      <style>{`
        #quotation-export-section thead th {
          color: #000000 !important;
          font-weight: 700 !important;
        }
      `}</style>
      {/* Compact Layout - Production Version */}
      <div style={{ padding: '10mm 8mm' }}>
        {/* Compact Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #7c3aed', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', margin: '0 0 4px 0' }}>
            {safeCompany.name}
          </h1>
          <p style={{ fontSize: '9px', color: '#4b5563', margin: '0 0 2px 0' }}>
            {safeCompany.address}
          </p>
          <p style={{ fontSize: '9px', color: '#4b5563', margin: '0 0 2px 0' }}>
            โทร: {safeCompany.phone} | อีเมล: {safeCompany.email}
            {safeCompany.taxId && ` | เลขผู้เสียภาษี: ${safeCompany.taxId}`}
          </p>
          {documentNumber && (
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#7c3aed', margin: '4px 0 0 0' }}>
              เลขที่: {documentNumber}
            </p>
          )}
        </div>

        {/* Document Title - Bold & Clear */}
        <div style={{ textAlign: 'center', marginBottom: '10px', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px', border: '2px solid #d1d5db' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#000000', letterSpacing: '0.5px' }}>
            ใบเสนอราคา
          </h2>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '3px 0 0 0', color: '#000000' }}>
            Quotation
          </p>
        </div>

        {/* Compact Customer & Project Info - Side by Side */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '9px' }}>
          {/* Customer Info */}
          <div style={{ flex: 1, backgroundColor: '#faf5ff', padding: '8px', borderRadius: '4px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '10px', color: '#7c3aed' }}>
              ข้อมูลลูกค้า
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>ชื่อ:</strong> {customer.name || 'ไม่ระบุ'}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>ที่อยู่:</strong> {customer.address || 'ไม่ระบุ'}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>โทร:</strong> {customer.phone || 'ไม่ระบุ'}
            </div>
            {customer.taxId && (
              <div>
                <strong>เลขผู้เสียภาษี:</strong> {customer.taxId}
              </div>
            )}
          </div>

          {/* Project Info */}
          <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '10px', color: '#166534' }}>
              ข้อมูลโครงการ
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>โครงการ:</strong> {projectTitle}
            </div>
            {projectDescription && (
              <div style={{ marginBottom: '2px' }}>
                <strong>รายละเอียด:</strong> {projectDescription}
              </div>
            )}
            {projectLocation && (
              <div style={{ marginBottom: '2px' }}>
                <strong>สถานที่:</strong> {projectLocation}
              </div>
            )}
            <div>
              <strong>วันที่:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Validity Notice */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fbbf24', padding: '6px', borderRadius: '4px', marginBottom: '10px', fontSize: '9px', textAlign: 'center' }}>
          <strong>ใบเสนอราคานี้มีผลถึง:</strong> {expiryDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} ({validityDays} วัน)
        </div>

        {/* Category Summary Table - แสดงเฉพาะหมวดหมู่และราคารวม */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #7c3aed', fontSize: '10px', marginBottom: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#7c3aed' }}>
              <th style={{ border: '1px solid #6d28d9', padding: '8px 6px', textAlign: 'center', width: '50px', color: '#ffffff', fontWeight: '700', backgroundColor: '#7c3aed' }}>
                ลำดับ
              </th>
              <th style={{ border: '1px solid #6d28d9', padding: '8px 10px', textAlign: 'left', color: '#ffffff', fontWeight: '700', backgroundColor: '#7c3aed' }}>
                หมวดหมู่
              </th>
              <th style={{ border: '1px solid #6d28d9', padding: '8px 10px', textAlign: 'center', width: '100px', color: '#ffffff', fontWeight: '700', backgroundColor: '#7c3aed' }}>
                จำนวนรายการ
              </th>
              <th style={{ border: '1px solid #6d28d9', padding: '8px 10px', textAlign: 'right', width: '150px', color: '#ffffff', fontWeight: '700', backgroundColor: '#7c3aed' }}>
                ราคารวม
              </th>
            </tr>
          </thead>
          <tbody>
            {categoryGroups.map((group, idx) => (
              <tr
                key={group.category}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#faf5ff',
                  pageBreakInside: 'avoid',
                }}
              >
                <td style={{ border: '1px solid #e9d5ff', padding: '10px 6px', textAlign: 'center', fontSize: '10px' }}>
                  {idx + 1}
                </td>
                <td style={{ border: '1px solid #e9d5ff', padding: '10px', fontSize: '11px' }}>
                  <div style={{ fontWeight: '600', color: '#7c3aed' }}>{group.category}</div>
                </td>
                <td style={{ border: '1px solid #e9d5ff', padding: '10px', textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
                  {group.itemCount} รายการ
                </td>
                <td style={{ border: '1px solid #e9d5ff', padding: '10px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#059669' }}>
                  {formatCurrency(group.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compact Summary */}
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <div style={{ maxWidth: '350px', marginLeft: 'auto', backgroundColor: '#faf5ff', padding: '10px', borderRadius: '4px', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span>รวมก่อน VAT:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalBeforeVat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '9px' }}>
              <span>VAT (7%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.vat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10px', paddingTop: '4px', borderTop: '1px solid #d8b4fe' }}>
              <span style={{ fontWeight: '600' }}>รวมทั้งสิ้น:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.grandTotal)}</span>
            </div>
            {discount && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '9px', color: '#dc2626' }}>
                  <span>ส่วนลด ({discount.type === 'percentage' || discount.type === 'percent' ? `${discount.value}%` : formatCurrency(discount.value)}):</span>
                  <span style={{ fontWeight: '600' }}>
                    -{(discount.type === 'percentage' || discount.type === 'percent')
                      ? formatCurrency((summary.grandTotal || 0) * (discount.value / 100))
                      : formatCurrency(discount.value)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '2px solid #7c3aed' }}>
                  <span style={{ fontWeight: '700' }}>ยอดชำระสุทธิ:</span>
                  <span style={{ fontWeight: '700', color: '#7c3aed', fontSize: '14px' }}>{formatCurrency(calculateFinalAmount())}</span>
                </div>
              </>
            )}
            {!discount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '2px solid #7c3aed' }}>
                <span style={{ fontWeight: '700' }}>ยอดชำระสุทธิ:</span>
                <span style={{ fontWeight: '700', color: '#7c3aed', fontSize: '14px' }}>{formatCurrency(summary.grandTotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Terms */}
        <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '4px', color: '#92400e' }}>เงื่อนไขการเสนอราคา</div>
          <ul style={{ fontSize: '8px', margin: '0', paddingLeft: '16px', lineHeight: '1.5', color: '#78350f' }}>
            <li>ราคานี้ไม่รวมค่าขนส่ง ค่าติดตั้ง และภาษีมูลค่าเพิ่ม (ยกเว้นระบุไว้)</li>
            <li>กำหนดชำระเงิน: มัดจำ 30%, งวดที่ 2: 40% เมื่อดำเนินการ 50%, งวดสุดท้าย: 30% เมื่อส่งมอบงาน</li>
            <li>ใบเสนอราคานี้มีอายุ {validityDays} วัน นับจากวันที่ออกเอกสาร</li>
          </ul>
        </div>

        {/* Compact Signature */}
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid' }}>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '35px', marginBottom: '4px' }} />
            <p style={{ margin: '0', fontSize: '10px', fontWeight: '600' }}>ผู้เสนอราคา</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>({safeCompany.name})</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>วันที่: ....../....../......</p>
          </div>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '35px', marginBottom: '4px' }} />
            <p style={{ margin: '0', fontSize: '10px', fontWeight: '600' }}>ผู้รับเสนอราคา</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>({customer.name})</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>วันที่: ....../....../......</p>
          </div>
        </div>

        {/* Compact Verification */}
        <div style={{ marginTop: '12px', textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>รหัสตรวจสอบเอกสาร</p>
          <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #7c3aed', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', letterSpacing: '1px', fontFamily: 'monospace', margin: 0 }}>
              {documentNumber || generateVerificationCode()}
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '7px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
          <p style={{ margin: 0 }}>ระบบ BOQ Management | © {new Date().getFullYear()} {safeCompany.name}</p>
        </div>
      </div>
    </div>
  );
}
