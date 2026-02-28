function invitationError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function toIsoString(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function createDefaultSender() {
  return async () => ({ accepted: true });
}

function mapContractToLegacyStatus(invitation) {
  if (invitation.status === 'delivered') {
    return 'sent';
  }

  if (invitation.status === 'failed') {
    return 'failed_terminal';
  }

  if (invitation.status === 'pending' && invitation.nextRetryAt) {
    return 'retry_scheduled';
  }

  return invitation.status;
}

function cloneLegacyInvitation(invitation) {
  return {
    invitationId: invitation.id,
    assignmentId: invitation.reviewerAssignmentId,
    reviewerId: invitation.reviewerId,
    displayName: invitation.displayName,
    status: mapContractToLegacyStatus(invitation),
    retryCount: invitation.retryCount,
    nextRetryAt: invitation.nextRetryAt,
    followUpRequired: invitation.followUpRequired,
    lastError: invitation.lastFailureReason
  };
}

function cloneContractInvitation(invitation) {
  return {
    id: invitation.id,
    reviewerAssignmentId: invitation.reviewerAssignmentId,
    paperId: invitation.paperId,
    reviewerId: invitation.reviewerId,
    status: invitation.status,
    retryCount: invitation.retryCount,
    maxRetries: invitation.maxRetries,
    nextRetryAt: invitation.nextRetryAt,
    followUpRequired: invitation.followUpRequired,
    lastFailureReason: invitation.lastFailureReason,
    deliveredAt: invitation.deliveredAt,
    canceledAt: invitation.canceledAt,
    updatedAt: invitation.updatedAt
  };
}

function cloneFailureLogEntry(entry) {
  return {
    id: entry.id,
    invitationId: entry.invitationId,
    deliveryAttemptId: entry.deliveryAttemptId,
    eventType: entry.eventType,
    message: entry.message,
    createdAt: entry.createdAt
  };
}

function normalizeActorRole(value) {
  return String(value ?? '').trim().toLowerCase();
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function nowIso(nowFn) {
  return toIsoString(nowFn());
}

export function createReviewInvitationModel({
  idFactory = () => crypto.randomUUID(),
  attemptIdFactory = () => crypto.randomUUID(),
  failureLogIdFactory = () => crypto.randomUUID(),
  nowFn = () => new Date().toISOString(),
  retryIntervalMs = 5 * 60 * 1000,
  maxRetries = 3
} = {}) {
  const invitationStore = new Map();
  const invitationByAssignmentId = new Map();
  const attemptStore = new Map();
  const attemptsByInvitationId = new Map();
  const failureLogEntries = [];

  function getInvitationOrThrow(invitationId) {
    const invitation = invitationStore.get(invitationId);
    if (!invitation) {
      throw invitationError('INVITATION_NOT_FOUND', 'invitation was not found', {
        status: 404,
        invitationId
      });
    }

    return invitation;
  }

  function getAssignmentInvitationOrThrow(assignmentId) {
    const invitationId = invitationByAssignmentId.get(assignmentId);
    if (!invitationId) {
      throw invitationError('INVITATION_NOT_FOUND', 'invitation was not found', {
        status: 404,
        reviewerAssignmentId: assignmentId
      });
    }

    return getInvitationOrThrow(invitationId);
  }

  function trackFailureLog(invitation, {
    deliveryAttemptId = null,
    eventType,
    message,
    createdAt
  }) {
    const entry = {
      id: failureLogIdFactory(),
      invitationId: invitation.id,
      deliveryAttemptId,
      paperId: invitation.paperId,
      reviewerId: invitation.reviewerId,
      eventType,
      message,
      createdAt
    };
    failureLogEntries.push(entry);
    return entry;
  }

  function createDeliveryAttempt(invitation, {
    attemptNumber,
    attemptType,
    scheduledAt,
    startedAt
  }) {
    const attempt = {
      id: attemptIdFactory(),
      invitationId: invitation.id,
      attemptNumber,
      attemptType,
      scheduledAt,
      startedAt,
      completedAt: null,
      outcome: 'failed',
      failureReason: null,
      providerMessageId: null
    };
    attemptStore.set(attempt.id, attempt);

    const list = attemptsByInvitationId.get(invitation.id) ?? [];
    list.push(attempt);
    attemptsByInvitationId.set(invitation.id, list);

    return attempt;
  }

  function markAttemptCompleted(attempt, {
    completedAt,
    outcome,
    failureReason = null,
    providerMessageId = null
  }) {
    attempt.completedAt = completedAt;
    attempt.outcome = outcome;
    attempt.failureReason = failureReason;
    attempt.providerMessageId = providerMessageId;
  }

  function setDelivered(invitation, deliveredAt) {
    invitation.status = 'delivered';
    invitation.deliveredAt = deliveredAt;
    invitation.nextRetryAt = null;
    invitation.lastFailureReason = null;
    invitation.followUpRequired = false;
    invitation.isActive = false;
    invitation.updatedAt = deliveredAt;
  }

  function scheduleRetry(invitation, baseTimeIso, failureReason) {
    invitation.status = 'pending';
    invitation.nextRetryAt = new Date(Date.parse(baseTimeIso) + retryIntervalMs).toISOString();
    invitation.lastFailureReason = failureReason;
    invitation.followUpRequired = false;
    invitation.updatedAt = baseTimeIso;
  }

  function setFailed(invitation, failedAt, failureReason) {
    invitation.status = 'failed';
    invitation.nextRetryAt = null;
    invitation.lastFailureReason = failureReason;
    invitation.followUpRequired = true;
    invitation.isActive = false;
    invitation.updatedAt = failedAt;
  }

  function setCanceled(invitation, canceledAt, reason) {
    invitation.status = 'canceled';
    invitation.canceledAt = canceledAt;
    invitation.nextRetryAt = null;
    invitation.lastFailureReason = reason;
    invitation.followUpRequired = false;
    invitation.isActive = false;
    invitation.updatedAt = canceledAt;
  }

  function getAttemptNumberForDispatch(invitation) {
    if (invitation.retryCount === 0) {
      return 0;
    }

    return invitation.retryCount;
  }

  async function executeSend(invitation, {
    sendFn,
    attemptNumber,
    attemptType,
    scheduledAt,
    startedAt,
    completedAt
  }) {
    const attempt = createDeliveryAttempt(invitation, {
      attemptNumber,
      attemptType,
      scheduledAt,
      startedAt
    });

    const result = await sendFn(cloneContractInvitation(invitation));
    const resolvedCompletedAt = completedAt ?? nowIso(nowFn);

    if (result?.accepted === true) {
      markAttemptCompleted(attempt, {
        completedAt: resolvedCompletedAt,
        outcome: 'delivered',
        providerMessageId: result?.providerMessageId ?? null
      });
      setDelivered(invitation, resolvedCompletedAt);
      return cloneContractInvitation(invitation);
    }

    const failureReason = result?.error ?? (attemptType === 'initial' ? 'Invitation dispatch failed.' : 'Invitation retry failed.');
    markAttemptCompleted(attempt, {
      completedAt: resolvedCompletedAt,
      outcome: 'failed',
      failureReason,
      providerMessageId: result?.providerMessageId ?? null
    });

    if (attemptType === 'retry') {
      invitation.retryCount += 1;
    }

    const retryLimitReached = invitation.retryCount >= invitation.maxRetries;
    const eventType = attemptType === 'initial' ? 'initial-failure' : 'retry-failure';
    trackFailureLog(invitation, {
      deliveryAttemptId: attempt.id,
      eventType,
      message: failureReason,
      createdAt: resolvedCompletedAt
    });

    if (retryLimitReached) {
      setFailed(invitation, resolvedCompletedAt, failureReason);
      trackFailureLog(invitation, {
        deliveryAttemptId: attempt.id,
        eventType: 'terminal-failure',
        message: `Retry limit reached after ${invitation.maxRetries} retries.`,
        createdAt: resolvedCompletedAt
      });
      return cloneContractInvitation(invitation);
    }

    scheduleRetry(invitation, resolvedCompletedAt, failureReason);
    return cloneContractInvitation(invitation);
  }

  function findActiveInvitationByAssignment(assignmentId) {
    const knownInvitationId = invitationByAssignmentId.get(assignmentId);
    if (!knownInvitationId) {
      return null;
    }

    const existing = invitationStore.get(knownInvitationId);
    if (!existing || !existing.isActive) {
      return null;
    }

    return existing;
  }

  function createOrReuseInvitation({
    reviewerAssignmentId,
    paperId = 'paper-unknown',
    reviewerId,
    displayName = null
  }) {
    const existing = findActiveInvitationByAssignment(reviewerAssignmentId);
    if (existing) {
      return {
        invitation: existing,
        reused: true
      };
    }

    const createdAt = nowIso(nowFn);
    const invitation = {
      id: idFactory(),
      reviewerAssignmentId,
      paperId,
      reviewerId,
      displayName,
      status: 'pending',
      retryCount: 0,
      maxRetries,
      nextRetryAt: null,
      followUpRequired: false,
      lastFailureReason: null,
      deliveredAt: null,
      canceledAt: null,
      isActive: true,
      createdAt,
      updatedAt: createdAt
    };

    invitationStore.set(invitation.id, invitation);
    invitationByAssignmentId.set(reviewerAssignmentId, invitation.id);

    return {
      invitation,
      reused: false
    };
  }

  function createInvitation({ assignmentId, reviewerId, displayName }) {
    const { invitation } = createOrReuseInvitation({
      reviewerAssignmentId: assignmentId,
      reviewerId,
      displayName
    });

    return cloneLegacyInvitation(invitation);
  }

  function getInvitation(invitationId) {
    const invitation = invitationStore.get(invitationId);
    return invitation ? cloneLegacyInvitation(invitation) : null;
  }

  function getInvitationStatus(invitationId) {
    const invitation = invitationStore.get(invitationId);
    return invitation ? cloneContractInvitation(invitation) : null;
  }

  function getFailureLog(invitationId, actorRole) {
    const normalizedRole = normalizeActorRole(actorRole);
    if (!['editor', 'admin', 'support'].includes(normalizedRole)) {
      throw invitationError('INVITATION_FORBIDDEN', 'you do not have access to invitation failure logs', {
        status: 403
      });
    }

    const invitation = getInvitationOrThrow(invitationId);
    return {
      invitationId: invitation.id,
      status: mapContractToLegacyStatus(invitation),
      retryCount: invitation.retryCount,
      lastError: invitation.lastFailureReason,
      followUpRequired: invitation.followUpRequired
    };
  }

  async function dispatchInvitation(invitationId, sendFn = createDefaultSender()) {
    const invitation = getInvitationOrThrow(invitationId);
    if (invitation.status === 'canceled') {
      return cloneLegacyInvitation(invitation);
    }

    const scheduledAt = nowIso(nowFn);
    await executeSend(invitation, {
      sendFn,
      attemptNumber: getAttemptNumberForDispatch(invitation),
      attemptType: 'initial',
      scheduledAt,
      startedAt: scheduledAt
    });

    return cloneLegacyInvitation(invitation);
  }

  async function retryInvitation(invitationId, sendFn = createDefaultSender()) {
    const invitation = getInvitationOrThrow(invitationId);
    if (invitation.status === 'canceled' || invitation.status === 'failed') {
      return cloneLegacyInvitation(invitation);
    }

    const startedAt = nowIso(nowFn);
    await executeSend(invitation, {
      sendFn,
      attemptNumber: invitation.retryCount + 1,
      attemptType: 'retry',
      scheduledAt: invitation.nextRetryAt ?? startedAt,
      startedAt
    });

    return cloneLegacyInvitation(invitation);
  }

  function cancelInvitation(invitationId, reason = 'assignment_removed') {
    const invitation = getInvitationOrThrow(invitationId);
    const canceledAt = nowIso(nowFn);
    setCanceled(invitation, canceledAt, reason);
    trackFailureLog(invitation, {
      eventType: 'retry-canceled',
      message: reason,
      createdAt: canceledAt
    });

    return cloneLegacyInvitation(invitation);
  }

  async function triggerInvitationDelivery({ reviewerAssignmentId, paperId, reviewerId }, sendFn = createDefaultSender()) {
    const { invitation, reused } = createOrReuseInvitation({
      reviewerAssignmentId,
      paperId,
      reviewerId
    });

    if (!reused) {
      const startedAt = nowIso(nowFn);
      await executeSend(invitation, {
        sendFn,
        attemptNumber: 0,
        attemptType: 'initial',
        scheduledAt: startedAt,
        startedAt
      });
    }

    return {
      invitation: cloneContractInvitation(invitation),
      reused
    };
  }

  function getAttemptOrThrow(invitationId, attemptId) {
    const attempt = attemptStore.get(attemptId);
    if (!attempt || attempt.invitationId !== invitationId) {
      throw invitationError('INVITATION_ATTEMPT_NOT_FOUND', 'invitation attempt was not found', {
        status: 404,
        invitationId,
        attemptId
      });
    }

    return attempt;
  }

  function applyDeliveryEvent(invitation, attempt, {
    eventType,
    failureReason,
    providerMessageId,
    occurredAt
  }) {
    const eventTime = toIsoString(occurredAt);

    if (invitation.status === 'failed' || invitation.status === 'canceled') {
      markAttemptCompleted(attempt, {
        completedAt: eventTime,
        outcome: 'ignored',
        failureReason: failureReason ?? null,
        providerMessageId: providerMessageId ?? null
      });
      trackFailureLog(invitation, {
        deliveryAttemptId: attempt.id,
        eventType: 'late-callback-ignored',
        message: `Ignored ${eventType} callback after terminal state ${invitation.status}.`,
        createdAt: eventTime
      });
      return cloneContractInvitation(invitation);
    }

    if (eventType === 'delivered') {
      markAttemptCompleted(attempt, {
        completedAt: eventTime,
        outcome: 'delivered',
        providerMessageId: providerMessageId ?? null
      });
      setDelivered(invitation, eventTime);
      return cloneContractInvitation(invitation);
    }

    const resolvedFailure = failureReason ?? 'Delivery callback failure.';
    markAttemptCompleted(attempt, {
      completedAt: eventTime,
      outcome: 'failed',
      failureReason: resolvedFailure,
      providerMessageId: providerMessageId ?? null
    });

    if (attempt.attemptType === 'retry') {
      invitation.retryCount = Math.max(invitation.retryCount, attempt.attemptNumber);
    }

    const failureEvent = attempt.attemptType === 'initial' ? 'initial-failure' : 'retry-failure';
    trackFailureLog(invitation, {
      deliveryAttemptId: attempt.id,
      eventType: failureEvent,
      message: resolvedFailure,
      createdAt: eventTime
    });

    if (invitation.retryCount >= invitation.maxRetries) {
      setFailed(invitation, eventTime, resolvedFailure);
      trackFailureLog(invitation, {
        deliveryAttemptId: attempt.id,
        eventType: 'terminal-failure',
        message: `Retry limit reached after ${invitation.maxRetries} retries.`,
        createdAt: eventTime
      });
      return cloneContractInvitation(invitation);
    }

    scheduleRetry(invitation, eventTime, resolvedFailure);
    return cloneContractInvitation(invitation);
  }

  function recordDeliveryEvent(invitationId, {
    attemptId,
    eventType,
    failureReason,
    providerMessageId,
    occurredAt
  }) {
    const invitation = getInvitationOrThrow(invitationId);
    const attempt = getAttemptOrThrow(invitationId, attemptId);

    return applyDeliveryEvent(invitation, attempt, {
      eventType,
      failureReason,
      providerMessageId,
      occurredAt: occurredAt ?? nowIso(nowFn)
    });
  }

  async function processDueRetries({ runAt }, sendFn = createDefaultSender()) {
    const runAtIso = toIsoString(runAt ?? nowFn());
    const dueInvitations = [...invitationStore.values()].filter((invitation) => {
      return invitation.status === 'pending'
        && invitation.nextRetryAt
        && Date.parse(invitation.nextRetryAt) <= Date.parse(runAtIso);
    });

    let processedInvitations = 0;
    let attemptsCreated = 0;
    let completed = 0;
    let failed = 0;
    let canceled = 0;

    for (const invitation of dueInvitations) {
      processedInvitations += 1;

      attemptsCreated += 1;
      await executeSend(invitation, {
        sendFn,
        attemptNumber: invitation.retryCount + 1,
        attemptType: 'retry',
        scheduledAt: invitation.nextRetryAt,
        startedAt: runAtIso,
        completedAt: runAtIso
      });

      if (invitation.status === 'delivered') {
        completed += 1;
      } else if (invitation.status === 'failed') {
        failed += 1;
      }
    }

    return {
      runAt: runAtIso,
      processedInvitations,
      attemptsCreated,
      completed,
      failed,
      canceled
    };
  }

  function cancelInvitationByAssignment(reviewerAssignmentId, reason = 'assignment_removed', occurredAt = nowIso(nowFn)) {
    const invitation = getAssignmentInvitationOrThrow(reviewerAssignmentId);

    if (invitation.status === 'delivered' || invitation.status === 'failed' || invitation.status === 'canceled') {
      return cloneContractInvitation(invitation);
    }

    const canceledAt = toIsoString(occurredAt);
    setCanceled(invitation, canceledAt, reason);
    trackFailureLog(invitation, {
      eventType: 'retry-canceled',
      message: reason,
      createdAt: canceledAt
    });

    return cloneContractInvitation(invitation);
  }

  function listFailureLogsByPaper(paperId, {
    page = 1,
    pageSize = 20,
    actorRole,
    editorPaperIds
  } = {}) {
    const normalizedRole = normalizeActorRole(actorRole);
    const knownEditorPapers = toStringArray(editorPaperIds);
    const canView = normalizedRole === 'admin'
      || normalizedRole === 'support'
      || (normalizedRole === 'editor' && (knownEditorPapers.length === 0 || knownEditorPapers.includes(paperId)));

    if (!canView) {
      throw invitationError('INVITATION_FORBIDDEN', 'you do not have access to invitation failure logs', {
        status: 403,
        paperId
      });
    }

    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;

    const matchingEntries = failureLogEntries
      .filter((entry) => entry.paperId === paperId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    const start = (safePage - 1) * safePageSize;
    const paged = matchingEntries.slice(start, start + safePageSize).map(cloneFailureLogEntry);

    return {
      paperId,
      entries: paged,
      page: safePage,
      pageSize: safePageSize,
      total: matchingEntries.length
    };
  }

  function listInvitationsForReviewer(reviewerId, { includeInactive = true } = {}) {
    if (!reviewerId) {
      return [];
    }

    return [...invitationStore.values()]
      .filter((invitation) => invitation.reviewerId === reviewerId)
      .filter((invitation) => includeInactive || invitation.isActive)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .map(cloneContractInvitation);
  }

  function getDeliveryAttempts(invitationId) {
    return (attemptsByInvitationId.get(invitationId) ?? []).map((attempt) => ({
      id: attempt.id,
      invitationId: attempt.invitationId,
      attemptNumber: attempt.attemptNumber,
      attemptType: attempt.attemptType,
      scheduledAt: attempt.scheduledAt,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      outcome: attempt.outcome,
      failureReason: attempt.failureReason,
      providerMessageId: attempt.providerMessageId
    }));
  }

  function getAllFailureLogs() {
    return failureLogEntries.map((entry) => ({ ...entry }));
  }

  return {
    createInvitation,
    getInvitation,
    dispatchInvitation,
    retryInvitation,
    cancelInvitation,
    getFailureLog,
    triggerInvitationDelivery,
    getInvitationStatus,
    recordDeliveryEvent,
    processDueRetries,
    cancelInvitationByAssignment,
    listFailureLogsByPaper,
    listInvitationsForReviewer,
    getDeliveryAttempts,
    getAllFailureLogs
  };
}
