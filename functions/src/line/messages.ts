/**
 * LINE message builder for document delivery
 * Uses LINE Flex Message format for better UX with tappable buttons
 */

import { buildShortUrl } from '../shared/pdfFlexMessage';

// LINE Flex Message types
type FlexBubble = {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  hero?: FlexImage;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: {
    header?: FlexBlockStyle;
    body?: FlexBlockStyle;
    footer?: FlexBlockStyle;
  };
};

type FlexBlockStyle = {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
};

type FlexBox = {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  flex?: number;
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  cornerRadius?: string;
};

type FlexText = {
  type: 'text';
  text: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
  weight?: 'regular' | 'bold';
  color?: string;
  wrap?: boolean;
  flex?: number;
  margin?: string;
  align?: 'start' | 'center' | 'end';
};

type FlexButton = {
  type: 'button';
  action: {
    type: 'uri' | 'postback' | 'message';
    label: string;
    uri?: string;
    data?: string;
    text?: string;
  };
  style?: 'primary' | 'secondary' | 'link';
  height?: 'sm' | 'md';
  color?: string;
  margin?: string;
};

type FlexSeparator = {
  type: 'separator';
  margin?: string;
  color?: string;
};

type FlexImage = {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
};

type FlexComponent = FlexBox | FlexText | FlexButton | FlexSeparator | FlexImage;

type FlexMessage = {
  type: 'flex';
  altText: string;
  contents: FlexBubble;
};

type TextMessage = { type: 'text'; text: string };

type LineMessage = FlexMessage | TextMessage;

const DOC_TYPE_LABELS: Record<string, { th: string; en: string; emoji: string }> = {
  QUO: { th: 'ใบเสนอราคา', en: 'Quotation', emoji: '📋' },
  BILL: { th: 'ใบวางบิล', en: 'Billing Note', emoji: '📄' },
  RECEIPT: { th: 'ใบเสร็จรับเงิน', en: 'Receipt', emoji: '🧾' },
};

function formatMoney(n: number | undefined, lang: 'th' | 'en') {
  const locale = lang === 'th' ? 'th-TH' : 'en-US';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

export type DocData = {
  docNo?: string;
  docType?: string;
  customerSnapshot?: { displayName?: string } | null;
  money?: { total_amount?: number; net_receive_amount?: number; total?: number } | null;
  pdfUrl?: string;
  pdf_path?: string;
  pdfPath?: string;
  pdf_short_token?: string;
  supersedes_document_id?: string | null;
  origin_document_id?: string | null;
};

export type BusinessData = { language?: string };

/**
 * Build LINE Flex Message with CTA button for PDF download
 * Mobile-optimized, works in LINE in-app browser and desktop
 */
export function buildLineDeliveryMessage(doc: DocData, business: BusinessData, prevDocNo?: string): LineMessage[] {
  const lang = business?.language === 'en' ? 'en' : 'th';

  // LINE FlexText requires non-empty text values
  const safeText = (value: unknown, fallback: string) => {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  };
  const rawDocNo = safeText(doc.docNo, '');
  const docNo = rawDocNo || (lang === 'th' ? 'รอเลขที่' : 'Pending');
  const rawDocType = safeText(doc.docType, lang === 'th' ? 'เอกสาร' : 'Document');
  const normalizedDocType = rawDocType.toUpperCase() === 'QUOTATION'
    ? 'QUO'
    : rawDocType.toUpperCase() === 'BILLING'
      ? 'BILL'
      : rawDocType.toUpperCase() === 'RECEIPT'
        ? 'RECEIPT'
        : rawDocType;
  const docTypeInfo = DOC_TYPE_LABELS[normalizedDocType] || {
    th: rawDocType,
    en: rawDocType,
    emoji: '📄'
  };
  const customerName = safeText(doc.customerSnapshot?.displayName, lang === 'th' ? 'ไม่ระบุ' : 'N/A');
  const total = (doc.money && (doc.money.total_amount ?? doc.money.net_receive_amount ?? doc.money.total)) || 0;
  const shortUrl = doc.pdf_short_token ? buildShortUrl(doc.pdf_short_token) : '';
  const rawUrl = doc.pdfUrl || doc.pdf_path || doc.pdfPath || '';
  const pdfUrl = shortUrl || (rawUrl.startsWith('http') ? rawUrl : '');
  const shareUrl = shortUrl || (rawUrl.includes('/p/') ? rawUrl : '');

  // Fallback to text message if no PDF URL
  if (!pdfUrl) {
    const errorMsg = lang === 'th'
      ? `⚠️ ไม่พบไฟล์ PDF สำหรับเอกสาร ${docNo}`
      : `⚠️ PDF file not found for document ${docNo}`;
    return [{ type: 'text', text: errorMsg }];
  }

  // Build Flex Message bubble
  const isNewVersion = !!prevDocNo;

  const titleText = isNewVersion
    ? (lang === 'th' ? '📄 เอกสารฉบับใหม่' : '📄 New Document Version')
    : (lang === 'th' ? `${docTypeInfo.emoji} เอกสารพร้อมแล้ว` : `${docTypeInfo.emoji} Document Ready`);

  const altText = isNewVersion
    ? (lang === 'th' ? `เอกสารฉบับใหม่ ${docNo}` : `New document ${docNo}`)
    : (lang === 'th' ? `${docTypeInfo.th} ${docNo}` : `${docTypeInfo.en} ${docNo}`);

  const bodyContents: FlexComponent[] = [
    // Document Number
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: lang === 'th' ? 'เลขที่' : 'No.', size: 'sm', color: '#666666', flex: 1 },
        { type: 'text', text: docNo, size: 'sm', weight: 'bold', color: '#111111', flex: 2, align: 'end' },
      ],
      margin: 'md',
    },
    // Document Type
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: lang === 'th' ? 'ประเภท' : 'Type', size: 'sm', color: '#666666', flex: 1 },
        { type: 'text', text: lang === 'th' ? docTypeInfo.th : docTypeInfo.en, size: 'sm', color: '#111111', flex: 2, align: 'end' },
      ],
      margin: 'sm',
    },
    // Customer
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: lang === 'th' ? 'ลูกค้า' : 'Customer', size: 'sm', color: '#666666', flex: 1 },
        { type: 'text', text: customerName, size: 'sm', color: '#111111', flex: 2, align: 'end', wrap: true },
      ],
      margin: 'sm',
    },
  ];

  // Add "Replaces" info if new version
  if (isNewVersion && prevDocNo) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: lang === 'th' ? 'แทนที่' : 'Replaces', size: 'sm', color: '#999999', flex: 1 },
        { type: 'text', text: prevDocNo, size: 'sm', color: '#999999', flex: 2, align: 'end' },
      ],
      margin: 'sm',
    });
  }

  // Separator and Total
  bodyContents.push(
    { type: 'separator', margin: 'lg', color: '#EEEEEE' },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: lang === 'th' ? 'ยอดรวมสุทธิ' : 'Total', size: 'md', weight: 'bold', color: '#111111', flex: 1 },
        { type: 'text', text: `฿${formatMoney(total, lang)}`, size: 'lg', weight: 'bold', color: '#1DB446', flex: 2, align: 'end' },
      ],
      margin: 'lg',
    }
  );

  const flexMessage: FlexMessage = {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: titleText, size: 'lg', weight: 'bold', color: '#FFFFFF' },
        ],
        paddingAll: 'lg',
        backgroundColor: isNewVersion ? '#FF8C00' : '#1DB446',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: 'lg',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: lang === 'th' ? '📄 ดูเอกสาร PDF' : '📄 View PDF Document',
              uri: pdfUrl,
            },
            style: 'primary',
            height: 'md',
            color: '#1DB446',
          },
        ],
        paddingAll: 'lg',
      },
    },
  };

  const messages: LineMessage[] = [flexMessage];
  if (shareUrl) {
    messages.push({
      type: 'text',
      text: `🔗 ลิงก์สั้นสำหรับแชร์: ${shareUrl}`,
    });
  }
  return messages;
}
