const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /\d/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

function addError(errors, field, code, message) {
  errors.push({ field, code, message });
}

export function validatePasswordPolicy(password) {
  const issues = [];

  if (typeof password !== 'string' || password.length < 12) {
    issues.push('PASSWORD_TOO_SHORT');
  }

  if (!UPPERCASE_PATTERN.test(password ?? '')) {
    issues.push('PASSWORD_MISSING_UPPERCASE');
  }

  if (!LOWERCASE_PATTERN.test(password ?? '')) {
    issues.push('PASSWORD_MISSING_LOWERCASE');
  }

  if (!NUMBER_PATTERN.test(password ?? '')) {
    issues.push('PASSWORD_MISSING_NUMBER');
  }

  if (!SYMBOL_PATTERN.test(password ?? '')) {
    issues.push('PASSWORD_MISSING_SYMBOL');
  }

  return issues;
}

export function validateRegistrationFields(submission) {
  const errors = [];
  const fullName = (submission.fullName ?? '').trim();
  const email = (submission.email ?? '').trim();
  const password = submission.password ?? '';
  const confirmPassword = submission.confirmPassword ?? '';

  if (!fullName) {
    addError(errors, 'fullName', 'REQUIRED', 'Full name is required.');
  } else if (fullName.length > 120) {
    addError(errors, 'fullName', 'MAX_LENGTH', 'Full name must be 120 characters or fewer.');
  }

  if (!email) {
    addError(errors, 'email', 'REQUIRED', 'Email is required.');
  } else if (email.length > 320) {
    addError(errors, 'email', 'MAX_LENGTH', 'Email must be 320 characters or fewer.');
  } else if (!EMAIL_PATTERN.test(email)) {
    addError(errors, 'email', 'INVALID_FORMAT', 'Email format is invalid.');
  }

  const passwordIssues = validatePasswordPolicy(password);
  if (passwordIssues.length > 0) {
    addError(
      errors,
      'password',
      'PASSWORD_POLICY_FAILED',
      'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.'
    );
  }

  if (confirmPassword !== password) {
    addError(errors, 'confirmPassword', 'PASSWORD_MISMATCH', 'Confirm password must match password.');
  }

  return errors;
}
