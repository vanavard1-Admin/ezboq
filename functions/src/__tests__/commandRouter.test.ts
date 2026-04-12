import { describe, expect, it } from '@jest/globals';

import { RouteType, routeIncomingText } from '../core/commandRouter';

describe('commandRouter', () => {
  it('lets document examples bypass an active draft', () => {
    const result = routeIncomingText({
      text: 'ตัวอย่างเอกสาร',
      hasActiveDraft: true,
      db: {} as any,
    });

    expect(result.route).toBe(RouteType.ROUTE_TRUST_COMMAND);
    expect(result.trustCommand).toBe('DOC_EXAMPLES');
  });

  it('lets welcome replay bypass an active draft', () => {
    const result = routeIncomingText({
      text: 'ส่งwelcome cardมาอีกรอบ',
      hasActiveDraft: true,
      db: {} as any,
    });

    expect(result.route).toBe(RouteType.ROUTE_TRUST_COMMAND);
    expect(result.trustCommand).toBe('WELCOME_REPLAY');
  });

  it('lets latest document phrasing bypass an active draft', () => {
    const result = routeIncomingText({
      text: 'เปิดดูเอกสารล่าสุด',
      hasActiveDraft: true,
      db: {} as any,
    });

    expect(result.route).toBe(RouteType.ROUTE_TRUST_COMMAND);
    expect(result.trustCommand).toBe('LATEST_DOC');
  });

  it('routes natural menu phrasing to menu route', () => {
    const result = routeIncomingText({
      text: 'ขอเมนูหน่อย',
      hasActiveDraft: false,
      db: {} as any,
    });

    expect(result.route).toBe(RouteType.ROUTE_MENU);
  });

  it('routes natural invoice phrasing with bill wording to create doc', () => {
    const result = routeIncomingText({
      text: 'ช่วยทำบิลให้หน่อย',
      hasActiveDraft: false,
      db: {} as any,
    });

    expect(result.route).toBe(RouteType.ROUTE_CREATE_DOC);
    expect(result.docType).toBe('BILL');
  });

  it('routes natural status and theme phrasing safely', () => {
    const status = routeIncomingText({
      text: 'ฉันเหลือฟรีอีกกี่ใบ',
      hasActiveDraft: true,
      db: {} as any,
    });
    const theme = routeIncomingText({
      text: 'เปลี่ยนธีมยังไง',
      hasActiveDraft: false,
      db: {} as any,
    });

    expect(status.route).toBe(RouteType.ROUTE_TRUST_COMMAND);
    expect(status.trustCommand).toBe('SUBSCRIPTION_STATUS');
    expect(theme.route).toBe(RouteType.ROUTE_SETTINGS);
  });
});
