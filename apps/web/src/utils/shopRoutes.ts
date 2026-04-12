export type ShopView = 'home' | 'catalog' | 'checkout' | 'rfq' | 'vendor';

export interface ParsedShopRoute {
  view: ShopView;
  rfqId?: string;
  vendorId?: string;
}

function sanitizeSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function parseShopRoute(route: `/shop${'' | `/${string}`}`): ParsedShopRoute {
  const segments = route
    .replace(/^\/shop/, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 0) {
    return { view: 'home' };
  }

  const [head, second, third] = segments;

  switch (head) {
    case 'catalog':
      return { view: 'catalog' };
    case 'checkout':
      return { view: 'checkout' };
    case 'rfq':
      return { view: 'rfq' };
    case 'vendor':
      return {
        view: 'vendor',
        rfqId: second,
        vendorId: third,
      };
    default:
      return { view: 'home' };
  }
}

export function buildShopRoute(view: Exclude<ShopView, 'vendor'>): `/shop${'' | `/${string}`}` {
  switch (view) {
    case 'home':
      return '/shop';
    case 'catalog':
      return '/shop/catalog';
    case 'checkout':
      return '/shop/checkout';
    case 'rfq':
      return '/shop/rfq';
    default:
      return '/shop';
  }
}

export function buildVendorPortalRoute(rfqId: string, vendorId: string): `/shop/${string}` {
  return `/shop/vendor/${sanitizeSegment(rfqId)}/${sanitizeSegment(vendorId)}`;
}
