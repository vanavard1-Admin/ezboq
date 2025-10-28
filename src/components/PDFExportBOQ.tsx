import { BOQItem, CompanyInfo, CustomerInfo, Profile, BOQSummary as BOQSummaryType } from '../types/boq';

interface PDFExportBOQProps {
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  profile: Profile;
  boqItems: BOQItem[];
  summary: BOQSummaryType;
  documentNumber?: string;
  signatureUrl?: string;
}

export function PDFExportBOQ({
  projectTitle,
  projectDescription,
  projectLocation,
  company,
  customer,
  profile,
  boqItems,
  summary,
  documentNumber,
  signatureUrl,
}: PDFExportBOQProps) {
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

  // Generate verification code
  const generateVerificationCode = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BOQ${year}${month}${day}${random}`;
  };

  return (
    <div
      id="boq-export-section"
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
        #boq-export-section thead th {
          color: #000000 !important;
          font-weight: 700 !important;
        }
      `}</style>
      {/* Compact Layout - Optimized for many items */}
      <div style={{ padding: '10mm 8mm' }}>
        {/* Compact Header */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #1f2937', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>
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
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#2563eb', margin: '4px 0 0 0' }}>
              เลขที่: {documentNumber}
            </p>
          )}
        </div>

        {/* Document Title - Bold & Clear */}
        <div style={{ textAlign: 'center', marginBottom: '10px', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px', border: '2px solid #d1d5db' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#000000', letterSpacing: '0.5px' }}>
            รายการถอดวัสดุ
          </h2>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '3px 0 0 0', color: '#000000' }}>
            Bill of Quantities (BOQ)
          </p>
        </div>

        {/* Compact Project & Customer Info - Side by Side */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '9px' }}>
          {/* Project Info */}
          <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '10px', color: '#1f2937' }}>
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

          {/* Customer Info */}
          <div style={{ flex: 1, backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '10px', color: '#1e40af' }}>
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
        </div>

        {/* Compact BOQ Table - Optimized for many items */}
        <div style={{ marginBottom: '10px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #1f2937',
              fontSize: '9px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#1f2937' }}>
                <th style={{ border: '1px solid #374151', padding: '4px 3px', textAlign: 'center', width: '25px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  ลำดับ
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 6px', textAlign: 'left', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  รายการ
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 3px', textAlign: 'center', width: '35px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  หน่วย
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 6px', textAlign: 'right', width: '50px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  จำนวน
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 6px', textAlign: 'right', width: '70px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  ค่าวัสดุ
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 6px', textAlign: 'right', width: '70px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  ค่าแรง
                </th>
                <th style={{ border: '1px solid #374151', padding: '4px 6px', textAlign: 'right', width: '90px', color: '#ffffff', fontWeight: '700', backgroundColor: '#1f2937' }}>
                  รวมเงิน
                </th>
              </tr>
            </thead>
            <tbody>
              {boqItems.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 3px', textAlign: 'center', fontSize: '8px' }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 6px', fontSize: '9px' }}>
                    <div style={{ fontWeight: '600', lineHeight: '1.3' }}>{item.name}</div>
                    {item.notes && (
                      <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px', lineHeight: '1.2' }}>
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 3px', textAlign: 'center', fontSize: '8px' }}>
                    {item.unit}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'right', fontSize: '9px' }}>
                    {item.quantity.toLocaleString('th-TH')}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'right', fontSize: '9px' }}>
                    {formatCurrency(item.material)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'right', fontSize: '9px' }}>
                    {formatCurrency(item.labor)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px 6px', textAlign: 'right', fontSize: '9px', fontWeight: '600' }}>
                    {formatCurrency((item.material + item.labor) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compact Summary Section */}
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <div style={{ maxWidth: '350px', marginLeft: 'auto', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>รวมค่าวัสดุ:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalMaterial)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>รวมค่าแรง:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalLabor)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px', paddingTop: '4px', borderTop: '1px solid #d1d5db' }}>
              <span style={{ color: '#374151' }}>รวมย่อย:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>ค่าของเสีย (3%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.wastage)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>ค่าดำเนินการ (5%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.operational)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>ค่าคลาดเคลื่อน (2%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.contingency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>กำไร (10%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.profit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px', paddingTop: '4px', borderTop: '1px solid #d1d5db' }}>
              <span style={{ color: '#374151' }}>รวมก่อน VAT:</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalBeforeVat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '9px' }}>
              <span style={{ color: '#374151' }}>VAT (7%):</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(summary.vat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '2px solid #1f2937' }}>
              <span style={{ fontWeight: '700', color: '#1f2937' }}>รวมทั้งสิ้น:</span>
              <span style={{ fontWeight: '700', color: '#059669', fontSize: '14px' }}>
                {formatCurrency(summary.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Signature Section */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid' }}>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '40px', marginBottom: '4px' }}>
              {/* Signature space */}
            </div>
            <p style={{ margin: '0', fontSize: '10px', fontWeight: '600' }}>
              ผู้เสนอราคา
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>
              ({safeCompany.name})
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>
              วันที่: ....../....../......
            </p>
          </div>
          <div style={{ width: '45%', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: '40px', marginBottom: '4px' }} />
            <p style={{ margin: '0', fontSize: '10px', fontWeight: '600' }}>
              ผู้อนุมัติ
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>
              (ชื่อผู้อนุมัติ)
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#6b7280' }}>
              วันที่: ....../....../......
            </p>
          </div>
        </div>

        {/* Compact Verification Section */}
        <div style={{ marginTop: '15px', textAlign: 'center', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
            รหัสตรวจสอบเอกสาร
          </p>
          <div style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #1f2937', borderRadius: '4px', marginBottom: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', letterSpacing: '1px', fontFamily: 'monospace', margin: 0 }}>
              {documentNumber || generateVerificationCode()}
            </p>
          </div>
          <p style={{ fontSize: '7px', color: '#9ca3af', marginTop: '4px' }}>
            เลขที่: {documentNumber || 'DRAFT'} | วันที่: {new Date().toLocaleDateString('th-TH')} | ใช้รหัสนี้เพื่อตรวจสอบความถูกต้อง
          </p>
        </div>

        {/* Compact Footer */}
        <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '7px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '6px' }}>
          <p style={{ margin: 0 }}>
            ระบบ BOQ Management | © {new Date().getFullYear()} {safeCompany.name} | หน้า 1/{Math.ceil(boqItems.length / 40) || 1}
          </p>
        </div>
      </div>
    </div>
  );
}
