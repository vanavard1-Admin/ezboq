import {
  buildAutoProvisionUid,
  canClaimLineLink,
  decideProvisioningUid,
} from '../services/lineProvisioningService';

describe('lineProvisioningService', () => {
  describe('buildAutoProvisionUid', () => {
    it('creates a stable hashed uid for a LINE user', () => {
      const uidA = buildAutoProvisionUid('U1234567890abcdef');
      const uidB = buildAutoProvisionUid('U1234567890abcdef');

      expect(uidA).toBe(uidB);
      expect(uidA.startsWith('line_')).toBe(true);
      expect(uidA.length).toBeLessThanOrEqual(128);
    });
  });

  describe('canClaimLineLink', () => {
    it('rejects taking over an active non-guest link owned by another uid', () => {
      expect(
        canClaimLineLink(
          { uid: 'owner_uid', status: 'ACTIVE', isGuest: false },
          'other_uid'
        )
      ).toBe(false);
    });

    it('allows reusing guest and revoked links', () => {
      expect(
        canClaimLineLink(
          { uid: 'guest_uid', status: 'ACTIVE', isGuest: true },
          'real_uid'
        )
      ).toBe(true);
      expect(
        canClaimLineLink(
          { uid: 'old_uid', status: 'REVOKED', isGuest: false },
          'real_uid'
        )
      ).toBe(true);
    });
  });

  describe('decideProvisioningUid', () => {
    it('reuses guest and revoked uids instead of minting a new one', () => {
      expect(
        decideProvisioningUid('Uline123', {
          uid: 'guest_Uline123',
          status: 'ACTIVE',
          isGuest: true,
        })
      ).toEqual({
        uid: 'guest_Uline123',
        reusedExistingUid: true,
        reactivated: false,
        upgradedGuest: true,
      });

      expect(
        decideProvisioningUid('Uline123', {
          uid: 'legacy_uid',
          status: 'REVOKED',
          isGuest: false,
        })
      ).toEqual({
        uid: 'legacy_uid',
        reusedExistingUid: true,
        reactivated: true,
        upgradedGuest: false,
      });
    });

    it('mints a hashed uid when no prior link exists', () => {
      const result = decideProvisioningUid('Uline123', null);

      expect(result.reusedExistingUid).toBe(false);
      expect(result.reactivated).toBe(false);
      expect(result.upgradedGuest).toBe(false);
      expect(result.uid.startsWith('line_')).toBe(true);
    });
  });
});
