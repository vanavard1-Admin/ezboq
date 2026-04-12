import { defineBoolean, defineInt, defineString } from 'firebase-functions/params';

// Centralized params (Firebase Functions params + env)
// These should replace legacy functions.config() usage.
export const GCP_PROJECT_ID_PARAM = defineString('GCP_PROJECT_ID');

export const LINE_LOGIN_CHANNEL_ID_PARAM = defineString('LINE_LOGIN_CHANNEL_ID');
export const LINE_LIFF_ID_PARAM = defineString('LINE_LIFF_ID');

export const PDF_SERVICE_URL_PARAM = defineString('PDF_SERVICE_URL');
export const PDF_SERVICE_ACCOUNT_PARAM = defineString('PDF_SERVICE_ACCOUNT');
export const PDF_SERVICE_AUDIENCE_PARAM = defineString('PDF_SERVICE_AUDIENCE');
export const PDF_RENDER_URL_PARAM = defineString('PDF_RENDER_URL');

export const USE_CLOUD_TASKS_PARAM = defineBoolean('USE_CLOUD_TASKS');
export const CLOUD_TASKS_QUEUE_PARAM = defineString('CLOUD_TASKS_QUEUE');
export const CLOUD_TASKS_LOCATION_PARAM = defineString('CLOUD_TASKS_LOCATION');

export const DELIVERY_TASK_URL_PARAM = defineString('DELIVERY_TASK_URL');
export const DELIVERY_TASK_AUDIENCE_PARAM = defineString('DELIVERY_TASK_AUDIENCE');
export const DELIVERY_SERVICE_ACCOUNT_PARAM = defineString('DELIVERY_SERVICE_ACCOUNT');

export const OCR_TASK_HANDLER_URL_PARAM = defineString('OCR_TASK_HANDLER_URL');
export const OCR_TASK_AUDIENCE_PARAM = defineString('OCR_TASK_AUDIENCE');

export const DEFAULT_SIGNED_URL_EXPIRE_DAYS_PARAM = defineInt('DEFAULT_SIGNED_URL_EXPIRE_DAYS');

export const HUMAN_FIRST_UX_PARAM = defineBoolean('HUMAN_FIRST_UX');
export const MANUAL_SLIP_REVIEW_PARAM = defineBoolean('MANUAL_SLIP_REVIEW');
export const UNIFIED_BRAIN_PARAM = defineBoolean('UNIFIED_BRAIN');

export const TIMEOUT_TASK_AUDIENCE_PARAM = defineString('TIMEOUT_TASK_AUDIENCE');
export const TIMEOUT_TASK_SERVICE_ACCOUNT_PARAM = defineString('TIMEOUT_TASK_SERVICE_ACCOUNT');
