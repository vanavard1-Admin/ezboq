import { describe, expect, it } from '@jest/globals';

import { normalizeInput } from '../utils/inputNormalization';

describe('inputNormalization', () => {
  it('normalizes common quotation typos into the canonical create command', () => {
    expect(normalizeInput('ใบเสรอราคา')).toBe('ทำใบเสนอราคา');
    expect(normalizeInput('ทำใบเสรอราคา')).toBe('ทำใบเสนอราคา');
  });
});
