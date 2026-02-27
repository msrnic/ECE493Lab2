export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}

export function isDuplicateEmail(repository, emailNormalized) {
  if (!emailNormalized) {
    return false;
  }

  return Boolean(repository.findUserByNormalizedEmail(emailNormalized));
}
