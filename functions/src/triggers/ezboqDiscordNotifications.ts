/**
 * EzBOQ Discord Server Notifications
 *
 * Sends notifications to the EzBOQ Discord server for:
 * 1. New user signups
 * 2. Payment/slip events (handled by subscriptionPaymentTrigger)
 * 3. System events
 */

import * as functions from 'firebase-functions/v1';

// EzBOQ Discord Server channels
const CH_SIGNUP = '1491009303455469640';
const CH_PAYMENT = '1491009305917259927';

async function sendDiscordEmbed(channelId: string, embed: Record<string, unknown>): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.warn(`[ezboqDiscord] Send failed (${channelId}):`, res.status);
    }
  } catch (err) {
    console.warn(`[ezboqDiscord] Send error (${channelId}):`, err);
  }
}

/**
 * New user signup → Discord notification
 */
export const onUserSignupDiscord = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['DISCORD_BOT_TOKEN'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .firestore.document('users/{userId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const userId = context.params.userId;

    const name = data.name || data.lineEmail?.split('@')[0] || 'ไม่ระบุ';
    const email = data.email || data.lineEmail || '-';
    const provider = data.authProvider || 'unknown';

    await sendDiscordEmbed(CH_SIGNUP, {
      title: '👤 ผู้ใช้ใหม่สมัครแล้ว!',
      color: 0x22c55e, // green
      fields: [
        { name: 'ชื่อ', value: name, inline: true },
        { name: 'อีเมล', value: email, inline: true },
        { name: 'สมัครผ่าน', value: provider, inline: true },
        { name: 'User ID', value: `\`${userId}\``, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'EzBOQ — ผู้ใช้ใหม่' },
    });

    console.log(`[ezboqDiscord] Signup notification sent: ${name} (${email})`);
  });

/**
 * Subscription activated → Discord notification
 * Fires when workspaces/{wsId}/subscription/current status changes to active
 */
export const onSubscriptionActivated = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['DISCORD_BOT_TOKEN'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .firestore.document('workspaces/{workspaceId}/subscription/current')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only on status transition to active
    if (before.status === 'active' || after.status !== 'active') return;

    const planLabel = after.plan === 'team' ? 'Business' : 'Pro';
    const approvedBy = after.approvedBy || 'admin';
    const endDate = after.endDate
      ? new Date(after.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      : '-';

    await sendDiscordEmbed(CH_PAYMENT, {
      title: '✅ Subscription เปิดใช้งานแล้ว!',
      color: 0x10b981, // emerald
      fields: [
        { name: 'ผู้ใช้', value: after.userName || '-', inline: true },
        { name: 'แพ็กเกจ', value: planLabel, inline: true },
        { name: 'หมดอายุ', value: endDate, inline: true },
        { name: 'อนุมัติโดย', value: approvedBy, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'EzBOQ — Subscription' },
    });
  });
