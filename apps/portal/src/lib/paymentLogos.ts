export const PAYMENT_BASE_URL = 'https://storage.googleapis.com/ezdoc-assets/payment-logos';

export const PAYMENT_LOGOS = {
  banks: {
    KBANK: `${PAYMENT_BASE_URL}/banks/KBANK.png`,
    SCB: `${PAYMENT_BASE_URL}/banks/SCB.png`,
    BBL: `${PAYMENT_BASE_URL}/banks/BBL.png`,
    KTB: `${PAYMENT_BASE_URL}/banks/KTB.png`,
    BAY: `${PAYMENT_BASE_URL}/banks/BAY.png`,
    TTB: `${PAYMENT_BASE_URL}/banks/TTB.png`,
    GSB: `${PAYMENT_BASE_URL}/banks/GSB.png`,
    GHB: `${PAYMENT_BASE_URL}/banks/GHB.png`,
    BAAC: `${PAYMENT_BASE_URL}/banks/BAAC.png`,
    CIMB: `${PAYMENT_BASE_URL}/banks/CIMB.png`,
    UOB: `${PAYMENT_BASE_URL}/banks/UOB.png`,
    TISCO: `${PAYMENT_BASE_URL}/banks/TISCO.png`,
    KKP: `${PAYMENT_BASE_URL}/banks/KKP.png`,
    IBANK: `${PAYMENT_BASE_URL}/banks/IBANK.png`,
    LHB: `${PAYMENT_BASE_URL}/banks/LHB.png`,
    TCRB: `${PAYMENT_BASE_URL}/banks/TCRB.png`,
    ICBC: `${PAYMENT_BASE_URL}/banks/ICBC.png`,
    CITI: `${PAYMENT_BASE_URL}/banks/CITI.png`,
    HSBC: `${PAYMENT_BASE_URL}/banks/HSBC.png`,
    THANACHART: `${PAYMENT_BASE_URL}/banks/THANACHART.png`,
  },
  cards: {
    VISA: `${PAYMENT_BASE_URL}/cards/VISA.png`,
    MASTERCARD: `${PAYMENT_BASE_URL}/cards/MASTERCARD.png`,
    JCB: `${PAYMENT_BASE_URL}/cards/JCB.png`,
  },
  wallets: {
    PROMPTPAY: `${PAYMENT_BASE_URL}/wallets/PROMPTPAY.png`,
    TRUEMONEY: `${PAYMENT_BASE_URL}/wallets/TRUEMONEY.png`,
    LINEPAY: `${PAYMENT_BASE_URL}/wallets/LINEPAY.png`,
  },
} as const;

export type PaymentCategory = keyof typeof PAYMENT_LOGOS;
export type BankKey = keyof typeof PAYMENT_LOGOS.banks;
export type CardKey = keyof typeof PAYMENT_LOGOS.cards;
export type WalletKey = keyof typeof PAYMENT_LOGOS.wallets;

export type PaymentMethodKey = BankKey | CardKey | WalletKey;
