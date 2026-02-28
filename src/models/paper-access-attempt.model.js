import { randomUUID } from 'node:crypto';
import {
  assertArray,
  assertEnum,
  assertInteger,
  assertIsoDateString,
  assertNonEmptyString,
  normalizeStringArray,
  cloneRecord
} from './model-validation.js';

export const PAPER_ACCESS_OUTCOMES = Object.freeze([
  'granted',
  'denied-revoked',
  'temporarily-unavailable',
  'throttled'
]);

const REASON_CODES_BY_OUTCOME = Object.freeze({
  granted: ['ACCESS_GRANTED'],
  'denied-revoked': ['ACCESS_REVOKED', 'ACCESS_NOT_ASSIGNED'],
  'temporarily-unavailable': ['TEMPORARY_OUTAGE'],
  throttled: ['TEMP_OUTAGE_THROTTLED']
});

function validateReasonCode(outcome, reasonCode) {
  const allowed = REASON_CODES_BY_OUTCOME[outcome];
  if (!allowed.includes(reasonCode)) {
    throw new Error(`reasonCode must match outcome ${outcome}`);
  }
}

function normalizeLimit(limit) {
  if (limit === undefined || limit === null) {
    return 50;
  }

  const normalized = Number(limit);
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error('limit must be a positive integer');
  }

  return Math.min(normalized, 200);
}

export function createPaperAccessAttemptStore({
  idFactory = () => randomUUID(),
  nowFn = () => new Date()
} = {}) {
  const attempts = [];

  function recordAttempt({
    reviewerId,
    paperId,
    fileId = null,
    outcome,
    reasonCode,
    requestId,
    viewerRoleSnapshot = [],
    retryAfterSeconds,
    occurredAt
  }) {
    const normalizedOutcome = assertEnum(outcome, 'outcome', PAPER_ACCESS_OUTCOMES);
    const normalizedReasonCode = assertNonEmptyString(reasonCode, 'reasonCode');
    validateReasonCode(normalizedOutcome, normalizedReasonCode);

    const normalizedViewerRoleSnapshot = normalizeStringArray(
      assertArray(viewerRoleSnapshot, 'viewerRoleSnapshot'),
      'viewerRoleSnapshot'
    );

    if (normalizedOutcome === 'throttled') {
      assertInteger(retryAfterSeconds, 'retryAfterSeconds', { min: 1 });
    }

    const record = {
      attemptId: idFactory(),
      reviewerId: assertNonEmptyString(reviewerId, 'reviewerId'),
      paperId: assertNonEmptyString(paperId, 'paperId'),
      fileId: fileId === null || fileId === undefined ? null : assertNonEmptyString(fileId, 'fileId'),
      outcome: normalizedOutcome,
      reasonCode: normalizedReasonCode,
      occurredAt: assertIsoDateString(occurredAt ?? nowFn().toISOString(), 'occurredAt'),
      requestId: assertNonEmptyString(requestId, 'requestId'),
      viewerRoleSnapshot: normalizedViewerRoleSnapshot,
      retryAfterSeconds: normalizedOutcome === 'throttled' ? retryAfterSeconds : null
    };

    attempts.push(record);
    return cloneRecord(record);
  }

  function listAttemptsForPaper(paperId, { outcome, limit } = {}) {
    const normalizedPaperId = assertNonEmptyString(paperId, 'paperId');
    const normalizedLimit = normalizeLimit(limit);

    if (outcome !== undefined) {
      assertEnum(outcome, 'outcome', PAPER_ACCESS_OUTCOMES);
    }

    return attempts
      .filter((attempt) => attempt.paperId === normalizedPaperId)
      .filter((attempt) => (outcome ? attempt.outcome === outcome : true))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, normalizedLimit)
      .map((attempt) => cloneRecord(attempt));
  }

  function listAllAttempts() {
    return attempts.map((attempt) => cloneRecord(attempt));
  }

  return {
    recordAttempt,
    listAttemptsForPaper,
    listAllAttempts
  };
}
