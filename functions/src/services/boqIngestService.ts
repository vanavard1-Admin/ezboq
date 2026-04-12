/**
 * BOQ Ingest Service (Lane 1)
 * 
 * Handles Excel (XLSX) upload, parsing, normalization, and validation.
 * Optimized for memory and forgiving Thai interior design BOQ structures.
 */

import * as JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface BoqRow {
  lineNo: number;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  raw?: any;
  roomName?: string; // Enhanced: Room-based grouping logic
}

export interface ValidationIssue {
  row: number;
  sheet: string;
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface BoqIngestResult {
  rows: BoqRow[];
  summary: {
    totalItems: number;
    totalAmount: number;
    sheetName: string;
  };
  validation: ValidationIssue[];
}

/**
 * Normalizes Thai/English column names for BOQ
 */
const COLUMN_MAP: Record<string, keyof BoqRow> = {
  'ลำดับ': 'lineNo',
  'รายการ': 'description',
  'จำนวน': 'qty',
  'หน่วย': 'unit',
  'ราคาต่อหน่วย': 'unitPrice',
  'จำนวนเงิน': 'amount',
  'item': 'description',
  'qty': 'qty',
  'quantity': 'qty',
  'unit': 'unit',
  'price': 'unitPrice',
  'rate': 'unitPrice',
  'amount': 'amount',
  'total': 'amount',
};

/**
 * BOQ Parser Service
 */
export class BoqIngestService {
  /**
   * Parse XLSX buffer into BOQ model
   */
  async parseExcel(buffer: Buffer): Promise<BoqIngestResult> {
    const zip: any = await (JSZip as any).loadAsync(buffer);
    const sharedStrings = await this.loadSharedStrings(zip);
    const sheetData = await this.loadSheet(zip, 'xl/worksheets/sheet1.xml', sharedStrings);

    const validation: ValidationIssue[] = [];
    const rows: BoqRow[] = [];
    
    // 1. Identify Header Row (Forgiving)
    let headerRowIdx = -1;
    let colMapping: Record<number, keyof BoqRow> = {};

    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
      const row = sheetData[i];
      if (!row) continue;
      const mapping: Record<number, keyof BoqRow> = {};
      let matches = 0;

      row.forEach((cell, idx) => {
        if (!cell) return;
        const normalized = String(cell).toLowerCase().trim();
        for (const [key, val] of Object.entries(COLUMN_MAP)) {
          if (normalized.includes(key.toLowerCase())) {
            mapping[idx] = val;
            matches++;
            break;
          }
        }
      });

      if (matches >= 3) { // Found it
        headerRowIdx = i;
        colMapping = mapping;
        break;
      }
    }

    if (headerRowIdx === -1) {
      validation.push({
        row: 1,
        sheet: 'Sheet1',
        code: 'MISSING_HEADERS',
        message: 'ไม่พบหัวข้อคอลัมน์ที่ต้องการ (รายการ, จำนวน, หน่วย, ราคาต่อหน่วย)',
        severity: 'error',
      });
      return { rows: [], summary: { totalItems: 0, totalAmount: 0, sheetName: 'Sheet1' }, validation };
    }

    // 2. Process Rows
    let totalAmount = 0;
    let currentRoom = 'General'; // Enhanced: Track room context

    for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
      const rawRow = sheetData[i];
      if (!rawRow || rawRow.every(c => !c)) continue; // Skip empty rows

      // Check if this row is a "Room Header" (bold or special keyword)
      const firstCell = String(rawRow[0] || '').trim();
      if (firstCell && firstCell.toLowerCase().includes('ห้อง')) {
        currentRoom = firstCell;
        continue;
      }

      const row: Partial<BoqRow> = { lineNo: rows.length + 1, roomName: currentRoom };
      let hasData = false;

      Object.entries(colMapping).forEach(([colIdx, field]) => {
        const val = rawRow[Number(colIdx)];
        if (val !== undefined && val !== null) {
          hasData = true;
          if (field === 'qty' || field === 'unitPrice' || field === 'amount') {
            const num = parseFloat(String(val).replace(/,/g, ''));
            (row as any)[field] = isNaN(num) ? 0 : num;
          } else {
            (row as any)[field] = String(val).trim();
          }
        }
      });

      if (hasData && row.description) {
        // Auto-calculate amount if missing
        if (!row.amount && row.qty && row.unitPrice) {
          row.amount = row.qty * row.unitPrice;
        }

        const finalRow = row as BoqRow;
        rows.push(finalRow);
        totalAmount += finalRow.amount || 0;

        // Row-level warnings
        if (!finalRow.qty || finalRow.qty === 0) {
          validation.push({ row: i + 1, sheet: 'Sheet1', field: 'qty', code: 'ZERO_QTY', message: 'จำนวนเป็น 0', severity: 'warning' });
        }
        if (!finalRow.unitPrice || finalRow.unitPrice === 0) {
          validation.push({ row: i + 1, sheet: 'Sheet1', field: 'unitPrice', code: 'ZERO_PRICE', message: 'ราคาต่อหน่วยเป็น 0', severity: 'warning' });
        }
      }
    }

    return {
      rows,
      summary: {
        totalItems: rows.length,
        totalAmount,
        sheetName: 'Sheet1',
      },
      validation,
    };
  }

  private async loadSharedStrings(zip: any): Promise<string[]> {
    const file = zip.file('xl/sharedStrings.xml');
    if (!file) return [];
    const xml = await file.async('string');
    const parser = new XMLParser();
    const result = parser.parse(xml);
    const sst = result.sst;
    if (!sst || !sst.si) return [];
    const items = Array.isArray(sst.si) ? sst.si : [sst.si];
    return items.map((it: any) => it.t || (it.r && it.r[0]?.t) || '');
  }

  private async loadSheet(zip: any, path: string, sharedStrings: string[]): Promise<any[][]> {
    const file = zip.file(path);
    if (!file) return [];
    const xml = await file.async('string');
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml);
    const sheet = result.worksheet;
    if (!sheet || !sheet.sheetData || !sheet.sheetData.row) return [];

    const rows = Array.isArray(sheet.sheetData.row) ? sheet.sheetData.row : [sheet.sheetData.row];
    const data: any[][] = [];

    rows.forEach((r: any) => {
      const rowIdx = parseInt(r['@_r']) - 1;
      data[rowIdx] = [];
      const cells = Array.isArray(r.c) ? r.c : [r.c];
      cells.forEach((c: any) => {
        const ref = c['@_r'];
        const colIdx = this.colRefToIndex(ref);
        const type = c['@_t'];
        let val = c.v;

        if (type === 's') { // Shared string
          val = sharedStrings[parseInt(val)];
        }
        data[rowIdx][colIdx] = val;
      });
    });

    return data;
  }

  private colRefToIndex(ref: string): number {
    const match = ref.match(/[A-Z]+/);
    if (!match) return 0;
    const colStr = match[0];
    let idx = 0;
    for (let i = 0; i < colStr.length; i++) {
      idx = idx * 26 + (colStr.charCodeAt(i) - 64);
    }
    return idx - 1;
  }
}
