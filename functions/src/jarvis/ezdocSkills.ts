/**
 * EzDoc Skills — ให้ Jarvis สร้างเอกสาร, ดูรายงาน, จัดการลูกค้า
 *
 * 8 skills ใหม่ที่เชื่อม Jarvis กับระบบ EzDoc
 */
import * as admin from "firebase-admin";
import type { JarvisSkill, JarvisResponse, JarvisContext } from "./types";
import { buildJarvisLinkRequiredResponse } from "./linkPrompt";

function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Helper: ดึง Firebase UID + businessId จาก LINE user ID
 */
async function resolveUser(
  lineUserId: string,
  db: admin.firestore.Firestore,
): Promise<{ uid: string; businessId: string } | null> {
  try {
    const linkDoc = await db.collection("line_links").doc(lineUserId).get();
    if (!linkDoc.exists) {
      const { getOrCreateGuestLink } = await import("../core/lineLinkService");
      const guestLink = await getOrCreateGuestLink(lineUserId);
      return {
        uid: guestLink.uid,
        businessId: guestLink.businessId,
      };
    }
    const linkData = linkDoc.data();
    if (!linkData || linkData.status !== "ACTIVE" || !linkData.uid) {
      const { getOrCreateGuestLink } = await import("../core/lineLinkService");
      const guestLink = await getOrCreateGuestLink(lineUserId);
      return {
        uid: guestLink.uid,
        businessId: guestLink.businessId,
      };
    }

    const uid = linkData.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    const businessId =
      userDoc.data()?.activeBusinessId || linkData.businessId;
    if (!businessId) return null;

    return { uid, businessId };
  } catch {
    return null;
  }
}

// ============ Skill 1: create_document ============

const createDocumentSkill: JarvisSkill = {
  name: "create_document",
  description:
    "สร้างเอกสารธุรกิจ. QUO=ใบเสนอราคา/quotation, BILL=ใบวางบิล/ใบแจ้งหนี้/ใบกำกับภาษี/invoice/tax invoice, RECEIPT=ใบเสร็จ/receipt. ใช้เมื่อ user พูดถึงการสร้าง/ออกเอกสาร",
  parameters: {
    doc_type: {
      type: "string",
      description: "QUO=ใบเสนอราคา, BILL=ใบวางบิล/ใบกำกับภาษี/invoice, RECEIPT=ใบเสร็จ",
      required: true,
      enum: ["QUO", "BILL", "RECEIPT"],
    },
    customer_name: {
      type: "string",
      description: "ชื่อลูกค้าหรือบริษัท",
      required: true,
    },
    items: {
      type: "string",
      description:
        'รายการสินค้า/บริการ รูปแบบ JSON array เช่น [{"name":"เสื้อยืด","qty":3,"price":200}]',
      required: true,
    },
    source_doc_no: {
      type: "string",
      description:
        "เลขที่เอกสารอ้างอิง (เช่น ออกใบเสร็จจาก INV-2568-001)",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const docType = params.doc_type as string;
    const customerName = params.customer_name as string;

    // Parse items
    let items: Array<{ name: string; qty: number; price: number }>;
    try {
      items =
        typeof params.items === "string"
          ? JSON.parse(params.items as string)
          : (params.items as Array<{ name: string; qty: number; price: number }>);
    } catch {
      return {
        type: "text",
        text: "❌ รูปแบบรายการไม่ถูกต้อง ลองบอกใหม่ เช่น:\nเสื้อยืด 3 ตัว ตัวละ 200",
      };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return {
        type: "text",
        text:
          "โอ๊ะ! ยังไม่เห็นรายการสินค้า/บริการครบครับ\n" +
          "ลองส่งเพิ่มแบบนี้ได้เลย:\n" +
          "ค่าออกแบบ 1 งาน ราคา 20000 บาท",
      };
    }

    // Resolve user
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return {
        type: "text",
        text:
          "โอ๊ะ! ตอนนี้ยังเริ่ม guest trial ไม่สำเร็จครับ\n" +
          "พิมพ์ \"เชื่อมต่อ\" เพื่อเก็บงานไว้กับบัญชี แล้วลองใหม่ได้เลย",
      };
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0,
    );

    const docTypeNames: Record<string, string> = {
      QUO: "ใบเสนอราคา",
      BILL: "ใบวางบิล",
      RECEIPT: "ใบเสร็จรับเงิน",
    };
    const docTypeEmoji: Record<string, string> = {
      QUO: "📋",
      BILL: "🧾",
      RECEIPT: "💰",
    };

    // Build preview
    const itemLines = items
      .map(
        (item, i) =>
          `${i + 1}. ${item.name} x${item.qty} = ฿${(item.qty * item.price).toLocaleString()}`,
      )
      .join("\n");

    const confirmText =
      `${docTypeEmoji[docType]} **${docTypeNames[docType] || docType}** (Draft)\n\n` +
      `👤 ลูกค้า: ${customerName}\n` +
      `─────────────────\n` +
      `${itemLines}\n` +
      `─────────────────\n` +
      `💰 รวม: ฿${subtotal.toLocaleString()}\n\n` +
      `ยืนยันออกเอกสารนี้หรือไม่?`;

    // Save draft to Firestore for confirmation step
    const draftRef = db.collection("jarvis_drafts").doc();
    await draftRef.set({
      uid: user.uid,
      businessId: user.businessId,
      lineUserId: ctx.lineUserId,
      docType,
      customerName,
      items,
      subtotal,
      sourceDocNo: (params.source_doc_no as string) || null,
      status: "pending_confirm",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + 10 * 60 * 1000,
      ), // 10 min TTL
    });

    return {
      type: "confirm",
      text: confirmText,
      confirmAction: "ยืนยัน",
      cancelAction: "ยกเลิก",
    };
  },
};

// ============ Skill 2: list_documents ============

const listDocumentsSkill: JarvisSkill = {
  name: "list_documents",
  description:
    "ดูรายการเอกสารล่าสุด เช่น ใบเสนอราคา ใบวางบิล ใบเสร็จ. ใช้เมื่อ user ถามว่ามีเอกสารอะไรบ้าง หรือดูเอกสารล่าสุด",
  parameters: {
    doc_type: {
      type: "string",
      description: "ประเภทเอกสารที่ต้องการดู (ว่างเปล่า = ทุกประเภท)",
      required: false,
      enum: ["QUO", "BILL", "RECEIPT", "ALL"],
    },
    limit: {
      type: "number",
      description: "จำนวนเอกสารที่ต้องการดู (default: 5)",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const limit = (params.limit as number) || 5;
    const docType = params.doc_type as string;

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    let query: admin.firestore.Query = db
      .collection(`users/${user.uid}/businesses/${user.businessId}/documents`)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (docType && docType !== "ALL") {
      query = query.where("docType", "==", docType);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return {
        type: "text",
        text: "📄 ยังไม่มีเอกสารครับ ลองสร้างเอกสารแรกดูสิ!\nพิมพ์ เช่น: ออกใบเสนอราคา ลูกค้า ABC เสื้อ 3 ตัว 200 บาท",
        quickReplies: ["ออกใบเสนอราคา", "ออกใบวางบิล", "ออกใบเสร็จ"],
      };
    }

    const emoji: Record<string, string> = {
      QUO: "📋",
      BILL: "🧾",
      RECEIPT: "💰",
    };
    const lines = snapshot.docs.map((doc) => {
      const d = doc.data();
      const e = emoji[d.docType] || "📄";
      const amount =
        d.money?.total_amount || d.total_amount || 0;
      const customer =
        d.customerSnapshot?.displayName || d.customer_name || "-";
      return `${e} ${d.docNo || "Draft"} | ${customer} | ฿${amount.toLocaleString()} | ${d.status || "DRAFT"}`;
    });

    return {
      type: "text",
      text: `📄 เอกสารล่าสุด ${snapshot.size} รายการ:\n\n${lines.join("\n")}`,
      quickReplies: [
        "ออกใบเสนอราคา",
        "ออกใบวางบิล",
        "ยอดขายเดือนนี้",
      ],
    };
  },
};

// ============ Skill 3: get_report ============

const getReportSkill: JarvisSkill = {
  name: "get_report",
  description:
    "ดูรายงานธุรกิจ เช่น ยอดขายเดือน ลูกค้ายอดสูง ใบค้างชำระ บริการยอดนิยม. ใช้เมื่อ user ถามเรื่องรายงาน สรุปยอด สถิติ",
  parameters: {
    report_type: {
      type: "string",
      description: "ประเภทรายงาน",
      required: true,
      enum: [
        "monthly_sales",
        "overdue_invoices",
        "top_customers",
        "popular_services",
      ],
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const reportType = params.report_type as string;

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    const docsSnapshot = await db
      .collection(
        `users/${user.uid}/businesses/${user.businessId}/documents`,
      )
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const docs = docsSnapshot.docs.map((d) => d.data());

    switch (reportType) {
      case "monthly_sales": {
        const receipts = docs.filter(
          (d) =>
            (d.docType === "RECEIPT" || d.doc_type === "RECEIPT") &&
            (d.status === "ISSUED" || d.status === "PAID"),
        );
        const totalRevenue = receipts.reduce(
          (sum, d) => sum + (d.money?.total_amount || d.total_amount || 0),
          0,
        );
        const invoices = docs.filter(
          (d) => d.docType === "BILL" || d.doc_type === "BILL",
        );
        const quotations = docs.filter(
          (d) => d.docType === "QUO" || d.doc_type === "QUO",
        );

        return {
          type: "text",
          text:
            `📊 **สรุปยอดขาย**\n\n` +
            `💰 รายได้รวม: ฿${totalRevenue.toLocaleString()}\n` +
            `🧾 ใบเสร็จ: ${receipts.length} ใบ\n` +
            `📋 ใบเสนอราคา: ${quotations.length} ใบ\n` +
            `🧾 ใบวางบิล: ${invoices.length} ใบ\n` +
            `📈 เฉลี่ย/ใบเสร็จ: ฿${receipts.length > 0 ? Math.round(totalRevenue / receipts.length).toLocaleString() : 0}`,
          quickReplies: [
            "ลูกค้าท็อป 5",
            "ใบค้างชำระ",
            "บริการยอดนิยม",
          ],
        };
      }

      case "overdue_invoices": {
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const overdue = docs.filter((d) => {
          const isBill =
            d.docType === "BILL" || d.doc_type === "BILL";
          const isUnpaid =
            d.status === "ISSUED" ||
            d.status === "UNPAID" ||
            d.status === "AWAITING_PAYMENT";
          const createdMs =
            d.createdAt?.toMillis?.() ||
            (d.createdAt?._seconds || 0) * 1000;
          return isBill && isUnpaid && now - createdMs > thirtyDays;
        });

        if (overdue.length === 0) {
          return {
            type: "text",
            text: "✅ ไม่มีใบวางบิลค้างชำระครับ เยี่ยม!",
            quickReplies: ["ยอดขายเดือนนี้", "ลูกค้าท็อป 5"],
          };
        }

        const lines = overdue.slice(0, 5).map((d) => {
          const amount =
            d.money?.total_amount || d.total_amount || 0;
          const customer =
            d.customerSnapshot?.displayName || d.customer_name || "-";
          return `⏰ ${d.docNo || "-"} | ${customer} | ฿${amount.toLocaleString()}`;
        });

        return {
          type: "text",
          text: `⏰ **ใบวางบิลค้างชำระ** (${overdue.length} ใบ)\n\n${lines.join("\n")}`,
          quickReplies: ["ยอดขายเดือนนี้", "ลูกค้าท็อป 5"],
        };
      }

      case "top_customers": {
        const customerTotals = new Map<
          string,
          { name: string; total: number; count: number }
        >();
        for (const d of docs) {
          if (d.docType !== "RECEIPT" && d.doc_type !== "RECEIPT")
            continue;
          const name =
            d.customerSnapshot?.displayName ||
            d.customer_name ||
            "ไม่ระบุ";
          const amount =
            d.money?.total_amount || d.total_amount || 0;
          const existing = customerTotals.get(name) || {
            name,
            total: 0,
            count: 0,
          };
          existing.total += amount;
          existing.count++;
          customerTotals.set(name, existing);
        }

        const sorted = Array.from(customerTotals.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        if (sorted.length === 0) {
          return { type: "text", text: "📊 ยังไม่มีข้อมูลลูกค้าครับ" };
        }

        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const lines = sorted.map(
          (c, i) =>
            `${medals[i]} ${c.name} | ฿${c.total.toLocaleString()} (${c.count} ใบเสร็จ)`,
        );

        return {
          type: "text",
          text: `🏆 **ลูกค้ายอดสูง Top 5**\n\n${lines.join("\n")}`,
          quickReplies: ["ยอดขายเดือนนี้", "บริการยอดนิยม"],
        };
      }

      case "popular_services": {
        const serviceTotals = new Map<
          string,
          { name: string; total: number; count: number }
        >();
        for (const d of docs) {
          if (d.docType !== "RECEIPT" && d.doc_type !== "RECEIPT")
            continue;
          const docItems = d.items || [];
          for (const item of docItems) {
            const name =
              item.description_th || item.name || "ไม่ระบุ";
            const amount =
              item.amount || item.qty * item.unit_price || 0;
            const existing = serviceTotals.get(name) || {
              name,
              total: 0,
              count: 0,
            };
            existing.total += amount;
            existing.count++;
            serviceTotals.set(name, existing);
          }
        }

        const sorted = Array.from(serviceTotals.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        if (sorted.length === 0) {
          return {
            type: "text",
            text: "📊 ยังไม่มีข้อมูลบริการครับ",
          };
        }

        const lines = sorted.map(
          (s, i) =>
            `${i + 1}. ${s.name} | ฿${s.total.toLocaleString()} (${s.count} รายการ)`,
        );

        return {
          type: "text",
          text: `📊 **บริการ/สินค้ายอดนิยม**\n\n${lines.join("\n")}`,
          quickReplies: ["ยอดขายเดือนนี้", "ลูกค้าท็อป 5"],
        };
      }

      default:
        return {
          type: "text",
          text: "❌ ลองพิมพ์: ยอดขาย, ใบค้างชำระ, ลูกค้าท็อป, บริการยอดนิยม",
        };
    }
  },
};

// ============ Skill 4: manage_customer ============

const manageCustomerSkill: JarvisSkill = {
  name: "manage_customer",
  description:
    "จัดการลูกค้า — เพิ่มลูกค้าใหม่, ค้นหาลูกค้า, ดูรายชื่อลูกค้า",
  parameters: {
    action: {
      type: "string",
      description: "การดำเนินการ",
      required: true,
      enum: ["add", "search", "list"],
    },
    name: {
      type: "string",
      description: "ชื่อลูกค้าหรือบริษัท",
      required: true,
    },
    phone: {
      type: "string",
      description: "เบอร์โทร",
      required: false,
    },
    email: {
      type: "string",
      description: "อีเมล",
      required: false,
    },
    address: {
      type: "string",
      description: "ที่อยู่",
      required: false,
    },
    tax_id: {
      type: "string",
      description: "เลขประจำตัวผู้เสียภาษี",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const action = params.action as string;
    const name = params.name as string;

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    const customersRef = db.collection(
      `users/${user.uid}/businesses/${user.businessId}/customers`,
    );

    switch (action) {
      case "add": {
        const newCustomer = {
          displayName: name,
          type: "COMPANY",
          phone: (params.phone as string) || "",
          email: (params.email as string) || "",
          address: (params.address as string) || "",
          taxId: (params.tax_id as string) || "",
          businessId: user.businessId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await customersRef.add(newCustomer);

        let details = `✅ เพิ่มลูกค้าเรียบร้อย!\n\n👤 ${name}`;
        if (params.phone) details += `\n📱 ${params.phone}`;
        if (params.email) details += `\n📧 ${params.email}`;
        if (params.address) details += `\n📍 ${params.address}`;
        if (params.tax_id) details += `\n🏢 เลขภาษี: ${params.tax_id}`;
        details += `\n\nID: ${docRef.id}`;

        return {
          type: "text",
          text: details,
          quickReplies: ["ออกใบเสนอราคา", "ดูลูกค้า", "เมนู"],
        };
      }

      case "search": {
        const snapshot = await customersRef.limit(50).get();
        const results = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((c) => {
            const displayName = (
              (c as Record<string, unknown>).displayName as string || ""
            ).toLowerCase();
            return displayName.includes(name.toLowerCase());
          })
          .slice(0, 5);

        if (results.length === 0) {
          return {
            type: "text",
            text: `🔍 ไม่พบลูกค้าชื่อ "${name}"\nต้องการเพิ่มลูกค้าใหม่หรือไม่?`,
            quickReplies: [`เพิ่มลูกค้า ${name}`, "ดูลูกค้าทั้งหมด"],
          };
        }

        const lines = results.map((c) => {
          const data = c as Record<string, unknown>;
          return `👤 ${data.displayName || "-"}${data.phone ? ` | ${data.phone}` : ""}`;
        });

        return {
          type: "text",
          text: `🔍 พบ ${results.length} รายการ:\n\n${lines.join("\n")}`,
        };
      }

      case "list": {
        const snapshot = await customersRef
          .limit(10)
          .get();

        if (snapshot.empty) {
          return {
            type: "text",
            text: "📋 ยังไม่มีลูกค้าครับ\nพิมพ์ เช่น: เพิ่มลูกค้า บริษัท ABC",
          };
        }

        const lines = snapshot.docs.map((doc) => {
          const d = doc.data();
          return `👤 ${d.displayName || "-"}${d.phone ? ` | ${d.phone}` : ""}`;
        });

        return {
          type: "text",
          text: `📋 **ลูกค้า** (${snapshot.size} รายการ)\n\n${lines.join("\n")}`,
          quickReplies: ["เพิ่มลูกค้า", "ออกใบเสนอราคา"],
        };
      }

      default:
        return { type: "text", text: "❌ คำสั่งไม่ถูกต้องครับ" };
    }
  },
};

// ============ Skill 5: check_payment ============

const checkPaymentSkill: JarvisSkill = {
  name: "check_payment",
  description:
    "เช็คสถานะการชำระเงิน ดูใบวางบิลที่ยังไม่ชำระ เช็คยอดค้างชำระ",
  parameters: {
    query: {
      type: "string",
      description: "เลขที่เอกสารหรือชื่อลูกค้าที่ต้องการเช็ค (ไม่บังคับ)",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const query = params.query as string;

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    const docsRef = db.collection(
      `users/${user.uid}/businesses/${user.businessId}/documents`,
    );

    const unpaidSnapshot = await docsRef
      .where("docType", "==", "BILL")
      .where("status", "in", ["ISSUED", "UNPAID", "AWAITING_PAYMENT"])
      .limit(20)
      .get();

    if (unpaidSnapshot.empty) {
      return {
        type: "text",
        text: "✅ ไม่มียอดค้างชำระครับ ลูกค้าจ่ายหมดแล้ว!",
        quickReplies: ["ยอดขายเดือนนี้", "เมนู"],
      };
    }

    let results = unpaidSnapshot.docs.map((doc) => doc.data());

    // Filter by query if provided
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((d) => {
        const docNo = (d.docNo || d.doc_no || "").toLowerCase();
        const customer = (
          d.customerSnapshot?.displayName ||
          d.customer_name ||
          ""
        ).toLowerCase();
        return docNo.includes(q) || customer.includes(q);
      });
    }

    const totalUnpaid = results.reduce(
      (sum, d) => sum + (d.money?.total_amount || d.total_amount || 0),
      0,
    );

    const lines = results.slice(0, 5).map((d) => {
      const amount =
        d.money?.total_amount || d.total_amount || 0;
      const customer =
        d.customerSnapshot?.displayName || d.customer_name || "-";
      return `🧾 ${d.docNo || "-"} | ${customer} | ฿${amount.toLocaleString()}`;
    });

    return {
      type: "text",
      text:
        `💳 **ยอดค้างชำระ** (${results.length} ใบ)\n` +
        `💰 รวม: ฿${totalUnpaid.toLocaleString()}\n\n` +
        `${lines.join("\n")}` +
        (results.length > 5
          ? `\n...และอีก ${results.length - 5} ใบ`
          : ""),
      quickReplies: ["ยอดขายเดือนนี้", "ลูกค้าท็อป 5"],
    };
  },
};

// ============ Skill 6: create_receipt_from_invoice ============

const createReceiptFromInvoiceSkill: JarvisSkill = {
  name: "create_receipt_from_invoice",
  description:
    "ออกใบเสร็จรับเงินจากใบวางบิลที่มีอยู่แล้ว เมื่อลูกค้าชำระเงินแล้ว",
  parameters: {
    invoice_doc_no: {
      type: "string",
      description: "เลขที่ใบวางบิล เช่น INV-2568-001",
      required: true,
    },
    payment_method: {
      type: "string",
      description: "วิธีชำระ",
      required: false,
      enum: ["transfer", "cash", "promptpay", "credit_card"],
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const invoiceNo = params.invoice_doc_no as string;
    const paymentMethod =
      (params.payment_method as string) || "transfer";

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    // Find the invoice
    const invoiceSnapshot = await db
      .collection(
        `users/${user.uid}/businesses/${user.businessId}/documents`,
      )
      .where("docNo", "==", invoiceNo)
      .limit(1)
      .get();

    if (invoiceSnapshot.empty) {
      return {
        type: "text",
        text: `❌ ไม่พบใบวางบิล ${invoiceNo}\nลองเช็คเลขที่เอกสารอีกครั้งครับ`,
        quickReplies: ["ดูเอกสารล่าสุด", "ใบค้างชำระ"],
      };
    }

    const invoice = invoiceSnapshot.docs[0].data();
    const customer =
      invoice.customerSnapshot?.displayName ||
      invoice.customer_name ||
      "-";
    const amount =
      invoice.money?.total_amount || invoice.total_amount || 0;

    const methodNames: Record<string, string> = {
      transfer: "โอนเงิน",
      cash: "เงินสด",
      promptpay: "PromptPay",
      credit_card: "บัตรเครดิต",
    };

    return {
      type: "confirm",
      text:
        `💰 **ออกใบเสร็จจาก ${invoiceNo}**\n\n` +
        `👤 ลูกค้า: ${customer}\n` +
        `💰 จำนวน: ฿${amount.toLocaleString()}\n` +
        `💳 วิธีชำระ: ${methodNames[paymentMethod] || paymentMethod}\n\n` +
        `ยืนยันออกใบเสร็จ?`,
      confirmAction: "ยืนยัน",
      cancelAction: "ยกเลิก",
    };
  },
};

// ============ Skill 7: business_setup ============

const businessSetupSkill: JarvisSkill = {
  name: "business_setup",
  description:
    "ตั้งค่าหรือแก้ไขข้อมูลธุรกิจ เช่น ชื่อบริษัท เลขภาษี บัญชีธนาคาร PromptPay",
  parameters: {
    field: {
      type: "string",
      description: "ข้อมูลที่ต้องการตั้งค่า",
      required: true,
      enum: [
        "name",
        "address",
        "taxId",
        "phone",
        "email",
        "bank",
        "promptpay",
        "check",
      ],
    },
    value: {
      type: "string",
      description: "ค่าที่ต้องการตั้ง",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const field = params.field as string;
    const value = params.value as string;

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    const businessRef = db.doc(
      `users/${user.uid}/businesses/${user.businessId}`,
    );

    // Check current status
    if (field === "check") {
      const doc = await businessRef.get();
      const data = doc.data() || {};
      const checklist = [
        { label: "ชื่อธุรกิจ", done: !!data.name },
        { label: "ที่อยู่", done: !!data.address },
        { label: "เลขภาษี", done: !!(data.taxId || data.tax_id) },
        { label: "โทรศัพท์", done: !!data.phone },
        { label: "อีเมล", done: !!data.email },
        { label: "บัญชีธนาคาร", done: !!(data.bankAccountNo && data.bankName) },
        { label: "PromptPay", done: !!(data.promptpayAccount || data.promptpay_account) },
        { label: "โลโก้", done: !!(data.logo_url || data.logoUrl) },
      ];

      const completed = checklist.filter((c) => c.done).length;
      const lines = checklist.map(
        (c) => `${c.done ? "✅" : "❌"} ${c.label}`,
      );

      return {
        type: "text",
        text:
          `⚙️ **ตั้งค่าธุรกิจ** (${completed}/${checklist.length})\n\n` +
          lines.join("\n") +
          (completed < checklist.length
            ? "\n\nพิมพ์ เช่น: ตั้งค่าชื่อ ร้านกาแฟ ABC"
            : "\n\n✅ ตั้งค่าครบแล้ว!"),
      };
    }

    // Update field
    const fieldMap: Record<string, string> = {
      name: "name",
      address: "address",
      taxId: "taxId",
      phone: "phone",
      email: "email",
    };

    if (fieldMap[field] && value) {
      await businessRef.update({
        [fieldMap[field]]: value,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const fieldNames: Record<string, string> = {
        name: "ชื่อธุรกิจ",
        address: "ที่อยู่",
        taxId: "เลขภาษี",
        phone: "เบอร์โทร",
        email: "อีเมล",
      };

      return {
        type: "text",
        text: `✅ อัปเดต${fieldNames[field] || field}เรียบร้อย: ${value}`,
        quickReplies: ["เช็คการตั้งค่า", "เมนู"],
      };
    }

    return {
      type: "text",
      text: `ต้องการตั้งค่า${field} เป็นอะไรครับ? พิมพ์บอกมาได้เลย`,
    };
  },
};

// ============ Skill 8: customer_info (Mini CRM) ============

const customerInfoSkill: JarvisSkill = {
  name: "customer_info",
  description:
    "ดูประวัติลูกค้าแบบละเอียด — ยอดซื้อ เอกสารทั้งหมด ยอดค้างชำระ หรือสรุปลูกค้าท็อป. ใช้เมื่อ user พิมพ์ ลูกค้า{ชื่อ}, ประวัติลูกค้า, ลูกค้าท็อป",
  parameters: {
    query: {
      type: "string",
      description: "ชื่อลูกค้าที่ต้องการดูประวัติ หรือ 'ท็อป' สำหรับสรุป top customers",
      required: true,
    },
    limit: {
      type: "number",
      description: "จำนวนที่แสดง (default: 5)",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const query = (params.query as string || "").trim();
    const limit = Math.min((params.limit as number) || 5, 10);

    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) {
      return buildJarvisLinkRequiredResponse();
    }

    const docsRef = db.collection(`users/${user.uid}/businesses/${user.businessId}/documents`);
    const docsSnapshot = await docsRef.orderBy("createdAt", "desc").limit(500).get();
    const allDocs = docsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // ===== TOP CUSTOMERS =====
    if (/ท็อป|top|ทั้งหมด|สรุป/i.test(query)) {
      const customerMap = new Map<string, { name: string; revenue: number; docCount: number; unpaid: number }>();

      for (const d of allDocs) {
        const name = (d as Record<string, unknown> & { customerSnapshot?: { displayName?: string }; customer_name?: string }).customerSnapshot?.displayName
          || (d as Record<string, unknown> & { customer_name?: string }).customer_name || "ไม่ระบุ";
        const amount = ((d as Record<string, unknown> & { money?: { total_amount?: number } }).money?.total_amount
          || (d as Record<string, unknown> & { total_amount?: number }).total_amount || 0) as number;
        const docType = ((d as Record<string, unknown>).docType || (d as Record<string, unknown>).doc_type || "") as string;
        const status = ((d as Record<string, unknown>).status || "") as string;

        const existing = customerMap.get(name) || { name, revenue: 0, docCount: 0, unpaid: 0 };
        existing.docCount++;
        if (docType === "RECEIPT") existing.revenue += amount;
        if ((docType === "BILL") && (status === "ISSUED" || status === "UNPAID" || status === "AWAITING_PAYMENT")) {
          existing.unpaid += amount;
        }
        customerMap.set(name, existing);
      }

      const sorted = Array.from(customerMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      if (sorted.length === 0) {
        return { type: "text", text: "📊 ยังไม่มีข้อมูลลูกค้าครับ" };
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = sorted.map((c, i) => {
        let line = `${medals[i] || `${i + 1}.`} **${c.name}**\n   💰 ฿${c.revenue.toLocaleString()} | 📄 ${c.docCount} เอกสาร`;
        if (c.unpaid > 0) line += ` | ⏰ ค้าง ฿${c.unpaid.toLocaleString()}`;
        return line;
      });

      return {
        type: "text",
        text: `🏆 **ลูกค้าท็อป ${sorted.length}**\n\n${lines.join("\n\n")}`,
        quickReplies: sorted.slice(0, 3).map((c) => `ลูกค้า ${c.name}`),
      };
    }

    // ===== SEARCH SPECIFIC CUSTOMER =====
    const matchingDocs = allDocs.filter((d) => {
      const data = d as Record<string, unknown> & { customerSnapshot?: { displayName?: string }; customer_name?: string };
      const name = (data.customerSnapshot?.displayName || data.customer_name || "").toLowerCase();
      return name.includes(query.toLowerCase());
    });

    if (matchingDocs.length === 0) {
      return {
        type: "text",
        text: `🔍 ไม่พบเอกสารของลูกค้า "${query}" ครับ`,
        quickReplies: ["ลูกค้าท็อป", "ดูลูกค้าทั้งหมด"],
      };
    }

    // Aggregate stats
    const customerName = ((matchingDocs[0] as Record<string, unknown> & { customerSnapshot?: { displayName?: string }; customer_name?: string }).customerSnapshot?.displayName
      || (matchingDocs[0] as Record<string, unknown> & { customer_name?: string }).customer_name || query);

    const stats = { quo: 0, bill: 0, receipt: 0, revenue: 0, unpaid: 0 };
    for (const d of matchingDocs) {
      const data = d as Record<string, unknown>;
      const docType = (data.docType || data.doc_type || "") as string;
      const status = (data.status || "") as string;
      const amount = ((data as Record<string, unknown> & { money?: { total_amount?: number } }).money?.total_amount
        || (data.total_amount as number) || 0);

      if (docType === "QUO") stats.quo++;
      else if (docType === "BILL") {
        stats.bill++;
        if (status === "ISSUED" || status === "UNPAID" || status === "AWAITING_PAYMENT") {
          stats.unpaid += amount;
        }
      } else if (docType === "RECEIPT") {
        stats.receipt++;
        stats.revenue += amount;
      }
    }

    // Recent 5 documents
    const recent = matchingDocs.slice(0, 5);
    const docTypeEmoji: Record<string, string> = { QUO: "📋", BILL: "🧾", RECEIPT: "💰" };
    const docTypeLabel: Record<string, string> = { QUO: "เสนอราคา", BILL: "วางบิล", RECEIPT: "เสร็จ" };

    const recentLines = recent.map((d) => {
      const data = d as Record<string, unknown>;
      const docType = (data.docType || data.doc_type || "") as string;
      const amount = ((data as Record<string, unknown> & { money?: { total_amount?: number } }).money?.total_amount
        || (data.total_amount as number) || 0);
      const status = (data.status || "") as string;
      const emoji = docTypeEmoji[docType] || "📄";
      return `${emoji} ${data.docNo || "-"} | ${docTypeLabel[docType] || docType} | ฿${amount.toLocaleString()} | ${status}`;
    });

    let text =
      `👤 **${customerName}**\n\n` +
      `📊 **สรุป**\n` +
      `💰 รายได้รวม: ฿${stats.revenue.toLocaleString()}\n` +
      `📄 เอกสารทั้งหมด: ${matchingDocs.length} ฉบับ\n` +
      `   📋 เสนอราคา: ${stats.quo} | 🧾 วางบิล: ${stats.bill} | 💰 เสร็จ: ${stats.receipt}`;

    if (stats.unpaid > 0) {
      text += `\n\n⚠️ **ค้างชำระ: ฿${stats.unpaid.toLocaleString()}**`;
    }

    text += `\n\n📄 **เอกสารล่าสุด**\n${recentLines.join("\n")}`;

    const quickReplies: string[] = [];
    if (stats.unpaid > 0) quickReplies.push(`ออกใบเสร็จ ${customerName}`);
    quickReplies.push(`ออกใบเสนอราคา ${customerName}`);
    quickReplies.push("ลูกค้าท็อป");

    return { type: "text", text, quickReplies };
  },
};

// ============ Skill 9: show_menu ============

const showMenuSkill: JarvisSkill = {
  name: "show_menu",
  description:
    "แสดงเมนูหลัก แสดงสิ่งที่ทำได้ทั้งหมด. ใช้เมื่อ user พิมพ์ เมนู, menu, help, ทำอะไรได้บ้าง",
  parameters: {},
  execute: async (): Promise<JarvisResponse> => {
    return {
      type: "text",
      text:
        `🐱 ด็อกช่วยได้เรื่องนี้เลยครับ!\n\n` +
        `📄 **เอกสาร**\n` +
        `• ออกใบเสนอราคา / ใบวางบิล / ใบเสร็จ\n` +
        `• ดูเอกสารล่าสุด / ออกใบเสร็จจากบิล\n` +
        `• ส่งรูป หรือ อัดเสียง → ด็อกสร้างเอกสารให้เลย\n\n` +
        `📊 **รายงาน**\n` +
        `• ยอดขายเดือนนี้ / ลูกค้าท็อป / ใบค้างชำระ\n\n` +
        `👤 **ลูกค้า**\n` +
        `• เพิ่ม / ค้นหา / ดูประวัติลูกค้า\n\n` +
        `⚙️ **ตั้งค่า**\n` +
        `• ตั้งค่าธุรกิจ / เช็คโควต้า / อัพเกรดแพลน`,
      quickReplies: [
        "ออกใบเสนอราคา",
        "ยอดขายเดือนนี้",
        "ลูกค้าท็อป",
        "ตั้งค่าธุรกิจ",
      ],
    };
  },
};

// ============ Skill 10: repeat_last_document ============

const repeatLastDocumentSkill: JarvisSkill = {
  name: "repeat_last_document",
  description:
    "ออกเอกสารซ้ำเหมือนใบล่าสุด. ใช้เมื่อ user พูดว่า เหมือนเดิม, อีกใบ, ซ้ำ, repeat, เหมือนครั้งก่อน, ออกอีก",
  parameters: {},
  execute: async (
    _params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) return buildJarvisLinkRequiredResponse();

    // Get the most recent document
    const docsSnap = await db
      .collection(`users/${user.uid}/businesses/${user.businessId}/documents`)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (docsSnap.empty) {
      return { type: "text", text: "ยังไม่มีเอกสารเลยครับ ลองออกใบแรกกัน!", quickReplies: ["ออกใบเสนอราคา"] };
    }

    const lastDoc = docsSnap.docs[0].data();
    const customerName = lastDoc.customerSnapshot?.displayName || lastDoc.customer_name || "-";
    const items = (lastDoc.items || []).map((item: { name?: string; description_th?: string; qty?: number; unit_price?: number }) => ({
      name: item.name || item.description_th || "-",
      qty: item.qty || 1,
      price: item.unit_price || 0,
    }));
    const subtotal = lastDoc.money?.grand_total || lastDoc.total_amount || 0;

    // Save as new draft
    const draftRef = db.collection("jarvis_drafts").doc();
    await draftRef.set({
      uid: user.uid,
      businessId: user.businessId,
      lineUserId: ctx.lineUserId,
      docType: lastDoc.docType,
      customerName,
      items,
      subtotal,
      sourceDocNo: null,
      status: "pending_confirm",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const typeNames: Record<string, string> = { QUO: "ใบเสนอราคา", BILL: "ใบวางบิล", RECEIPT: "ใบเสร็จ" };
    const itemList = items.map((i: { name: string; qty: number; price: number }) => `• ${i.name} x${i.qty} = ฿${(i.qty * i.price).toLocaleString()}`).join("\n");

    return {
      type: "confirm",
      text:
        `🔄 ออก${typeNames[lastDoc.docType] || lastDoc.docType}ซ้ำเหมือนใบล่าสุด\n\n` +
        `👤 ${customerName}\n${itemList}\n💰 รวม ฿${subtotal.toLocaleString()}\n\n` +
        `ยืนยันเลยมั้ยครับ?`,
      confirmAction: `jarvis_confirm_doc_${draftRef.id}`,
    };
  },
};

// ============ Skill 11: batch_receipt ============

const batchReceiptSkill: JarvisSkill = {
  name: "batch_receipt",
  description:
    "ออกใบเสร็จทีเดียวหลายใบจากบิลค้างชำระ. ใช้เมื่อ user พูดว่า ออกใบเสร็จทุกบิล, ออกใบเสร็จทั้งหมด, batch, รวดเดียว",
  parameters: {},
  execute: async (
    _params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) return buildJarvisLinkRequiredResponse();

    // Get all BILLs, filter unpaid in memory (avoids composite index)
    const allBillsSnap = await db
      .collection(`users/${user.uid}/businesses/${user.businessId}/documents`)
      .where("docType", "==", "BILL")
      .limit(100)
      .get();

    const billsSnap = {
      empty: true as boolean,
      docs: allBillsSnap.docs.filter(d => {
        const status = d.data().status;
        return status === "ISSUED" || status === "UNPAID";
      }),
    };
    billsSnap.empty = billsSnap.docs.length === 0;

    if (billsSnap.empty) {
      return { type: "text", text: "ไม่มีบิลค้างชำระเลยครับ เยี่ยม! 🎉", quickReplies: ["ยอดขายเดือนนี้"] };
    }

    const bills = billsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    let totalAmount = 0;
    const billList = bills.map((b: any) => {
      const amt = b.money?.grand_total || b.total_amount || 0;
      totalAmount += amt;
      const name = b.customerSnapshot?.displayName || b.customer_name || "-";
      return `• ${b.docNo} — ${name} ฿${amt.toLocaleString()}`;
    }).join("\n");

    // Save batch info as draft
    const draftRef = db.collection("jarvis_drafts").doc();
    await draftRef.set({
      uid: user.uid,
      businessId: user.businessId,
      lineUserId: ctx.lineUserId,
      docType: "BATCH_RECEIPT",
      billIds: bills.map((b: any) => b.id),
      billCount: bills.length,
      totalAmount,
      status: "pending_confirm",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return {
      type: "confirm",
      text:
        `📦 พบ ${bills.length} บิลค้างชำระ รวม ฿${totalAmount.toLocaleString()}\n\n` +
        `${billList}\n\n` +
        `ออกใบเสร็จทั้งหมดเลยมั้ยครับ?`,
      confirmAction: `jarvis_confirm_batch_${draftRef.id}`,
    };
  },
};

// ============ Skill 12: save_template ============

const saveTemplateSkill: JarvisSkill = {
  name: "save_template",
  description:
    "บันทึกเอกสารล่าสุดเป็นแม่แบบ. ใช้เมื่อ user พูดว่า บันทึกแม่แบบ, save template, บันทึกเป็นเทมเพลต",
  parameters: {
    template_name: {
      type: "string",
      description: "ชื่อแม่แบบ เช่น งานรายเดือนคุณพลอย",
      required: true,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) return buildJarvisLinkRequiredResponse();

    const templateName = String(params.template_name || "").trim();
    if (!templateName) return { type: "text", text: "บอกชื่อแม่แบบด้วยครับ เช่น 'บันทึกแม่แบบ งานรายเดือนคุณพลอย'" };

    // Get the most recent document to use as template
    const docsSnap = await db
      .collection(`users/${user.uid}/businesses/${user.businessId}/documents`)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (docsSnap.empty) {
      return { type: "text", text: "ยังไม่มีเอกสารเลยครับ ออกใบสักใบก่อนแล้วค่อยบันทึกเป็นแม่แบบ" };
    }

    const lastDoc = docsSnap.docs[0].data();

    await db
      .collection(`users/${user.uid}/businesses/${user.businessId}/templates`)
      .add({
        name: templateName,
        docType: lastDoc.docType,
        customerName: lastDoc.customerSnapshot?.displayName || lastDoc.customer_name || "-",
        items: lastDoc.items || [],
        totalAmount: lastDoc.money?.grand_total || lastDoc.total_amount || 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      type: "text",
      text: `✅ บันทึกแม่แบบ "${templateName}" เรียบร้อยครับ!\nครั้งหน้าพิมพ์ "ออกจากแม่แบบ ${templateName}" ได้เลย`,
      quickReplies: ["ออกจากแม่แบบ " + templateName, "เมนู"],
    };
  },
};

// ============ Skill 13: use_template ============

const useTemplateSkill: JarvisSkill = {
  name: "use_template",
  description:
    "ออกเอกสารจากแม่แบบที่บันทึกไว้. ใช้เมื่อ user พูดว่า ออกจากแม่แบบ, ใช้เทมเพลต, use template, ดูแม่แบบ",
  parameters: {
    template_name: {
      type: "string",
      description: "ชื่อแม่แบบ หรือ 'ทั้งหมด' เพื่อดูรายการ",
      required: false,
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) return buildJarvisLinkRequiredResponse();

    const templateName = String(params.template_name || "").trim();
    const templatesRef = db.collection(`users/${user.uid}/businesses/${user.businessId}/templates`);

    // List all templates if no name specified
    if (!templateName || /ทั้งหมด|ดู|list/i.test(templateName)) {
      const snap = await templatesRef.orderBy("createdAt", "desc").limit(10).get();
      if (snap.empty) return { type: "text", text: "ยังไม่มีแม่แบบครับ ออกเอกสารแล้วพิมพ์ 'บันทึกแม่แบบ ชื่อ' ได้เลย" };

      const list = snap.docs.map(d => {
        const t = d.data();
        const typeNames: Record<string, string> = { QUO: "QUO", BILL: "BILL", RECEIPT: "REC" };
        return `• ${t.name} (${typeNames[t.docType] || t.docType}) — ${t.customerName} ฿${(t.totalAmount || 0).toLocaleString()}`;
      }).join("\n");

      return {
        type: "text",
        text: `📋 แม่แบบทั้งหมด:\n\n${list}\n\nพิมพ์ "ออกจากแม่แบบ ชื่อ" ได้เลยครับ`,
      };
    }

    // Find template by name (fuzzy match)
    const snap = await templatesRef.get();
    const match = snap.docs.find(d =>
      d.data().name.toLowerCase().includes(templateName.toLowerCase()),
    );

    if (!match) {
      return { type: "text", text: `ไม่เจอแม่แบบ "${templateName}" ครับ ลองพิมพ์ "ดูแม่แบบ" ดูรายการทั้งหมด`, quickReplies: ["ดูแม่แบบ"] };
    }

    const tmpl = match.data();
    const items = (tmpl.items || []).map((item: { name?: string; description_th?: string; qty?: number; unit_price?: number }) => ({
      name: item.name || item.description_th || "-",
      qty: item.qty || 1,
      price: item.unit_price || 0,
    }));
    const subtotal = tmpl.totalAmount || 0;

    // Save as draft
    const draftRef = db.collection("jarvis_drafts").doc();
    await draftRef.set({
      uid: user.uid,
      businessId: user.businessId,
      lineUserId: ctx.lineUserId,
      docType: tmpl.docType,
      customerName: tmpl.customerName,
      items,
      subtotal,
      sourceDocNo: null,
      status: "pending_confirm",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const typeNames: Record<string, string> = { QUO: "ใบเสนอราคา", BILL: "ใบวางบิล", RECEIPT: "ใบเสร็จ" };
    return {
      type: "confirm",
      text:
        `📋 ออก${typeNames[tmpl.docType] || tmpl.docType}จากแม่แบบ "${tmpl.name}"\n` +
        `👤 ${tmpl.customerName} — ฿${subtotal.toLocaleString()}\n\nยืนยันครับ?`,
      confirmAction: `jarvis_confirm_doc_${draftRef.id}`,
    };
  },
};

// ============ Skill 14: add_expense ============

const addExpenseSkill: JarvisSkill = {
  name: "add_expense",
  description:
    "บันทึกรายจ่ายธุรกิจ. ใช้เมื่อ user พูดว่า จ่าย, รายจ่าย, ค่าใช้จ่าย, expense, ซื้อ...บาท, จ่ายค่า...",
  parameters: {
    description: {
      type: "string",
      description: "รายละเอียดรายจ่าย เช่น ค่าน้ำมัน, ค่าเช่า, ซื้อกระดาษ",
      required: true,
    },
    amount: {
      type: "number",
      description: "จำนวนเงิน (บาท)",
      required: true,
    },
    category: {
      type: "string",
      description: "หมวดหมู่",
      required: false,
      enum: ["transport", "office", "food", "utility", "marketing", "other"],
    },
  },
  execute: async (
    params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    const db = getDb();
    const user = await resolveUser(ctx.lineUserId, db);
    if (!user) return buildJarvisLinkRequiredResponse();

    const description = String(params.description || "").trim();
    const amount = Number(params.amount) || 0;
    const category = String(params.category || "other");

    if (!description || amount <= 0) {
      return { type: "text", text: "บอกรายละเอียดกับจำนวนเงินด้วยครับ เช่น 'จ่ายค่าน้ำมัน 1500'" };
    }

    const categoryLabels: Record<string, string> = {
      transport: "🚗 เดินทาง",
      office: "🏢 สำนักงาน",
      food: "🍜 อาหาร",
      utility: "💡 สาธารณูปโภค",
      marketing: "📢 การตลาด",
      other: "📦 อื่นๆ",
    };

    await db
      .collection(`users/${user.uid}/businesses/${user.businessId}/expenses`)
      .add({
        description,
        amount,
        category,
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "jarvis",
      });

    return {
      type: "text",
      text: `✅ บันทึกรายจ่ายแล้ว\n${categoryLabels[category] || "📦"} ${description} — ฿${amount.toLocaleString()}`,
      quickReplies: ["สรุปรายจ่ายเดือนนี้", "ยอดขายเดือนนี้"],
    };
  },
};

// ============ Skill 15: expense_report ============

const expenseReportSkill: JarvisSkill = {
  name: "expense_report",
  description:
    "สรุปรายจ่ายเดือนนี้ รายรับรายจ่าย กำไร. ใช้เมื่อ user พูดว่า สรุปรายจ่าย, expense report, รายรับรายจ่าย, กำไร, ขาดทุน",
  parameters: {},
  execute: async (
    _params: Record<string, unknown>,
    ctx: JarvisContext,
  ): Promise<JarvisResponse> => {
    try {
      const db = getDb();
      const user = await resolveUser(ctx.lineUserId, db);
      if (!user) return buildJarvisLinkRequiredResponse();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startTs = startOfMonth.getTime();

      // Get expenses this month (single field query — no composite index needed)
      let totalExpense = 0;
      const categoryTotals: Record<string, number> = {};
      const categoryLabels: Record<string, string> = {
        transport: "🚗 เดินทาง",
        office: "🏢 สำนักงาน",
        food: "🍜 อาหาร",
        utility: "💡 สาธารณูปโภค",
        marketing: "📢 การตลาด",
        other: "📦 อื่นๆ",
      };
      let expenseCount = 0;

      try {
        const expSnap = await db
          .collection(`users/${user.uid}/businesses/${user.businessId}/expenses`)
          .where("date", ">=", startOfMonth)
          .get();

        expSnap.docs.forEach(d => {
          const exp = d.data();
          const amt = exp.amount || 0;
          totalExpense += amt;
          expenseCount++;
          const cat = exp.category || "other";
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        });
      } catch {
        // expenses collection may not exist yet — that's fine
      }

      // Get income — query RECEIPT only (no composite index needed), filter date in memory
      let totalIncome = 0;
      let receiptCount = 0;

      const recSnap = await db
        .collection(`users/${user.uid}/businesses/${user.businessId}/documents`)
        .where("docType", "==", "RECEIPT")
        .limit(200)
        .get();

      recSnap.docs.forEach(d => {
        const doc = d.data();
        const createdAt = doc.createdAt?.toDate?.()?.getTime?.() || 0;
        if (createdAt >= startTs) {
          totalIncome += doc.money?.grand_total || doc.total_amount || 0;
          receiptCount++;
        }
      });

      const profit = totalIncome - totalExpense;
      const profitEmoji = profit >= 0 ? "📈" : "📉";

      let expenseBreakdown = "";
      if (Object.keys(categoryTotals).length > 0) {
        expenseBreakdown = "\n\nแยกตามหมวด:\n" +
          Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt]) => `${categoryLabels[cat] || cat} ฿${amt.toLocaleString()}`)
            .join("\n");
      }

      const monthName = now.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

      return {
        type: "text",
        text:
          `💰 สรุปเดือน${monthName}\n\n` +
          `รายรับ: ฿${totalIncome.toLocaleString()} (${receiptCount} ใบเสร็จ)\n` +
          `รายจ่าย: ฿${totalExpense.toLocaleString()} (${expenseCount} รายการ)\n` +
          `${profitEmoji} กำไร: ฿${profit.toLocaleString()}` +
          expenseBreakdown,
        quickReplies: ["ยอดขายเดือนนี้", "ใบค้างชำระ"],
      };
    } catch (err) {
      console.error("[EXPENSE_REPORT] Error:", err);
      return { type: "text", text: "❌ ดึงข้อมูลไม่ได้ครับ ลองใหม่อีกทีนะ" };
    }
  },
};

// ============ Export ============

export const ezdocSkills: JarvisSkill[] = [
  createDocumentSkill,
  listDocumentsSkill,
  getReportSkill,
  manageCustomerSkill,
  customerInfoSkill,
  checkPaymentSkill,
  createReceiptFromInvoiceSkill,
  businessSetupSkill,
  repeatLastDocumentSkill,
  batchReceiptSkill,
  saveTemplateSkill,
  useTemplateSkill,
  addExpenseSkill,
  expenseReportSkill,
  showMenuSkill,
];
