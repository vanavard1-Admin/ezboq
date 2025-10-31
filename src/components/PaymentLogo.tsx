/**
 * PaymentLogo Component
 * Renders payment method brand logos
 * Using static SVG assets instead of figma:asset
 */

export type PaymentBrand = 'visa' | 'mastercard' | 'promptpay' | 'truemoney' | 'rabbitlinepay' | 'rabbit_linepay';

import visaLogo from '../assets/brands/payments/visa.svg?url';
import mastercardLogo from '../assets/brands/payments/mastercard.svg?url';
import promptpayLogo from '../assets/brands/payments/promptpay.svg?url';
import trueMoneyLogo from '../assets/brands/payments/truemoney.svg?url';
import rabbitLinePayLogo from '../assets/brands/payments/rabbitlinepay.svg?url';

const PAYMENT_LOGO_MAP: Record<PaymentBrand, string> = {
  visa: visaLogo,
  mastercard: mastercardLogo,
  promptpay: promptpayLogo,
  truemoney: trueMoneyLogo,
  rabbitlinepay: rabbitLinePayLogo,
  rabbit_linepay: rabbitLinePayLogo, // Alias
};

const PAYMENT_NAMES: Record<PaymentBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  promptpay: 'PromptPay',
  truemoney: 'TrueMoney Wallet',
  rabbitlinepay: 'Rabbit LINE Pay',
  rabbit_linepay: 'Rabbit LINE Pay',
};

interface PaymentLogoProps {
  brand?: PaymentBrand;
  type?: PaymentBrand; // Alias for brand (backward compatibility)
  alt?: string;
  className?: string;
  priority?: boolean;
}

export function PaymentLogo({ brand, type, alt, className = '', priority = false }: PaymentLogoProps) {
  const paymentBrand = brand || type;
  if (!paymentBrand) {
    throw new Error('PaymentLogo: either brand or type prop is required');
  }
  
  return (
    <img
      src={PAYMENT_LOGO_MAP[paymentBrand]}
      alt={alt ?? PAYMENT_NAMES[paymentBrand]}
      width={64}
      height={28}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={priority ? 'high' : 'auto'}
      className={className}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}