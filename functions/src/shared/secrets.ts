import { defineSecret } from 'firebase-functions/params';

// Centralized secret params (Firebase Secrets)
// Use getters in code to avoid secret.value() at module load.
export const LINE_CHANNEL_ACCESS_TOKEN_SECRET = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');
export const LINE_CHANNEL_SECRET_SECRET = defineSecret('LINE_CHANNEL_SECRET');
export const LINE_LINK_STATE_SECRET_SECRET = defineSecret('LINE_LINK_STATE_SECRET');
export const SENDGRID_API_KEY_SECRET = defineSecret('SENDGRID_API_KEY');
export const SENDGRID_FROM_EMAIL_SECRET = defineSecret('SENDGRID_FROM_EMAIL');
