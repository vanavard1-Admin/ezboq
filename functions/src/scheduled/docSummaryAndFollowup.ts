/**
 * Daily Summary Push + Smart Follow-up
 *
 * 1. dailySummaryPush — ทุกเช้า 8:00 ส่งสรุปรายวันให้เจ้าของธุรกิจ
 * 2. smartFollowUp — ทุกเช้า 10:00 เตือนเรื่อง QUO/BILL ที่ค้างนาน
 */
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getLineChannelAccessToken, LINE_API } from "../shared/config";

function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

async function pushLineText(lineUserId: string, text: string): Promise<void> {
  const accessToken = getLineChannelAccessToken();
  if (!accessToken) return;
  try {
    await fetch(LINE_API.PUSH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });
  } catch (err) {
    console.error("[PUSH] Failed:", err);
  }
}

// ============================================================
// 1. Daily Summary Push — 08:00 Bangkok time
// ============================================================

export const dailySummaryPush = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Bangkok",
    region: "asia-southeast1",
    memory: "256MiB",
    secrets: ["LINE_CHANNEL_ACCESS_TOKEN"],
  },
  async () => {
    console.log("[DAILY_SUMMARY] Starting...");
    const db = getDb();

    // Get all active jarvis users
    const jarvisSnap = await db
      .collection("jarvis_users")
      .where("active", "==", true)
      .limit(200)
      .get();

    if (jarvisSnap.empty) {
      console.log("[DAILY_SUMMARY] No active users");
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    for (const userDoc of jarvisSnap.docs) {
      try {
        const lineUserId = userDoc.id;
        const linkDoc = await db.collection("line_links").doc(lineUserId).get();
        if (!linkDoc.exists) continue;

        const linkData = linkDoc.data()!;
        const uid = linkData.uid;
        if (!uid) continue;

        const userRef = await db.collection("users").doc(uid).get();
        const businessId = userRef.data()?.activeBusinessId || linkData.businessId;
        if (!businessId) continue;

        const docsRef = db.collection(`users/${uid}/businesses/${businessId}/documents`);

        // Get RECEIPT docs, filter date in memory (no composite index)
        const allReceipts = await docsRef.where("docType", "==", "RECEIPT").limit(100).get();
        let yesterdayIncome = 0;
        let yesterdayReceiptCount = 0;
        allReceipts.docs.forEach((d) => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.()?.getTime?.() || 0;
          if (ts >= startOfYesterday.getTime() && ts < startOfToday.getTime()) {
            yesterdayIncome += data.money?.grand_total || data.total_amount || 0;
            yesterdayReceiptCount++;
          }
        });

        // Get BILL docs, filter unpaid in memory
        const allBills = await docsRef.where("docType", "==", "BILL").limit(100).get();
        let unpaidTotal = 0;
        let unpaidCount = 0;
        allBills.docs.forEach((d) => {
          const data = d.data();
          if (data.status === "ISSUED" || data.status === "UNPAID") {
            unpaidTotal += data.money?.grand_total || data.total_amount || 0;
            unpaidCount++;
          }
        });

        // Only push if there's something to report
        if (yesterdayReceiptCount === 0 && unpaidCount === 0) continue;

        let msg = `🐱 สวัสดีตอนเช้าครับเจ้าของ!\n\n`;

        if (yesterdayReceiptCount > 0) {
          msg += `💰 เมื่อวานรับเงิน ฿${yesterdayIncome.toLocaleString()} (${yesterdayReceiptCount} ใบเสร็จ)\n`;
        }

        if (unpaidCount > 0) {
          msg += `📋 บิลค้างชำระ ${unpaidCount} ใบ รวม ฿${unpaidTotal.toLocaleString()}\n`;
        }

        msg += `\nพิมพ์ "ยอดขายเดือนนี้" ดูรายละเอียดได้เลยครับ`;

        await pushLineText(lineUserId, msg);
      } catch (err) {
        console.error("[DAILY_SUMMARY] Error for user:", err);
      }
    }

    console.log("[DAILY_SUMMARY] Done");
  },
);

// ============================================================
// 2. Smart Follow-up — 10:00 Bangkok time
// ============================================================

export const smartFollowUp = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Asia/Bangkok",
    region: "asia-southeast1",
    memory: "256MiB",
    secrets: ["LINE_CHANNEL_ACCESS_TOKEN"],
  },
  async () => {
    console.log("[SMART_FOLLOWUP] Starting...");
    const db = getDb();

    const jarvisSnap = await db
      .collection("jarvis_users")
      .where("active", "==", true)
      .limit(200)
      .get();

    if (jarvisSnap.empty) return;

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const userDoc of jarvisSnap.docs) {
      try {
        const lineUserId = userDoc.id;
        const linkDoc = await db.collection("line_links").doc(lineUserId).get();
        if (!linkDoc.exists) continue;

        const linkData = linkDoc.data()!;
        const uid = linkData.uid;
        if (!uid) continue;

        const userRef = await db.collection("users").doc(uid).get();
        const businessId = userRef.data()?.activeBusinessId || linkData.businessId;
        if (!businessId) continue;

        const docsRef = db.collection(`users/${uid}/businesses/${businessId}/documents`);
        const reminders: string[] = [];

        // Get QUOs, filter old + ISSUED in memory (no composite index)
        const allQuos = await docsRef.where("docType", "==", "QUO").limit(50).get();
        let quoCount = 0;
        for (const quoDoc of allQuos.docs) {
          if (quoCount >= 5) break;
          const quo = quoDoc.data();
          if (quo.status !== "ISSUED") continue;
          const createdTs = quo.createdAt?.toDate?.()?.getTime?.() || 0;
          if (createdTs > threeDaysAgo.getTime() || createdTs === 0) continue;
          const customer = quo.customerSnapshot?.displayName || quo.customer_name || "-";
          const amount = quo.money?.grand_total || quo.total_amount || 0;
          const daysAgo = Math.floor((now.getTime() - createdTs) / 86400000);
          reminders.push(`📋 ${quo.docNo} — ${customer} ฿${amount.toLocaleString()} (${daysAgo} วันแล้ว)`);
          quoCount++;
        }

        // Get BILLs, filter old + unpaid in memory
        const allBills = await docsRef.where("docType", "==", "BILL").limit(50).get();
        let billCount = 0;
        for (const billDoc of allBills.docs) {
          if (billCount >= 5) break;
          const bill = billDoc.data();
          if (bill.status !== "ISSUED" && bill.status !== "UNPAID") continue;
          const createdTs = bill.createdAt?.toDate?.()?.getTime?.() || 0;
          if (createdTs > sevenDaysAgo.getTime() || createdTs === 0) continue;
          const customer = bill.customerSnapshot?.displayName || bill.customer_name || "-";
          const amount = bill.money?.grand_total || bill.total_amount || 0;
          const daysAgo = Math.floor((now.getTime() - createdTs) / 86400000);
          reminders.push(`🧾 ${bill.docNo} — ${customer} ฿${amount.toLocaleString()} (ค้าง ${daysAgo} วัน)`);
          billCount++;
        }

        if (reminders.length === 0) continue;

        // Check idempotency — don't push same reminder twice in one day
        const todayKey = now.toISOString().slice(0, 10);
        const idempRef = db.doc(`automations/smart_followup/runs/${todayKey}_${lineUserId}`);
        const idempSnap = await idempRef.get();
        if (idempSnap.exists) continue;
        await idempRef.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() });

        const msg =
          `🐱 ด็อกเตือนเรื่องเอกสารครับ!\n\n` +
          reminders.join("\n") +
          `\n\nอยากให้ด็อกช่วย follow up ลูกค้ามั้ยครับ?`;

        await pushLineText(lineUserId, msg);
      } catch (err) {
        console.error("[SMART_FOLLOWUP] Error for user:", err);
      }
    }

    console.log("[SMART_FOLLOWUP] Done");
  },
);
