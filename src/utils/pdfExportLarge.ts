/**
 * Large BOQ PDF Export Utility - P0 Production Version
 * 
 * ✅ Features:
 * - Auto-switch between canvas (< 300) and AutoTable (≥ 300) modes
 * - Incremental rendering with memory cleanup
 * - Cancellation support
 * - Export queue with BroadcastChannel lock
 * - Telemetry tracking
 * - Auto document splitting for 600+ items
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { BOQItem, BOQSummary, CompanyInfo, CustomerInfo, Profile } from '../types/boq';
import { formatCurrency } from './calculations';
import { downloadFile, isMobileDevice } from './downloadHelper';

// ========== CONFIGURATION ==========

export type ExportMode = 'canvas' | 'autotable';

export interface ExportConfig {
  mode: ExportMode;
  scale: number;
  imageQuality: number;
  compress: boolean;
}

export interface ExportTelemetry {
  startTime: number;
  endTime?: number;
  ttfbRender?: number;
  totalTime?: number;
  pages: number;
  itemCount: number;
  mode: ExportMode;
  memPeakEst?: number;
  cancelled: boolean;
  error?: string;
}

// ========== EXPORT STATE ==========

let exportInProgress = false;
let currentCancelled = false;
let exportChannel: BroadcastChannel | null = null;

// Telemetry storage
const telemetry: ExportTelemetry[] = [];

// ========== MODE SELECTION ==========

/**
 * Pick export mode based on item count
 */
export function pickExportMode(itemCount: number): ExportMode {
  return itemCount >= 300 ? 'autotable' : 'canvas';
}

/**
 * Pick scale based on context
 */
export function pickScale(itemCount: number, mobile: boolean = isMobileDevice()): number {
  if (mobile || itemCount > 500) return 1.5;
  return Math.min(2, window.devicePixelRatio || 1);
}

/**
 * Get export configuration
 */
export function getExportConfig(itemCount: number): ExportConfig {
  const mode = pickExportMode(itemCount);
  const scale = pickScale(itemCount);
  const imageQuality = itemCount > 500 ? 0.85 : 0.92;
  
  return {
    mode,
    scale,
    imageQuality,
    compress: true,
  };
}

// ========== CANCELLATION ==========

/**
 * Cancel current export
 */
export function cancelExport(): void {
  currentCancelled = true;
  console.log('🚫 Export cancelled by user');
}

/**
 * Check if export was cancelled
 */
function checkCancelled(): void {
  if (currentCancelled) {
    throw new Error('ยกเลิกโดยผู้ใช้');
  }
}

/**
 * Reset cancellation flag
 */
function resetCancellation(): void {
  currentCancelled = false;
}

// ========== EXPORT QUEUE LOCK ==========

/**
 * Initialize export channel for cross-tab locking
 */
function initExportChannel(): void {
  if (!exportChannel && 'BroadcastChannel' in window) {
    try {
      exportChannel = new BroadcastChannel('ezboq-export');
      
      exportChannel.onmessage = (event) => {
        if (event.data.type === 'lock-request') {
          // Another tab is requesting lock
          if (exportInProgress) {
            exportChannel?.postMessage({ type: 'lock-denied' });
          }
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported:', error);
    }
  }
}

/**
 * Acquire export lock
 */
async function acquireExportLock(): Promise<boolean> {
  initExportChannel();
  
  if (exportInProgress) {
    console.warn('⚠️ Export already in progress in this tab');
    return false;
  }
  
  // Request lock from other tabs
  if (exportChannel) {
    exportChannel.postMessage({ type: 'lock-request' });
    
    // Wait for potential denials
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  exportInProgress = true;
  console.log('🔒 Export lock acquired');
  return true;
}

/**
 * Release export lock
 */
function releaseExportLock(): void {
  exportInProgress = false;
  if (exportChannel) {
    exportChannel.postMessage({ type: 'lock-released' });
  }
  console.log('🔓 Export lock released');
}

// ========== FRAME HELPER ==========

/**
 * Wait for next animation frame
 */
const nextFrame = (): Promise<void> => {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
};

// ========== DOM PREPARATION ==========

/**
 * Create skinny export container
 * Removes heavy styles like shadows, filters, etc.
 */
function createSkinnyContainer(sourceElement: HTMLElement): HTMLElement {
  const container = document.createElement('div');
  container.className = 'export-skinny';
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 210mm;
    background: white;
    font-family: "Sarabun", "Noto Sans Thai", sans-serif;
  `;
  
  // Clone content
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  
  // Strip heavy styles
  const stripHeavyStyles = (el: HTMLElement) => {
    el.style.boxShadow = 'none';
    el.style.filter = 'none';
    el.style.textShadow = 'none';
    el.style.position = 'static';
    el.style.transform = 'none';
    
    // Remove background images
    const bgImage = getComputedStyle(el).backgroundImage;
    if (bgImage && bgImage !== 'none') {
      el.style.backgroundImage = 'none';
    }
    
    // Recurse
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) {
        stripHeavyStyles(child);
      }
    });
  };
  
  stripHeavyStyles(clone);
  container.appendChild(clone);
  document.body.appendChild(container);
  
  return container;
}

// ========== CANVAS MODE ==========

/**
 * Export using html2canvas (< 300 items)
 */
async function exportCanvasMode(
  element: HTMLElement,
  config: ExportConfig,
  telemetryData: ExportTelemetry
): Promise<jsPDF> {
  console.log('🎨 Using canvas mode for export');
  
  const renderStart = performance.now();
  
  // Create skinny container
  const container = createSkinnyContainer(element);
  
  try {
    checkCancelled();
    
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: config.scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      ignoreElements: (el) => {
        const tag = el.tagName?.toLowerCase();
        return ['img', 'canvas', 'video', 'svg'].includes(tag);
      },
    });
    
    telemetryData.ttfbRender = performance.now() - renderStart;
    checkCancelled();
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'A4',
      compress: config.compress,
    });
    
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Convert canvas to image
    const imgData = canvas.toDataURL('image/jpeg', config.imageQuality);
    
    // Calculate dimensions
    const canvasWidthMM = (canvas.width * 0.264583) / config.scale;
    const canvasHeightMM = (canvas.height * 0.264583) / config.scale;
    const scaleRatio = pageWidth / canvasWidthMM;
    const scaledHeight = canvasHeightMM * scaleRatio;
    
    telemetryData.pages = Math.ceil(scaledHeight / pageHeight);
    
    checkCancelled();
    
    // Add pages incrementally
    for (let page = 0; page < telemetryData.pages; page++) {
      checkCancelled();
      
      if (page > 0) pdf.addPage();
      
      const sourceY = page * (pageHeight / scaleRatio);
      const sourceHeight = Math.min(pageHeight / scaleRatio, canvasHeightMM - sourceY);
      
      // Create page canvas
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = (sourceHeight / canvasHeightMM) * canvas.height;
      
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        const sourceYPixels = (sourceY / canvasHeightMM) * canvas.height;
        ctx.drawImage(
          canvas,
          0,
          sourceYPixels,
          canvas.width,
          Math.min(pageCanvas.height, canvas.height - sourceYPixels),
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );
        
        const pageImgData = pageCanvas.toDataURL('image/jpeg', config.imageQuality);
        const pageHeightScaled = sourceHeight * scaleRatio;
        pdf.addImage(pageImgData, 'JPEG', 0, 0, pageWidth, pageHeightScaled);
        
        // Cleanup
        pageCanvas.width = 0;
        pageCanvas.height = 0;
      }
      
      await nextFrame();
    }
    
    // Cleanup main canvas
    canvas.width = 0;
    canvas.height = 0;
    
    return pdf;
    
  } finally {
    // Remove container
    container.remove();
  }
}

// ========== AUTOTABLE MODE ==========

/**
 * Export using jsPDF AutoTable (≥ 300 items)
 */
async function exportAutoTableMode(
  items: BOQItem[],
  summary: BOQSummary,
  company: CompanyInfo,
  customer: CustomerInfo,
  projectTitle: string,
  telemetryData: ExportTelemetry
): Promise<jsPDF> {
  console.log('📊 Using AutoTable mode for export');
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  
  checkCancelled();
  
  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentPage = 1;
  
  // Header function
  const addHeader = () => {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(company.name, pageWidth / 2, 40, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(company.address, pageWidth / 2, 55, { align: 'center' });
    pdf.text(`โทร: ${company.phone}`, pageWidth / 2, 68, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('รายการถอดวัสดุ (BOQ)', pageWidth / 2, 90, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`โครงการ: ${projectTitle}`, 40, 110);
    pdf.text(`ลูกค้า: ${customer.name}`, 40, 125);
  };
  
  // Add initial header
  addHeader();
  
  checkCancelled();
  
  // Prepare table data
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.unit,
    item.quantity.toFixed(2),
    formatCurrency(item.unitPrice),
    formatCurrency(item.totalPrice),
  ]);
  
  // Add table with AutoTable
  autoTable(pdf, {
    head: [['ลำดับ', 'รายการ', 'หน่วย', 'ปริมาณ', 'ราคา/หน่วย', 'รวม']],
    body: tableData,
    startY: 140,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 40, halign: 'center' },
      1: { cellWidth: 200 },
      2: { cellWidth: 50, halign: 'center' },
      3: { cellWidth: 60, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 90, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Page number
      pdf.setFontSize(9);
      pdf.text(
        `หน้า ${currentPage}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
      currentPage++;
      
      // Add header on new pages
      if (data.pageNumber > 1) {
        pdf.setFontSize(10);
        pdf.text('รายการถอดวัสดุ (ต่อ)', pageWidth / 2, 30, { align: 'center' });
      }
    },
    pageBreak: 'auto',
    showHead: 'everyPage',
  });
  
  checkCancelled();
  
  // Add summary on last page
  const finalY = (pdf as any).lastAutoTable.finalY + 20;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('สรุปยอดเงิน', pageWidth - 220, finalY);
  
  pdf.setFont('helvetica', 'normal');
  let summaryY = finalY + 15;
  
  const summaryItems = [
    ['รวมก่อน VAT:', formatCurrency(summary.totalBeforeVat)],
    ['VAT (7%):', formatCurrency(summary.vat)],
    ['รวมทั้งหมด:', formatCurrency(summary.grandTotal)],
  ];
  
  if (summary.discountAmount > 0) {
    summaryItems.push(['ส่วนลด:', `-${formatCurrency(summary.discountAmount)}`]);
  }
  
  summaryItems.push(['ยอดชำระสุทธิ:', formatCurrency(summary.totalAfterDiscount)]);
  
  summaryItems.forEach(([label, value]) => {
    pdf.text(label, pageWidth - 220, summaryY);
    pdf.text(value, pageWidth - 40, summaryY, { align: 'right' });
    summaryY += 15;
  });
  
  telemetryData.pages = currentPage - 1;
  
  return pdf;
}

// ========== AUTO DOCUMENT SPLITTING ==========

/**
 * Check if should offer auto-split
 */
export function shouldOfferAutoSplit(itemCount: number): boolean {
  return itemCount >= 600;
}

/**
 * Split items by category
 */
export function splitByCategory(items: BOQItem[]): Map<string, BOQItem[]> {
  const grouped = new Map<string, BOQItem[]>();
  
  items.forEach(item => {
    const category = item.category || 'อื่นๆ';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  });
  
  return grouped;
}

// ========== MAIN EXPORT FUNCTION ==========

export interface LargeBOQExportOptions {
  projectTitle: string;
  projectDescription?: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  profile: Profile;
  items: BOQItem[];
  summary: BOQSummary;
  filename: string;
  onProgress?: (current: number, total: number, status: string) => void;
  elementId?: string; // For canvas mode
}

/**
 * Main export function with auto mode selection
 */
export async function exportLargeBOQ(
  options: LargeBOQExportOptions
): Promise<void> {
  const { items, filename, onProgress, elementId } = options;
  const itemCount = items.length;
  
  // Check if too large and suggest split
  if (shouldOfferAutoSplit(itemCount)) {
    const shouldSplit = confirm(
      `เอกสารมี ${itemCount} รายการ ซึ่งค่อนข้างใหญ่\n\n` +
      `แนะนำให้แบ่งเอกสารตามหมวดหมู่เพื่อความรวดเร็วและเสถียร\n\n` +
      `ต้องการแบ่งเอกสารหรือไม่?`
    );
    
    if (shouldSplit) {
      await exportSplitByCategory(options);
      return;
    }
  }
  
  // Acquire lock
  const lockAcquired = await acquireExportLock();
  if (!lockAcquired) {
    throw new Error('มีการส่งออกอยู่แล้ว กรุณารอสักครู่');
  }
  
  // Initialize telemetry
  const telemetryData: ExportTelemetry = {
    startTime: performance.now(),
    pages: 0,
    itemCount,
    mode: pickExportMode(itemCount),
    cancelled: false,
  };
  
  try {
    resetCancellation();
    
    const config = getExportConfig(itemCount);
    console.log(`📦 Exporting ${itemCount} items using ${config.mode} mode`);
    
    if (onProgress) {
      onProgress(0, 100, `กำลังเตรียมข้อมูล (${itemCount} รายการ)`);
    }
    
    let pdf: jsPDF;
    
    if (config.mode === 'autotable') {
      // AutoTable mode
      if (onProgress) {
        onProgress(25, 100, 'กำลังสร้างตาราง...');
      }
      
      pdf = await exportAutoTableMode(
        items,
        options.summary,
        options.company,
        options.customer,
        options.projectTitle,
        telemetryData
      );
      
    } else {
      // Canvas mode
      if (!elementId) {
        throw new Error('Element ID required for canvas mode');
      }
      
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element not found: ${elementId}`);
      }
      
      if (onProgress) {
        onProgress(25, 100, 'กำลังเรนเดอร์...');
      }
      
      pdf = await exportCanvasMode(element, config, telemetryData);
    }
    
    checkCancelled();
    
    if (onProgress) {
      onProgress(90, 100, 'กำลังบันทึกไฟล์...');
    }
    
    // Save PDF
    const pdfBlob = pdf.output('blob');
    const finalFilename = `${filename}.pdf`;
    
    if (isMobileDevice()) {
      downloadFile(pdfBlob, finalFilename, 'application/pdf');
    } else {
      pdf.save(finalFilename);
    }
    
    // Complete telemetry
    telemetryData.endTime = performance.now();
    telemetryData.totalTime = telemetryData.endTime - telemetryData.startTime;
    telemetry.push(telemetryData);
    
    console.log(`✅ Export completed in ${(telemetryData.totalTime / 1000).toFixed(1)}s`);
    console.log(`📊 Telemetry:`, telemetryData);
    
    if (onProgress) {
      onProgress(100, 100, 'เสร็จสิ้น');
    }
    
  } catch (error: any) {
    telemetryData.cancelled = currentCancelled;
    telemetryData.error = error.message;
    telemetry.push(telemetryData);
    
    console.error('❌ Export failed:', error);
    throw error;
    
  } finally {
    releaseExportLock();
    resetCancellation();
  }
}

/**
 * Export split by category
 */
async function exportSplitByCategory(
  options: LargeBOQExportOptions
): Promise<void> {
  const grouped = splitByCategory(options.items);
  const categories = Array.from(grouped.keys());
  const total = categories.length;
  
  console.log(`📂 Splitting into ${total} documents by category`);
  
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const categoryItems = grouped.get(category)!;
    
    if (options.onProgress) {
      options.onProgress(
        i + 1,
        total,
        `กำลังส่งออกหมวด: ${category} (${categoryItems.length} รายการ)`
      );
    }
    
    // Recalculate summary for this category
    const categorySubtotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const categorySummary: BOQSummary = {
      subtotal: categorySubtotal,
      wasteCost: categorySubtotal * (options.profile.wastePct / 100),
      opexCost: categorySubtotal * (options.profile.opexPct / 100),
      errorCost: categorySubtotal * (options.profile.errorPct / 100),
      totalBeforeMarkup: 0,
      markup: 0,
      totalBeforeVat: 0,
      vat: 0,
      grandTotal: 0,
      discountAmount: 0,
      totalAfterDiscount: 0,
      withholdingTaxAmount: 0,
      netPayable: 0,
    };
    
    // Complete calculation
    const costFactors = 1 + (options.profile.wastePct + options.profile.opexPct + options.profile.errorPct) / 100;
    categorySummary.totalBeforeMarkup = categorySubtotal * costFactors;
    categorySummary.markup = categorySummary.totalBeforeMarkup * (options.profile.markupPct / 100);
    categorySummary.totalBeforeVat = categorySummary.totalBeforeMarkup + categorySummary.markup;
    categorySummary.vat = categorySummary.totalBeforeVat * (options.profile.vatPct / 100);
    categorySummary.grandTotal = categorySummary.totalBeforeVat + categorySummary.vat;
    categorySummary.totalAfterDiscount = categorySummary.grandTotal;
    categorySummary.netPayable = categorySummary.totalAfterDiscount;
    
    await exportLargeBOQ({
      ...options,
      items: categoryItems,
      summary: categorySummary,
      filename: `${options.filename}_${category}`,
    });
    
    // Delay between exports
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`✅ All ${total} category documents exported`);
}

// ========== TELEMETRY ==========

/**
 * Get telemetry data
 */
export function getTelemetry(): ExportTelemetry[] {
  return [...telemetry];
}

/**
 * Get telemetry stats
 */
export function getTelemetryStats() {
  const completed = telemetry.filter(t => !t.cancelled && !t.error);
  
  if (completed.length === 0) {
    return null;
  }
  
  const times = completed.map(t => t.totalTime || 0);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  
  const failureRate = telemetry.filter(t => t.error).length / telemetry.length;
  
  return {
    totalExports: telemetry.length,
    completedExports: completed.length,
    avgTimeMs: avgTime,
    maxTimeMs: maxTime,
    failureRate,
  };
}

/**
 * Clear telemetry
 */
export function clearTelemetry(): void {
  telemetry.length = 0;
}
