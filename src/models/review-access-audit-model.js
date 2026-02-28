import { randomUUID } from 'node:crypto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

  return parsed;
}

function toIsoString(value, fieldName) {
  return normalizeDateInput(value, fieldName).toISOString();
}

function cloneEntry(entry) {
  return structuredClone(entry);
}

export function createReviewAccessAuditModel({
  seedEntries = [],
  nowFn = () => new Date(),
  idFactory = () => randomUUID()
} = {}) {
  const auditEntries = [];

  function recordAccess({ editorId, paperId, accessedAt = nowFn() }) {
    const normalizedAccessedAt = normalizeDateInput(accessedAt, 'accessedAt');
    const entry = {
      auditId: assertNonEmptyString(idFactory(), 'auditId'),
      editorId: assertNonEmptyString(editorId, 'editorId'),
      paperId: assertNonEmptyString(paperId, 'paperId'),
      accessedAt: normalizedAccessedAt.toISOString(),
      retentionUntil: new Date(normalizedAccessedAt.getTime() + ONE_YEAR_MS).toISOString()
    };

    auditEntries.push(entry);
    return cloneEntry(entry);
  }

  function listEntries({ editorId, paperId } = {}) {
    return auditEntries
      .filter((entry) => (editorId ? entry.editorId === editorId : true))
      .filter((entry) => (paperId ? entry.paperId === paperId : true))
      .map(cloneEntry);
  }

  function purgeExpiredEntries({ now = nowFn() } = {}) {
    const nowMs = normalizeDateInput(now, 'now').getTime();
    const retained = auditEntries.filter((entry) => normalizeDateInput(entry.retentionUntil, 'retentionUntil').getTime() > nowMs);
    const removedCount = auditEntries.length - retained.length;

    auditEntries.splice(0, auditEntries.length, ...retained);
    return removedCount;
  }

  for (const entry of seedEntries) {
    recordAccess({
      editorId: entry.editorId,
      paperId: entry.paperId,
      accessedAt: toIsoString(entry.accessedAt, 'accessedAt')
    });
  }

  return {
    recordAccess,
    listEntries,
    purgeExpiredEntries
  };
}
