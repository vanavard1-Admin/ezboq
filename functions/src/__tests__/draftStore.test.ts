import { describe, expect, it } from '@jest/globals';

import { formatDraftForDisplay } from '../core/draftStore';

describe('draftStore formatDraftForDisplay', () => {
  it('shows notes when the draft includes a remark', () => {
    const summary = formatDraftForDisplay({
      docType: 'BILL',
      customerName: 'นิด้า',
      items: [{ name: 'ค่าออกแบบ', qty: 1, price: 5000 }],
      subtotal: 5000,
      total: 5000,
      notes: 'งวดที่ 1',
    });

    expect(summary).toContain('ลูกค้า: นิด้า');
    expect(summary).toContain('ค่าออกแบบ');
    expect(summary).toContain('📝 หมายเหตุ: งวดที่ 1');
  });
});
