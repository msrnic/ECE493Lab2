import { describe, expect, it } from 'vitest';
import { createInMemoryRepository } from '../../src/models/repository.js';

describe('repository', () => {
  it('adds generated ids when records do not include id', () => {
    const repository = createInMemoryRepository({ idGenerator: () => 'generated-id' });

    const account = repository.createUserAccount({ emailNormalized: 'test@example.com' });

    expect(account.id).toBe('generated-id');
  });

  it('keeps explicit ids when present', () => {
    const repository = createInMemoryRepository();

    const account = repository.createUserAccount({ id: 'acct-1', emailNormalized: 'test@example.com' });

    expect(account.id).toBe('acct-1');
  });

  it('returns null for updates on missing records', () => {
    const repository = createInMemoryRepository();

    expect(repository.updateUserAccount('missing', { id: 'missing' })).toBeNull();
    expect(repository.updateConfirmationToken('missing', { id: 'missing' })).toBeNull();
    expect(repository.updateEmailDeliveryJob('missing', { id: 'missing' })).toBeNull();
  });

  it('returns null for find lookups when records do not exist', () => {
    const repository = createInMemoryRepository();

    expect(repository.findUserById('missing')).toBeNull();
    expect(repository.findUserByNormalizedEmail('missing@example.com')).toBeNull();
    expect(repository.findConfirmationTokenByHash('missing')).toBeNull();
  });

  it('lists due email jobs with both Date and number inputs', () => {
    const repository = createInMemoryRepository();

    repository.createEmailDeliveryJob({
      id: 'due',
      status: 'queued_retry',
      nextAttemptAt: '2026-01-01T00:00:00.000Z'
    });
    repository.createEmailDeliveryJob({
      id: 'future',
      status: 'queued_retry',
      nextAttemptAt: '2026-01-01T00:05:00.000Z'
    });

    const dueFromDate = repository.listEmailDeliveryJobsDue(new Date('2026-01-01T00:00:01.000Z'));
    const dueFromNumber = repository.listEmailDeliveryJobsDue(new Date('2026-01-01T00:00:01.000Z').getTime());

    expect(dueFromDate).toHaveLength(1);
    expect(dueFromDate[0].id).toBe('due');
    expect(dueFromNumber).toHaveLength(1);
    expect(dueFromNumber[0].id).toBe('due');
  });

  it('resets stored state collections', () => {
    const repository = createInMemoryRepository();
    repository.createUserAccount({ emailNormalized: 'test@example.com' });
    repository.createConfirmationToken({ tokenHash: 'hash' });
    repository.createRegistrationAttempt({ emailNormalized: 'test@example.com' });
    repository.createEmailDeliveryJob({ nextAttemptAt: '2026-01-01T00:00:00.000Z' });

    repository.reset();

    expect(repository.listUserAccounts()).toHaveLength(0);
    expect(repository.listConfirmationTokens()).toHaveLength(0);
    expect(repository.listRegistrationAttempts()).toHaveLength(0);
    expect(repository.listEmailDeliveryJobs()).toHaveLength(0);
  });
});
