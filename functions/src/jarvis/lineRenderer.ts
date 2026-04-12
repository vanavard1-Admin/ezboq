/**
 * Jarvis LINE Renderer — แปลง JarvisResponse เป็น LINE messages
 */
import type { JarvisResponse } from "./types";

export interface LineMessage {
  type: string;
  text?: string;
  altText?: string;
  contents?: unknown;
  quickReply?: { items: QuickReplyItem[] };
  [key: string]: unknown;  // index signature for LINE SDK compatibility
}

interface QuickReplyItem {
  type: "action";
  action: {
    type: "message";
    label: string;
    text: string;
  };
}

/**
 * แปลง JarvisResponse → LINE Message(s) พร้อมส่ง
 */
export function renderToLine(response: JarvisResponse): LineMessage[] {
  switch (response.type) {
    case "text":
      return [renderTextResponse(response)];

    case "products":
      return [renderProductsResponse(response)];

    case "ride":
      return [renderRideResponse(response)];

    case "confirm":
      return [renderConfirmResponse(response)];

    default:
      return [{ type: "text", text: "🤖 Jarvis พร้อมให้บริการครับ" }];
  }
}

function renderTextResponse(response: JarvisResponse & { type: "text" }): LineMessage {
  const msg: LineMessage = {
    type: "text",
    text: response.text,
  };

  if (response.quickReplies?.length) {
    msg.quickReply = {
      items: response.quickReplies.map((label) => ({
        type: "action" as const,
        action: {
          type: "message" as const,
          label: label.slice(0, 20),   // LINE limit: 20 chars
          text: label,
        },
      })),
    };
  }

  return msg;
}

function renderProductsResponse(response: JarvisResponse & { type: "products" }): LineMessage {
  // Flex Message — product carousel
  const bubbles = response.products.slice(0, 10).map((product) => ({
    type: "bubble",
    size: "micro",
    hero: {
      type: "image",
      url: product.imageUrl,
      size: "full",
      aspectMode: "cover",
      aspectRatio: "1:1",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: product.name,
          size: "sm",
          weight: "bold",
          maxLines: 2,
          wrap: true,
        },
        {
          type: "text",
          text: `฿${product.price.toLocaleString()}`,
          size: "lg",
          color: "#FF5722",
          weight: "bold",
        },
        ...(product.rating
          ? [
              {
                type: "text" as const,
                text: `⭐ ${product.rating} | ขายแล้ว ${product.soldCount?.toLocaleString() || "-"}`,
                size: "xs" as const,
                color: "#888888",
              },
            ]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "🟠 ดูสินค้า",
            uri: product.productUrl,
          },
          style: "primary",
          height: "sm",
        },
      ],
    },
  }));

  return {
    type: "flex",
    altText: `🔍 ${response.title} — พบ ${response.products.length} รายการ`,
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

function renderRideResponse(response: JarvisResponse & { type: "ride" }): LineMessage {
  const buttons = response.options.map((opt) => ({
    type: "button",
    action: {
      type: "uri",
      label: `${opt.provider === "grab" ? "🟢" : "🔵"} ${opt.provider.charAt(0).toUpperCase() + opt.provider.slice(1)}${opt.estimatedPrice ? ` ~฿${opt.estimatedPrice}` : ""}`,
      uri: opt.deeplink,
    },
    style: "primary",
    height: "sm",
    margin: "sm",
  }));

  return {
    type: "flex",
    altText: `🚗 เรียกรถไป ${response.destination.name}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🚗 เรียกรถ",
            weight: "bold",
            size: "xl",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: [
              {
                type: "text",
                text: `📍 จาก: ${response.pickup.name}`,
                size: "sm",
              },
              {
                type: "text",
                text: `📍 ไป: ${response.destination.name}`,
                size: "sm",
                weight: "bold",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: buttons,
      },
    },
  };
}

function renderConfirmResponse(response: JarvisResponse & { type: "confirm" }): LineMessage {
  return {
    type: "flex",
    altText: response.text,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: response.text,
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "button",
            action: {
              type: "message",
              label: "✅ ยืนยัน",
              text: response.confirmAction,
            },
            style: "primary",
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "❌ ยกเลิก",
              text: response.cancelAction || "ยกเลิก",
            },
            style: "secondary",
          },
        ],
      },
    },
  };
}
