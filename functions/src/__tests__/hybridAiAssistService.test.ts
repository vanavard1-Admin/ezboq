import { describe, expect, it } from '@jest/globals';

import { classifyConversationalIntent } from '../services/hybridAiAssistService';

describe('hybridAiAssistService', () => {
  it('classifies natural welcome replay requests', async () => {
    const result = await classifyConversationalIntent('ขอ welcome card ใหม่หน่อย');
    expect(result.intent).toBe('WELCOME_REPLAY');
  });

  it('classifies natural help requests', async () => {
    const result = await classifyConversationalIntent('ช่วยสอนใช้หน่อย');
    expect(result.intent).toBe('HELP_GUIDE');
  });

  it('classifies natural document example requests', async () => {
    const result = await classifyConversationalIntent('อยากดูตัวอย่างใบเสนอราคา');
    expect(result.intent).toBe('DOC_EXAMPLES');
  });

  it('classifies natural business setup requests', async () => {
    const result = await classifyConversationalIntent('อยากตั้งค่าโลโก้กับที่อยู่');
    expect(result.intent).toBe('BUSINESS_SETUP_FORM');
    expect(result.canonicalText).toBe('ตั้งค่าธุรกิจแบบฟอร์ม');
  });

  it('classifies package status phrasing from real users', async () => {
    const result = await classifyConversationalIntent('ฉันเหลือฟรีอีกกี่ใบ');
    expect(result.intent).toBe('PACKAGE_STATUS');
    expect(result.canonicalText).toBe('สถานะแพ็ค');
  });

  it('classifies paid-but-not-updated complaints', async () => {
    const result = await classifyConversationalIntent('จ่ายแล้วทำไมยังไม่ขึ้น');
    expect(result.intent).toBe('PAYMENT_CLAIM');
  });

  it('classifies natural upgrade phrasing for pro and team', async () => {
    const pro = await classifyConversationalIntent('ซื้อโปรยังไง');
    const team = await classifyConversationalIntent('อยากได้แพ็กทีม');
    expect(pro.intent).toBe('UPGRADE_PRO');
    expect(team.intent).toBe('UPGRADE_TEAM');
  });

  it('classifies menu, theme, latest doc, and team invite requests', async () => {
    const menu = await classifyConversationalIntent('ขอเมนูหน่อย');
    const theme = await classifyConversationalIntent('เปลี่ยนธีมยังไง');
    const latest = await classifyConversationalIntent('เปิดดูเอกสารล่าสุด');
    const invite = await classifyConversationalIntent('ขอเชิญทีมยังไง');

    expect(menu.intent).toBe('MENU');
    expect(theme.intent).toBe('THEME_HELP');
    expect(latest.intent).toBe('LATEST_DOC');
    expect(invite.intent).toBe('TEAM_INVITE');
  });

  it('classifies natural invoice wording that uses bill wording', async () => {
    const result = await classifyConversationalIntent('ช่วยทำบิลให้หน่อย');
    expect(result.intent).toBe('CREATE_INVOICE');
  });
});
