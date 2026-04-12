/**
 * EzDoc - LINE Service
 * 
 * Helper functions for LINE messaging.
 */

import { getLineChannelAccessToken } from '../shared/config';

const LINE_API_PUSH = 'https://api.line.me/v2/bot/message/push';

/**
 * Push a text message to LINE user
 */
export async function pushLineMessage(
  lineUserId: string,
  text: string,
  accessToken?: string,
  quickReplyActions?: Array<{
    type: 'action';
    action: {
      type: 'message';
      label: string;
      text: string;
    };
  }>
): Promise<void> {
  const token = accessToken || getLineChannelAccessToken();
  
  if (!token) {
    console.error('[lineService] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  const message: any = {
    type: 'text',
    text,
  };

  if (quickReplyActions && quickReplyActions.length > 0) {
    message.quickReply = {
      items: quickReplyActions.slice(0, 13), // LINE limit
    };
  }

  const response = await fetch(LINE_API_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [message],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }
}

/**
 * Push arbitrary LINE messages (flex/text) in one request
 */
export async function pushLineMessages(
  lineUserId: string,
  messages: Array<Record<string, unknown>>,
  accessToken?: string
): Promise<void> {
  const token = accessToken || getLineChannelAccessToken();
  if (!token) {
    console.error('[lineService] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  const response = await fetch(LINE_API_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }
}

/**
 * Push credit purchase flex message with QR
 */
export async function pushLineFlexPurchase(
  lineUserId: string,
  params: {
    purchaseId: string;
    amount: number;
    qrDataUrl: string;
    expiryMinutes: number;
  }
): Promise<void> {
  const token = getLineChannelAccessToken();
  
  if (!token) {
    console.error('[lineService] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  const { amount, qrDataUrl, expiryMinutes } = params;

  const flexMessage = {
    type: 'flex',
    altText: `💳 QR ชำระเงิน ${amount} บาท`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '💳 ชำระเงินผ่าน PromptPay',
            weight: 'bold',
            size: 'lg',
            color: '#1DB446',
          },
        ],
        backgroundColor: '#F7F7F7',
        paddingAll: '15px',
      },
      hero: {
        type: 'image',
        url: qrDataUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'fit',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `ยอดชำระ: ${amount} บาท`,
            weight: 'bold',
            size: 'xl',
            align: 'center',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: `⏰ QR หมดอายุใน ${expiryMinutes} นาที`,
            size: 'sm',
            color: '#999999',
            align: 'center',
            margin: 'lg',
          },
          {
            type: 'text',
            text: 'โอนแล้วพิมพ์',
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'md',
          },
          {
            type: 'text',
            text: '"ยืนยันการชำระเงิน"',
            weight: 'bold',
            size: 'md',
            color: '#1DB446',
            align: 'center',
          },
        ],
        paddingAll: '15px',
      },
    },
  };

  const response = await fetch(LINE_API_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [flexMessage],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }
}

/**
 * Push admin slip review flex message
 */
export async function pushLineFlexAdminSlipReview(
  lineUserId: string,
  params: {
    purchaseId: string;
    amount: number;
    packageLabel: string;
    refId: string;
    slipImageUrl: string;
    createdAt: string;
    userId: string;
    lineUserId: string;
  }
): Promise<void> {
  const token = getLineChannelAccessToken();

  if (!token) {
    console.error('[lineService] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  const flexMessage = {
    type: 'flex',
    altText: `สลิปใหม่ ${params.purchaseId}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Slip Review',
            weight: 'bold',
            size: 'lg',
            color: '#111827',
          },
          {
            type: 'text',
            text: `ID: ${params.purchaseId}`,
            size: 'xs',
            color: '#6b7280',
            margin: 'sm',
          },
        ],
        backgroundColor: '#f3f4f6',
        paddingAll: '12px',
      },
      hero: {
        type: 'image',
        url: params.slipImageUrl,
        size: 'full',
        aspectRatio: '4:5',
        aspectMode: 'fit',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${params.packageLabel} • ${params.amount} บาท`,
            weight: 'bold',
            size: 'md',
            color: '#111827',
          },
          {
            type: 'text',
            text: `Ref: ${params.refId}`,
            size: 'xs',
            color: '#6b7280',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `เวลา: ${params.createdAt}`,
            size: 'xs',
            color: '#6b7280',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `UID: ${params.userId}`,
            size: 'xs',
            color: '#6b7280',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `LINE: ${params.lineUserId}`,
            size: 'xs',
            color: '#6b7280',
            margin: 'sm',
          },
        ],
        paddingAll: '12px',
        spacing: 'sm',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#16a34a',
            action: {
              type: 'message',
              label: 'อนุมัติ',
              text: `admin ยืนยัน ${params.purchaseId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'message',
              label: 'ดูรายละเอียด',
              text: `admin ดู ${params.purchaseId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'message',
              label: 'ปฏิเสธ',
              text: `admin ปฏิเสธ ${params.purchaseId} สลิปไม่ชัด`,
            },
          },
        ],
        paddingAll: '12px',
        spacing: 'sm',
      },
    },
  };

  const response = await fetch(LINE_API_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [flexMessage],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE API error ${response.status}: ${errorText}`);
  }
}
