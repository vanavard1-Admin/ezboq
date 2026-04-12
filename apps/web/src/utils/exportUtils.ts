interface DocumentWithAdoptedStyleSheets extends Document {
  adoptedStyleSheets: CSSStyleSheet[];
}

export interface ExportDocumentTarget {
  elementId: string;
  label: string;
  filename: string;
}

interface ExportPdfOptions {
  download?: boolean;
}

type Html2CanvasModule = typeof import('html2canvas');
type JsPdfModule = typeof import('jspdf');

let pdfDepsPromise: Promise<{
  html2canvas: Html2CanvasModule['default'];
  jsPDF: JsPdfModule['default'];
}> | null = null;
let zipCtorPromise: Promise<unknown> | null = null;

async function loadPdfDeps() {
  if (!pdfDepsPromise) {
    pdfDepsPromise = Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]).then(([html2canvasModule, jsPdfModule]) => ({
      html2canvas: html2canvasModule.default,
      jsPDF: jsPdfModule.default,
    }));
  }

  return pdfDepsPromise;
}

async function loadZipCtor() {
  if (!zipCtorPromise) {
    zipCtorPromise = import('jszip');
  }

  const loaded = await zipCtorPromise;
  const module = loaded as { default?: typeof import('jszip') } | typeof import('jszip');

  if (module && typeof module === 'object' && 'default' in module && module.default) {
    return module.default;
  }

  return module as typeof import('jszip');
}

function sanitizeFilename(value: string) {
  return value
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code <= 31 || '<>:"/\\|?*'.includes(char)) {
        return '_';
      }
      return char;
    })
    .join('')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'document';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function waitForFontsReady() {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document.fonts as FontFaceSet).ready;
    } catch {
      // ignore font readiness failures and continue with current render state
    }
  }
}

async function waitForElementAssets(element: HTMLElement) {
  await waitForFontsReady();
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(async (img) => {
    if (img.complete && img.naturalWidth > 0) return;
    try {
      if (typeof img.decode === 'function') {
        await img.decode();
        return;
      }
    } catch {
      // fall through to load/error listeners
    }
    await new Promise<void>((resolve) => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }));
}

async function withHiddenPrintButtons<T>(element: HTMLElement, work: () => Promise<T>): Promise<T> {
  const printButtons = Array.from(element.querySelectorAll('.print\\:hidden')) as HTMLElement[];
  printButtons.forEach((btn) => {
    btn.style.display = 'none';
  });

  try {
    return await work();
  } finally {
    printButtons.forEach((btn) => {
      btn.style.display = '';
    });
  }
}

export async function exportDocumentAsPDF(
  elementId: string,
  filename: string,
  onProgress?: (progress: number) => void,
  options?: ExportPdfOptions,
): Promise<Blob> {
  const { html2canvas, jsPDF } = await loadPdfDeps();
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  onProgress?.(20);
  await waitForElementAssets(element);

  const canvas = await withHiddenPrintButtons(element, () =>
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: Math.max(element.scrollWidth, element.clientWidth),
      windowHeight: Math.max(element.scrollHeight, element.clientHeight),
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        fixOklchColors(element, clonedDoc, clonedEl);
      },
    }),
  );

  onProgress?.(60);

  // Calculate PDF dimensions
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Split into multiple A4 pages if content is taller than one page
  const totalPages = Math.ceil(imgHeight / pageHeight);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const sourceY = (page * pageHeight / imgHeight) * canvas.height;
    const sourceHeight = (pageHeight / imgHeight) * canvas.height;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) continue;

    ctx.drawImage(
      canvas,
      0, sourceY, canvas.width, pageCanvas.height,
      0, 0, pageCanvas.width, pageCanvas.height,
    );

    const pageImgData = pageCanvas.toDataURL('image/png');
    const sliceHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;
    pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, sliceHeight);
  }

  onProgress?.(100);

  const blob = pdf.output('blob');
  if (options?.download) {
    downloadBlob(blob, sanitizeFilename(filename));
  }
  return blob;
}

// Wait until element exists in DOM
async function waitForElement(id: string, maxWait = 5000): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const el = document.getElementById(id);
    if (el && el.offsetHeight > 0) return el;
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}

// Fix oklch colors for html2canvas (Tailwind CSS v4 uses oklch which html2canvas can't parse)
// Nuclear approach: remove ALL stylesheets, inline ALL computed styles

const INLINE_PROPS = [
  'color', 'background-color', 'background-image', 'background',
  'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-style', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'outline-color', 'box-shadow', 'text-shadow', 'text-decoration-color', 'text-decoration',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-indent', 'white-space', 'word-break', 'word-spacing',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
  'display', 'position', 'top', 'right', 'bottom', 'left',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'justify-content', 'align-items', 'align-self', 'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'overflow', 'overflow-x', 'overflow-y', 'opacity', 'visibility', 'z-index',
  'vertical-align', 'table-layout', 'border-collapse', 'border-spacing',
  'list-style-type', 'list-style-position',
  'transform', 'transform-origin',
  'object-fit', 'object-position',
];

function fixOklchColors(originalRoot: HTMLElement, clonedDoc: Document, clonedRoot: HTMLElement) {
  // Step 1: Inline all computed styles from the REAL DOM onto cloned elements
  const originals = [originalRoot, ...Array.from(originalRoot.querySelectorAll('*'))];
  const clones = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll('*'))];

  for (let i = 0; i < originals.length && i < clones.length; i++) {
    const computed = getComputedStyle(originals[i]);
    const clonedEl = clones[i] as HTMLElement;
    for (const prop of INLINE_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== '' && val !== 'normal' && val !== 'auto' && val !== 'none' && val !== '0px') {
        clonedEl.style.setProperty(prop, val);
      }
    }
    // Always set these even if "none"
    const bg = computed.getPropertyValue('background-color');
    if (bg) clonedEl.style.setProperty('background-color', bg);
    const col = computed.getPropertyValue('color');
    if (col) clonedEl.style.setProperty('color', col);
  }

  // Step 2: Remove ALL <style> and <link> stylesheet elements
  clonedDoc.querySelectorAll('style').forEach(el => el.remove());
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());

  // Step 3: Clear adoptedStyleSheets (Vite injects styles via this API)
  try {
    if ('adoptedStyleSheets' in clonedDoc) {
      (clonedDoc as DocumentWithAdoptedStyleSheets).adoptedStyleSheets = [];
    }
  } catch { /* some browsers don't allow setting */ }

  // Step 4: Disable any remaining styleSheets in the collection
  try {
    for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
      try { clonedDoc.styleSheets[i].disabled = true; } catch { /* cross-origin */ }
    }
  } catch { /* ignore */ }

  // Step 5: Remove CSS custom properties from :root / html (Tailwind stores oklch in variables)
  const htmlEl = clonedDoc.documentElement;
  if (htmlEl) {
    htmlEl.style.cssText = 'color-scheme: light;';
  }
  const bodyEl = clonedDoc.body;
  if (bodyEl) {
    const bodyComputed = getComputedStyle(document.body);
    bodyEl.style.setProperty('background-color', bodyComputed.getPropertyValue('background-color'));
    bodyEl.style.setProperty('color', bodyComputed.getPropertyValue('color'));
    bodyEl.style.setProperty('font-family', bodyComputed.getPropertyValue('font-family'));
    bodyEl.style.setProperty('font-size', bodyComputed.getPropertyValue('font-size'));
  }

  // Step 6: Scan all elements for oklch in inline styles (safety net)
  clonedDoc.querySelectorAll('*').forEach(el => {
    const htmlElement = el as HTMLElement;
    const styleAttr = htmlElement.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      htmlElement.setAttribute('style', styleAttr.replace(/oklch\([^)]*\)/g, 'rgb(0, 0, 0)'));
    }
  });
}

export async function exportMultipleElementsAsSinglePDF(
  elementIds: string[],
  filename: string,
  onProgress?: (message: string, progress: number) => void
): Promise<void> {
  const { html2canvas, jsPDF } = await loadPdfDeps();
  const docNames = ['ใบเสนอราคา', 'ใบวางบิล', 'แผนการทำงาน', 'สัญญาว่าจ้าง'];

  // Wait for all elements to be ready
  onProgress?.('กำลังเตรียมเอกสาร...', 5);
  const elements: HTMLElement[] = [];
  for (let i = 0; i < elementIds.length; i++) {
    const el = await waitForElement(elementIds[i]);
    if (!el) {
      throw new Error(`ไม่พบเอกสาร: ${docNames[i] || elementIds[i]}`);
    }
    elements.push(el);
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  let isFirstPage = true;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const progressBase = 10 + (i / elements.length) * 80;
    const progressStep = 80 / elements.length;
    onProgress?.(`กำลังสร้าง${docNames[i]}...`, progressBase);
    await waitForElementAssets(element);

    const canvas = await withHiddenPrintButtons(element, () =>
      html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: Math.max(element.scrollWidth, element.clientWidth),
        windowHeight: Math.max(element.scrollHeight, element.clientHeight),
        onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
          fixOklchColors(element, clonedDoc, clonedEl);
        },
      }),
    );

    onProgress?.(`กำลังสร้าง${docNames[i]}...`, progressBase + progressStep * 0.5);

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const totalPages = Math.ceil(imgHeight / pageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      const sourceY = (page * pageHeight / imgHeight) * canvas.height;
      const sourceHeight = (pageHeight / imgHeight) * canvas.height;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(sourceHeight, canvas.height - sourceY);
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(
        canvas,
        0, sourceY, canvas.width, pageCanvas.height,
        0, 0, pageCanvas.width, pageCanvas.height,
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const sliceHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;
      pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, sliceHeight);
    }

    onProgress?.(`สร้าง${docNames[i]}เสร็จแล้ว`, progressBase + progressStep);
  }

  onProgress?.('กำลังบันทึกไฟล์...', 95);

  const pdfBlob = pdf.output('blob');
  downloadBlob(pdfBlob, sanitizeFilename(filename));

  onProgress?.('เสร็จสิ้น!', 100);
}

export async function sharePdfFile(
  blob: Blob,
  filename: string,
  shareText?: string,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  const file = new File([blob], sanitizeFilename(filename), { type: 'application/pdf' });
  const sharePayload: ShareData = {
    files: [file],
    title: filename,
    text: shareText,
  };

  if (typeof navigator.canShare === 'function' && !navigator.canShare(sharePayload)) {
    return false;
  }

  if (typeof navigator.share !== 'function') {
    return false;
  }

  await navigator.share(sharePayload);
  return true;
}

export async function exportAllDocumentsAsZip(
  projectName: string,
  documents: ExportDocumentTarget[],
  onProgress?: (message: string, progress: number) => void
): Promise<void> {
  const JSZip = await loadZipCtor();
  const zip = new JSZip();

  for (let index = 0; index < documents.length; index += 1) {
    const doc = documents[index];
    const baseProgress = (index / Math.max(documents.length, 1)) * 95;
    const progressSpan = 95 / Math.max(documents.length, 1);
    onProgress?.(`กำลังสร้าง${doc.label}...`, baseProgress);

    const blob = await exportDocumentAsPDF(
      doc.elementId,
      doc.filename,
      (progress) => onProgress?.(`กำลังสร้าง${doc.label}...`, baseProgress + (progress / 100) * progressSpan),
      { download: false },
    );

    zip.file(`${sanitizeFilename(projectName)}_${sanitizeFilename(doc.filename)}`, blob);
  }

  // Generate ZIP
  onProgress?.('กำลังสร้างไฟล์ ZIP...', 99);
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Download ZIP
  const sanitizedProjectName = sanitizeFilename(projectName);
  downloadBlob(zipBlob, `${sanitizedProjectName}_เอกสารทั้งหมด.zip`);

  onProgress?.('เสร็จสิ้น!', 100);
}
