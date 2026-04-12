import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Onboarding Service
 * 
 * Handles first-time user onboarding and help text.
 */

import * as admin from 'firebase-admin';
import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';

const db = getDb();

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return true;

    const userData = userDoc.data();
    return !userData?.onboarding_completed;
  } catch (e) {
    console.warn('[onboarding] Error checking onboarding status:', e);
    return false;
  }
}

/**
 * Mark onboarding as completed
 * Also sets up retention flow tracking
 * 
 * @param userId - User ID
 * @param traceId - Optional trace ID for event logging
 */
export async function completeOnboarding(userId: string, traceId?: string): Promise<void> {
  try {
    await db.collection('users').doc(userId).set({
      onboarding_completed: true,
      onboarding_completed_at: admin.firestore.FieldValue.serverTimestamp(),
      onboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp(), // For retention flow
      retentionFlowActive: true, // Enable retention flow
    }, { merge: true });

    // ✅ D1: Log onboarding event (non-blocking)
    if (traceId) {
      try {
        const { appendDocumentEvent } = await import('./documentEvents');
        // Use a synthetic docId for onboarding events
        await appendDocumentEvent(`onboarding_${userId}`, {
          event: 'ONBOARDING_COMPLETED',
          traceId,
          handler: 'onboardingService',
          result_code: 'OK',
          meta: {
            userId,
          },
        }).catch(err => {
          console.warn(`[onboarding] Failed to log event (non-blocking):`, err);
        });
      } catch (importError) {
        // documentEvents may not exist - non-blocking
        console.warn(`[onboarding] documentEvents not available (non-blocking):`, importError);
      }
    }

    console.log(`[onboarding] Onboarding completed: userId=${userId}, traceId=${traceId || 'none'}`);
  } catch (e) {
    console.warn('[onboarding] Error marking onboarding complete:', e);
  }
}

/**
 * Get onboarding messages (5 messages)
 */
export function getOnboardingMessages(profile?: { accountName?: string; nickname?: string }): string[] {
  const accountName = (profile?.accountName || 'EzDOC').trim();
  const nickname = profile?.nickname?.trim();
  const nicknameLine = nickname ? `สวัสดี เจ้านาย ${nickname}` : 'สวัสดี เจ้านาย';
  const mascotName = accountName ? `หุ่นแมว${accountName}` : 'หุ่นแมว EzDOC';

  return [
    // Message 1: Welcome + safety
    `บี๊บ! EzDOC ออนไลน์แล้วครับเจ้านาย 🤖🐾 ติ๊ดๆ ด๊อกๆ คือ ${mascotName} ที่ชอบจัดเอกสารให้มนุษย์ 📄\n${nicknameLine}\n\n✅ ผู้ใช้ใหม่ใช้ฟรีได้ ${STARTER_FREE_DOC_QUOTA} ใบแรก\nเอกสารฟรีจะมีลายน้ำ EzDOC\nเริ่มไวใน 60 วิ\n1) พิมพ์ "ทำใบเสนอราคา"\n2) ส่งข้อมูลสั้น ๆ หรือก๊อป-แก้-ส่งบล็อกตัวอย่าง\n3) พิมพ์ "ออกเอกสาร"\n\nพิมพ์ติดกันก็ได้ ลูกค้าแมวเป้า / อาหารแมว3000`,

    // Message 2: Link + business setup (one-step)
    `ติ๊ดๆ ถ้าต้องการให้ด๊อกๆ จำเอกสาร ลูกค้า และข้อมูลธุรกิจของคุณไว้ ให้เชื่อมต่อบัญชีครับเจ้านาย\nปลอดภัย LINE Login + HTTPS + ไม่ขอรหัสผ่าน\n\nตั้งค่าธุรกิจช่วยให้เอกสารดูเป็นทางการ\nพิมพ์ “ตั้งค่าธุรกิจ” ได้เลยครับ`,

    // Message 3: Document types
    `ติ๊ดๆ เอกสารที่สร้างได้ครับ\n\n1. ใบเสนอราคา (QUO)\n2. ใบวางบิล (INV)\n3. ใบเสร็จ (REC)\n\nต่อเอกสาร\n- ใบวางบิลจาก QUO-xxxx\n- ยืนยันรับเงิน INV-xxxx\n- ออกใบเสร็จหลังยืนยันรับเงิน`,

    // Message 4: Usage example
    `ติ๊ดๆ ตัวอย่างก๊อป-แก้-ส่งครับเจ้านาย\n\nลูกค้า แมวเป้า\nรายการ\n- อาหารแมว 2 x 1500\n- ค่าขนส่ง 300\nประเภทเอกสาร ใบเสนอราคา\nหมายเหตุ -\n\nพร้อมแล้วพิมพ์ "ออกเอกสาร" ได้เลยครับ`,

    // Message 5: Image upload & help
    `📸 อัปโหลดรูปภาพครับ\n\nส่งรูป แล้วพิมพ์\n- "โลโก้"\n- "ลายเซ็น"\n- "ตราประทับ"\n\nถ้าอยากดูคำสั่งทั้งหมด\nพิมพ์ "วิธีใช้งาน" หรือ "เมนู" ได้เลยครับเจ้านาย`,
  ];
}

async function buildCompactOnboardingMessages(
  userId: string,
  nickname?: string,
): Promise<Array<Record<string, unknown>>> {
  const { getUserPlan } = await import('../core/planService');
  const { buildWelcomeFlexMessage, getWelcomeQuickReply } = await import('./uxCopy');
  const { buildDocumentExamplesFlexMessage } = await import('./documentExamplesService');

  const plan = await getUserPlan(userId);
  const quickReply = getWelcomeQuickReply(plan, { linked: true }).slice(0, 13);
  const introText =
    `${nickname ? `เชื่อมต่อบัญชีเรียบร้อยแล้วครับ ${nickname}\n\n` : 'เชื่อมต่อบัญชีเรียบร้อยแล้วครับ\n\n'}` +
    'จากนี้ด๊อกๆ จะช่วยจำเอกสาร ลูกค้า และข้อมูลงานของคุณไว้ให้ครับ\n' +
    'ถ้าจะเริ่มทันที กดปุ่มด้านล่างหรือพิมพ์ "ทำใบเสนอราคา" ได้เลย';

  return [
    buildWelcomeFlexMessage(plan, { linked: true }),
    buildDocumentExamplesFlexMessage(),
    {
      type: 'text',
      text: introText,
      quickReply: {
        items: quickReply,
      },
    },
  ];
}

/**
 * Get usage guide text
 */
export function getUsageGuide(): string {
  return `บี๊บ! ด๊อกๆ สรุปวิธีใช้งานให้เจ้านาย 📖

สร้างเอกสาร
1. พิมพ์ "ทำใบเสนอราคา"
2. พิมพ์ "ลูกค้า [ชื่อ]"
3. พิมพ์ "เพิ่มรายการ [ชื่อ] [ราคา]" เพิ่มได้หลายรายการ
4. พิมพ์ "ยืนยัน" ได้ PDF ทันที

ต่อเอกสาร
สร้างใบวางบิลจาก QUO-xxxx
สร้างใบเสร็จจาก INV-xxxx
ออกครบชุดจาก QUO-xxxx

ตั้งค่า
ตั้งค่าธุรกิจ / ตั้งค่าพร้อมเพย์ [เลข]
ตั้งค่าธนาคาร [รหัส] [เลขบัญชี]
ตั้งค่าธีม เขียว แดง น้ำเงิน ขาวดำ

เชื่อมต่อบัญชี (สำหรับรายงาน)
พิมพ์ "เชื่อมต่อบัญชี" หรือ "รายงาน"

อัปโหลดรูป
ส่งรูปแล้วพิมพ์ "โลโก้" "ลายเซ็น" หรือ "ตราประทับ"`;
}

/**
 * Get help text (command list) - copy/paste oriented
 */
export function getHelpText(): string {
  return `บี๊บ! ด๊อกๆ รวมคำสั่งทั้งหมดให้เจ้านาย 📋

ตัวอย่างที่ใช้บ่อย
1. ตั้งค่าธุรกิจ  พิมพ์ "ตั้งค่าธุรกิจแบบฟอร์ม" แล้วก๊อปไปแก้
2. ตั้งค่าธนาคาร  ตั้งค่าธนาคาร กสิกร 1234567890 บริษัท ABC
3. ซื้อแพ็ค  พิมพ์ "ซื้อแพ็ค 99" แล้วรอ QR โอนเงิน ส่งสลิป

เอกสาร
ทำใบเสนอราคา / ลูกค้า [ชื่อ] / เพิ่มรายการ [ชื่อ] [ราคา]
หมายเหตุ [ข้อความ] / วันที่ 01/02/2569
ยืนยัน / ออกเอกสาร / ลบ (ลบรายการล่าสุด)

ต่อเอกสาร
ใบวางบิลจาก QUO-xxxx / ใบเสร็จจาก INV-xxxx / ออกครบชุดจาก QUO-xxxx

ธุรกิจ
ตั้งค่าธุรกิจแบบฟอร์ม / ตั้งค่าธนาคาร [ชื่อ] [เลข] [ชื่อ]
ตั้งค่าพร้อมเพย์ [เลข] / ตั้งค่าธีม เขียว แดง น้ำเงิน ขาวดำ
ส่งรูป แล้วพิมพ์ "โลโก้" "ลายเซ็น" "ตราประทับ"
ตั้งผู้ลงนาม [ชื่อ] ตำแหน่ง [ตำแหน่ง]

แพ็ค
ซื้อแพ็ค 99 / สถานะแพ็ค / ประวัติการซื้อแพ็ค / เช็คสลิป

รายงาน (ต้องเชื่อมต่อบัญชี)
รายงาน / รายงาน เดือนนี้ / เดือนก่อน / เดือน 12/2568
บิลค้าง / ลูกค้ายอดสูง / บริการขายดี

โปรโมชัน
คูปอง / แนะนำเพื่อน / ใช้โค้ด [CODE]

ช่วยเหลือ
รายงานปัญหา [ข้อความ] / เชื่อมต่อบัญชี / เมนู / วิธีใช้งาน`;
}

/**
 * Get fallback message for true free-text input that we don't understand
 * This is ONLY for genuine text input, NOT button actions
 * 
 * Tone: Polite, non-blaming, with clear guidance
 * Button actions should NEVER reach this function
 */
export function getFallbackMessage(input?: string): string {
  void input;
  // Never blame the user - always be helpful and polite
  let response = `บี๊บ! ด๊อกๆ ช่วยต่อให้ได้นะครับ เจ้านาย 😊`;

  response += `\n\nกดปุ่มด้านล่างได้เลยครับ`;

  return response;
}

/**
 * Suggest corrections for common typos
 */
export function suggestTypoCorrection(input: string): string | null {
  const text = input.toLowerCase().trim();

  const corrections: Record<string, { pattern: RegExp; suggestion: string; command: string }> = {
    // Missing space after "ลูกค้า"
    'customer_no_space': {
      pattern: /^ลูกค้า\S+/,
      suggestion: 'ลูกค้า [ชื่อ]',
      command: text.replace(/^ลูกค้า/, 'ลูกค้า '),
    },
    // Typo: เพิ้ม -> เพิ่ม
    'add_item_typo': {
      pattern: /^เพิ้มรายการ/,
      suggestion: 'เพิ่มรายการ',
      command: text.replace(/^เพิ้มรายการ/, 'เพิ่มรายการ'),
    },
    // Missing space after "เพิ่มรายการ"
    'add_item_no_space': {
      pattern: /^เพิ่มรายการ\S+\d+$/,
      suggestion: 'เพิ่มรายการ [ชื่อ] [ราคา]',
      command: text.replace(/^เพิ่มรายการ(\S+)(\d+)$/, 'เพิ่มรายการ $1 $2'),
    },
    // "ใบเสนอ" without "ราคา"
    'quotation_short': {
      pattern: /^ใบเสนอ$/,
      suggestion: 'ทำใบเสนอราคา',
      command: 'ทำใบเสนอราคา',
    },
    // Common typo: ใบเสรอราคา
    'quotation_typo': {
      pattern: /^(?:ทำ)?ใบเสรอราคา$/,
      suggestion: 'ทำใบเสนอราคา',
      command: 'ทำใบเสนอราคา',
    },
    // "บิล" alone
    'invoice_short': {
      pattern: /^บิล$/,
      suggestion: 'ทำใบวางบิล',
      command: 'ทำใบวางบิล',
    },
    // "เสร็จ" alone
    'receipt_short': {
      pattern: /^เสร็จ$/,
      suggestion: 'ทำใบเสร็จ',
      command: 'ทำใบเสร็จ',
    },
  };

  for (const [, correction] of Object.entries(corrections)) {
    if (correction.pattern.test(text)) {
      return `💡 คุณหมายถึง "${correction.suggestion}" หรือเปล่า?\n\nลอง: ${correction.command}`;
    }
  }

  return null;
}

/**
 * Push onboarding messages to LINE (async, non-blocking)
 */
export async function sendOnboardingAsync(lineUserId: string, userId: string): Promise<void> {
  try {
    let nickname: string | undefined;
    try {
      const lineSnap = await db.collection('lineUsers').doc(lineUserId).get();
      const lineData = lineSnap.exists ? (lineSnap.data() as { lineDisplayName?: string }) : null;
      if (lineData?.lineDisplayName) {
        nickname = lineData.lineDisplayName;
      }
    } catch (err) {
      console.warn('[onboarding] Failed to read lineUsers for nickname:', err);
    }

    if (!nickname) {
      try {
        const userRecord = await admin.auth().getUser(userId);
        if (userRecord.displayName) {
          nickname = userRecord.displayName;
        }
      } catch (err) {
        console.warn('[onboarding] Failed to read auth displayName:', err);
      }
    }

    const messages = await buildCompactOnboardingMessages(userId, nickname);
    const { pushLineMessages } = await import('./lineService');
    await pushLineMessages(lineUserId, messages);

    // Mark onboarding as completed
    await completeOnboarding(userId);

    console.log(`[onboarding] Completed for userId=${userId}`);
  } catch (e) {
    console.error('[onboarding] Error sending onboarding:', e);
  }
}
