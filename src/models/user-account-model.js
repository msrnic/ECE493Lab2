import { createHash } from 'node:crypto';

export function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

export function createPendingUserAccount({
  fullName,
  emailNormalized,
  passwordHash,
  now = new Date()
}) {
  return {
    fullName: fullName.trim(),
    emailNormalized,
    passwordHash,
    status: 'pending',
    createdAt: now.toISOString(),
    activatedAt: null
  };
}

export function activateUserAccount(account, now = new Date()) {
  if (account.status === 'active') {
    return account;
  }

  return {
    ...account,
    status: 'active',
    activatedAt: now.toISOString()
  };
}
