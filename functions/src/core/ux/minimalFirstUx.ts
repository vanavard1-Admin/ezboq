import type { UxVariant, DocType } from './interface';
import type { LineDraft } from '../draftStore';
import type { QuickReplyAction } from '../../shared/lineQuickReply';
// We might need a separate state machine or just simplified button logic


function getMinimalButtons(state: any): QuickReplyAction[] {
    // Simplified buttons for minimal UX
    // Just return essential actions based on state
    // state is currently HumanFirstState (from determineHumanFirstState)
    // We can map it loosely or implementation specific

    // For minimal, we might just return "Menu" or nothing if text is sufficient
    // But helpful shortcuts are good.
    // Let's rely on standard actions but fewer of them.
    const actions: QuickReplyAction[] = [];

    // If ready to confirm
    if (state.canConfirm) {
        actions.push({
            type: 'action',
            action: { type: 'message', label: 'ออกเอกสาร', text: 'ออกเอกสาร' }
        });
    } else {
        // If missing customer
        if (!state.hasCustomer) {
            // Maybe no button? Or just "Help"?
        }
    }
    actions.push({
        type: 'action',
        action: { type: 'message', label: 'เมนู', text: 'เมนู' }
    });

    return actions;
}

export const minimalFirstUx: UxVariant = {
    getCreateAcknowledgmentMessage(docType: DocType): string {
        switch (docType) {
            case 'QUO':
                return `เริ่มทำใบเสนอราคา`;
            case 'BILL':
                return `เริ่มทำใบวางบิล`;
            case 'RECEIPT':
                return `เริ่มทำใบเสร็จ`;
        }
    },

    getNoDraftMessage(): string {
        return `ยังไม่มีเอกสาร

พิมพ์คำสั่ง:
- ทำใบเสนอราคา
- ทำใบวางบิล`;
    },

    getConfirmWithoutDraftMessage(): string {
        return `ไม่มีเอกสารให้ยืนยัน
พิมพ์ “ทำใบเสนอราคา” เพื่อเริ่ม`;
    },

    getCustomerSetMessage(customerName: string): string {
        return `บันทึกลูกค้าแล้ว: ${customerName}
ถัดไป: พิมพ์รายการ (เช่น "ค่าแรง 3000")`;
    },

    getItemAddedMessage(itemName: string, price: number, qty: number = 1): string {
        const total = price * qty;
        return `บันทึกรายการ: ${itemName} (${total.toLocaleString('th-TH')} บ.)
ถัดไป: พิมพ์รายการเพิ่ม หรือ “ออกเอกสาร”`;
    },

    getPriceSetMessage(itemName: string, price: number): string {
        return `บันทึกราคา: ${itemName} (${price.toLocaleString('th-TH')} บ.)
ถัดไป: พิมพ์รายการเพิ่ม หรือ “ออกเอกสาร”`;
    },

    getMissingInfoMessage(draft: LineDraft, missing: Array<'customer' | 'items'>): string {
        const missingText = missing.map(m => m === 'customer' ? 'ชื่อลูกค้า' : 'รายการ').join(' และ ');
        return `ข้อมูลไม่ครบ ขาด: ${missingText}
กรุณาพิมพ์ส่งมาได้เลย`;
    },

    getReadyToConfirmMessage(): string {
        return `ข้อมูลครบแล้ว
พิมพ์ “ออกเอกสาร” เพื่อยืนยัน`;
    },

    getAmbiguousMessage(): string {
        return `ขออภัย ไม่เข้าใจคำสั่ง
ลองพิมพ์: “ลูกค้า ABC” หรือ “ค่าขนส่ง 300”`;
    },

    getResetMessage(): string {
        return `รีเซ็ตแล้ว
เริ่มเอกสารใหม่ได้เลย`;
    },

    getUndoMessage(hasItem: boolean): string {
        return hasItem ? `ลบรายการล่าสุดแล้ว` : `ไม่มีรายการให้ลบ`;
    },

    getPhoneTransparencyMessage(phone: string): string {
        return `เบอร์โทร: ${phone}`;
    },

    shouldShowSummary(): boolean {
        // Minimal UX shows summary only when necessary (e.g. ready to confirm)
        // Or maybe never automatically?
        // Let's say false, unless standard logic overrides?
        // Implementation in handler will decide.
        return false;
    },

    getButtons(state: any): QuickReplyAction[] {
        return getMinimalButtons(state);
    }
};
