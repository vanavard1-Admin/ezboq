import { describe, expect, it } from '@jest/globals';

import {
  buildWelcomeFlexMessage,
  getFallbackMessage,
  getHelpSummary,
  getVersionAnnouncementMessage,
  getUsageGuideSimple,
  getWelcomeMessage,
  getWelcomeQuickReply,
} from '../services/uxCopy';
import { getHelpMessageShort } from '../services/helpCopy';

describe('plan-aware onboarding copy', () => {
  it('shows buy pack CTA for FREE users', () => {
    const buttons = getWelcomeQuickReply('FREE');
    const texts = buttons.map((button) => button.action.text);

    expect(texts).toContain('ซื้อแพ็ค 99');
    expect(texts).toContain('ตัวอย่างเอกสาร');
    expect(texts).toContain('ตั้งค่าธุรกิจแบบฟอร์ม');
    expect(getWelcomeMessage('FREE')).toContain('10 ใบแรก');
    expect(getWelcomeMessage('FREE')).toContain('ลายน้ำ EzDOC');
    expect(getWelcomeMessage('FREE')).toContain('ตัวอย่าง PDF จริง');
    expect(getWelcomeMessage('FREE')).toContain('ตั้งค่าธุรกิจแบบฟอร์ม');
    expect(getWelcomeMessage('FREE')).toContain('ซื้อแพ็ค 99');
    expect(getWelcomeMessage('FREE')).toContain('ซื้อแพ็ค 279');
    expect(getFallbackMessage(false, 'FREE')).toContain('ซื้อแพ็ค 99');
    expect(getHelpMessageShort('FREE')).toContain('10 ใบแรก');

    const welcomeFlex = buildWelcomeFlexMessage('FREE') as {
      type: string;
      altText: string;
      contents: { footer: { contents: Array<any> } };
    };
    const footerLabels = welcomeFlex.contents.footer.contents
      .filter((button) => button.type === 'button')
      .map((button) => button.action.label);
    const serializedFlex = JSON.stringify(welcomeFlex);
    expect(welcomeFlex.type).toBe('flex');
    expect(welcomeFlex.altText).toContain('EzDOC');
    expect(footerLabels).toContain('ซื้อแพ็ค 99');
    expect(footerLabels).toContain('ซื้อแพ็ค 279');
    expect(serializedFlex).toContain('https://doc.ezboq.com');
    expect(serializedFlex).toContain('เชื่อมต่อ');
  });

  it('hides relink CTA in linked onboarding variant', () => {
    const buttons = getWelcomeQuickReply('FREE', { linked: true });
    const texts = buttons.map((button) => button.action.text);
    const welcomeFlex = buildWelcomeFlexMessage('FREE', { linked: true });
    const serializedFlex = JSON.stringify(welcomeFlex);

    expect(texts).not.toContain('เชื่อมต่อ');
    expect(serializedFlex).toContain('เชื่อมบัญชีเรียบร้อยแล้ว');
    expect(serializedFlex).toContain('ตั้งค่าธุรกิจแบบฟอร์ม');
  });

  it('replaces buy pack CTA with subscription status for PRO and TEAM users', () => {
    const proTexts = getWelcomeQuickReply('PRO').map((button) => button.action.text);
    const teamTexts = getWelcomeQuickReply('TEAM').map((button) => button.action.text);

    expect(proTexts).toContain('สถานะแพ็ค');
    expect(teamTexts).toContain('สถานะแพ็ค');
    expect(proTexts).not.toContain('ซื้อแพ็ค 99');
    expect(teamTexts).not.toContain('ซื้อแพ็ค 99');
  });

  it('uses plan-aware help copy for paid users', () => {
    expect(getWelcomeMessage('PRO')).toContain('สถานะแพ็ค');
    expect(getWelcomeMessage('PRO')).not.toContain('ซื้อแพ็ค 99');
    expect(getUsageGuideSimple('TEAM')).toContain('สถานะแพ็ค');
    expect(getHelpSummary('PRO')).toContain('แพ็ค  สถานะแพ็ค / เช็คสลิป');
    expect(getHelpMessageShort('TEAM')).toContain('สถานะแพ็ค');
    expect(getHelpMessageShort('TEAM')).not.toContain('ซื้อแพ็ค 99');
  });

  it('has a concise version announcement for broadcast', () => {
    const announcement = getVersionAnnouncementMessage('1.1');

    expect(announcement).toContain('เวอร์ชัน 1.1');
    expect(announcement).toContain('Welcome Card');
    expect(announcement).toContain('ตัวอย่างเอกสารจริง');
    expect(announcement).not.toContain('99/เดือน');
  });
});
