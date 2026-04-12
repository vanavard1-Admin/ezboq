/**
 * EzDoc Configuration
 * Environment variables and constants
 */

import {
  CLOUD_TASKS_LOCATION_PARAM,
  CLOUD_TASKS_QUEUE_PARAM,
  DEFAULT_SIGNED_URL_EXPIRE_DAYS_PARAM,
  DELIVERY_SERVICE_ACCOUNT_PARAM,
  DELIVERY_TASK_AUDIENCE_PARAM,
  DELIVERY_TASK_URL_PARAM,
  GCP_PROJECT_ID_PARAM,
  HUMAN_FIRST_UX_PARAM,
  LINE_LIFF_ID_PARAM,
  LINE_LOGIN_CHANNEL_ID_PARAM,
  MANUAL_SLIP_REVIEW_PARAM,
  UNIFIED_BRAIN_PARAM,
  OCR_TASK_AUDIENCE_PARAM,
  OCR_TASK_HANDLER_URL_PARAM,
  PDF_RENDER_URL_PARAM,
  PDF_SERVICE_ACCOUNT_PARAM,
  PDF_SERVICE_AUDIENCE_PARAM,
  PDF_SERVICE_URL_PARAM,
  TIMEOUT_TASK_AUDIENCE_PARAM,
  TIMEOUT_TASK_SERVICE_ACCOUNT_PARAM,
  USE_CLOUD_TASKS_PARAM,
} from './params';
import {
  LINE_CHANNEL_ACCESS_TOKEN_SECRET,
  LINE_CHANNEL_SECRET_SECRET,
  LINE_LINK_STATE_SECRET_SECRET,
  SENDGRID_API_KEY_SECRET,
  SENDGRID_FROM_EMAIL_SECRET,
} from './secrets';

const readSecret = (getSecretValue: () => string, envKey: string): string => {
  try {
    const value = getSecretValue();
    if (value) return value;
  } catch {
    // Secret may not be bound in local/dev; fall back to env.
  }
  return process.env[envKey] || '';
};

// LINE Configuration (secrets via Secret Manager)
export const getLineChannelSecret = (): string =>
  readSecret(() => LINE_CHANNEL_SECRET_SECRET.value(), 'LINE_CHANNEL_SECRET');
export const getLineChannelAccessToken = (): string =>
  readSecret(() => LINE_CHANNEL_ACCESS_TOKEN_SECRET.value(), 'LINE_CHANNEL_ACCESS_TOKEN');
export const getLineLinkStateSecret = (): string =>
  readSecret(() => LINE_LINK_STATE_SECRET_SECRET.value(), 'LINE_LINK_STATE_SECRET');

// SendGrid (secret)
export const getSendgridApiKey = (): string =>
  readSecret(() => SENDGRID_API_KEY_SECRET.value(), 'SENDGRID_API_KEY').trim();
export const getSendgridFromEmail = (): string =>
  readSecret(() => SENDGRID_FROM_EMAIL_SECRET.value(), 'SENDGRID_FROM_EMAIL').trim();
export const isEmailDeliveryEnabled = (): boolean => !!getSendgridApiKey();

// Dev bypass (secret)
export const getDevBypassSecret = (): string =>
  (process.env.DEV_BYPASS_SECRET || '').trim();

// GCP/Firebase Configuration
export const getProjectId = (): string =>
  GCP_PROJECT_ID_PARAM.value() ||
  process.env.GCP_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  '';

export const getLineLoginChannelId = (): string =>
  LINE_LOGIN_CHANNEL_ID_PARAM.value() ||
  process.env.LINE_LOGIN_CHANNEL_ID ||
  process.env.LINE_CHANNEL_ID ||
  '';

export const getLineLiffId = (): string =>
  LINE_LIFF_ID_PARAM.value() ||
  process.env.LINE_LIFF_ID ||
  '';

// PDF Service Configuration (lazy accessors to avoid params.value() at deploy time)
export const getPdfServiceUrl = (): string =>
  PDF_SERVICE_URL_PARAM.value() ||
  process.env.PDF_SERVICE_URL ||
  'http://localhost:8080/jobs/render-pdf';
export const getPdfServiceAudience = (): string =>
  PDF_SERVICE_AUDIENCE_PARAM.value() ||
  process.env.PDF_SERVICE_AUDIENCE ||
  '';

// Bump this when the PDF template changes to force re-render of older docs
export const getPdfTemplateVersion = (): string =>
  process.env.PDF_TEMPLATE_VERSION || '2026-01-30-v1';
// PDF render-buffer endpoint used by pdfWorker (returns application/pdf bytes)
export const getPdfRenderUrl = (): string =>
  PDF_RENDER_URL_PARAM.value() ||
  process.env.PDF_RENDER_URL ||
  process.env.PDF_SERVICE_URL ||
  'http://localhost:8080/jobs/render-buffer';

// Settings
export const getDefaultSignedUrlExpireDays = (): number =>
  Number(
    DEFAULT_SIGNED_URL_EXPIRE_DAYS_PARAM.value() ||
    process.env.DEFAULT_SIGNED_URL_EXPIRE_DAYS ||
    7
  );

// Default Tax Settings
export const DEFAULT_VAT_RATE = 7; // %
export const DEFAULT_WHT_RATE = 3; // %

// Document Prefix
export const DOC_PREFIX = {
  QUO: 'QUO',
  BILL: 'INV',
  RECEIPT: 'RCP',
  CN: 'CN',
  DN: 'DN',
} as const;

// LINE API Endpoints
export const LINE_API = {
  REPLY: 'https://api.line.me/v2/bot/message/reply',
  PUSH: 'https://api.line.me/v2/bot/message/push',
  CONTENT: 'https://api-data.line.me/v2/bot/message',
} as const;

// Timeouts
export const DRAFT_EXPIRE_MINUTES = 30;

// Cloud Tasks Configuration
export const getCloudTasksQueue = (): string =>
  CLOUD_TASKS_QUEUE_PARAM.value() ||
  process.env.CLOUD_TASKS_QUEUE ||
  'ezdoc-pdf-jobs';
export const getCloudTasksLocation = (): string =>
  CLOUD_TASKS_LOCATION_PARAM.value() ||
  process.env.CLOUD_TASKS_LOCATION ||
  'asia-southeast1';
export const getPdfServiceAccount = (): string => {
  const projectId = getProjectId() || '';
  return (
    PDF_SERVICE_ACCOUNT_PARAM.value() ||
    process.env.PDF_SERVICE_ACCOUNT ||
    (projectId ? `pdf-service@${projectId}.iam.gserviceaccount.com` : '')
  );
};
export const getUseCloudTasks = (): boolean =>
  USE_CLOUD_TASKS_PARAM.value() ??
  (process.env.USE_CLOUD_TASKS === 'true');
// Delivery worker endpoint (Cloud Tasks will POST here)
export const getDeliveryTaskUrl = (): string =>
  DELIVERY_TASK_URL_PARAM.value() ||
  process.env.DELIVERY_TASK_URL ||
  '';
export const getDeliveryServiceAccount = (): string =>
  DELIVERY_SERVICE_ACCOUNT_PARAM.value() ||
  process.env.DELIVERY_SERVICE_ACCOUNT ||
  getPdfServiceAccount();
// Audience expected in OIDC token for delivery tasks. Defaults to DELIVERY_TASK_URL if not set.
export const getDeliveryTaskAudience = (): string =>
  DELIVERY_TASK_AUDIENCE_PARAM.value() ||
  process.env.DELIVERY_TASK_AUDIENCE ||
  process.env.DELIVERY_TASK_URL ||
  '';

// Feature Flags
export const getHumanFirstUxEnabled = (): boolean =>
  HUMAN_FIRST_UX_PARAM.value() ??
  (process.env.HUMAN_FIRST_UX === '1' || process.env.HUMAN_FIRST_UX === 'true');
export const getManualSlipReview = (): boolean =>
  MANUAL_SLIP_REVIEW_PARAM.value() ??
  (process.env.MANUAL_SLIP_REVIEW !== 'false');
export const getUnifiedBrainEnabled = (): boolean =>
  UNIFIED_BRAIN_PARAM.value() ??
  (process.env.UNIFIED_BRAIN === '1' || process.env.UNIFIED_BRAIN === 'true');

// PDF Timeout Task Configuration (SECURITY SEV-0)
// Audience expected in OIDC token for timeout tasks. Must match function URL in production.
export const getTimeoutTaskAudience = (): string =>
  TIMEOUT_TASK_AUDIENCE_PARAM.value() ||
  process.env.TIMEOUT_TASK_AUDIENCE ||
  '';
// Service account email used by Cloud Tasks to sign OIDC token
export const getTimeoutTaskServiceAccount = (): string =>
  TIMEOUT_TASK_SERVICE_ACCOUNT_PARAM.value() ||
  process.env.TIMEOUT_TASK_SERVICE_ACCOUNT ||
  '';

// OCR task configuration
export const getOcrTaskHandlerUrl = (): string =>
  OCR_TASK_HANDLER_URL_PARAM.value() ||
  process.env.OCR_TASK_HANDLER_URL ||
  '';
export const getOcrTaskAudience = (): string =>
  OCR_TASK_AUDIENCE_PARAM.value() ||
  process.env.OCR_TASK_AUDIENCE ||
  process.env.OCR_TASK_HANDLER_URL ||
  '';
