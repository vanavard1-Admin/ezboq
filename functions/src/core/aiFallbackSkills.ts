/**
 * AI Fallback Skills — EzDoc skills ที่เขียนลง line_drafts (legacy draft store)
 *
 * ต่างจาก jarvis/ezdocSkills.ts:
 * - ใช้ draftStore (line_drafts/{uid}) แทน jarvis_drafts
 * - UID + businessId ส่งมาจาก conversationHandler โดยตรง (ไม่ต้อง resolveUser)
 * - สร้างได้แค่ draft → user ต้อง "ยืนยัน" ผ่าน flow เดิม
 */
import type { JarvisSkill, JarvisResponse } from "../jarvis/types";

/**
 * สร้าง skills สำหรับ AI fallback
 * uid/businessId ถูก capture ใน closure เพื่อให้ skill ใช้ได้ตรงๆ
 */
export function buildAIFallbackSkills(uid: string, businessId: string): JarvisSkill[] {
  return [
    buildCreateDocumentSkill(uid, businessId),
    buildShowMenuSkill(),
    buildBusinessSetupSkill(),
  ];
}

// ============ Skill: create_document ============

function buildCreateDocumentSkill(uid: string, businessId: string): JarvisSkill {
  return {
    name: "create_document",
    description:
      "สร้างเอกสารธุรกิจ (draft). QUO=ใบเสนอราคา, BILL=ใบวางบิล/ใบกำกับภาษี/invoice, RECEIPT=ใบเสร็จ. " +
      "เรียกเมื่อ user ต้องการสร้าง/ออกเอกสาร",
    parameters: {
      doc_type: {
        type: "string",
        description: "QUO=ใบเสนอราคา, BILL=ใบวางบิล/ใบกำกับภาษี, RECEIPT=ใบเสร็จ",
        required: true,
        enum: ["QUO", "BILL", "RECEIPT"],
      },
      customer_name: {
        type: "string",
        description: "ชื่อลูกค้าหรือบริษัท (ถ้า user บอก)",
        required: false,
      },
      items: {
        type: "string",
        description:
          'รายการสินค้า/บริการ JSON array เช่น [{"name":"เสื้อยืด","qty":3,"price":200}]',
        required: false,
      },
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<JarvisResponse> => {
      try {
        const draftStore = await import("./draftStore");

        const docType = (params.doc_type as string) || "QUO";
        const validDocType = (
          ["QUO", "BILL", "RECEIPT"].includes(docType) ? docType : "QUO"
        ) as "QUO" | "BILL" | "RECEIPT";

        // Create or reuse draft in line_drafts/{uid}
        await draftStore.getOrCreateDraft(uid, businessId, validDocType);

        // Build update patch
        const patch: Record<string, unknown> = {};

        if (params.customer_name) {
          patch.customerName = params.customer_name as string;
        }

        if (params.items) {
          try {
            const raw =
              typeof params.items === "string"
                ? JSON.parse(params.items as string)
                : params.items;
            if (Array.isArray(raw) && raw.length > 0) {
              const items = raw.map((item: Record<string, unknown>) => ({
                name: (item.name as string) || "",
                qty: (item.qty as number) || 1,
                price: (item.price as number) || 0,
              }));
              const subtotal = items.reduce(
                (sum: number, item: { qty: number; price: number }) =>
                  sum + item.qty * item.price,
                0,
              );
              patch.items = items;
              patch.subtotal = subtotal;
              patch.total = subtotal;
            }
          } catch {
            // Ignore JSON parse errors — AI may have sent bad format
          }
        }

        if (Object.keys(patch).length > 0) {
          await draftStore.updateDraft(uid, patch);
        }

        // Display updated draft
        const draft = await draftStore.getDraft(uid);

        if (draft) {
          const summary = draftStore.formatDraftForDisplay(draft);
          const docNames: Record<string, string> = {
            QUO: "ใบเสนอราคา",
            BILL: "ใบวางบิล",
            RECEIPT: "ใบเสร็จ",
          };
          return {
            type: "text",
            text:
              `ติ๊ดๆ สร้างแบบร่าง${docNames[validDocType] || "เอกสาร"}แล้วครับเจ้านาย\n\n` +
              `${summary}\n\n` +
              `แก้ไขหรือเพิ่มข้อมูลได้เลย พร้อมแล้วกด "ยืนยัน"`,
            quickReplies: ["ยืนยัน", "ยกเลิก", "เมนู"],
          };
        }

        const docNames2: Record<string, string> = {
          QUO: "ใบเสนอราคา",
          BILL: "ใบวางบิล",
          RECEIPT: "ใบเสร็จ",
        };
        return {
          type: "text",
          text: `ติ๊ดๆ สร้างแบบร่าง${docNames2[validDocType] || "เอกสาร"}แล้วครับ พิมพ์ข้อมูลเพิ่มได้เลย`,
        };
      } catch (err) {
        console.error("[AI_FALLBACK] create_document error:", err);
        return {
          type: "text",
          text: "โอ๊ะ! เกิดข้อผิดพลาดครับเจ้านาย ลองพิมพ์ใหม่อีกครั้ง",
        };
      }
    },
  };
}

// ============ Skill: show_menu ============

function buildShowMenuSkill(): JarvisSkill {
  return {
    name: "show_menu",
    description:
      "แสดงเมนูหลัก/วิธีใช้. เรียกเมื่อ user ถามว่าทำอะไรได้บ้าง หรือต้องการดูเมนู",
    parameters: {},
    execute: async (): Promise<JarvisResponse> => {
      return {
        type: "text",
        text:
          "บี๊บ! ด๊อกๆ ช่วยได้หลายอย่างเลยครับเจ้านาย\n\n" +
          'พิมพ์ชื่อเอกสารได้เลย เช่น "ใบเสนอราคา" "ใบวางบิล" "ใบเสร็จ"\n' +
          'หรือพิมพ์ "ยอดขาย" ดูรายงานได้ครับ',
        quickReplies: ["ใบเสนอราคา", "ใบวางบิล", "ใบเสร็จ", "ยอดขาย"],
      };
    },
  };
}

// ============ Skill: business_setup ============

function buildBusinessSetupSkill(): JarvisSkill {
  return {
    name: "business_setup",
    description:
      "แนะนำตั้งค่าธุรกิจ เช่น เปลี่ยนชื่อ ที่อยู่ เลขภาษี บัญชีธนาคาร โลโก้. " +
      "เรียกเมื่อ user ถามเรื่องตั้งค่า/แก้ไขข้อมูลธุรกิจ",
    parameters: {},
    execute: async (): Promise<JarvisResponse> => {
      return {
        type: "text",
        text:
          "ตั้งค่าธุรกิจได้ 2 ทางครับเจ้านาย\n\n" +
          '1) พิมพ์ "ตั้งค่า" ตรงนี้เลย\n' +
          "2) เข้าเว็บ https://doc.ezboq.com แก้ไขได้ละเอียดกว่า",
        quickReplies: ["ตั้งค่า", "เมนู"],
      };
    },
  };
}
