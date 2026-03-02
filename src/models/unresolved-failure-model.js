import { NOTIFICATION_STATUS, DELIVERY_ATTEMPT_STATUS } from './notification-status.js';

function cloneRecord(record) {
  return {
    ...record
  };
}

function addDays(iso, days) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalDate(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function badRequest(message, code = 'INVALID_UNRESOLVED_FAILURE') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

export function createUnresolvedFailureModel({
  idFactory = () => crypto.randomUUID(),
  nowFn = () => new Date(),
  retentionDays = 365
} = {}) {
  const recordsById = new Map();

  function createRecord({ notification, attempt, failureReason }) {
    if (!notification || !attempt) {
      throw badRequest('notification and attempt are required');
    }

    if (attempt.attemptNumber !== 2) {
      throw badRequest('unresolved failures must be recorded from attempt 2');
    }

    if (attempt.status !== DELIVERY_ATTEMPT_STATUS.FAILURE) {
      throw badRequest('unresolved failures require a failed attempt');
    }

    const normalizedFailureReason = typeof failureReason === 'string' && failureReason.trim().length > 0
      ? failureReason.trim()
      : attempt.failureReason;

    if (typeof normalizedFailureReason !== 'string' || normalizedFailureReason.trim().length === 0) {
      throw badRequest('failureReason is required');
    }

    const timestamp = attempt.attemptedAt ?? nowFn().toISOString();
    const record = {
      failureRecordId: idFactory(),
      notificationId: notification.notificationId,
      timestamp,
      submissionId: notification.submissionId,
      authorId: notification.authorId,
      failureReason: normalizedFailureReason,
      attemptNumber: 2,
      finalDeliveryStatus: NOTIFICATION_STATUS.UNRESOLVED_FAILURE,
      retainedUntil: addDays(timestamp, retentionDays),
      createdAt: nowFn().toISOString()
    };

    recordsById.set(record.failureRecordId, record);
    return cloneRecord(record);
  }

  function list({
    submissionId,
    authorId,
    from,
    to,
    page = 1,
    pageSize = 25
  } = {}) {
    const fromDate = parseOptionalDate(from);
    const toDate = parseOptionalDate(to);
    const normalizedPage = normalizePositiveInteger(page, 1);
    const normalizedPageSize = Math.min(normalizePositiveInteger(pageSize, 25), 100);

    const filtered = Array.from(recordsById.values()).filter((record) => {
      if (submissionId && record.submissionId !== submissionId) {
        return false;
      }

      if (authorId && record.authorId !== authorId) {
        return false;
      }

      const timestamp = new Date(record.timestamp);
      if (fromDate && timestamp < fromDate) {
        return false;
      }

      if (toDate && timestamp > toDate) {
        return false;
      }

      return true;
    }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

    const total = filtered.length;
    const start = (normalizedPage - 1) * normalizedPageSize;
    const items = filtered.slice(start, start + normalizedPageSize).map(cloneRecord);

    return {
      items,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total
    };
  }

  function getById(failureRecordId) {
    const record = recordsById.get(failureRecordId);
    return record ? cloneRecord(record) : null;
  }

  function purgeExpired(now = nowFn().toISOString()) {
    const cutoff = Date.parse(now);
    let removed = 0;

    for (const [failureRecordId, record] of recordsById.entries()) {
      if (Date.parse(record.retainedUntil) <= cutoff) {
        recordsById.delete(failureRecordId);
        removed += 1;
      }
    }

    return removed;
  }

  return {
    createRecord,
    list,
    getById,
    purgeExpired
  };
}
