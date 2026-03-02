const DECISION_OUTCOMES = Object.freeze(['accepted', 'rejected', 'revision']);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_DECISION_PAYLOAD';
  return error;
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeEmail(value) {
  const email = normalizeRequiredString(value, 'authorEmail');
  if (!email.includes('@')) {
    throw validationError('authorEmail must be a valid email');
  }

  return email.toLowerCase();
}

function normalizeOutcome(value) {
  const outcome = normalizeRequiredString(value, 'decisionOutcome').toLowerCase();
  if (!DECISION_OUTCOMES.includes(outcome)) {
    throw validationError('decisionOutcome must be accepted, rejected, or revision');
  }

  return outcome;
}

function normalizeFinalizedAt(value, now) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError('finalizedAt must be an ISO date-time');
  }

  if (date.getTime() > now.getTime()) {
    throw validationError('finalizedAt cannot be in the future');
  }

  return date.toISOString();
}

function createEmailSubject(outcome, submissionId) {
  const prefix = outcome === 'accepted'
    ? 'Decision: Accepted'
    : outcome === 'rejected'
      ? 'Decision: Rejected'
      : 'Decision: Revision Requested';

  return `${prefix} for submission ${submissionId}`;
}

function createEmailBody({ decisionId, submissionId, decisionOutcome, finalizedAt }) {
  return `<article data-notification-email="decision-${decisionId}">`
    + `<h1>Decision update</h1>`
    + `<p>Submission <strong>${submissionId}</strong> is now <strong>${decisionOutcome}</strong>.</p>`
    + `<p>Finalized at: ${finalizedAt}</p>`
    + '</article>';
}

export function createFinalizedDecisionModel({ nowFn = () => new Date() } = {}) {
  function createFinalizedDecision({
    decisionId,
    submissionId,
    authorId,
    authorEmail,
    decisionOutcome,
    finalizedAt
  } = {}) {
    const now = nowFn();
    const normalizedDecisionId = normalizeRequiredString(decisionId, 'decisionId');
    const normalizedSubmissionId = normalizeRequiredString(submissionId, 'submissionId');
    const normalizedAuthorId = normalizeRequiredString(authorId, 'authorId');
    const normalizedAuthorEmail = normalizeEmail(authorEmail);
    const normalizedDecisionOutcome = normalizeOutcome(decisionOutcome);
    const normalizedFinalizedAt = normalizeFinalizedAt(finalizedAt, now);

    return {
      decisionId: normalizedDecisionId,
      submissionId: normalizedSubmissionId,
      authorId: normalizedAuthorId,
      authorEmail: normalizedAuthorEmail,
      decisionOutcome: normalizedDecisionOutcome,
      finalizedAt: normalizedFinalizedAt,
      dedupeKey: `${normalizedDecisionId}::${normalizedAuthorId}`
    };
  }

  function createEmailContent(decision) {
    return {
      subject: createEmailSubject(decision.decisionOutcome, decision.submissionId),
      bodyHtml: createEmailBody(decision)
    };
  }

  return {
    createFinalizedDecision,
    createEmailContent
  };
}

export { DECISION_OUTCOMES };
