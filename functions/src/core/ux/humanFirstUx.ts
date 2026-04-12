import type { UxVariant, DocType } from './interface';
import type { LineDraft } from '../draftStore';
import type { QuickReplyAction } from '../../shared/lineQuickReply';
import { getHumanFirstButtons } from '../humanFirstStateMachine';

export const humanFirstUx: UxVariant = {
    getCreateAcknowledgmentMessage(docType: DocType): string {
        switch (docType) {
            case 'QUO':
                return `บี๊บ! เริ่มทำใบเสนอราคาให้แล้วครับ เจ้านาย`;
            case 'BILL':
                return `บี๊บ! เริ่มทำใบวางบิลให้แล้วครับ เจ้านาย`;
            case 'RECEIPT':
                return `บี๊บ! เริ่มทำใบเสร็จให้แล้วครับ เจ้านาย`;
        }
    },

    getNoDraftMessage(): string {
        return `ตอนนี้ยังไม่มีเอกสารในมือครับเจ้านาย

พิมพ์ "ทำใบเสนอราคา" หรือ "ทำใบวางบิล" ได้เลย`;
    },

    getConfirmWithoutDraftMessage(): string {
        return `ยังไม่มีเอกสารให้ยืนยันครับเจ้านาย

พิมพ์ "ทำใบเสนอราคา" เพื่อเริ่มใหม่ได้เลย`;
    },

    getCustomerSetMessage(customerName: string): string {
        return `ติ๊ดๆ บันทึกลูกค้าแล้วครับ ${customerName}

ส่งรายการได้เลยเจ้านาย เช่น
ค่าแรง 3000
ค่าขนส่ง 300`;
    },

    getItemAddedMessage(itemName: string, price: number, qty: number = 1): string {
        const total = price * qty;
        const qtyText = qty > 1 ? ` x${qty}` : '';
        return `ติ๊ดๆ เพิ่มรายการแล้วครับ
${itemName}${qtyText}  ${total.toLocaleString('th-TH')} บาท

ส่งรายการต่อได้เจ้านาย หรือพิมพ์ "ออกเอกสาร"`;
    },

    getPriceSetMessage(itemName: string, price: number): string {
        return `ติ๊ดๆ ตั้งราคาให้แล้วครับ
${itemName}  ${price.toLocaleString('th-TH')} บาท

ถ้ามีรายการอื่น พิมพ์ต่อได้เลยเจ้านาย`;
    },

    getMissingInfoMessage(draft: LineDraft, missing: Array<'customer' | 'items'>): string {
        const missingText = missing.map(m => m === 'customer' ? 'ชื่อลูกค้า' : 'รายการ').join(' และ ');

        const customerLine = draft.customerName
            ? `ลูกค้า ${draft.customerName}`
            : 'ยังไม่ได้ระบุลูกค้า';

        const itemsText = draft.items && draft.items.length > 0
            ? draft.items.slice(-5).map((item, idx) =>
                `${idx + 1}. ${item.name} ${item.qty > 1 ? `x${item.qty}` : ''} ${(item.price * item.qty).toLocaleString('th-TH')} บาท`
            ).join('\n')
            : 'ยังไม่มีรายการ';

        const totalText = `รวม ${(draft.total || 0).toLocaleString('th-TH')} บาท`;

        return `ยังออกเอกสารไม่ได้ครับเจ้านาย ขาด${missingText}

${customerLine}
${itemsText}
${totalText}

ส่งข้อมูลที่ขาดมาได้เลย`;
    },

    getReadyToConfirmMessage(docType: DocType): string {
        const names: Record<DocType, string> = {
            QUO: 'ใบเสนอราคา',
            BILL: 'ใบวางบิล',
            RECEIPT: 'ใบเสร็จ',
        };
        const name = names[docType] || 'เอกสาร';
        return `พร้อมออก${name}แล้วครับเจ้านาย

พิมพ์ "ออกเอกสาร" ได้เลย
หรือจะแก้ก็พิมพ์ "ลบรายการ"`;
    },

    getAmbiguousMessage(draft: LineDraft): string {
        const customerLine = draft.customerName
            ? `ลูกค้า ${draft.customerName}`
            : 'ยังไม่ได้ระบุลูกค้า';

        const itemsText = draft.items && draft.items.length > 0
            ? draft.items.slice(-5).map((item, idx) =>
                `${idx + 1}. ${item.name} ${item.qty > 1 ? `x${item.qty}` : ''} ${(item.price * item.qty).toLocaleString('th-TH')} บาท`
            ).join('\n')
            : 'ยังไม่มีรายการ';

        const totalText = `รวม ${(draft.total || 0).toLocaleString('th-TH')} บาท`;

        return `ติ๊ดๆ ด๊อกๆ จับไม่ชัดว่าอยาก "ตั้งลูกค้า" หรือ "เพิ่มรายการ" นะเจ้านาย

ตอนนี้เอกสารเป็นแบบนี้ 👇
${customerLine}
${itemsText}
${totalText}

ลองพิมพ์แบบนี้ดูนะ
ลูกค้า บริษัท ABC
หรือ ค่าขนส่ง 3000`;
    },

    getResetMessage(): string {
        return `รีเซ็ตให้แล้วครับเจ้านาย เอกสารก่อนหน้าถูกยกเลิกแล้ว

พิมพ์ "ทำใบเสนอราคา" เพื่อเริ่มใหม่ได้เลย`;
    },

    getUndoMessage(hasItem: boolean): string {
        if (hasItem) {
            return `ลบรายการล่าสุดให้แล้วครับเจ้านาย

ถ้ายังไม่ใช่ พิมพ์ "ลบรายการ" ซ้ำได้`;
        } else {
            return `ตอนนี้ยังไม่มีรายการให้ลบครับเจ้านาย`;
        }
    },

    getPhoneTransparencyMessage(phone: string): string {
        return `รับเบอร์แล้วครับเจ้านาย ${phone}
ยังไม่บันทึกลงเอกสาร (ใช้ช่วยตรวจสอบเฉยๆ)`;
    },

    shouldShowSummary(): boolean {
        return true;
    },

    getButtons(state: any): QuickReplyAction[] {
        return getHumanFirstButtons(state);
    }
};
