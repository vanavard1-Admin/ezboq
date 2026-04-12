import { describe, expect, it } from '@jest/globals';

import {
  STARTER_FREE_DOC_QUOTA,
  buildStarterQuotaStatus,
} from '../core/lineLinkService';

describe('lineLinkService starter quota', () => {
  it('defaults missing starter quota to the shared free quota', () => {
    expect(buildStarterQuotaStatus(undefined, undefined)).toEqual({
      quota: STARTER_FREE_DOC_QUOTA,
      used: 0,
      remaining: STARTER_FREE_DOC_QUOTA,
    });
  });

  it('upgrades legacy one-doc quota to the current starter quota', () => {
    expect(buildStarterQuotaStatus(1, 1)).toEqual({
      quota: STARTER_FREE_DOC_QUOTA,
      used: 1,
      remaining: STARTER_FREE_DOC_QUOTA - 1,
    });
  });

  it('clamps usage so remaining never goes negative', () => {
    expect(buildStarterQuotaStatus(10, 99)).toEqual({
      quota: STARTER_FREE_DOC_QUOTA,
      used: STARTER_FREE_DOC_QUOTA,
      remaining: 0,
    });
  });
});
