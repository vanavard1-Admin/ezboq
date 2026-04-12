/**
 * Discord Interactions Endpoint
 * Handles button clicks (Approve/Reject) from Discord messages
 *
 * Requires env vars:
 *   DISCORD_PUBLIC_KEY - Application's public key for signature verification
 *   DISCORD_BOT_TOKEN - Bot token for editing messages
 */
import * as functions from 'firebase-functions/v1';
import * as crypto from 'crypto';
// Discord REST API base (for future use if needed)
// const DISCORD_API = 'https://discord.com/api/v10';

// Discord Interaction Types
const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
} as const;

// Discord Interaction Response Types
const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
} as const;

/**
 * Verify Discord request signature using Ed25519
 */
function verifyDiscordSignature(
  publicKeyHex: string,
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  try {
    // Create Ed25519 public key from hex (DER-encoded SPKI format)
    const derPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
    const derKey = Buffer.concat([derPrefix, publicKeyBytes]);

    const key = crypto.createPublicKey({
      key: derKey,
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(
      null, // Ed25519 doesn't use a separate hash
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// Note: Message editing is handled via Interaction Response (UPDATE_MESSAGE)
// If needed for non-interaction edits, use Discord REST API:
// PATCH /channels/{channelId}/messages/{messageId}

/**
 * Main Discord Interactions Endpoint
 */
export const discordInteractions = functions
  .runWith({ timeoutSeconds: 10, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      console.error('DISCORD_PUBLIC_KEY not configured');
      res.status(500).send('Server configuration error');
      return;
    }

    // Verify signature
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;

    if (!signature || !timestamp) {
      res.status(401).send('Missing signature headers');
      return;
    }

    // Use rawBody for signature verification (Firebase provides this)
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
    const bodyStr = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

    const isValid = verifyDiscordSignature(publicKey, signature, timestamp, bodyStr);
    if (!isValid) {
      console.warn('Invalid signature from Discord');
      res.status(401).send('Invalid signature');
      return;
    }

    const interaction = req.body;

    // Handle PING (Discord verification)
    if (interaction.type === INTERACTION_TYPE.PING) {
      console.log('Discord PING received - responding with PONG');
      res.json({ type: RESPONSE_TYPE.PONG });
      return;
    }

    // Handle Button Clicks (MESSAGE_COMPONENT)
    if (interaction.type === INTERACTION_TYPE.MESSAGE_COMPONENT) {
      const customId: string = interaction.data?.custom_id || '';
      const user = interaction.member?.user || interaction.user || {};
      const username = user.global_name || user.username || 'Unknown';
      const userId = user.id || '';

      console.log(`Button click: ${customId} by ${username} (${userId})`);

      // Parse custom_id: "approve_{id}" or "reject_{id}"
      const isApprove = customId.startsWith('approve_');
      const isReject = customId.startsWith('reject_');

      if (!isApprove && !isReject) {
        res.json({
          type: RESPONSE_TYPE.UPDATE_MESSAGE,
          data: { content: '❓ Unknown action', components: [] },
        });
        return;
      }

      const approvalId = customId.replace(/^(approve|reject)_/, '');
      const action = isApprove ? 'approved' : 'rejected';
      const emoji = isApprove ? '✅' : '❌';
      const color = isApprove ? 0x00CC00 : 0xCC0000;

      // Get original embed info
      const originalMessage = interaction.message || {};
      const originalEmbed = originalMessage.embeds?.[0] || {};
      const originalTitle = (originalEmbed.title || '').replace(/^🔔\s*/, '');
      const originalDesc = originalEmbed.description || '';
      const originalFields = originalEmbed.fields || [];

      // Respond by updating the message (removes buttons, updates embed)
      res.json({
        type: RESPONSE_TYPE.UPDATE_MESSAGE,
        data: {
          embeds: [{
            title: `${emoji} ${originalTitle}`,
            description: originalDesc,
            color,
            fields: [
              ...originalFields,
              {
                name: `${emoji} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                value: `by <@${userId}> (${username})`,
                inline: false,
              },
            ],
            footer: {
              text: `approval:${approvalId}|status:${action}|by:${username}`,
            },
            timestamp: new Date().toISOString(),
          }],
          components: [], // Remove buttons
        },
      });

      console.log(`Approval ${approvalId} ${action} by ${username}`);
      return;
    }

    // Unknown interaction type
    console.warn('Unknown interaction type:', interaction.type);
    res.status(400).json({ error: 'Unknown interaction type' });
  });
