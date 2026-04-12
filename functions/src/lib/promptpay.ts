/**
 * PromptPay QR Code Generator
 * Generates PromptPay QR codes for payment
 */

import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/**
 * Generate PromptPay QR code as PNG Buffer
 * @param bankAccount - PromptPay bank account number (10 digits)
 * @param amount - Amount in THB
 * @returns PNG Buffer of QR code image
 */
export async function generatePromptPayQRBuffer(
  bankAccount: string,
  amount: number
): Promise<Buffer> {
  const payload = generatePayload(bankAccount, { amount });
  return QRCode.toBuffer(payload, {
    type: "png",
    width: 400,
    margin: 2,
  });
}

/**
 * Generate PromptPay QR code as Data URL (for web display)
 * @param bankAccount - PromptPay bank account number (10 digits)
 * @param amount - Amount in THB
 * @returns Data URL of QR code image
 */
export async function generatePromptPayQR(
  bankAccount: string,
  amount: number
): Promise<string> {
  const payload = generatePayload(bankAccount, { amount });
  return QRCode.toDataURL(payload);
}

/**
 * System PromptPay account for receiving payments
 * Set via environment variable
 */
export const SYSTEM_PROMPTPAY_ACCOUNT = process.env.PROMPTPAY_ACCOUNT || "0000000000";

/**
 * Plan pricing configuration
 */
export const PLANS = {
  MONTHLY_99: {
    id: "MONTHLY_99",
    name: "แพ็ก 99",
    price: 99,
    seats: 1,
    duration: 30, // days
  },
  MONTHLY_299: {
    id: "MONTHLY_299",
    name: "แพ็ก Team",
    price: 279,
    seats: 3,
    duration: 30, // days
  },
} as const;

export type PlanId = keyof typeof PLANS;
