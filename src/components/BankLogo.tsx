/**
 * BankLogo Component
 * Renders Thai bank logos (13 major banks)
 * Using static SVG assets instead of figma:asset
 */

export type ThaiBank =
  | 'bbl'
  | 'kbank'
  | 'scb'
  | 'ktb'
  | 'bay'
  | 'ttb'
  | 'gsb'
  | 'ghb'
  | 'kkp'
  | 'cimb'
  | 'uob'
  | 'tisco'
  | 'lhbank';

import bblLogo from '../assets/brands/banks/bbl.svg?url';
import kbankLogo from '../assets/brands/banks/kbank.svg?url';
import scbLogo from '../assets/brands/banks/scb.svg?url';
import ktbLogo from '../assets/brands/banks/ktb.svg?url';
import bayLogo from '../assets/brands/banks/bay.svg?url';
import ttbLogo from '../assets/brands/banks/ttb.svg?url';
import gsbLogo from '../assets/brands/banks/gsb.svg?url';
import ghbLogo from '../assets/brands/banks/ghb.svg?url';
import kkpLogo from '../assets/brands/banks/kkp.svg?url';
import cimbLogo from '../assets/brands/banks/cimb.svg?url';
import uobLogo from '../assets/brands/banks/uob.svg?url';
import tiscoLogo from '../assets/brands/banks/tisco.svg?url';
import lhbankLogo from '../assets/brands/banks/lhbank.svg?url';

const BANK_LOGO_MAP: Record<ThaiBank, string> = {
  bbl: bblLogo,
  kbank: kbankLogo,
  scb: scbLogo,
  ktb: ktbLogo,
  bay: bayLogo,
  ttb: ttbLogo,
  gsb: gsbLogo,
  ghb: ghbLogo,
  kkp: kkpLogo,
  cimb: cimbLogo,
  uob: uobLogo,
  tisco: tiscoLogo,
  lhbank: lhbankLogo,
};

export const BANK_NAMES: Record<ThaiBank, string> = {
  bbl: 'ธนาคารกรุงเทพ',
  kbank: 'ธนาคารกสิกรไทย',
  scb: 'ธนาคารไทยพาณิชย์',
  ktb: 'ธนาคารกรุงไทย',
  bay: 'ธนาคารกรุงศรีอยุธยา',
  ttb: 'ธนาคารทหารไทยธนชาต',
  gsb: 'ธนาคารออมสิน',
  ghb: 'ธนาคารอาคารสงเคราะห์',
  kkp: 'ธนาคารเกียรตินาคินภัทร',
  cimb: 'ธนาคารซีไอเอ็มบีไทย',
  uob: 'ธนาคารยูโอบี',
  tisco: 'ธนาคารทิสโก้',
  lhbank: 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
};

interface BankLogoProps {
  bank: ThaiBank;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export function BankLogo({ bank, alt, className = '', priority = false }: BankLogoProps) {
  return (
    <img
      src={BANK_LOGO_MAP[bank]}
      alt={alt ?? BANK_NAMES[bank]}
      width={64}
      height={28}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={className}
      style={{ objectFit: 'contain', display: 'block' }}
      data-pdf-keep="true"
    />
  );
}
