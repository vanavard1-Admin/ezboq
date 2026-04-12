import { describe, expect, it } from 'vitest';
import { buildShopRoute, buildVendorPortalRoute, parseShopRoute } from './shopRoutes';

describe('shopRoutes', () => {
  it('parses standard shop views from route', () => {
    expect(parseShopRoute('/shop')).toEqual({ view: 'home' });
    expect(parseShopRoute('/shop/catalog')).toEqual({ view: 'catalog' });
    expect(parseShopRoute('/shop/checkout')).toEqual({ view: 'checkout' });
    expect(parseShopRoute('/shop/rfq')).toEqual({ view: 'rfq' });
  });

  it('parses vendor portal route with ids', () => {
    expect(parseShopRoute('/shop/vendor/rfq-123/vendor-siam')).toEqual({
      view: 'vendor',
      rfqId: 'rfq-123',
      vendorId: 'vendor-siam',
    });
  });

  it('builds deterministic routes for app navigation', () => {
    expect(buildShopRoute('home')).toBe('/shop');
    expect(buildShopRoute('catalog')).toBe('/shop/catalog');
    expect(buildShopRoute('checkout')).toBe('/shop/checkout');
    expect(buildShopRoute('rfq')).toBe('/shop/rfq');
    expect(buildVendorPortalRoute('rfq 1', 'vendor/homepro')).toBe('/shop/vendor/rfq%201/vendor%2Fhomepro');
  });
});
