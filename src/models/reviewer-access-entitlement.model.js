import {
  assertEnum,
  assertIsoDateString,
  assertNonEmptyString,
  cloneRecord
} from './model-validation.js';

export const REVIEWER_ASSIGNMENT_STATUSES = Object.freeze(['accepted', 'withdrawn']);
export const REVIEWER_ACCESS_STATUSES = Object.freeze(['active', 'revoked']);

function nowIso(nowFn) {
  return nowFn().toISOString();
}

function validateState({ assignmentStatus, accessStatus, revokedAt }) {
  if (accessStatus === 'active' && assignmentStatus !== 'accepted') {
    throw new Error('active access requires assignmentStatus to be accepted');
  }

  if (accessStatus === 'revoked' && !revokedAt) {
    throw new Error('revoked access requires revokedAt');
  }
}

export function createReviewerAccessEntitlement(
  {
    entitlementId,
    reviewerId,
    paperId,
    assignmentStatus = 'accepted',
    accessStatus = 'active',
    revokedAt = null,
    revokedBy = null,
    updatedAt
  },
  { nowFn = () => new Date() } = {}
) {
  const normalized = {
    entitlementId: assertNonEmptyString(entitlementId, 'entitlementId'),
    reviewerId: assertNonEmptyString(reviewerId, 'reviewerId'),
    paperId: assertNonEmptyString(paperId, 'paperId'),
    assignmentStatus: assertEnum(assignmentStatus, 'assignmentStatus', REVIEWER_ASSIGNMENT_STATUSES),
    accessStatus: assertEnum(accessStatus, 'accessStatus', REVIEWER_ACCESS_STATUSES),
    revokedAt: assertIsoDateString(revokedAt, 'revokedAt', { required: false }),
    revokedBy: revokedBy === null ? null : assertNonEmptyString(revokedBy, 'revokedBy'),
    updatedAt: assertIsoDateString(updatedAt ?? nowIso(nowFn), 'updatedAt')
  };

  validateState(normalized);
  return normalized;
}

export function resolveEntitlementDecision(entitlement) {
  if (!entitlement) {
    return {
      allowed: false,
      reasonCode: 'ACCESS_NOT_ASSIGNED'
    };
  }

  if (entitlement.assignmentStatus !== 'accepted') {
    return {
      allowed: false,
      reasonCode: 'ACCESS_NOT_ASSIGNED'
    };
  }

  if (entitlement.accessStatus === 'revoked') {
    return {
      allowed: false,
      reasonCode: 'ACCESS_REVOKED'
    };
  }

  return {
    allowed: true,
    reasonCode: 'ACCESS_GRANTED'
  };
}

export function revokeReviewerAccessEntitlement(
  entitlement,
  {
    revokedAt,
    revokedBy,
    updatedAt,
    nowFn = () => new Date()
  } = {}
) {
  const normalizedRevokedAt = assertIsoDateString(revokedAt ?? nowIso(nowFn), 'revokedAt');

  return createReviewerAccessEntitlement(
    {
      ...cloneRecord(entitlement),
      assignmentStatus: entitlement.assignmentStatus,
      accessStatus: 'revoked',
      revokedAt: normalizedRevokedAt,
      revokedBy: revokedBy ?? entitlement.revokedBy,
      updatedAt: updatedAt ?? normalizedRevokedAt
    },
    { nowFn }
  );
}
