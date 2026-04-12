/**
 * LINE Reply Templates
 * Build structured messages for LINE replies — natural Thai
 */

import { DraftPayload } from '../shared/types';

const formatMoney = (n: number): string => {
    return n.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Build summary text for draft confirmation
 */
export function buildDraftSummary(draft: DraftPayload): string {
    const type = draft.doc_type ?? '—';
    const date = draft.issue_date_raw ?? '—';
    const customer = draft.customer_name ?? '—';

    const lines = [
        `บี๊บ! สรุปร่างเอกสารครับเจ้านาย`,
        ``,
        `${type}  ลูกค้า ${customer}  วันที่ ${date}`,
        ``,
    ];

    draft.items.forEach((it, i) => {
        lines.push(
            `${i + 1}. ${it.description_th}  ${it.qty} ${it.unit} x ${formatMoney(it.unit_price)} = ${formatMoney(it.amount)}`
        );
    });

    lines.push('');

    if (draft.total_mismatch) {
        lines.push(`ยอดรวมไม่ตรง (รวม ${formatMoney(draft.total_hint || 0)} / คำนวณ ${formatMoney(draft.subtotal_candidate || 0)})`);
    } else {
        lines.push(`รวม ${formatMoney(draft.subtotal_candidate || 0)} บาท`);
    }

    if (draft.vat_enabled) {
        lines.push(`VAT ${draft.vat_rate || 7}%`);
    }
    if (draft.wht_enabled) {
        lines.push(`หัก ณ ที่จ่าย ${draft.wht_rate || 3}%`);
    }

    if (draft.warnings.length) {
        lines.push(``, `${draft.warnings.join(', ')}`);
    }

    lines.push(``, `พิมพ์ "ยืนยัน" หรือ "แก้ไข" ได้เลย`);

    return lines.join('\n');
}

/**
 * Build confirmation buttons template
 */
export function buildConfirmButtons(draftId: string): object {
    return {
        type: 'template',
        altText: 'ยืนยัน/ยกเลิก',
        template: {
            type: 'buttons',
            text: 'ติ๊ดๆ เลือกได้เลยเจ้านาย',
            actions: [
                {
                    type: 'postback',
                    label: 'ยืนยันออกเอกสาร',
                    data: `action=CONFIRM&draftId=${draftId}`,
                },
                {
                    type: 'postback',
                    label: 'ยกเลิก',
                    data: `action=CANCEL&draftId=${draftId}`,
                },
            ],
        },
    };
}

/**
 * Build simple text message
 */
export function textMessage(text: string): object {
    return { type: 'text', text };
}

/**
 * Build document created notification
 */
export function buildDocCreatedMessage(docNo: string): object {
    return {
        type: 'text',
        text: `ติ๊ดๆ รับเรื่องแล้วครับเจ้านาย กำลังออกเอกสาร ${docNo}\nรอสักครู่นะ`,
    };
}

/**
 * Build PDF ready notification
 */
export function buildPdfReadyMessage(
    docNo: string,
    downloadUrl: string
): object {
    return {
        type: 'text',
        text: `ตึ๊ง! ออกเอกสารเสร็จแล้วครับเจ้านาย ${docNo}\n\nดาวน์โหลด ${downloadUrl}\n(ลิงก์หมดอายุใน 7 วัน)`,
    };
}

/**
 * Build business setup prompt
 */
export function buildBusinessSetupPrompt(): object {
    return {
        type: 'text',
        text: `โอ๊ะ! ยังไม่มีข้อมูลธุรกิจครับเจ้านาย

พิมพ์ "ตั้งค่าธุรกิจ" เพื่อเริ่มกรอกข้อมูล หรือส่งแบบนี้

ตั้งค่าธุรกิจ
ชื่อ บริษัท ABC จำกัด
ที่อยู่ 123 ถ.สุขุมวิท
โทร 02-123-4567
อีเมล info@abc.co.th
เลขประจำตัวผู้เสียภาษี 0105561234567`,
    };
}

/**
 * Build Due Date Reminder Message
 */
export function buildDueDateReminderHelper(docNo: string, customer: string, date: string, amount: number): object {
    return {
        type: 'flex',
        altText: `เตือนครบกำหนด ${docNo}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: 'ครบกำหนดชำระ', weight: 'bold', color: '#ffffff' },
                    { type: 'text', text: docNo, size: 'xs', color: '#ffffffcc' }
                ],
                backgroundColor: '#ff9800'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: customer, weight: 'bold', size: 'lg' },
                    { type: 'text', text: `ยอด ${amount.toLocaleString()} บาท`, size: 'md', margin: 'sm' },
                    { type: 'text', text: `วันที่ ${date}`, size: 'sm', color: '#aaaaaa' }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'button', style: 'primary', action: { type: 'message', label: 'ดูรายละเอียด', text: `ดูเอกสาร ${docNo}` } }
                ]
            }
        }
    };
}

/**
 * Build Unpaid Follow-up Message
 */
export function buildUnpaidFollowupHelper(docNo: string, customer: string, amount: number): object {
    return {
        type: 'flex',
        altText: `ติดตามยอด ${docNo}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: 'ติดตามยอดค้างชำระ', weight: 'bold', color: '#ffffff' }
                ],
                backgroundColor: '#ef5350'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: `${customer} ยังไม่ชำระ`, weight: 'bold' },
                    { type: 'text', text: `ยอด ${amount.toLocaleString()} บาท`, margin: 'sm' }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    { type: 'button', style: 'secondary', action: { type: 'message', label: 'แจ้งชำระแล้ว', text: `ชำระแล้ว ${docNo}` } },
                    { type: 'button', style: 'link', action: { type: 'message', label: 'ส่งเลขบัญชี', text: `ขอเลขบัญชี` } }
                ]
            }
        }
    };
}
