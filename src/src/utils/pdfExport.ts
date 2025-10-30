/**
 * PDF Export Utility - Production Version
 * High-quality PDF export with Thai font support
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { downloadFile, isMobileDevice } from './downloadHelper';

export interface PDFExportOptions {
  filename: string;
  format: 'a4' | 'a3';
  orientation: 'portrait' | 'landscape';
  quality?: number;
  addPageNumbers?: boolean;
  addWatermark?: boolean;
  watermarkText?: string;
  compress?: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  documentName: string;
  status: 'preparing' | 'rendering' | 'generating' | 'complete' | 'error';
}

const THAI_FONTS = {
  primary: 'Sarabun',
  secondary: 'Noto Sans Thai',
  fallback: 'sans-serif',
};

const PDF_CONFIG = {
  scale: 2, // Reduced from 3 to 2 for better performance on large documents
  imageFormat: 'JPEG' as const, // Use JPEG instead of PNG to avoid signature errors
  mimeType: 'image/jpeg' as const, // MIME type for toDataURL
  imageQuality: 0.92, // Reduced from 0.98 to 0.92 for faster processing
  renderDelay: 800, // Reduced from 1500 to 800
  fontLoadDelay: 200, // Reduced from 300 to 200
  exportDelay: 500, // Reduced from 800 to 500
  cleanupDelay: 100, // Reduced from 200 to 100
  skipImages: true, // Skip all images to avoid PNG signature errors
  maxRenderTime: 45000, // Maximum time allowed for rendering (45 seconds)
};

const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
};

/**
 * Ensure Thai fonts are loaded
 */
const ensureThaifontsLoaded = async (): Promise<void> => {
  if (!document.fonts) return;

  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`16px ${THAI_FONTS.primary}`),
      document.fonts.load(`16px "${THAI_FONTS.secondary}"`),
      document.fonts.load(`bold 16px ${THAI_FONTS.primary}`),
      document.fonts.load(`bold 16px "${THAI_FONTS.secondary}"`),
    ]);
    await new Promise(resolve => setTimeout(resolve, PDF_CONFIG.fontLoadDelay));
  } catch (error) {
    console.warn('Failed to load Thai fonts:', error);
  }
};

/**
 * Apply Thai font styling
 */
const applyThaiFont = (element: HTMLElement): void => {
  const allElements = element.getElementsByTagName('*');
  const fontFamily = `"${THAI_FONTS.primary}", "${THAI_FONTS.secondary}", ${THAI_FONTS.fallback}`;

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement;
    el.style.fontFamily = fontFamily;
    el.style.webkitFontSmoothing = 'antialiased';
    el.style.mozOsxFontSmoothing = 'grayscale';
    el.style.textRendering = 'optimizeLegibility';
  }
};

/**
 * Prepare element for export
 */
const prepareElement = (element: HTMLElement): { restore: () => void } => {
  const originalScrollTop = window.scrollY;
  const parentElement = element.parentElement;
  let originalPosition = '';
  let originalLeft = '';
  let originalTop = '';

  if (parentElement) {
    originalPosition = parentElement.style.position;
    originalLeft = parentElement.style.left;
    originalTop = parentElement.style.top;
    parentElement.style.position = 'fixed';
    parentElement.style.left = '0';
    parentElement.style.top = '0';
  }

  window.scrollTo(0, 0);

  return {
    restore: () => {
      if (parentElement) {
        parentElement.style.position = originalPosition;
        parentElement.style.left = originalLeft;
        parentElement.style.top = originalTop;
      }
      window.scrollTo(0, originalScrollTop);
    },
  };
};

/**
 * Render element to canvas with timeout protection
 */
const renderToCanvas = async (
  element: HTMLElement,
  elementId: string
): Promise<HTMLCanvasElement> => {
  await new Promise(resolve => setTimeout(resolve, PDF_CONFIG.cleanupDelay));

  console.log(`🎨 Rendering element: ${elementId}`);
  console.log(`📐 Element dimensions: ${element.offsetWidth}x${element.scrollHeight || element.offsetHeight}`);
  console.log(`📍 Element position:`, {
    offsetTop: element.offsetTop,
    offsetLeft: element.offsetLeft,
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
  });
  
  // Pre-check for images
  const images = element.querySelectorAll('img, canvas, video, svg');
  console.log(`⚠️ Found ${images.length} media elements in ${elementId} (will be removed)`);

  // 🔒 Save and lock current scroll position
  const currentScrollY = window.scrollY;
  const currentScrollX = window.scrollX;

  // ⏱️ Add timeout wrapper to prevent infinite hangs
  const renderPromise = html2canvas(element, {
    scale: PDF_CONFIG.scale,
    useCORS: true,
    allowTaint: false, // Prevent tainted canvas to avoid PNG errors
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering: false,
    imageTimeout: 0,
    removeContainer: true,
    width: element.offsetWidth || 794,
    height: element.scrollHeight || element.offsetHeight || 1123,
    windowWidth: element.offsetWidth || 794,
    windowHeight: element.scrollHeight || element.offsetHeight || 1123,
    letterRendering: true,
    proxy: undefined,
    scrollY: -currentScrollY, // Lock scroll position - prevent auto-scroll
    scrollX: -currentScrollX, // Lock horizontal scroll
    ignoreElements: (element) => {
      // Aggressively ignore all media elements
      const tagName = element.tagName?.toLowerCase();
      if (['img', 'canvas', 'video', 'iframe', 'svg', 'object', 'embed', 'picture', 'source'].includes(tagName)) {
        return true;
      }
      // Also ignore elements with background images
      const style = (element as HTMLElement).style;
      if (style && style.backgroundImage && style.backgroundImage !== 'none') {
        return true;
      }
      return false;
    },
    onclone: (clonedDoc) => {
      // IMPORTANT: Remove ALL media elements FIRST to prevent image loading
      const problematicElements = clonedDoc.querySelectorAll('img, canvas, video, iframe, svg, object, embed, picture, source, [style*="background-image"]');
      problematicElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        
        // Remove background images immediately
        if (htmlEl.style) {
          htmlEl.style.backgroundImage = 'none';
        }
        
        // For img/svg/canvas tags, replace with placeholder
        const tagName = el.tagName?.toLowerCase();
        if (['img', 'canvas', 'video', 'iframe', 'svg', 'object', 'embed', 'picture', 'source'].includes(tagName)) {
          const parent = el.parentElement;
          if (parent) {
            const placeholder = clonedDoc.createElement('span');
            placeholder.style.display = 'inline-block';
            placeholder.style.padding = '4px 8px';
            placeholder.style.backgroundColor = '#f3f4f6';
            placeholder.style.border = '1px solid #d1d5db';
            placeholder.style.borderRadius = '4px';
            placeholder.style.fontSize = '10px';
            placeholder.style.color = '#6b7280';
            placeholder.textContent = '[รูปภาพ]';
            
            try {
              parent.replaceChild(placeholder, el);
            } catch (e) {
              // If replace fails, just remove
              el.remove();
            }
          } else {
            el.remove();
          }
        }
      });
      
      // Remove ALL background images from all elements
      const allElements = clonedDoc.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          // Remove background-image
          htmlEl.style.backgroundImage = 'none';
          htmlEl.style.background = '';
          
          // Remove src attribute if exists
          if (htmlEl.hasAttribute('src')) {
            htmlEl.removeAttribute('src');
          }
          if (htmlEl.hasAttribute('srcset')) {
            htmlEl.removeAttribute('srcset');
          }
          if (htmlEl.hasAttribute('data-src')) {
            htmlEl.removeAttribute('data-src');
          }
        }
      });
      
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        console.log(`✅ Found cloned element: ${elementId}`);
        
        // Reset element position and visibility
        clonedElement.style.position = 'relative';
        clonedElement.style.left = '0';
        clonedElement.style.marginLeft = '0';
        clonedElement.style.opacity = '1';
        clonedElement.style.visibility = 'visible';
        clonedElement.style.display = 'block';
        clonedElement.style.height = 'auto';
        clonedElement.style.overflow = 'visible';

        applyThaiFont(clonedElement);

        // Reset parent wrapper position
        let currentParent = clonedElement.parentElement;
        let depth = 0;
        while (currentParent && depth < 5) {
          if (currentParent.hasAttribute('data-pdf-export-wrapper')) {
            console.log(`✅ Found PDF export wrapper parent, resetting position`);
            currentParent.style.position = 'static';
            currentParent.style.left = '0';
            currentParent.style.marginLeft = '0';
            currentParent.style.opacity = '1';
            currentParent.style.visibility = 'visible';
          }
          currentParent.style.height = 'auto';
          currentParent.style.overflow = 'visible';
          currentParent = currentParent.parentElement;
          depth++;
        }
      } else {
        console.error(`❌ Could not find cloned element: ${elementId}`);
        console.log('Available IDs in cloned document:', Array.from(clonedDoc.querySelectorAll('[id]')).map(el => el.id).slice(0, 20));
      }
    },
  });

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`การสร้าง PDF หมดเวลา (เกิน ${PDF_CONFIG.maxRenderTime / 1000} วินาที) - ลองลดจำนวนรายการหรือแบ่งเป็นหลายเอกสาร`));
    }, PDF_CONFIG.maxRenderTime);
  });

  // Race between render and timeout
  let canvas: HTMLCanvasElement;
  try {
    console.log(`⏱️ Starting render with ${PDF_CONFIG.maxRenderTime / 1000}s timeout...`);
    canvas = await Promise.race([renderPromise, timeoutPromise]);
    console.log(`✅ Render completed within timeout`);
  } catch (timeoutError) {
    console.error(`❌ Render timeout or error:`, timeoutError);
    throw timeoutError;
  }

  // 🔓 Restore original scroll position immediately
  window.scrollTo(currentScrollX, currentScrollY);

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error(`Canvas has invalid dimensions: ${canvas?.width}x${canvas?.height}`);
  }

  console.log(`✅ Canvas rendered successfully: ${canvas.width}x${canvas.height}`);
  return canvas;
};

/**
 * Add watermark
 */
const addWatermark = (
  pdf: jsPDF,
  text: string,
  pageWidth: number,
  pageHeight: number
): void => {
  pdf.setTextColor(200, 200, 200);
  pdf.setFontSize(60);
  pdf.setFont('helvetica', 'bold');
  
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  
  pdf.saveGraphicsState();
  pdf.text(text, centerX, centerY, {
    angle: 45,
    align: 'center',
    baseline: 'middle',
  });
  pdf.restoreGraphicsState();
};

/**
 * Add page numbers
 */
const addPageNumbers = (
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
): void => {
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(10);
  pdf.text(
    `หน้า ${pageNumber} จาก ${totalPages}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
};

/**
 * Export element to PDF
 */
export const exportToPDF = async (
  elementId: string,
  options: PDFExportOptions
): Promise<void> => {
  const {
    filename,
    format,
    orientation,
    quality = 0.95,
    addPageNumbers: includePageNumbers = false,
    addWatermark: includeWatermark = false,
    watermarkText = 'DRAFT',
    compress = true,
  } = options;

  try {
    console.log(`📄 Starting PDF export for: ${elementId}`);
    
    // Debug: List all export sections available
    const allExportSections = Array.from(document.querySelectorAll('[id*="export-section"]'));
    console.log(`🔍 Available export sections (${allExportSections.length}):`, allExportSections.map(el => ({
      id: el.id,
      visible: window.getComputedStyle(el).display !== 'none',
      inDOM: document.body.contains(el),
    })));
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`❌ Element not found: ${elementId}`);
      console.log('💡 Tip: Check that PDFExportWrapper is rendered in the DOM');
      throw new Error(`Element "${elementId}" not found`);
    }

    console.log(`✅ Element found: ${elementId}`);
    console.log(`   📐 Dimensions: ${element.offsetWidth}x${element.offsetHeight}`);
    console.log(`   🎨 Computed style:`, {
      display: window.getComputedStyle(element).display,
      visibility: window.getComputedStyle(element).visibility,
      opacity: window.getComputedStyle(element).opacity,
      position: window.getComputedStyle(element).position,
      left: window.getComputedStyle(element).left,
    });
    await ensureThaifontsLoaded();
    const { restore } = prepareElement(element);
    await new Promise(resolve => setTimeout(resolve, PDF_CONFIG.renderDelay));

    try {
      const canvas = await renderToCanvas(element, elementId);
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: format.toUpperCase() as 'A4' | 'A3',
        compress,
      });

      const pageDim = PAGE_DIMENSIONS[format];
      const pageWidth = orientation === 'portrait' ? pageDim.width : pageDim.height;
      const pageHeight = orientation === 'portrait' ? pageDim.height : pageDim.width;
      
      console.log(`📸 Converting main canvas to data URL (${canvas.width}x${canvas.height})...`);
      let imgData: string;
      try {
        // Test if canvas is tainted by trying to get a single pixel
        try {
          const testCtx = canvas.getContext('2d');
          if (testCtx) {
            testCtx.getImageData(0, 0, 1, 1);
          }
          console.log(`✅ Canvas is not tainted`);
        } catch (taintError) {
          console.error(`⚠️ Canvas may be tainted:`, taintError);
        }
        
        imgData = canvas.toDataURL(PDF_CONFIG.mimeType, PDF_CONFIG.imageQuality);
        console.log(`✅ Main canvas converted to data URL successfully (${imgData.length} bytes)`);
      } catch (error) {
        console.error(`❌ Failed to convert canvas to data URL:`, error);
        throw new Error('ไม่สามารถแปลง canvas เป็นรูปภาพได้');
      }
      const canvasHeightMM = (canvas.height * 0.264583) / PDF_CONFIG.scale;
      const canvasWidthMM = (canvas.width * 0.264583) / PDF_CONFIG.scale;
      const scaleRatio = pageWidth / canvasWidthMM;
      const scaledWidth = pageWidth;
      const scaledHeight = canvasHeightMM * scaleRatio;
      const totalPages = Math.ceil(scaledHeight / pageHeight);

      console.log(`📄 Document will be split into ${totalPages} page(s)`);
      console.log(`📐 Canvas: ${canvasWidthMM.toFixed(2)}mm x ${canvasHeightMM.toFixed(2)}mm`);
      console.log(`📐 Scaled: ${scaledWidth.toFixed(2)}mm x ${scaledHeight.toFixed(2)}mm`);

      if (totalPages === 1) {
        const yOffset = Math.max(0, (pageHeight - scaledHeight) / 2);
        pdf.addImage(imgData, PDF_CONFIG.imageFormat, 0, yOffset, scaledWidth, scaledHeight, undefined, 'FAST');
        if (includeWatermark) addWatermark(pdf, watermarkText, pageWidth, pageHeight);
        if (includePageNumbers) addPageNumbers(pdf, 1, 1, pageWidth, pageHeight);
      } else {
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const sourceY = page * (pageHeight / scaleRatio);
          const sourceHeight = Math.min(pageHeight / scaleRatio, canvasHeightMM - sourceY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = (sourceHeight / canvasHeightMM) * canvas.height;

          const pageCtx = pageCanvas.getContext('2d', { willReadFrequently: true });
          if (pageCtx) {
            // Fill with white background first to avoid transparency issues
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            
            // Draw the page content
            console.log(`🎨 Drawing page ${page + 1} content from main canvas...`);
            console.log(`   Source: y=${((sourceY / canvasHeightMM) * canvas.height).toFixed(0)}, h=${pageCanvas.height}`);
            console.log(`   Target: ${pageCanvas.width}x${pageCanvas.height}`);
            
            let drawSuccess = false;
            try {
              const sourceYPixels = (sourceY / canvasHeightMM) * canvas.height;
              
              // Ensure we're not drawing outside canvas bounds
              if (sourceYPixels < 0 || sourceYPixels >= canvas.height) {
                console.error(`❌ Invalid source Y position: ${sourceYPixels} (canvas height: ${canvas.height})`);
                throw new Error('Invalid source position');
              }
              
              // Check if main canvas is tainted before drawing
              try {
                const mainCtx = canvas.getContext('2d');
                if (mainCtx) {
                  mainCtx.getImageData(0, 0, 1, 1);
                }
              } catch (taintCheck) {
                console.error(`❌ Main canvas is tainted, cannot draw to page canvas:`, taintCheck);
                throw new Error('Main canvas is tainted');
              }
              
              pageCtx.drawImage(
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
              console.log(`✅ Page ${page + 1} content drawn successfully`);
              drawSuccess = true;
            } catch (drawError) {
              console.error(`❌ Failed to draw page ${page + 1} content:`, drawError);
              console.error(`❌ Draw error details:`, {
                message: drawError.message,
                sourceY,
                canvasHeightMM,
                canvasHeight: canvas.height,
                pageHeight: pageCanvas.height
              });
              console.warn(`⚠️ Creating blank page ${page + 1} due to draw error`);
              // Page canvas already has white background from fillRect above
              // Add error message to the page
              pageCtx.fillStyle = '#ff0000';
              pageCtx.font = '20px Arial';
              pageCtx.textAlign = 'center';
              pageCtx.fillText('เกิดข้อผิดพลาดในการแสดงหน้านี้', pageCanvas.width / 2, pageCanvas.height / 2);
            }

            try {
              console.log(`📸 Converting page ${page + 1} canvas to data URL (${pageCanvas.width}x${pageCanvas.height})...`);
              
              // Test if page canvas is tainted
              try {
                pageCtx.getImageData(0, 0, 1, 1);
                console.log(`✅ Page ${page + 1} canvas is not tainted`);
              } catch (taintError) {
                console.error(`⚠️ Page ${page + 1} canvas may be tainted:`, taintError);
              }
              
              // Try multiple export strategies
              let pageImgData: string;
              let exportFormat = PDF_CONFIG.imageFormat;
              
              try {
                // Try JPEG first
                pageImgData = pageCanvas.toDataURL(PDF_CONFIG.mimeType, PDF_CONFIG.imageQuality);
                console.log(`✅ Page ${page + 1} canvas converted as JPEG (${pageImgData.length} bytes)`);
              } catch (jpegError) {
                console.warn(`⚠️ JPEG export failed for page ${page + 1}, trying PNG:`, jpegError);
                try {
                  // Fallback to PNG
                  pageImgData = pageCanvas.toDataURL('image/png');
                  exportFormat = 'PNG';
                  console.log(`✅ Page ${page + 1} canvas converted as PNG (${pageImgData.length} bytes)`);
                } catch (pngError) {
                  console.error(`❌ Both JPEG and PNG export failed for page ${page + 1}`);
                  throw jpegError; // Throw original error
                }
              }
              
              const pageHeightScaled = sourceHeight * scaleRatio;
              pdf.addImage(pageImgData, exportFormat, 0, 0, scaledWidth, pageHeightScaled, undefined, 'FAST');
              console.log(`✅ Page ${page + 1}/${totalPages} added to PDF successfully`);
            } catch (error) {
              console.error(`❌ Failed to convert page ${page + 1} canvas to data URL:`, error);
              console.error(`❌ Error details:`, {
                message: error.message,
                name: error.name,
                stack: error.stack
              });
              throw new Error(`ไม่สามารถแปลงหน้า ${page + 1} เป็นรูปภาพได้: ${error.message}`);
            }
          }

          if (includeWatermark) addWatermark(pdf, watermarkText, pageWidth, pageHeight);
          if (includePageNumbers) addPageNumbers(pdf, page + 1, totalPages, pageWidth, pageHeight);
        }
      }

      // Save PDF with mobile support
      const pdfBlob = pdf.output('blob');
      const finalFilename = `${filename}.pdf`;
      
      if (isMobileDevice()) {
        console.log('📱 Mobile device detected, using mobile-friendly download');
        downloadFile(pdfBlob, finalFilename, 'application/pdf');
      } else {
        // Desktop - use native jsPDF save
        pdf.save(finalFilename);
      }
      
      console.log(`✅ PDF saved successfully: ${finalFilename}`);
    } finally {
      restore();
    }
  } catch (error: any) {
    console.error(`❌ PDF export failed for ${elementId}:`, error);
    let errorMessage = 'ไม่สามารถส่งออกเอกสารได้';
    
    if (error?.message?.includes('PNG signature') || error?.message?.includes('รูปภาพ')) {
      errorMessage = 'พบปัญหาในการโหลดรูปภาพ กรุณาลองอีกครั้ง';
    } else if (error?.message?.includes('CORS')) {
      errorMessage = 'ไม่สามารถโหลดรูปภาพจากแหล่งภายนอกได้';
    } else if (error?.message?.includes('หมดเวลา') || error?.message?.includes('timeout')) {
      errorMessage = error.message; // Use the detailed timeout message
    } else if (error?.message?.includes('canvas') || error?.message?.includes('Canvas')) {
      errorMessage = `พบปัญหาในการสร้าง PDF: ${error.message}`;
    } else if (error?.message) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Export workflow documents
 */
export const exportWorkflowToPDF = async (
  projectTitle: string,
  documentType: 'all' | 'boq' | 'quotation' | 'invoice' | 'receipt' = 'all',
  onProgress?: (progress: ExportProgress) => void,
  installmentNumber?: number
): Promise<void> => {
  const documents = [
    { id: 'boq-export-section', name: 'BOQ', type: 'boq', title: 'รายการถอดวัสดุ' },
    { id: 'quotation-export-section', name: 'Quotation', type: 'quotation', title: 'ใบเสนอราคา' },
    { id: 'invoice-export-section', name: 'Invoice', type: 'invoice', title: 'ใบวางบิล' },
    { id: 'receipt-export-section', name: 'Receipt', type: 'receipt', title: 'ใบเสร็จรับเงิน' },
  ];

  const docsToExport = documentType === 'all'
    ? documents
    : documents.filter(d => d.type === documentType);

  const total = docsToExport.length;
  let successCount = 0;
  const errors: string[] = [];

  console.log(`📦 Starting workflow PDF export: ${documentType} (${total} documents)`);

  // 🔍 Check BOQ size if exporting BOQ
  if (documentType === 'boq' || documentType === 'all') {
    const boqElement = document.getElementById('boq-export-section');
    if (boqElement) {
      const tableRows = boqElement.querySelectorAll('tbody tr');
      const itemCount = tableRows.length;
      
      if (itemCount > 200) {
        console.warn(`⚠️ BOQ contains ${itemCount} items. Export may take 30-60 seconds.`);
      }
      if (itemCount > 500) {
        console.warn(`🚨 BOQ contains ${itemCount} items. This is a large document - please wait patiently.`);
      }
    }
  }

  // 🔒 Lock scroll during entire export process
  const currentScrollY = window.scrollY;
  const currentScrollX = window.scrollX;
  const originalOverflow = document.body.style.overflow;
  const originalPosition = document.body.style.position;
  
  // Prevent scroll during export
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${currentScrollY}px`;
  document.body.style.left = `-${currentScrollX}px`;
  document.body.style.width = '100%';

  try {
    for (let i = 0; i < docsToExport.length; i++) {
      const doc = docsToExport[i];

    try {
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          documentName: doc.title,
          status: 'preparing',
        });
      }

      console.log(`📄 Processing document ${i + 1}/${total}: ${doc.title}`);
      const element = document.getElementById(doc.id);
      if (!element) {
        const errorMsg = `ไม่พบส่วน ${doc.title} (ID: ${doc.id})`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            documentName: doc.title,
            status: 'error',
          });
        }
        continue;
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          documentName: doc.title,
          status: 'rendering',
        });
      }

      let filename = projectTitle.replace(/[^a-zA-Z0-9ก-๙\s]/g, '_').trim();
      if (!filename) filename = 'เอกสาร';

      if (installmentNumber && doc.type === 'receipt') {
        filename = `${filename}_งวดที่_${installmentNumber}_${doc.name}`;
      } else {
        filename = `${filename}_${doc.name}`;
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          documentName: doc.title,
          status: 'generating',
        });
      }

      await exportToPDF(doc.id, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        quality: 0.95,
        compress: true,
      });
      
      successCount++;
      console.log(`✅ Successfully exported: ${doc.title}`);

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          documentName: doc.title,
          status: 'complete',
        });
      }

      if (i < docsToExport.length - 1) {
        await new Promise(resolve => setTimeout(resolve, PDF_CONFIG.exportDelay));
      }
    } catch (error: any) {
      const errorMsg = `ส่งออก ${doc.title} ล้มเหลว: ${error?.message || 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`, error);
      errors.push(errorMsg);

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          documentName: doc.title,
          status: 'error',
        });
      }
    }
  }

  if (successCount === 0) {
    const errorMessage = `ไม่สามารถส่งออกเอกสารได้\n${errors.join('\n')}`;
    console.error(`❌ Export failed:`, errorMessage);
    throw new Error(errorMessage);
  }

    console.log(`✅ Workflow export complete: ${successCount}/${total} documents exported successfully`);
  } finally {
    // 🔓 Restore scroll and body styles
    document.body.style.overflow = originalOverflow;
    document.body.style.position = originalPosition;
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';
    
    // Restore scroll position
    window.scrollTo(currentScrollX, currentScrollY);
  }
};

/**
 * Export single installment receipt
 */
export const exportInstallmentReceipt = async (
  projectTitle: string,
  installmentNumber: number,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> => {
  const elementId = `receipt-installment-${installmentNumber}-export`;
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`ไม่พบใบเสร็จงวดที่ ${installmentNumber}`);
  }

  if (onProgress) {
    onProgress({
      current: 1,
      total: 1,
      documentName: `ใบเสร็จรับเงิน งวดที่ ${installmentNumber}`,
      status: 'preparing',
    });
  }

  const filename = `${projectTitle.replace(/[^a-zA-Z0-9ก-๙\s]/g, '_')}_ใบเสร็จ_งวดที่_${installmentNumber}`;

  if (onProgress) {
    onProgress({
      current: 1,
      total: 1,
      documentName: `ใบเสร็จรับเงิน งวดที่ ${installmentNumber}`,
      status: 'rendering',
    });
  }

  await exportToPDF(elementId, {
    filename,
    format: 'a4',
    orientation: 'portrait',
    quality: 0.95,
    compress: true,
  });

  if (onProgress) {
    onProgress({
      current: 1,
      total: 1,
      documentName: `ใบเสร็จรับเงิน งวดที่ ${installmentNumber}`,
      status: 'complete',
    });
  }
};
