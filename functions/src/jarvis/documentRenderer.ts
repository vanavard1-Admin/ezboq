/**
 * Document Renderer — Rich LINE Flex Messages สำหรับเอกสาร EzDoc
 *
 * สร้าง Flex Message สวยๆ สำหรับ preview เอกสาร, รายงาน, confirm
 */

export interface LineFlexMessage {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}

/**
 * Render document draft preview (for confirmation before issuing)
 */
export function renderDocumentPreview(params: {
  docType: string;
  customerName: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  vatRate?: number;
}): LineFlexMessage {
  const docTypeNames: Record<string, string> = {
    QUO: "ใบเสนอราคา",
    BILL: "ใบวางบิล",
    RECEIPT: "ใบเสร็จรับเงิน",
  };

  const headerColors: Record<string, string> = {
    QUO: "#2196F3",    // Blue
    BILL: "#FF9800",   // Orange
    RECEIPT: "#4CAF50", // Green
  };

  const itemBoxes = params.items.map((item) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: `${item.name} x${item.qty}`,
        size: "sm",
        color: "#555555",
        flex: 3,
      },
      {
        type: "text",
        text: `฿${(item.qty * item.price).toLocaleString()}`,
        size: "sm",
        color: "#111111",
        align: "end",
        flex: 2,
      },
    ],
  }));

  const vatAmount = params.vatRate
    ? Math.round(params.subtotal * (params.vatRate / 100))
    : 0;
  const total = params.subtotal + vatAmount;

  return {
    type: "flex",
    altText: `📋 ${docTypeNames[params.docType] || params.docType} - ${params.customerName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: docTypeNames[params.docType] || params.docType,
            color: "#ffffff",
            size: "lg",
            weight: "bold",
          },
          {
            type: "text",
            text: "Draft — รอยืนยัน",
            color: "#ffffffcc",
            size: "xs",
          },
        ],
        backgroundColor: headerColors[params.docType] || "#666666",
        paddingAll: "15px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `👤 ${params.customerName}`,
            weight: "bold",
            size: "md",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: itemBoxes,
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "รวม",
                size: "sm",
                color: "#555555",
                flex: 3,
              },
              {
                type: "text",
                text: `฿${params.subtotal.toLocaleString()}`,
                size: "sm",
                color: "#111111",
                align: "end",
                flex: 2,
              },
            ],
          },
          ...(vatAmount > 0
            ? [
                {
                  type: "box" as const,
                  layout: "horizontal" as const,
                  contents: [
                    {
                      type: "text" as const,
                      text: `VAT ${params.vatRate}%`,
                      size: "sm" as const,
                      color: "#555555",
                      flex: 3,
                    },
                    {
                      type: "text" as const,
                      text: `฿${vatAmount.toLocaleString()}`,
                      size: "sm" as const,
                      color: "#111111",
                      align: "end" as const,
                      flex: 2,
                    },
                  ],
                },
              ]
            : []),
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "สุทธิ",
                size: "lg",
                weight: "bold",
                color: "#111111",
                flex: 3,
              },
              {
                type: "text",
                text: `฿${total.toLocaleString()}`,
                size: "lg",
                weight: "bold",
                color: headerColors[params.docType] || "#111111",
                align: "end",
                flex: 2,
              },
            ],
          },
        ],
        paddingAll: "15px",
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "message",
              label: "✅ ยืนยันออก",
              text: "ยืนยันออกเอกสาร",
            },
            color: headerColors[params.docType] || "#666666",
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "message",
              label: "❌ ยกเลิก",
              text: "ยกเลิก",
            },
          },
        ],
        paddingAll: "10px",
      },
    },
  };
}

/**
 * Render document list as compact cards
 */
export function renderDocumentList(
  documents: Array<{
    docNo: string;
    docType: string;
    customerName: string;
    amount: number;
    status: string;
  }>,
): LineFlexMessage {
  const docTypeEmoji: Record<string, string> = {
    QUO: "📋",
    BILL: "🧾",
    RECEIPT: "💰",
  };

  const statusColors: Record<string, string> = {
    DRAFT: "#999999",
    ISSUED: "#2196F3",
    PAID: "#4CAF50",
    CANCELLED: "#F44336",
  };

  const itemBoxes = documents.slice(0, 8).map((doc) => ({
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    margin: "md",
    contents: [
      {
        type: "text",
        text: `${docTypeEmoji[doc.docType] || "📄"} ${doc.docNo}`,
        size: "sm",
        flex: 3,
      },
      {
        type: "text",
        text: doc.customerName,
        size: "xs",
        color: "#666666",
        flex: 3,
      },
      {
        type: "text",
        text: `฿${doc.amount.toLocaleString()}`,
        size: "sm",
        align: "end",
        color: statusColors[doc.status] || "#111111",
        flex: 2,
      },
    ],
  }));

  return {
    type: "flex",
    altText: `📄 เอกสารล่าสุด ${documents.length} รายการ`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📄 เอกสารล่าสุด",
            weight: "bold",
            size: "lg",
          },
          {
            type: "separator",
            margin: "md",
          },
          ...itemBoxes,
        ],
        paddingAll: "15px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "message",
              label: "ออกเอกสารใหม่",
              text: "ออกใบเสนอราคา",
            },
            color: "#2196F3",
          },
        ],
        paddingAll: "10px",
      },
    },
  };
}

/**
 * Render report summary card
 */
export function renderReportCard(params: {
  title: string;
  emoji: string;
  metrics: Array<{ label: string; value: string; highlight?: boolean }>;
}): LineFlexMessage {
  const metricBoxes = params.metrics.map((m) => ({
    type: "box",
    layout: "horizontal",
    margin: "md",
    contents: [
      {
        type: "text",
        text: m.label,
        size: "sm",
        color: "#555555",
        flex: 3,
      },
      {
        type: "text",
        text: m.value,
        size: m.highlight ? "lg" : "sm",
        weight: m.highlight ? "bold" : "regular",
        color: m.highlight ? "#4CAF50" : "#111111",
        align: "end",
        flex: 2,
      },
    ],
  }));

  return {
    type: "flex",
    altText: `${params.emoji} ${params.title}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${params.emoji} ${params.title}`,
            weight: "bold",
            size: "lg",
          },
          {
            type: "separator",
            margin: "md",
          },
          ...metricBoxes,
        ],
        paddingAll: "15px",
      },
    },
  };
}
