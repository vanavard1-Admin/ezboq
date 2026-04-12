import { describe, expect, it } from '@jest/globals';

import { getButtonAction } from '../core/buttonActionMap';
import { Intent } from '../core/conversationOrchestrator';
import { CMD_BUY_PACK_279, getCanonicalCommand } from '../shared/commands';

describe('package command canonicalization', () => {
  it('maps legacy 299 aliases to the 279 command', () => {
    expect(getCanonicalCommand('ซื้อ 299')).toBe(CMD_BUY_PACK_279);
    expect(getCanonicalCommand('แพ็ค 299')).toBe(CMD_BUY_PACK_279);
    expect(getCanonicalCommand('ซื้อแพ็ค399')).toBe(CMD_BUY_PACK_279);
  });

  it('routes legacy purchase aliases to BUY_PACKAGE_279 intent', () => {
    expect(getButtonAction('ซื้อแพ็ค 279')?.intent).toBe(Intent.BUY_PACKAGE_279);
    expect(getButtonAction('ซื้อแพ็ค 399')?.intent).toBe(Intent.BUY_PACKAGE_279);
    expect(getButtonAction('ซื้อ 299')?.intent).toBe(Intent.BUY_PACKAGE_279);
  });
});
