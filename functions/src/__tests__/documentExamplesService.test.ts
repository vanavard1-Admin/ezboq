import { describe, expect, it } from '@jest/globals';

import {
  buildDocumentExamplesFlexMessage,
  getDocumentExampleMessages,
} from '../services/documentExamplesService';

describe('document examples service', () => {
  it('builds a 3-card sample carousel with open and download links', () => {
    const flex = buildDocumentExamplesFlexMessage() as {
      type: string;
      altText: string;
      contents: { type: string; contents: Array<any> };
    };

    expect(flex.type).toBe('flex');
    expect(flex.altText).toContain('ตัวอย่างเอกสาร');
    expect(flex.contents.type).toBe('carousel');
    expect(flex.contents.contents).toHaveLength(3);

    const firstFooter = flex.contents.contents[0].footer.contents;
    expect(firstFooter[0].action.uri).toContain('/examples/view/');
    expect(firstFooter[1].action.uri).toContain('/examples/download/');
  });

  it('returns only the sample carousel', () => {
    const messages = getDocumentExampleMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'flex' });
  });
});
