import type { CSSProperties } from 'react';

interface EzBOQLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const imgSizeMap = {
  xs: 'h-7',
  sm: 'h-10',
  md: 'h-16',
  lg: 'h-24',
} as const;

const imgSizesMap = {
  xs: '112px',
  sm: '160px',
  md: '256px',
  lg: '384px',
} as const;

export function EzBOQLogo({ size = 'md', className = '', style }: EzBOQLogoProps) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet="/ezboq-logo-320.webp 320w, /ezboq-logo-512.webp 512w"
        sizes={imgSizesMap[size]}
      />
      <img
        src="/ezboq-logo.png"
        alt="EzBOQ"
        width={512}
        height={341}
        decoding="async"
        fetchPriority={size === 'lg' ? 'high' : 'auto'}
        style={style}
        className={`select-none object-contain ${imgSizeMap[size]} ${className}`}
      />
    </picture>
  );
}
