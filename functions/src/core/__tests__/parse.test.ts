import { describe, expect, it } from '@jest/globals';

import { parseEzDocText } from '../parse';

describe('parseEzDocText', () => {
  it('keeps parsing items after note sections in long structured blocks', () => {
    const parsed = parseEzDocText(`รายละเอียดรายการงาน:
• หมวด E งานระบบไฟฟ้า (Electrical System)
• E.1 เดินท่อร้อยสายไฟแสงสว่าง ขนาดสายเบอร์ 1.5 L/N จำนวน 1 งาน ราคา 17,500 บาท
• E.27 สวิตซ์ดิมเมอร์ ห้องนอน จำนวน 1 งาน ราคา 1,000 บาท
• หมายเหตุงานไฟฟ้า: ใช้ท่อ PVC ขาว, ใช้สวิตช์ปลั๊ก พานาโซนิคสีขาว
• หมวด F งานฝ้า (Ceiling System)
• F.1 งานฝ้าฉาบเรียบห้องนั่งเล่น โครง SCG แผ่นธรรมดาตราช้าง 9 มม. จำนวน 1 งาน ราคา 41,894 บาท
• F.2 งานฝ้าห้องน้ำ โครง SCG แผ่นทนชื้นตราช้าง 9 มม. จำนวน 1 งาน ราคา 8,125 บาท
• หมวด G งานระบบประปา (Plumbing System)
• G.1 เดินท่อ PVC ใหม่ทั้งหมด และท่อ PPE น้ำร้อน จำนวน 1 งาน ราคา 16,250 บาท`);

    expect(parsed.items).toHaveLength(5);
    expect(parsed.items?.[2]?.description_th).toContain('F.1 งานฝ้าฉาบเรียบห้องนั่งเล่น');
    expect(parsed.items?.[4]?.description_th).toContain('G.1 เดินท่อ PVC ใหม่ทั้งหมด');
  });

  it('extracts amount from explicit ราคา cue instead of trailing detail numbers', () => {
    const parsed = parseEzDocText(`F.5 งานทาสีฝ้า TOA สีขาว รหัส A8000 จำนวน 1 งาน ราคา 23,968 บาท (รายละเอียด: พื้นที่รวม 95.87 ตร.ม. ในราคา 250 บาท/ตร.ม. โดยทา 2 ชั้น)`);

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items?.[0]?.unit_price).toBe(23968);
    expect(parsed.items?.[0]?.description_th).toBe('F.5 งานทาสีฝ้า TOA สีขาว รหัส A8000');
  });
});
