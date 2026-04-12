import type { QuickReplyAction } from '../shared/lineQuickReply';

const WEB_URL = (process.env.WEB_URL || 'https://doc.ezboq.com').replace(/\/+$/, '');

type SampleDoc = {
  docTypeLabel: string;
  themeLabel: string;
  emoji: string;
  accent: string;
  gradientEnd: string;
  summary: string;
  feature: string;
  viewPath: string;
  downloadPath: string;
};

const SAMPLE_DOCS: SampleDoc[] = [
  {
    docTypeLabel: 'ใบเสนอราคา',
    themeLabel: 'Executive',
    emoji: '📋',
    accent: '#1D4ED8',
    gradientEnd: '#1E40AF',
    summary: 'โทนสุภาพ ดูน่าเชื่อถือ เหมาะกับการเสนอราคาให้ลูกค้าใหม่',
    feature: 'ครบ flow เสนอราคา → วางบิล → เสร็จ',
    viewPath: '/examples/view/quotation-executive.pdf',
    downloadPath: '/examples/download/quotation-executive.pdf',
  },
  {
    docTypeLabel: 'ใบวางบิล',
    themeLabel: 'Modern',
    emoji: '🧾',
    accent: '#0F766E',
    gradientEnd: '#065F46',
    summary: 'อ่านยอดง่าย เน้นวันครบกำหนดและยอดชำระ เหมาะกับงานขายจริง',
    feature: 'แจ้งยอดชำระ + วันครบกำหนดชัดเจน',
    viewPath: '/examples/view/invoice-modern.pdf',
    downloadPath: '/examples/download/invoice-modern.pdf',
  },
  {
    docTypeLabel: 'ใบเสร็จ',
    themeLabel: 'Minimal',
    emoji: '✅',
    accent: '#374151',
    gradientEnd: '#1F2937',
    summary: 'เรียบ คลีน พิมพ์ออกกระดาษง่าย เหมาะกับเอกสารปิดงาน',
    feature: 'พิมพ์กระดาษ / ส่งลิงก์ลูกค้าได้ทันที',
    viewPath: '/examples/view/receipt-minimal.pdf',
    downloadPath: '/examples/download/receipt-minimal.pdf',
  },
];

const toAbsoluteUrl = (path: string): string => `${WEB_URL}${path}`;

function buildSampleBubble(sample: SampleDoc): Record<string, unknown> {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '18px',
      paddingBottom: '14px',
      background: {
        type: 'linearGradient',
        angle: '135deg',
        startColor: sample.accent,
        endColor: sample.gradientEnd,
      },
      contents: [
        {
          type: 'text',
          text: `${sample.emoji} ${sample.docTypeLabel}`,
          weight: 'bold',
          size: 'xl',
          color: '#FFFFFF',
          wrap: true,
        },
        {
          type: 'text',
          text: `Theme ${sample.themeLabel}`,
          size: 'xs',
          color: '#E5E7EB',
          margin: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: sample.summary,
          size: 'sm',
          color: '#374151',
          wrap: true,
        },
        // Feature tag
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          paddingAll: '8px',
          backgroundColor: '#F9FAFB',
          cornerRadius: '8px',
          contents: [
            { type: 'text', text: '💡', size: 'sm', flex: 0 },
            {
              type: 'text',
              text: sample.feature,
              size: 'xs',
              color: '#6B7280',
              wrap: true,
              flex: 1,
            },
          ],
        },
        {
          type: 'text',
          text: 'ตัวอย่างจริง เปิดดู PDF ได้ทันที',
          size: 'xxs',
          color: '#9CA3AF',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: sample.accent,
          action: {
            type: 'uri',
            label: 'เปิดดู',
            uri: toAbsoluteUrl(sample.viewPath),
          },
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: 'ดาวน์โหลด',
            uri: toAbsoluteUrl(sample.downloadPath),
          },
        },
      ],
    },
  };
}

export function buildDocumentExamplesFlexMessage(): Record<string, unknown> {
  return {
    type: 'flex',
    altText: 'ตัวอย่างเอกสาร EzDOC',
    contents: {
      type: 'carousel',
      contents: SAMPLE_DOCS.map(buildSampleBubble),
    },
  };
}

export function getDocumentExampleMessages(
  _quickReply?: QuickReplyAction[]
): Array<Record<string, unknown>> {
  void _quickReply;
  return [buildDocumentExamplesFlexMessage()];
}
