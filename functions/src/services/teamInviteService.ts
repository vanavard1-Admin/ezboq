import { getDb } from '../core/firebaseAdmin';
import * as admin from 'firebase-admin';
import { getOrCreateSubscription } from '../core/subscriptionService';
import { getEffectiveSubscriptionPlan, isSubscriptionCurrentlyActive } from '../core/planService';

const db = getDb();

const LINE_OA_URL = 'https://line.me/R/ti/p/@ezdoc';
const INVITE_TTL_DAYS = 7;
const TEAM_FEATURE_ENABLED = true;

type InviteDoc = {
  code: string;
  owner_user_id: string;
  owner_business_id: string;
  seat_total: number;
  used_count: number;
  used_by: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'FULL';
  created_at: admin.firestore.Timestamp;
  expires_at: admin.firestore.Timestamp;
  updated_at?: admin.firestore.Timestamp;
};

function normalizeInviteCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
}

export function parseTeamInviteCodeFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(เข้าทีม|join\s*team|team\s*code)\s*[:=]?\s*([A-Za-z0-9-]+)/i);
  if (match && match[2]) return normalizeInviteCode(match[2]);

  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 2 && /(เข้าทีม|team|join)/i.test(tokens[0])) {
    return normalizeInviteCode(tokens[1]);
  }
  return null;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 5; i += 1) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `TEAM-${random}`;
    const snap = await db.collection('team_invites').doc(code).get();
    if (!snap.exists) return code;
  }
  return `TEAM-${Date.now().toString(36).toUpperCase()}`;
}

async function getActiveBusinessId(userId: string): Promise<string | null> {
  const userSnap = await db.doc(`users/${userId}`).get();
  if (!userSnap.exists) return null;
  const data = userSnap.data() || {};
  return (data.activeBusinessId as string) || null;
}

export async function buildTeamInviteMessage(
  userId: string,
  businessId?: string | null
): Promise<string> {
  if (!TEAM_FEATURE_ENABLED) {
    return 'บี๊บ! ตอนนี้แพ็กทีมยังไม่พร้อมใช้งานครบทุกส่วนครับเจ้านาย\nถ้าจะเริ่มใช้งานตอนนี้ พิมพ์ "ซื้อแพ็ค 99" ได้เลยครับ';
  }
  const subscription = await getOrCreateSubscription(userId);
  const plan = getEffectiveSubscriptionPlan(subscription);

  if (plan !== 'TEAM' || !isSubscriptionCurrentlyActive(subscription)) {
    return (
      'บี๊บ! ฟีเจอร์ทีมใช้ได้เฉพาะ EzDOC Team 279 บาทครับเจ้านาย\n' +
      'แพ็กนี้ใช้งานได้หลายผู้ใช้ และออกเอกสารได้ไม่จำกัด\n' +
      'ชวนทีมได้สูงสุด 3 คน\n\n' +
      'พิมพ์ "ซื้อแพ็ค 279" ได้เลยครับ'
    );
  }

  const storedSeatTotal = subscription.seatTotal || 3;
  const seatTotal = Math.min(storedSeatTotal, 3);
  const seatUsed = Math.max(subscription.seatUsed || 1, 1);
  const remaining = Math.max(0, seatTotal - seatUsed);
  if (remaining <= 0) {
    return 'โอ๊ะ! ที่นั่งทีมเต็มแล้วครับเจ้านาย (3 คน)';
  }

  let activeBusinessId = await getActiveBusinessId(userId);
  if (!activeBusinessId && businessId) {
    activeBusinessId = businessId;
    await db.doc(`users/${userId}`).set({ activeBusinessId }, { merge: true });
  }

  if (storedSeatTotal > 3) {
    await db.collection('subscriptions').doc(userId).set({ seatTotal: 3 }, { merge: true });
  }

  if (!activeBusinessId) {
    return 'โอ๊ะ! ยังไม่ตั้งค่าธุรกิจครับเจ้านาย\nตั้งค่าธุรกิจก่อน แล้วค่อยเชิญทีมได้เลยครับ';
  }

  const userSnap = await db.doc(`users/${userId}`).get();
  const userData = userSnap.data() || {};
  const existingCode = userData.team_invite_code as string | undefined;
  const existingExpires = userData.team_invite_expires_at as admin.firestore.Timestamp | undefined;
  const now = admin.firestore.Timestamp.now();
  let inviteCode = existingCode || '';
  let expiresAt = existingExpires;

  if (!inviteCode || !expiresAt || expiresAt.toMillis() <= now.toMillis()) {
    inviteCode = await generateUniqueInviteCode();
    expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    const inviteDoc: InviteDoc = {
      code: inviteCode,
      owner_user_id: userId,
      owner_business_id: activeBusinessId,
      seat_total: seatTotal,
      used_count: 0,
      used_by: [],
      status: 'ACTIVE',
      created_at: now,
      expires_at: expiresAt,
    };
    await db.collection('team_invites').doc(inviteCode).set(inviteDoc, { merge: true });
    await db.doc(`users/${userId}`).set(
      {
        team_invite_code: inviteCode,
        team_invite_expires_at: expiresAt,
      },
      { merge: true }
    );
  }

  return (
    'บี๊บ! ลิงก์ชวนทีมพร้อมแล้วครับเจ้านาย\n\n' +
    `ลิงก์แอด ${LINE_OA_URL}\n` +
    `โค้ดทีม ${inviteCode}\n\n` +
    'ให้เพื่อนพิมพ์ เข้าทีม <โค้ด>\n' +
    `โควต้าคงเหลือ ${remaining} คน`
  );
}

export async function joinTeamWithCode(userId: string, text: string): Promise<string> {
  if (!TEAM_FEATURE_ENABLED) {
    return 'บี๊บ! ตอนนี้แพ็กทีมยังไม่พร้อมใช้งานครบทุกส่วนครับเจ้านาย\nถ้าจะเริ่มใช้งานตอนนี้ พิมพ์ "ซื้อแพ็ค 99" ได้เลยครับ';
  }
  const inviteCode = parseTeamInviteCodeFromText(text);
  if (!inviteCode) {
    return 'ติ๊ดๆ พิมพ์แบบนี้นะครับเจ้านาย\nตัวอย่าง เข้าทีม TEAM-ABC123';
  }

  const userSnap = await db.doc(`users/${userId}`).get();
  const userData = userSnap.data() || {};
  if (userData.team_owner_id) {
    return 'ติ๊ดๆ เจ้านายอยู่ในทีมอยู่แล้วครับ\nถ้าต้องการออก ให้พิมพ์ เมนู ได้เลยครับ';
  }

  const inviteRef = db.collection('team_invites').doc(inviteCode);
  const now = admin.firestore.Timestamp.now();

  try {
    await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) throw new Error('INVITE_NOT_FOUND');
      const invite = inviteSnap.data() as InviteDoc;

      if (invite.status !== 'ACTIVE') throw new Error('INVITE_INACTIVE');
      if (invite.expires_at.toMillis() <= now.toMillis()) throw new Error('INVITE_EXPIRED');
      if (invite.used_by?.includes(userId)) throw new Error('INVITE_ALREADY_USED');

      const ownerId = invite.owner_user_id;
      if (!ownerId) throw new Error('INVITE_OWNER_MISSING');
      if (ownerId === userId) throw new Error('INVITE_SELF');

      const ownerSubRef = db.collection('subscriptions').doc(ownerId);
      const ownerSubSnap = await tx.get(ownerSubRef);
      if (!ownerSubSnap.exists) throw new Error('OWNER_SUB_MISSING');
      const ownerSub = ownerSubSnap.data() as any;
      const ownerPlan = getEffectiveSubscriptionPlan(ownerSub);
      if (ownerPlan !== 'TEAM' || !isSubscriptionCurrentlyActive(ownerSub)) throw new Error('OWNER_NOT_TEAM');

      const seatTotal = ownerSub.seatTotal || 3;
      const seatUsed = ownerSub.seatUsed || 1;
      if (seatUsed >= seatTotal) throw new Error('TEAM_FULL');

      const ownerBusinessId = invite.owner_business_id;
      const ownerBizRef = db.doc(`users/${ownerId}/businesses/${ownerBusinessId}`);
      const ownerBizSnap = await tx.get(ownerBizRef);
      if (!ownerBizSnap.exists) throw new Error('BUSINESS_NOT_FOUND');
      const ownerBizData = ownerBizSnap.data() || {};

      const newBizRef = db.collection(`users/${userId}/businesses`).doc();
      tx.set(newBizRef, {
        ...ownerBizData,
        createdAt: now,
        updatedAt: now,
        cloned_from_user_id: ownerId,
        cloned_from_business_id: ownerBusinessId,
      });

      const memberSubRef = db.collection('subscriptions').doc(userId);
      tx.set(
        memberSubRef,
        {
          uid: userId,
          plan: 'TEAM',
          status: 'ACTIVE',
          seatTotal: 1,
          seatUsed: 1,
          autoRenew: false,
          nextBillingAt: ownerSub.nextBillingAt || null,
          periodStart: ownerSub.periodStart || now,
          periodEnd: ownerSub.periodEnd || now,
          createdAt: ownerSub.createdAt || now,
          updatedAt: now,
          team_owner_id: ownerId,
        },
        { merge: true }
      );

      tx.set(
        db.doc(`users/${userId}`),
        {
          activeBusinessId: newBizRef.id,
          team_owner_id: ownerId,
          team_joined_at: now,
          team_invite_code: inviteCode,
        },
        { merge: true }
      );

      tx.update(ownerSubRef, {
        seatUsed: seatUsed + 1,
        updatedAt: now,
      });

      tx.update(inviteRef, {
        used_count: (invite.used_count || 0) + 1,
        used_by: admin.firestore.FieldValue.arrayUnion(userId),
        updated_at: now,
      });
    });
  } catch (error: any) {
    const reason = error?.message || 'UNKNOWN';
    if (reason === 'INVITE_NOT_FOUND') {
      return 'โอ๊ะ! ไม่พบโค้ดทีมนี้ครับเจ้านาย\nลองใหม่ได้เลยครับ';
    }
    if (reason === 'INVITE_EXPIRED') {
      return 'โอ๊ะ! โค้ดทีมหมดอายุแล้วครับเจ้านาย\nขอโค้ดใหม่จากแอดมินได้เลยครับ';
    }
    if (reason === 'TEAM_FULL') {
      return 'โอ๊ะ! ทีมนี้เต็มแล้วครับเจ้านาย';
    }
    if (reason === 'INVITE_SELF') {
      return 'ติ๊ดๆ โค้ดนี้เป็นของเจ้านายเองนะครับ';
    }
    if (reason === 'INVITE_ALREADY_USED') {
      return 'ติ๊ดๆ โค้ดนี้ถูกใช้ไปแล้วครับเจ้านาย';
    }
    if (reason === 'OWNER_NOT_TEAM') {
      return 'โอ๊ะ! ทีมต้นทางไม่อยู่ในสถานะ Team แล้วครับเจ้านาย';
    }
    console.error('[teamInviteService] joinTeamWithCode failed:', error);
    return 'โอ๊ะ! ระบบขัดข้องชั่วคราวครับเจ้านาย\nลองใหม่ได้เลยครับ';
  }

  return (
    'บี๊บ! เข้าทีมสำเร็จแล้วครับเจ้านาย\n' +
    'ข้อมูลธุรกิจถูกคัดลอกให้แล้ว\n' +
    'ลองพิมพ์ ทำใบเสนอราคา ได้เลยครับ'
  );
}
