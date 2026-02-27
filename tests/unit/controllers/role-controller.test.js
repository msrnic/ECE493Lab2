import { describe, expect, it } from 'vitest';
import { createRoleController } from '../../../src/controllers/role-controller.js';
import { createInMemoryRepository } from '../../../src/models/repository.js';
import { invokeHandler } from '../../helpers/http-harness.js';

describe('role-controller', () => {
  it('redirects unauthenticated sessions and unknown accounts to login', async () => {
    const repository = createInMemoryRepository();
    const controller = createRoleController({
      repository,
      authController: {
        getAuthenticatedSession: () => null
      }
    });

    const unauthenticated = await invokeHandler(controller.updateRole, {
      body: {
        role: 'editor'
      }
    });
    expect(unauthenticated.statusCode).toBe(302);
    expect(unauthenticated.redirectLocation).toBe('/login');

    const unknownAccountController = createRoleController({
      repository,
      authController: {
        getAuthenticatedSession: () => ({
          user: {
            id: 'missing-user'
          }
        })
      }
    });

    const unknownAccount = await invokeHandler(unknownAccountController.updateRole, {
      body: {
        role: 'editor'
      }
    });
    expect(unknownAccount.statusCode).toBe(302);
    expect(unknownAccount.redirectLocation).toBe('/login');
  });

  it('rejects invalid role updates and reports unchanged role', async () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'usr-1',
      fullName: 'Role User',
      emailNormalized: 'role@example.com',
      passwordHash: 'hash',
      role: 'editor',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const controller = createRoleController({
      repository,
      authController: {
        getAuthenticatedSession: () => ({
          user: {
            id: 'usr-1'
          }
        })
      }
    });

    const invalid = await invokeHandler(controller.updateRole, {
      body: {
        role: 'admin'
      }
    });
    expect(invalid.statusCode).toBe(302);
    expect(invalid.redirectLocation).toBe('/dashboard?roleUpdated=invalid');

    const missingRole = await invokeHandler(controller.updateRole, {
      body: {}
    });
    expect(missingRole.statusCode).toBe(302);
    expect(missingRole.redirectLocation).toBe('/dashboard?roleUpdated=invalid');

    const unchanged = await invokeHandler(controller.updateRole, {
      body: {
        role: 'editor'
      }
    });
    expect(unchanged.statusCode).toBe(302);
    expect(unchanged.redirectLocation).toBe('/dashboard?roleUpdated=unchanged');
  });

  it('updates role when request is valid', async () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({
      id: 'usr-2',
      fullName: 'Role User 2',
      emailNormalized: 'role2@example.com',
      passwordHash: 'hash',
      role: 'author',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const controller = createRoleController({
      repository,
      authController: {
        getAuthenticatedSession: () => ({
          user: {
            id: 'usr-2'
          }
        })
      }
    });

    const response = await invokeHandler(controller.updateRole, {
      body: {
        role: 'reviewer'
      }
    });

    expect(response.statusCode).toBe(302);
    expect(response.redirectLocation).toBe('/dashboard?roleUpdated=updated');
    expect(repository.findUserById('usr-2').role).toBe('reviewer');
  });
});
