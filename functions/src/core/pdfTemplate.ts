// functions/src/core/pdfTemplate.ts (LEGACY BLOCKED)
// This file intentionally throws to prevent legacy rendering.

export function renderPdfHtml(): never {
  throw new Error('[PDF_ENGINE_BLOCKED] legacy renderPdfHtml() is disabled. Use renderPdfFromPayload()');
}
