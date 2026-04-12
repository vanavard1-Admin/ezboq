import React from 'react';
import { ProjectData, getProjectCustomerAmount } from '../utils/projectData';
import { TrendingUp, TrendingDown, DollarSign, Percent, Pencil, Eye } from 'lucide-react';
import type { CompanyProfile } from '../utils/companyProfile';

interface PriceComparisonDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

interface CategoryPriceItem {
  no: string;
  description: string;
  unit: string;
  quantity: number | string;
  cost: number;
  selling: number;
  profit: number;
  profitRate: number;
}

interface CategoryPriceSummary {
  cost: number;
  selling: number;
  items: CategoryPriceItem[];
}

export function PriceComparisonDocument({ project, companyProfile }: PriceComparisonDocumentProps) {
  void companyProfile;
  const [isEditing, setIsEditing] = React.useState(false);

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // คำนวณราคาทุนและราคาขาย
  const calculatePrices = () => {
    let totalCost = 0;
    let totalSelling = 0;
    const categories: Record<string, CategoryPriceSummary> = {};

    project.quotationData.forEach((item) => {
      const unitPrice = typeof item.unitPrice === 'string' && item.unitPrice === '' ? 0 : Number(item.unitPrice);
      const laborCost = typeof item.laborCost === 'string' && item.laborCost === '' ? 0 : Number(item.laborCost);
      const quantity = typeof item.quantity === 'string' && item.quantity === '' ? 0 : Number(item.quantity);

      const itemCost = (unitPrice + laborCost) * quantity;

      // ตรวจสอบว่าเป็นหัวข้อหมวดหรือไม่
      if (!item.unit || item.unit === '') {
        if (itemCost === 0 && item.description) {
          categories[item.no] = { cost: 0, selling: 0, items: [] };
        }
      } else {
        // หาหมวดที่รายการนี้อยู่
        const categoryNo = item.no.split('.')[0];

        if (categories[categoryNo]) {
          const itemSelling = getProjectCustomerAmount(project, item);
          const profitRate = itemCost > 0 ? (itemSelling - itemCost) / itemCost : 0;

          categories[categoryNo].cost += itemCost;
          categories[categoryNo].selling += itemSelling;
          categories[categoryNo].items.push({
            ...item,
            cost: itemCost,
            selling: itemSelling,
            profit: itemSelling - itemCost,
            profitRate: profitRate
          });

          totalCost += itemCost;
          totalSelling += itemSelling;
        }
      }
    });

    return { categories, totalCost, totalSelling };
  };

  const { categories, totalCost, totalSelling } = calculatePrices();

  // ค่าดำเนินการ (ถ้าโครงการกำหนดไว้)
  const operatingSelling = project.operatingCost !== undefined ? project.operatingCost : totalSelling * 0.05;

  const grandTotalCost = totalCost; // ทุนไม่รวมค่าดำเนินการ
  const grandTotalSelling = totalSelling + operatingSelling;
  const totalProfit = grandTotalSelling - grandTotalCost;
  const profitMargin = (totalProfit / grandTotalSelling) * 100;

  return (
    <div className="max-w-[1200px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--doc-primary)] text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-2">เปรียบเทียบราคาทุน vs ราคาเสนอลูกค้า</h1>
            <p className="text-stone-400">Price Comparison Report</p>
          </div>
          <DollarSign className="w-16 h-16 text-stone-500" />
        </div>
      </div>

      {/* Edit / View toggle */}
      <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 border-b border-stone-200 print:hidden">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isEditing
              ? 'bg-[var(--doc-primary)] text-white'
              : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        >
          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditing ? 'ดูตัวอย่าง' : 'แก้ไข'}
        </button>
        {isEditing && (
          <span className="text-[11px] text-stone-400">คลิกที่ข้อความเพื่อแก้ไขได้เลย</span>
        )}
      </div>

      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={`${isEditing ? '[&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_td]:outline-none [&_td]:hover:bg-amber-50/40 [&_td]:focus:bg-amber-50/60 [&_span]:outline-none [&_span]:hover:bg-amber-50/40 [&_span]:focus:bg-amber-50/60 [&_h2]:outline-none [&_h2]:hover:bg-amber-50/40 [&_h3]:outline-none [&_h3]:hover:bg-amber-50/40 [&_h4]:outline-none [&_h4]:hover:bg-amber-50/40 [&_p]:rounded [&_td]:rounded [&_span]:rounded [&_p]:transition-colors [&_td]:transition-colors [&_span]:transition-colors' : ''}`}
      >

      {/* Project Info */}
      <div className="px-8 py-4 bg-stone-50 border-b border-stone-200">
        <h2 className="font-medium text-stone-800">{project.name}</h2>
        <p className="text-sm text-stone-500">{project.address}</p>
      </div>

      {/* Summary Cards */}
      <div className="px-8 py-6 bg-white">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-stone-500" />
              <span className="text-sm text-stone-500">ราคาทุนรวม</span>
            </div>
            <p className="text-2xl text-stone-800">{formatCurrency(grandTotalCost)}</p>
            <p className="text-xs text-stone-400 mt-1">บาท</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-stone-500" />
              <span className="text-sm text-stone-500">ราคาเสนอรวม</span>
            </div>
            <p className="text-2xl text-stone-800">{formatCurrency(grandTotalSelling)}</p>
            <p className="text-xs text-stone-400 mt-1">บาท</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-stone-500" />
              <span className="text-sm text-stone-500">กำไรรวม</span>
            </div>
            <p className="text-2xl text-stone-800">{formatCurrency(totalProfit)}</p>
            <p className="text-xs text-stone-400 mt-1">บาท</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-stone-500" />
              <span className="text-sm text-stone-500">Profit Margin</span>
            </div>
            <p className="text-2xl text-stone-800">{profitMargin.toFixed(2)}%</p>
            <p className="text-xs text-stone-400 mt-1">อัตรากำไร</p>
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="px-8 py-6">
        <h3 className="text-lg mb-4 text-stone-800">รายละเอียดเปรียบเทียบแต่ละหมวด</h3>

        <div className="space-y-6">
          {Object.keys(categories).map((categoryNo) => {
            const category = categories[categoryNo];
            const categoryHeader = project.quotationData.find(item => item.no === categoryNo);

            if (!categoryHeader || category.items.length === 0) return null;

            const categoryProfit = category.selling - category.cost;
            const categoryProfitPercent = category.cost > 0 ? ((category.selling - category.cost) / category.cost) * 100 : 0;

            return (
              <div key={categoryNo} className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="bg-[var(--doc-primary)] text-white px-4 py-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{categoryHeader.description}</h4>
                    <div className="flex gap-6 text-sm">
                      <span>ทุน: {formatCurrency(category.cost)} บาท</span>
                      <span>ขาย: {formatCurrency(category.selling)} บาท</span>
                      <span className="text-stone-300">กำไร: {formatCurrency(categoryProfit)} ({categoryProfitPercent.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="px-3 py-2 text-left text-stone-500 w-12">ลำดับ</th>
                        <th className="px-3 py-2 text-left text-stone-500">รายการ</th>
                        <th className="px-3 py-2 text-center text-stone-500 w-24">จำนวน</th>
                        <th className="px-3 py-2 text-right text-stone-500 w-32">ราคาทุน</th>
                        <th className="px-3 py-2 text-right text-stone-500 w-32">ราคาขาย</th>
                        <th className="px-3 py-2 text-right text-stone-500 w-32">กำไร</th>
                        <th className="px-3 py-2 text-center text-stone-500 w-20">% กำไร</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, idx: number) => (
                        <tr key={idx} className="border-b border-stone-200 hover:bg-stone-50">
                          <td className="px-3 py-2 text-stone-500">{item.no}</td>
                          <td className="px-3 py-2 text-stone-800">{item.description}</td>
                          <td className="px-3 py-2 text-center text-stone-500">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-3 py-2 text-right text-stone-800">{formatCurrency(item.cost)}</td>
                          <td className="px-3 py-2 text-right text-stone-800">{formatCurrency(item.selling)}</td>
                          <td className="px-3 py-2 text-right text-stone-800">{formatCurrency(item.profit)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-stone-100 text-stone-500 border border-stone-200">
                              {(item.profitRate * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Operating Cost Section */}
        <div className="mt-6 border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-stone-50 px-4 py-2 border-b border-stone-200">
            <h4 className="text-stone-800">ค่าดำเนินการ</h4>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-stone-500">ค่าดำเนินการ (ทุน):</span>
                <span className="ml-2 text-stone-800">{formatCurrency(0)} บาท</span>
              </div>
              <div>
                <span className="text-stone-500">ค่าดำเนินการ (ขาย):</span>
                <span className="ml-2 text-stone-800">{formatCurrency(operatingSelling)} บาท</span>
              </div>
              <div>
                <span className="text-stone-500">ส่วนต่าง:</span>
                <span className="ml-2 text-stone-800">{formatCurrency(operatingSelling)} บาท</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total */}
        <div className="mt-6 bg-[var(--doc-primary)] rounded-lg p-6 text-white">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-stone-400 text-sm mb-1">ราคาทุนสุทธิ</p>
              <p className="text-2xl">{formatCurrency(grandTotalCost)}</p>
            </div>
            <div>
              <p className="text-stone-400 text-sm mb-1">ราคาเสนอสุทธิ</p>
              <p className="text-2xl">{formatCurrency(grandTotalSelling)}</p>
            </div>
            <div>
              <p className="text-stone-400 text-sm mb-1">กำไรสุทธิ</p>
              <p className="text-2xl text-stone-300">{formatCurrency(totalProfit)}</p>
            </div>
            <div>
              <p className="text-stone-400 text-sm mb-1">Profit Margin</p>
              <p className="text-2xl text-stone-300">{profitMargin.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-3 px-6 rounded-lg transition-colors"
        >
          พิมพ์รายงาน
        </button>
      </div>
    </div>
  );
}
