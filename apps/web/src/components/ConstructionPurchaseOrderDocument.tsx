import React from 'react';
import { ShoppingCart, Building2, Package, AlertTriangle } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';

interface ConstructionPurchaseOrderDocumentProps {
  project: ProjectData;
}

interface ConstructionPurchaseOrderItem {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  supplier: string;
  note?: string;
}

interface ConstructionPurchaseOrderCategory {
  category: string;
  items: ConstructionPurchaseOrderItem[];
}

export function ConstructionPurchaseOrderDocument({ project }: ConstructionPurchaseOrderDocumentProps) {
  const co = loadCompanyProfile();
  // รายการวัสดุที่ต้องสั่งซื้อ (ตัวอย่าง)
  const materials: ConstructionPurchaseOrderCategory[] = [
    {
      category: 'A) วัสดุงานปรับปรุงพื้น',
      items: [
        { name: 'วัสดุขัดพื้นเกรดดี', unit: 'ชุด', qty: 1, unitPrice: 5000, supplier: 'บริษัทวัสดุก่อสร้าง A' },
        { name: 'ปูน Self-Leveling Mortar', unit: 'ถุง', qty: 10, unitPrice: 450, supplier: 'SCG' },
      ],
    },
    {
      category: 'B) วัสดุงานก่อสร้าง',
      items: [
        { name: 'อิฐมวลเบา', unit: 'ก้อน', qty: 500, unitPrice: 12, supplier: 'โรงงานอิฐมวลเบา' },
        { name: 'ปูนฉาบ', unit: 'ถุง', qty: 30, unitPrice: 180, supplier: 'SCG' },
        { name: 'ประตู พร้อมอุปกรณ์', unit: 'ชุด', qty: 2, unitPrice: 4500, supplier: 'ร้านประตู XYZ' },
        { name: 'สีรองพื้น', unit: 'แกลลอน', qty: 4, unitPrice: 350, supplier: 'TOA' },
      ],
    },
    {
      category: 'C) วัสดุงานกันซึม',
      items: [
        { name: 'วัสดุกันซึมคุณภาพดี', unit: 'ถัง', qty: 3, unitPrice: 800, supplier: 'Sika / Weber' },
      ],
    },
    {
      category: 'D) วัสดุงานปูกระเบื้อง',
      items: [
        { name: 'กระเบื้อง 60x120', unit: 'ตร.ม.', qty: 0, unitPrice: 0, supplier: 'ลูกค้าจัดหาเอง', note: 'ลูกค้าจัดหาเอง' },
        { name: 'ปูนฉาบผนัง/พื้น', unit: 'ถุง', qty: 25, unitPrice: 180, supplier: 'SCG' },
        { name: 'ตาข่ายเสริมแรง', unit: 'ม้วน', qty: 2, unitPrice: 450, supplier: 'ร้านวัสดุก่อสร้าง' },
        { name: 'ปูนกาวกระเบื้อง (สำหรับขนาด 60x120)', unit: 'ถุง', qty: 20, unitPrice: 250, supplier: 'SCG / Kerakoll' },
        { name: 'กิ๊บล็อคกระเบื้อง (Tile Leveling System)', unit: 'ชุด', qty: 5, unitPrice: 380, supplier: 'Shopee' },
        { name: 'ยาแนว', unit: 'ถุง', qty: 10, unitPrice: 120, supplier: 'SCG' },
      ],
    },
  ];

  const calculateCategoryTotal = (items: ConstructionPurchaseOrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  };

  const calculateGrandTotal = () => {
    return materials.reduce((sum, cat) => sum + calculateCategoryTotal(cat.items), 0);
  };

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีฟ้าเข้ม */}
      <div className="bg-gradient-to-r from-cyan-700 to-blue-800 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">ใบสั่งซื้อวัสดุ</h1>
                <p className="text-cyan-100 text-sm">Purchase Order (PO)</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-cyan-100">{(co.companyName || co.companyNameTh || 'ชื่อบริษัท').toUpperCase()}</p>
            <p className="text-xs text-cyan-200">{co.tagline || 'Interior Design & Construction'}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-200">
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่ PO:</p>
            <p className="text-xs text-slate-800">PO-2569-001</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">วันที่สั่งซื้อ:</p>
            <p className="text-xs text-slate-800">3 มกราคม 2569</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">กำหนดส่งของ:</p>
            <p className="text-xs text-cyan-700">ก่อนเริ่มงาน 2 วัน</p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 border-b border-cyan-100 bg-cyan-50/30">
        <h3 className="text-sm text-cyan-900 mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>รายละเอียดโครงการ</span>
        </h3>
        <div className="text-[10px] text-slate-700">
          <p><strong>โครงการ:</strong> {project.name}</p>
          <p><strong>สถานที่ส่งของ:</strong> {project.address}</p>
          <p><strong>ผู้ติดต่อ:</strong> {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} ({co.phone || '-'})</p>
        </div>
      </div>

      {/* Materials List */}
      <div className="px-6 py-4">
        <h3 className="text-sm text-cyan-900 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" />
          <span>รายการวัสดุที่สั่งซื้อ</span>
        </h3>

        {materials.map((category, catIndex) => (
          <div key={catIndex} className="mb-6 last:mb-0">
            {/* Category Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-4 py-2 rounded-t-lg">
              <h4 className="text-xs">{category.category}</h4>
            </div>

            {/* Category Items Table */}
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-cyan-100 text-cyan-900">
                  <th className="border border-cyan-200 px-3 py-2 text-left w-12">ลำดับ</th>
                  <th className="border border-cyan-200 px-3 py-2 text-left">รายการวัสดุ</th>
                  <th className="border border-cyan-200 px-3 py-2 text-center w-20">หน่วย</th>
                  <th className="border border-cyan-200 px-3 py-2 text-center w-20">จำนวน</th>
                  <th className="border border-cyan-200 px-3 py-2 text-right w-24">ราคา/หน่วย</th>
                  <th className="border border-cyan-200 px-3 py-2 text-right w-28">รวม (บาท)</th>
                  <th className="border border-cyan-200 px-3 py-2 text-left w-40">ผู้จำหน่าย</th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item, itemIndex) => {
                  const total = item.qty * item.unitPrice;
                  const isCustomerProvided = item.note === 'ลูกค้าจัดหาเอง';

                  return (
                    <tr key={itemIndex} className={isCustomerProvided ? 'bg-yellow-50' : 'hover:bg-cyan-50'}>
                      <td className="border border-cyan-200 px-3 py-2 text-center">{itemIndex + 1}</td>
                      <td className="border border-cyan-200 px-3 py-2">
                        {item.name}
                        {item.note && (
                          <div className="flex items-center gap-1 text-yellow-700 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-[9px]">{item.note}</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-cyan-200 px-3 py-2 text-center">{item.unit}</td>
                      <td className="border border-cyan-200 px-3 py-2 text-center">
                        {isCustomerProvided ? '-' : item.qty}
                      </td>
                      <td className="border border-cyan-200 px-3 py-2 text-right">
                        {isCustomerProvided ? '-' : item.unitPrice.toLocaleString()}
                      </td>
                      <td className="border border-cyan-200 px-3 py-2 text-right">
                        {isCustomerProvided ? '-' : total.toLocaleString()}
                      </td>
                      <td className="border border-cyan-200 px-3 py-2 text-[9px]">{item.supplier}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-cyan-100">
                  <td colSpan={5} className="border border-cyan-200 px-3 py-2 text-right">
                    <strong>รวมหมวด {category.category.charAt(0)}</strong>
                  </td>
                  <td className="border border-cyan-200 px-3 py-2 text-right">
                    <strong>{calculateCategoryTotal(category.items).toLocaleString()}</strong>
                  </td>
                  <td className="border border-cyan-200 px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* Grand Total */}
        <div className="mt-6 bg-gradient-to-r from-cyan-700 to-blue-800 text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-cyan-100 mb-1">มูลค่ารวมทั้งหมด (ไม่รวมวัสดุที่ลูกค้าจัดหา)</p>
              <p className="text-[9px] text-cyan-200">* ยังไม่รวม VAT</p>
            </div>
            <div className="text-right">
              <p className="text-2xl">{calculateGrandTotal().toLocaleString()} บาท</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Terms */}
      <div className="px-6 py-4 border-t border-cyan-200 bg-cyan-50/30">
        <h3 className="text-sm text-cyan-900 mb-2">เงื่อนไขการส่งมอบและชำระเงิน</h3>
        <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
          <li>ส่งของก่อนเริ่มงานอย่างน้อย 2 วัน เพื่อตรวจสอบและเก็บรักษา</li>
          <li>วัสดุต้องมีคุณภาพตามมาตรฐาน หากไม่ตรงตามรายละเอียดสามารถเปลี่ยนคืนได้</li>
          <li>กระเบื้อง 60x120 - ลูกค้าจัดหาเอง ต้องพร้อมก่อนเริ่มงาน Cluster D</li>
          <li>ชำระเงินผ่านโอนเข้าบัญชีบริษัท หรือเงินสดตามตกลง</li>
          <li>ออกใบกำกับภาษีเต็มรูปแบบทุกรายการ</li>
        </ul>
      </div>

      {/* Important Notes */}
      <div className="px-6 py-4 border-t border-cyan-200 bg-white">
        <h3 className="text-sm text-cyan-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span>หมายเหตุสำคัญ</span>
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
            <li className="text-yellow-800"><strong>กระเบื้อง 60x120 - ลูกค้าจัดหาเอง</strong> กรุณาจัดส่งก่อนเริ่มงาน Cluster D</li>
            <li>วัสดุบางรายการอาจปรับเปลี่ยนตามความพร้อมในท้องตลาด (แจ้งก่อนเปลี่ยน)</li>
            <li>ปริมาณวัสดุเป็นการประมาณการ อาจมีการเพิ่ม-ลด ตามสภาพงานจริง</li>
            <li>เก็บวัสดุในที่ร่มและปลอดภัย ป้องกันความเสียหาย</li>
          </ul>
        </div>
      </div>

      {/* Signatures */}
      <div className="px-6 py-6 border-t border-cyan-200">
        <div className="grid grid-cols-2 gap-8 text-[10px]">
          <div className="text-center">
            <div className="border-b border-cyan-300 mb-2 pb-12"></div>
            <p className="text-slate-700">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} (ผู้สั่งซื้อ)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
          <div className="text-center">
            <div className="border-b border-cyan-300 mb-2 pb-12"></div>
            <p className="text-slate-700">ผู้จำหน่าย (ยืนยันรับคำสั่งซื้อ)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-cyan-700 to-blue-800 text-white px-6 py-3">
        <div className="text-center text-[9px]">
          <p className="text-cyan-100">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} | {co.tagline || 'Interior Design & Construction'}
          </p>
          <p className="text-cyan-200 mt-1">
            โทร: {co.phone || '-'} | อีเมล: {co.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
