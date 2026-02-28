import { createHash } from 'node:crypto';

export const USER_ROLES = Object.freeze(['author', 'editor', 'reviewer']);
const DEFAULT_USER_ROLE = 'author';

export function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

export function normalizeUserRole(role, { fallbackRole = DEFAULT_USER_ROLE } = {}) {
  if (typeof role !== 'string') {
    return fallbackRole;
  }

  const normalized = role.trim().toLowerCase();
  if (USER_ROLES.includes(normalized)) {
    return normalized;
  }

  return fallbackRole;
}

export function createPendingUserAccount({
  fullName,
  emailNormalized,
  passwordHash,
  role = DEFAULT_USER_ROLE,
  now = new Date()
}) {
  const normalizedRole = normalizeUserRole(role);
  return {
    fullName: fullName.trim(),
    emailNormalized,
    passwordHash,
    role: normalizedRole,
    lastAssignedRole: normalizedRole,
    status: 'pending',
    createdAt: now.toISOString(),
    activatedAt: null
  };
}

export function updateUserAccountRole(account, role) {
  const normalizedRole = normalizeUserRole(role);
  return {
    ...account,
    role: normalizedRole,
    lastAssignedRole: normalizedRole
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
