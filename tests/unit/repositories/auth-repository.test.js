import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createAuthRepository } from '../../../src/repositories/auth-repository.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('auth-repository', () => {
  it('persists accounts and auth records across repository instances', () => {
    const paths = createTempPersistencePaths('ece493-auth-repo-');
    const first = createAuthRepository({
      databaseFilePath: paths.authDataFilePath,
      idFactory: () => 'generated-id'
    });

    const account = first.createUserAccount({
      emailNormalized: 'persisted@example.com',
      status: 'active',
      role: 'editor'
    });
    first.createConfirmationToken({ tokenHash: 'token-hash' });
    first.createRegistrationAttempt({ emailNormalized: 'persisted@example.com' });
    first.createEmailDeliveryJob({
      nextAttemptAt: '2026-02-01T00:00:00.000Z'
    });
    first.createSecurityNotification({
      userId: 'user-1',
      queuedAt: '2026-02-01T00:00:00.000Z'
    });
    first.createSecurityAuditEntry({
      userId: 'user-1',
      recordedAt: '2026-02-01T00:00:00.000Z'
    });

    const second = createAuthRepository({
      databaseFilePath: paths.authDataFilePath
    });

    expect(second.findUserById(account.id)?.emailNormalized).toBe('persisted@example.com');
    expect(second.findUserByNormalizedEmail('persisted@example.com')?.id).toBe(account.id);
    expect(second.listConfirmationTokens()).toHaveLength(1);
    expect(second.listRegistrationAttemptsByEmail('persisted@example.com')).toHaveLength(1);
    expect(second.listEmailDeliveryJobsDue(new Date('2026-02-01T00:00:01.000Z'))).toHaveLength(1);
    expect(second.listSecurityNotifications()).toHaveLength(1);
    expect(second.listSecurityAuditEntries()).toHaveLength(1);
  });

  it('supports update and missing-record branches', () => {
    const paths = createTempPersistencePaths('ece493-auth-repo-update-');
    const repository = createAuthRepository({
      databaseFilePath: paths.authDataFilePath
    });

    expect(repository.updateUserAccount('missing', { id: 'missing' })).toBeNull();
    expect(repository.updateConfirmationToken('missing', { id: 'missing' })).toBeNull();
    expect(repository.updateEmailDeliveryJob('missing', { id: 'missing' })).toBeNull();
    expect(repository.findUserById('missing')).toBeNull();
    expect(repository.findUserByNormalizedEmail('missing@example.com')).toBeNull();
    expect(repository.findConfirmationTokenByHash('missing')).toBeNull();

    const account = repository.createUserAccount({
      id: 'acct-1',
      emailNormalized: 'acct1@example.com',
      status: 'pending',
      role: 'author'
    });
    repository.createConfirmationToken({
      id: 'token-1',
      tokenHash: 'hash-1'
    });
    repository.createEmailDeliveryJob({
      id: 'job-1',
      nextAttemptAt: '2026-02-01T00:10:00.000Z'
    });

    const updatedAccount = repository.updateUserAccount(account.id, {
      ...account,
      status: 'active'
    });
    const updatedToken = repository.updateConfirmationToken('token-1', {
      id: 'token-1',
      tokenHash: 'hash-1',
      consumedAt: '2026-02-01T00:20:00.000Z'
    });
    const updatedJob = repository.updateEmailDeliveryJob('job-1', {
      id: 'job-1',
      nextAttemptAt: '2026-02-01T00:00:00.000Z'
    });

    expect(updatedAccount?.status).toBe('active');
    expect(updatedToken?.consumedAt).toBe('2026-02-01T00:20:00.000Z');
    expect(updatedJob?.nextAttemptAt).toBe('2026-02-01T00:00:00.000Z');
    expect(repository.listEmailDeliveryJobsDue(new Date('2026-02-01T00:00:00.000Z').getTime())).toHaveLength(1);
  });

  it('normalizes missing state keys and reset clears all persisted collections', () => {
    const paths = createTempPersistencePaths('ece493-auth-repo-reset-');
    mkdirSync(path.dirname(paths.authDataFilePath), { recursive: true });
    writeFileSync(paths.authDataFilePath, '{}\n', 'utf8');

    const repository = createAuthRepository({
      databaseFilePath: paths.authDataFilePath,
      idFactory: () => 'generated-id'
    });
    expect(repository.listUserAccounts()).toEqual([]);
    expect(repository.listConfirmationTokens()).toEqual([]);
    expect(repository.listRegistrationAttempts()).toEqual([]);
    expect(repository.listEmailDeliveryJobs()).toEqual([]);
    expect(repository.listSecurityNotifications()).toEqual([]);
    expect(repository.listSecurityAuditEntries()).toEqual([]);

    repository.createUserAccount({
      emailNormalized: 'reset@example.com'
    });
    repository.createConfirmationToken({ tokenHash: 'hash' });
    repository.createRegistrationAttempt({ emailNormalized: 'reset@example.com' });
    repository.createEmailDeliveryJob({ nextAttemptAt: '2026-02-01T00:00:00.000Z' });
    repository.createSecurityNotification({ userId: 'user-1', queuedAt: '2026-02-01T00:00:00.000Z' });
    repository.createSecurityAuditEntry({ userId: 'user-1', recordedAt: '2026-02-01T00:00:00.000Z' });

    repository.reset();

    expect(repository.listUserAccounts()).toEqual([]);
    expect(repository.listConfirmationTokens()).toEqual([]);
    expect(repository.listRegistrationAttempts()).toEqual([]);
    expect(repository.listEmailDeliveryJobs()).toEqual([]);
    expect(repository.listSecurityNotifications()).toEqual([]);
    expect(repository.listSecurityAuditEntries()).toEqual([]);
  });
});
