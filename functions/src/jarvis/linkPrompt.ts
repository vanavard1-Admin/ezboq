import type { JarvisResponse } from './types';

export const JARVIS_LINK_REQUIRED_TEXT =
  'บี๊บ! ยังไม่ได้เชื่อมต่อบัญชีครับเจ้านาย\n\n' +
  'พิมพ์ "เชื่อมต่อ" เพื่อให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลงานของคุณไว้';

export function buildJarvisLinkRequiredResponse(): JarvisResponse {
  return {
    type: 'text',
    text: JARVIS_LINK_REQUIRED_TEXT,
    quickReplies: ['เชื่อมต่อ', 'ตัวอย่างเอกสาร', 'ตั้งค่าธุรกิจแบบฟอร์ม'],
  };
}
