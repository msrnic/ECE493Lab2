export function normalizeCredentialEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function parseCredentialSubmission(payload, now = new Date()) {
  const body = payload && typeof payload === 'object' ? payload : {};

  return {
    email: normalizeCredentialEmail(body.email),
    password: String(body.password ?? ''),
    submittedAt: now.toISOString()
  };
}

export function validateCredentialSubmission(submission) {
  const errors = [];

  if (!submission.email) {
    errors.push({ field: 'email', message: 'Email is required.' });
  }

  if (!submission.password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  return errors;
}
