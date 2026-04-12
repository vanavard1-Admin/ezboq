/**
 * Quota Renderer — สร้าง LINE Flex Message แสดงหลอด fill bar การใช้งาน
 *
 * แสดงให้ user เห็นว่าใช้ไปกี่คำถามแล้ว เหลืออีกเท่าไร
 * พร้อมปุ่มอัพเกรดเมื่อใกล้หมด
 */
import type { JarvisQuota, JarvisPlan } from "./quotaService";
import {
  JARVIS_PLANS,
  getDocUsagePercent,
  getDaysRemaining,
  shouldShowUpgradePrompt,
} from "./quotaService";

// ============ Fill Bar Builder ============

/**
 * สร้าง text fill bar (ใช้ใน text message)
 * Example: [████████░░] 80/100
 */
export function buildTextFillBar(quota: JarvisQuota): string {
  const percent = getDocUsagePercent(quota);
  if (isUnlimitedPlan(quota)) {
    return "🚀 แพ็กใช้งานอยู่ — ออกเอกสารไม่จำกัด";
  }

  const totalBars = 10;
  const filledBars = Math.round((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  const filled = "█".repeat(filledBars);
  const empty = "░".repeat(emptyBars);

  const remaining = quota.documentsLimit - quota.documentsUsed;
  const daysLeft = getDaysRemaining(quota);

  let bar = `[${filled}${empty}] ${quota.documentsUsed}/${quota.documentsLimit}`;
  bar += quota.plan === "FREE"
    ? `\nเหลือ ${remaining} ใบจากสิทธิ์ฟรี`
    : `\nเหลือ ${remaining} เอกสาร (${daysLeft} วัน)`;

  if (percent >= 100) {
    bar += quota.plan === "FREE"
      ? "\n⛔ ใช้สิทธิ์ฟรี 10 ใบแรกครบแล้ว! กรุณาอัพเกรดเพื่อออกเอกสารต่อ"
      : "\n⛔ หมดโควต้าเอกสารแล้ว! กรุณาอัพเกรดเพื่อออกเอกสารต่อ";
  } else if (percent >= 80) {
    bar += quota.plan === "FREE"
      ? "\n⚠️ สิทธิ์ฟรีใกล้หมดแล้ว! อัพเกรดเพื่อออกเอกสารต่อ"
      : "\n⚠️ ใกล้หมดแล้ว! อัพเกรดเพื่อเพิ่มโควต้าเอกสาร";
  }

  return bar;
}

/**
 * สร้าง Flex Message fill bar (visual bar ที่สวยงาม)
 */
export function buildFlexFillBar(quota: JarvisQuota): Record<string, unknown> {
  const percent = getDocUsagePercent(quota);
  const remaining = quota.documentsLimit - quota.documentsUsed;
  const daysLeft = getDaysRemaining(quota);
  const planConfig = JARVIS_PLANS[quota.plan];
  const promptLevel = shouldShowUpgradePrompt(quota);

  // Bar colors based on usage
  const barColor = percent >= 90 ? "#F44336" : percent >= 70 ? "#FF9800" : "#4CAF50";
  const bgColor = "#E0E0E0";

  // Build the fill bar box (uses width percentage)
  const fillBarContents: Record<string, unknown>[] = [
    // Background bar
    {
      type: "box",
      layout: "vertical",
      contents: [],
      backgroundColor: bgColor,
      height: "8px",
      cornerRadius: "4px",
    },
    // Filled bar (overlay)
    {
      type: "box",
      layout: "vertical",
      contents: [],
      backgroundColor: barColor,
      height: "8px",
      cornerRadius: "4px",
      width: `${Math.min(100, Math.max(2, percent))}%`,
      position: "absolute",
      offsetTop: "0px",
      offsetStart: "0px",
    },
  ];

  // Main body contents
  const bodyContents: Record<string, unknown>[] = [
    // Header
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `${planConfig.emoji} EzDoc ${planConfig.name}`,
          weight: "bold",
          size: "sm",
          flex: 3,
        },
        {
          type: "text",
          text: isUnlimitedPlan(quota)
            ? "ไม่จำกัด"
            : quota.plan === "FREE"
              ? `${remaining} ใบฟรี`
              : `${remaining} เอกสาร`,
          size: "sm",
          align: "end",
          color: barColor,
          weight: "bold",
          flex: 2,
        },
      ],
    },
    // Fill bar
    {
      type: "box",
      layout: "vertical",
      contents: fillBarContents,
      margin: "md",
      height: "8px",
    },
    // Stats line
    {
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: quota.plan === "FREE"
            ? `ใช้ไป ${quota.documentsUsed}/${quota.documentsLimit} ใบจากสิทธิ์ฟรี`
            : `ออกไป ${quota.documentsUsed}/${quota.documentsLimit} เอกสาร`,
          size: "xs",
          color: "#999999",
          flex: 3,
        },
        {
          type: "text",
          text: quota.plan === "FREE" ? "ใช้ฟรีครั้งแรก" : `เหลือ ${daysLeft} วัน`,
          size: "xs",
          color: "#999999",
          align: "end",
          flex: 2,
        },
      ],
    },
  ];

  // Warning message if running low
  if (promptLevel === "soft") {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      backgroundColor: "#FFF3E0",
      cornerRadius: "6px",
      paddingAll: "8px",
      contents: [
        {
          type: "text",
          text: "⚠️ เอกสารใกล้หมดแล้ว! อัพเกรดเพื่อออกเอกสารต่อ",
          size: "xs",
          color: "#E65100",
          wrap: true,
        },
      ],
    });
  }

  if (promptLevel === "hard") {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      backgroundColor: "#FFEBEE",
      cornerRadius: "6px",
      paddingAll: "8px",
      contents: [
        {
          type: "text",
          text: "⛔ โควต้าเอกสารหมดแล้ว! กรุณาอัพเกรดเพื่อออกเอกสารต่อ",
          size: "xs",
          color: "#C62828",
          wrap: true,
        },
      ],
    });
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "12px",
    },
    // Upgrade button (show if not unlimited)
    ...(!isUnlimitedPlan(quota) && promptLevel !== "none"
      ? {
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                color: "#FF6F00",
                action: {
                  type: "message",
                  label: "🚀 อัพเกรด EzDoc",
                  text: "อัพเกรด EzDoc",
                },
              },
            ],
            paddingAll: "8px",
          },
        }
      : {}),
  };
}

// ============ Upgrade Menu ============

/**
 * สร้าง Flex Message แสดงแพลนทั้งหมด (สำหรับเมื่อ user พิมพ์ "อัพเกรด")
 */
export function buildUpgradeMenu(currentPlan: JarvisPlan): Record<string, unknown> {
  const plans = (Object.entries(JARVIS_PLANS) as [JarvisPlan, typeof JARVIS_PLANS[JarvisPlan]][])
    .filter(([key]) => key !== "FREE"); // Don't show FREE in upgrade menu

  const planCards = plans.map(([key, config]) => {
    const isCurrent = key === currentPlan;
    const borderColor = isCurrent ? "#4CAF50" : "#E0E0E0";

    return {
      type: "box",
      layout: "vertical",
      margin: "md",
      cornerRadius: "10px",
      borderWidth: "2px",
      borderColor,
      paddingAll: "12px",
      backgroundColor: isCurrent ? "#E8F5E9" : "#FFFFFF",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `${config.emoji} ${config.name}`,
              weight: "bold",
              size: "md",
              flex: 3,
            },
            {
              type: "text",
              text: config.price > 0 ? `฿${config.price}` : "ฟรี",
              size: "sm",
              align: "end",
              color: "#FF6F00",
              weight: "bold",
              flex: 2,
            },
          ],
        },
        {
          type: "text",
          text: config.description,
          size: "xs",
          color: "#666666",
          margin: "sm",
          wrap: true,
        },
        ...(isCurrent
          ? [
              {
                type: "text" as const,
                text: "✅ แพลนปัจจุบัน",
                size: "xs" as const,
                color: "#4CAF50",
                margin: "sm" as const,
                weight: "bold" as const,
              },
            ]
          : key !== currentPlan && JARVIS_PLANS[key].price > JARVIS_PLANS[currentPlan].price
          ? [
              {
                type: "button" as const,
                style: "primary" as const,
                height: "sm" as const,
                margin: "sm" as const,
                color: "#FF6F00",
                action: {
                  type: "message" as const,
                  label: `เลือก ${config.name}`,
                  text: key === "BASIC" ? "ซื้อแพ็ค 99" : "ซื้อแพ็ค 279",
                },
              },
            ]
          : []),
      ],
    };
  });

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "🚀 อัพเกรด EzDoc AI",
          weight: "bold",
          size: "lg",
          color: "#ffffff",
        },
        {
          type: "text",
          text: "เลือกแพลนที่เหมาะกับคุณ",
          size: "xs",
          color: "#ffffffcc",
        },
      ],
      backgroundColor: "#FF6F00",
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: planCards,
      paddingAll: "12px",
    },
  };
}

// ============ Blocked Message ============

/**
 * สร้างข้อความเมื่อ user หมดโควต้า
 */
export function buildBlockedMessage(quota: JarvisQuota): {
  text: string;
  flex: Record<string, unknown>;
} {
  const text = quota.plan === "FREE"
    ? [
        `⛔ สิทธิ์ฟรี 10 ใบแรกของบัญชีนี้ใช้ครบแล้วครับ`,
        `ตอนนี้คุณใช้ไป ${quota.documentsUsed}/${quota.documentsLimit} ใบแล้ว`,
        ``,
        `EzDOC Pro 99 บาท สำหรับ 1 ผู้ใช้ ออกเอกสารได้ไม่จำกัด`,
        `EzDOC Team 279 บาท สำหรับหลายผู้ใช้ ออกเอกสารได้ไม่จำกัด`,
        ``,
        `พิมพ์ "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279" ได้เลยครับ`,
      ].join("\n")
    : [
        `⛔ โควต้าเอกสารหมดแล้วครับ`,
        `คุณออกเอกสารครบ ${quota.documentsLimit} ฉบับในรอบนี้แล้ว`,
        `พิมพ์ "อัพเกรด EzDoc" เพื่อดูแพลนทั้งหมด`,
      ].join("\n");

  return { text, flex: buildUpgradeMenu(quota.plan) };
}

// ============ Inline Quota Footer ============

/**
 * สร้าง text footer สั้นๆ ต่อท้ายทุก response (1 บรรทัด)
 * Example: "━━ 🆓 8/15 [████████░░] ━━"
 */
export function buildInlineQuotaText(quota: JarvisQuota): string {
  if (isUnlimitedPlan(quota)) return "";  // No bar for Pro unlimited

  const percent = getDocUsagePercent(quota);
  const totalBars = 8;
  const filledBars = Math.round((percent / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  const filled = "▓".repeat(filledBars);
  const empty = "░".repeat(emptyBars);

  const remaining = quota.documentsLimit - quota.documentsUsed;
  const emoji = JARVIS_PLANS[quota.plan].emoji;

  if (percent >= 100) {
    return `\n━━ ${emoji} ⛔ เอกสารหมด! พิมพ์ "อัพเกรด" ━━`;
  }
  if (percent >= 80) {
    return `\n━━ ${emoji} ${filled}${empty} เหลือ ${remaining} เอกสาร ⚠️ ━━`;
  }
  return `\n━━ ${emoji} ${filled}${empty} เหลือ ${remaining} เอกสาร ━━`;
}

function isUnlimitedPlan(quota: JarvisQuota): boolean {
  return quota.documentsLimit >= 99999;
}
