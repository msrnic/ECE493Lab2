import { randomUUID } from 'node:crypto';
import { DECISION_ACTIONS } from './decision-model.js';

export const DECISION_AUDIT_OUTCOMES = Object.freeze({
  SUCCESS_DEFER: 'SUCCESS_DEFER',
  SUCCESS_FINAL: 'SUCCESS_FINAL',
  DENIED_UNASSIGNED: 'DENIED_UNASSIGNED',
  DENIED_IMMUTABLE: 'DENIED_IMMUTABLE',
  DENIED_CONFLICT: 'DENIED_CONFLICT',
  DENIED_PRECONDITION: 'DENIED_PRECONDITION',
  DENIED_INVALID: 'DENIED_INVALID'
});

const ALLOWED_OUTCOMES = new Set(Object.values(DECISION_AUDIT_OUTCOMES));
const ALLOWED_ACTIONS = new Set(Object.values(DECISION_ACTIONS));

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeDateInput(value, fieldName) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed.toISOString();
}

function normalizeOutcome(outcome) {
  const normalized = assertNonEmptyString(outcome, 'outcome');
  if (!ALLOWED_OUTCOMES.has(normalized)) {
    throw new Error(`outcome must be one of ${Object.values(DECISION_AUDIT_OUTCOMES).join(', ')}`);
  }

  return normalized;
}

function normalizeActionAttempted(actionAttempted) {
  const normalized = assertNonEmptyString(actionAttempted, 'actionAttempted').toUpperCase();
  if (!ALLOWED_ACTIONS.has(normalized)) {
    throw new Error(`actionAttempted must be one of ${Object.values(DECISION_ACTIONS).join(', ')}`);
  }

  return normalized;
}

function normalizeReason(reason) {
  if (reason === undefined || reason === null) {
    return null;
  }

  const normalized = String(reason).trim();
  return normalized.length === 0 ? null : normalized;
}

function cloneEntry(entry) {
  return structuredClone(entry);
}

export function createDecisionAuditModel({
  seedEntries = [],
  nowFn = () => new Date(),
  idFactory = () => randomUUID(),
  shouldFailPersistFn = () => false
} = {}) {
  const auditEntries = [];
  let activeFailurePredicate = shouldFailPersistFn;

  function setShouldFailPersist(predicateOrBoolean) {
    if (typeof predicateOrBoolean === 'function') {
      activeFailurePredicate = predicateOrBoolean;
      return;
    }

    activeFailurePredicate = () => predicateOrBoolean === true;
  }

  function recordEntry({
    paperId,
    editorId,
    actionAttempted,
    outcome,
    reason = null,
    occurredAt = nowFn()
  }) {
    const normalizedEntry = {
      auditId: assertNonEmptyString(idFactory(), 'auditId'),
      paperId: assertNonEmptyString(paperId, 'paperId'),
      editorId: assertNonEmptyString(editorId, 'editorId'),
      actionAttempted: normalizeActionAttempted(actionAttempted),
      outcome: normalizeOutcome(outcome),
      reason: normalizeReason(reason),
      occurredAt: normalizeDateInput(occurredAt, 'occurredAt')
    };

    if (activeFailurePredicate(normalizedEntry)) {
      throw new Error('AUDIT_WRITE_FAILED');
    }

    auditEntries.push(normalizedEntry);
    return cloneEntry(normalizedEntry);
  }

  function listEntries({
    paperId,
    editorId,
    outcome
  } = {}) {
    return auditEntries
      .filter((entry) => (paperId ? entry.paperId === paperId : true))
      .filter((entry) => (editorId ? entry.editorId === editorId : true))
      .filter((entry) => (outcome ? entry.outcome === outcome : true))
      .map(cloneEntry);
  }

  function clearEntries() {
    auditEntries.splice(0, auditEntries.length);
  }

  for (const seedEntry of seedEntries) {
    recordEntry(seedEntry);
  }

  return {
    recordEntry,
    listEntries,
    clearEntries,
    setShouldFailPersist
  };
}
