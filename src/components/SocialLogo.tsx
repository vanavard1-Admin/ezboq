/**
 * SocialLogo Component
 * Renders social media brand logos (Google, Facebook, YouTube)
 * Using static SVG assets instead of figma:asset
 */

type SocialBrand = 'google' | 'facebook' | 'youtube';

import googleLogo from '../assets/brands/social/google.svg?url';
import facebookLogo from '../assets/brands/social/facebook.svg?url';
import youtubeLogo from '../assets/brands/social/youtube.svg?url';

const SOCIAL_LOGO_MAP: Record<SocialBrand, string> = {
  google: googleLogo,
  facebook: facebookLogo,
  youtube: youtubeLogo,
};

interface SocialLogoProps {
  brand: SocialBrand;
  alt?: string;
  className?: string;
}

export function SocialLogo({ brand, alt, className = '' }: SocialLogoProps) {
  return (
    <img
      src={SOCIAL_LOGO_MAP[brand]}
      alt={alt ?? brand}
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ objectFit: 'contain', display: 'inline-block' }}
    />
  );
}
