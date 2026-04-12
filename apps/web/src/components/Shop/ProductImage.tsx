/**
 * ProductImage – renders a visually rich product thumbnail
 * based on category and brand. Uses branded gradient backgrounds
 * with category-specific icons/emojis so the shop feels alive
 * instead of wall-of-text cards.
 */

interface ProductImageProps {
  categoryId: string;
  brand?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  imageUrl?: string;
}

type CategoryVisual = {
  emoji: string;
  gradient: string;
  pattern?: string;
};

const categoryVisuals: Record<string, CategoryVisual> = {
  'cement-mortar': {
    emoji: '🧱',
    gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 40%, #d1d5db 100%)',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.06) 16px)',
  },
  'tile-floor': {
    emoji: '🔲',
    gradient: 'linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 100%)',
    pattern: 'repeating-conic-gradient(rgba(255,255,255,0.08) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
  },
  paint: {
    emoji: '🎨',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 40%, #60a5fa 100%)',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)',
  },
  electrical: {
    emoji: '⚡',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 40%, #f87171 100%)',
    pattern: 'repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(255,255,255,0.05) 12px, rgba(255,255,255,0.05) 14px)',
  },
  plumbing: {
    emoji: '🔧',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 40%, #67e8f9 100%)',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 40%)',
  },
  hardware: {
    emoji: '🔩',
    gradient: 'linear-gradient(135deg, #44403c 0%, #78716c 40%, #a8a29e 100%)',
    pattern: 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,255,255,0.04) 10px, rgba(255,255,255,0.04) 20px)',
  },
  'ceiling-wall': {
    emoji: '📐',
    gradient: 'linear-gradient(135deg, #525252 0%, #737373 40%, #a3a3a3 100%)',
    pattern: 'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 7px)',
  },
  'wood-builtin': {
    emoji: '🪵',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)',
    pattern: 'repeating-linear-gradient(175deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 8px)',
  },
};

const brandColors: Record<string, string> = {
  SCG: '#e11d48',
  TPI: '#2563eb',
  'ปูนอินทรี': '#059669',
  'ตราเสือ': '#ea580c',
  COTTO: '#7c3aed',
  Duragres: '#0891b2',
  Sosuco: '#4f46e5',
  Campana: '#be185d',
  TOA: '#dc2626',
  Jotun: '#2563eb',
  'Nippon Paint': '#e11d48',
  Beger: '#16a34a',
  Yazaki: '#dc2626',
  BCC: '#1d4ed8',
  Schneider: '#16a34a',
  HACO: '#f59e0b',
  DOS: '#0284c7',
  Sanwa: '#7c3aed',
  'Thai Pipe': '#059669',
  Hafele: '#1e293b',
  Yale: '#eab308',
  Solex: '#2563eb',
  Colt: '#78716c',
  'ตราช้าง': '#dc2626',
  Gyproc: '#2563eb',
  Shera: '#059669',
  Vanachai: '#92400e',
  Crown: '#7c3aed',
  GreenPanel: '#16a34a',
  Fuku: '#be185d',
};

const sizeMap = {
  sm: { container: '64px', emoji: '24px', brand: '9px', radius: '12px' },
  md: { container: '120px', emoji: '40px', brand: '10px', radius: '16px' },
  lg: { container: '180px', emoji: '56px', brand: '11px', radius: '20px' },
};

export function ProductImage({
  categoryId,
  brand,
  name,
  size = 'md',
  className = '',
  imageUrl,
}: ProductImageProps) {
  const visual = categoryVisuals[categoryId] || {
    emoji: '📦',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
  };

  const dim = sizeMap[size];
  const brandColor = brand ? brandColors[brand] || '#475569' : undefined;

  return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: dim.container,
          height: dim.container,
          minWidth: dim.container,
          borderRadius: dim.radius,
          background: visual.gradient,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '4px',
        }}
        title={name}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: dim.radius,
            }}
          />
        ) : (
          <>
            {/* pattern overlay */}
            {visual.pattern && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: visual.pattern,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* shimmer effect */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />

            {/* emoji icon */}
            <span
              style={{
                fontSize: dim.emoji,
                lineHeight: 1,
                zIndex: 1,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
              }}
              role="img"
              aria-label={categoryId}
            >
              {visual.emoji}
            </span>

            {/* brand badge */}
            {brand && size !== 'sm' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: size === 'lg' ? '10px' : '6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: brandColor || '#475569',
                  color: '#fff',
                  fontSize: dim.brand,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  whiteSpace: 'nowrap',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  zIndex: 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                {brand}
              </span>
            )}
          </>
        )}
      </div>
  );
}
