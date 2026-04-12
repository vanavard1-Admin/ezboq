import React from 'react';
import { projects } from '../utils/projectData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Building2, Percent, FileText, Target } from 'lucide-react';

export function DashboardDocument() {
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // คำนวณข้อมูลแต่ละโครงการ
  const projectStats = projects.map(project => {
    let totalCost = 0;
    let totalSelling = 0;

    project.quotationData.forEach((item) => {
      const unitPrice = typeof item.unitPrice === 'string' && item.unitPrice === '' ? 0 : Number(item.unitPrice);
      const laborCost = typeof item.laborCost === 'string' && item.laborCost === '' ? 0 : Number(item.laborCost);
      const quantity = typeof item.quantity === 'string' && item.quantity === '' ? 0 : Number(item.quantity);

      const itemCost = (unitPrice + laborCost) * quantity;

      if (item.unit && item.unit !== '') {
        const categoryNo = item.no.split('.')[0];
        
        // ทุกหมวดใช้กำไร 20% ยกเว้นหมวด A (ออกแบบ) ไม่บวกกำไร
        const profitRate = categoryNo === 'A' ? 0.00 : 0.20;
        const itemSelling = itemCost * (1 + profitRate);

        totalCost += itemCost;
        totalSelling += itemSelling;
      }
    });

    // ค่าดำเนินการ 5% (เฉพาะราคาขายเท่านั้น ทุนไม่มี)
    const operatingSelling = totalSelling * 0.05;

    const grandTotalCost = totalCost; // ทุนไม่รวมค่าดำเนินการ
    const grandTotalSelling = totalSelling + operatingSelling;
    const totalProfit = grandTotalSelling - grandTotalCost;
    const profitMargin = grandTotalCost > 0 ? (totalProfit / grandTotalSelling) * 100 : 0;

    return {
      name: project.name.length > 25 ? project.name.substring(0, 25) + '...' : project.name,
      fullName: project.name,
      cost: grandTotalCost,
      selling: grandTotalSelling,
      profit: totalProfit,
      profitMargin,
      itemCount: project.quotationData.filter(item => item.unit && item.unit !== '').length,
    };
  });

  // สรุปรวมทั้งหมด
  const totalAllCost = projectStats.reduce((sum, p) => sum + p.cost, 0);
  const totalAllSelling = projectStats.reduce((sum, p) => sum + p.selling, 0);
  const totalAllProfit = projectStats.reduce((sum, p) => sum + p.profit, 0);
  const avgProfitMargin = projectStats.length > 0 
    ? projectStats.reduce((sum, p) => sum + p.profitMargin, 0) / projectStats.length 
    : 0;

  // ข้อมูลสำหรับกราฟแท่ง
  const barChartData = projectStats.map(p => ({
    name: p.name,
    ทุน: Math.round(p.cost),
    ขาย: Math.round(p.selling),
    กำไร: Math.round(p.profit),
  }));

  // ข้อมูลสำหรับกราฟวงกลม
  const pieChartData = projectStats.map(p => ({
    name: p.fullName,
    value: Math.round(p.profit),
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-[1400px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-600 text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2">แดชบอร์ดสรุปรายงาน</h1>
            <p className="text-indigo-100">Dashboard & Statistics Report</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-200">BUSINESS DASHBOARD</p>
            <p className="text-xs text-indigo-300 mt-1">{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-8 py-6 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-l-4 border-blue-500 rounded-lg p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-slate-500">ราคาทุนรวม</span>
            </div>
            <p className="text-2xl text-blue-800 mb-1">{formatCurrency(totalAllCost)}</p>
            <p className="text-xs text-blue-600">บาท</p>
          </div>

          <div className="bg-white border-l-4 border-green-500 rounded-lg p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-slate-500">ราคาเสนอรวม</span>
            </div>
            <p className="text-2xl text-green-800 mb-1">{formatCurrency(totalAllSelling)}</p>
            <p className="text-xs text-green-600">บาท</p>
          </div>

          <div className="bg-white border-l-4 border-amber-500 rounded-lg p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-amber-100 p-3 rounded-lg">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs text-slate-500">กำไรรวม</span>
            </div>
            <p className="text-2xl text-amber-800 mb-1">{formatCurrency(totalAllProfit)}</p>
            <p className="text-xs text-amber-600">บาท</p>
          </div>

          <div className="bg-white border-l-4 border-purple-500 rounded-lg p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Percent className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-slate-500">Profit Margin</span>
            </div>
            <p className="text-2xl text-purple-800 mb-1">{avgProfitMargin.toFixed(2)}%</p>
            <p className="text-xs text-purple-600">เฉลี่ย</p>
          </div>
        </div>
      </div>

      {/* Project Overview Table */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg text-slate-800">ภาพรวมโครงการทั้งหมด</h2>
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white">
                <th className="px-4 py-3 text-left">โครงการ</th>
                <th className="px-4 py-3 text-center">รายการ</th>
                <th className="px-4 py-3 text-right">ราคาทุน</th>
                <th className="px-4 py-3 text-right">ราคาขาย</th>
                <th className="px-4 py-3 text-right">กำไร</th>
                <th className="px-4 py-3 text-center">Margin</th>
              </tr>
            </thead>
            <tbody>
              {projectStats.map((project, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-indigo-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800">{project.fullName}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{project.itemCount}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(project.cost)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(project.selling)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{formatCurrency(project.profit)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                      {project.profitMargin.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-gradient-to-r from-slate-100 to-slate-50 font-medium">
                <td className="px-4 py-4 text-slate-900">รวมทั้งหมด</td>
                <td className="px-4 py-4 text-center text-slate-700">
                  {projectStats.reduce((sum, p) => sum + p.itemCount, 0)}
                </td>
                <td className="px-4 py-4 text-right text-blue-800">{formatCurrency(totalAllCost)}</td>
                <td className="px-4 py-4 text-right text-green-800">{formatCurrency(totalAllSelling)}</td>
                <td className="px-4 py-4 text-right text-amber-800">{formatCurrency(totalAllProfit)}</td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-block bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs">
                    {avgProfitMargin.toFixed(2)}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="px-8 py-6 bg-slate-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-slate-800">เปรียบเทียบราคาตามโครงการ</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value) + ' บาท'}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ทุน" fill="#3b82f6" />
                <Bar dataKey="ขาย" fill="#10b981" />
                <Bar dataKey="กำไร" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="text-slate-800">สัดส่วนกำไรแต่ละโครงการ</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${percent > 0.05 ? (percent * 100).toFixed(0) + '%' : ''}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value) + ' บาท'}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => {
                    const label = typeof value === 'string' ? value : String(value);
                    const project = pieChartData.find((item) => item.name === label);
                    return project ? project.name : label;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="px-8 py-6">
        <h3 className="text-lg text-slate-800 mb-4">สรุปข้อมูลสำคัญ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white p-2 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-blue-900 mb-1">จำนวนโครงการทั้งหมด</p>
                <p className="text-2xl text-blue-800">{projects.length} โครงการ</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 text-white p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-green-900 mb-1">โครงการกำไรสูงสุด</p>
                <p className="text-xl text-green-800">
                  {projectStats.reduce((max, p) => p.profit > max.profit ? p : max, projectStats[0])?.fullName || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-500 text-white p-2 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-amber-900 mb-1">กำไรเฉลี่ยต่อโครงการ</p>
                <p className="text-2xl text-amber-800">
                  {formatCurrency(totalAllProfit / projects.length)} บาท
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-500 text-white p-2 rounded-lg">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-purple-900 mb-1">Margin สูงสุด</p>
                <p className="text-2xl text-purple-800">
                  {Math.max(...projectStats.map(p => p.profitMargin)).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white py-3 text-center">
        <p className="text-xs text-indigo-200">Business Dashboard • Generated on {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-slate-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg transition-colors"
        >
          พิมพ์รายงาน
        </button>
      </div>
    </div>
  );
}
