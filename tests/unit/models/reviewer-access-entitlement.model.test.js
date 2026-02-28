import { describe, expect, it } from 'vitest';
import {
  createReviewerAccessEntitlement,
  resolveEntitlementDecision,
  revokeReviewerAccessEntitlement
} from '../../../src/models/reviewer-access-entitlement.model.js';

describe('reviewer-access-entitlement.model', () => {
  it('creates active entitlements and resolves decisions', () => {
    const entitlement = createReviewerAccessEntitlement({
      entitlementId: 'ent-1',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'accepted',
      accessStatus: 'active'
    });

    expect(entitlement.accessStatus).toBe('active');
    expect(resolveEntitlementDecision(entitlement)).toEqual({
      allowed: true,
      reasonCode: 'ACCESS_GRANTED'
    });
  });

  it('enforces state validation and denial decisions', () => {
    expect(() => createReviewerAccessEntitlement({
      entitlementId: 'ent-2',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'withdrawn',
      accessStatus: 'active'
    })).toThrow(/assignmentStatus/);

    expect(() => createReviewerAccessEntitlement({
      entitlementId: 'ent-3',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'accepted',
      accessStatus: 'revoked'
    })).toThrow(/revokedAt/);

    expect(resolveEntitlementDecision(null)).toEqual({
      allowed: false,
      reasonCode: 'ACCESS_NOT_ASSIGNED'
    });

    const withdrawn = createReviewerAccessEntitlement({
      entitlementId: 'ent-4',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'withdrawn',
      accessStatus: 'revoked',
      revokedAt: '2026-02-08T01:00:00.000Z'
    });
    expect(resolveEntitlementDecision(withdrawn).reasonCode).toBe('ACCESS_NOT_ASSIGNED');
  });

  it('revokes active entitlement records', () => {
    const active = createReviewerAccessEntitlement({
      entitlementId: 'ent-5',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'accepted',
      accessStatus: 'active'
    });

    const revoked = revokeReviewerAccessEntitlement(active, {
      revokedBy: 'editor-1',
      revokedAt: '2026-02-08T02:00:00.000Z'
    });

    expect(revoked.accessStatus).toBe('revoked');
    expect(revoked.revokedBy).toBe('editor-1');
    expect(resolveEntitlementDecision(revoked)).toEqual({
      allowed: false,
      reasonCode: 'ACCESS_REVOKED'
    });

    const alreadyRevoked = createReviewerAccessEntitlement({
      entitlementId: 'ent-6',
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      assignmentStatus: 'accepted',
      accessStatus: 'revoked',
      revokedAt: '2026-02-08T01:00:00.000Z',
      revokedBy: 'editor-existing'
    });
    const fallbackRevokedBy = revokeReviewerAccessEntitlement(alreadyRevoked, {
      revokedAt: '2026-02-08T02:30:00.000Z'
    });
    expect(fallbackRevokedBy.revokedBy).toBe('editor-existing');

    const autoTimestampRevocation = revokeReviewerAccessEntitlement(active, {});
    expect(autoTimestampRevocation.revokedAt).toMatch(/T/);
  });
});
