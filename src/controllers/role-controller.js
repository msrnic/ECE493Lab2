import { USER_ROLES, normalizeUserRole, updateUserAccountRole } from '../models/user-account-model.js';

function normalizeRequestedRole(role) {
  if (typeof role !== 'string') {
    return '';
  }

  return role.trim().toLowerCase();
}

export function createRoleController({ repository, authController } = {}) {
  async function updateRole(req, res) {
    const session = authController?.getAuthenticatedSession?.(req);
    if (!session?.user?.id) {
      res.status(302).redirect('/login');
      return;
    }

    const account = repository?.findUserById?.(session.user.id);
    if (!account) {
      res.status(302).redirect('/login');
      return;
    }

    const requestedRole = normalizeRequestedRole(req.body?.role);
    if (!USER_ROLES.includes(requestedRole)) {
      res.status(302).redirect('/dashboard?roleUpdated=invalid');
      return;
    }

    const currentRole = normalizeUserRole(account.role);
    if (currentRole === requestedRole) {
      res.status(302).redirect('/dashboard?roleUpdated=unchanged');
      return;
    }

    repository.updateUserAccount(account.id, updateUserAccountRole(account, requestedRole));
    res.status(302).redirect('/dashboard?roleUpdated=updated');
  }

  return {
    updateRole
  };
}
