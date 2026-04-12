import type { LineDraft } from '../draftStore';
import type { QuickReplyAction } from '../../shared/lineQuickReply';

export type DocType = 'QUO' | 'BILL' | 'RECEIPT';

export interface UxVariant {
    getCreateAcknowledgmentMessage(docType: DocType): string;
    getNoDraftMessage(): string;
    getConfirmWithoutDraftMessage(): string;
    getCustomerSetMessage(customerName: string): string;
    getItemAddedMessage(itemName: string, price: number, qty: number): string;
    getPriceSetMessage(itemName: string, price: number): string;
    getMissingInfoMessage(draft: LineDraft, missing: Array<'customer' | 'items'>): string;
    getReadyToConfirmMessage(docType: DocType): string;
    getAmbiguousMessage(draft: LineDraft): string;
    getResetMessage(): string;
    getUndoMessage(hasItem: boolean): string;
    getPhoneTransparencyMessage(phone: string): string;
    // Helper to determine if we should show buttons/quick replies
    shouldShowSummary(draft: LineDraft): boolean;
    getButtons(state: any): QuickReplyAction[]; // state type to be defined or inferred
}
