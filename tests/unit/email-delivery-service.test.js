import { describe, expect, it, vi } from 'vitest';
import { createEmailDeliveryService } from '../../src/controllers/email-delivery-service.js';
import { createInMemoryRepository } from '../../src/models/repository.js';

describe('email-delivery-service', () => {
  it('throws when sendEmail is not a function', () => {
    const repository = createInMemoryRepository();

    expect(() => createEmailDeliveryService({ repository, sendEmail: null })).toThrow(
      'sendEmail must be a function'
    );
  });

  it('returns sent on successful delivery', async () => {
    const repository = createInMemoryRepository();
    const sendEmail = vi.fn().mockResolvedValue({ accepted: true });
    const service = createEmailDeliveryService({
      repository,
      sendEmail,
      nowFn: () => new Date('2026-01-01T00:00:00.000Z')
    });

    const user = repository.createUserAccount({
      id: 'acct-1',
      emailNormalized: 'test@example.com'
    });

    const result = await service.deliverRegistrationConfirmation({
      userAccount: user,
      confirmationToken: 'token-value'
    });

    expect(result.emailDelivery).toBe('sent');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(repository.listEmailDeliveryJobs()[0].status).toBe('sent');
  });

  it('queues retry when delivery fails', async () => {
    const repository = createInMemoryRepository();
    const sendEmail = vi.fn().mockRejectedValue(new Error('smtp failed'));
    const service = createEmailDeliveryService({
      repository,
      sendEmail,
      nowFn: () => new Date('2026-01-01T00:00:00.000Z')
    });

    const user = repository.createUserAccount({
      id: 'acct-1',
      emailNormalized: 'test@example.com'
    });

    const result = await service.deliverRegistrationConfirmation({
      userAccount: user,
      confirmationToken: 'token-value'
    });

    expect(result.emailDelivery).toBe('queued_retry');
    expect(repository.listEmailDeliveryJobs()[0].status).toBe('queued_retry');
  });

  it('uses default nowFn when not provided', async () => {
    const repository = createInMemoryRepository();
    const sendEmail = vi.fn().mockResolvedValue({ accepted: true });
    const service = createEmailDeliveryService({
      repository,
      sendEmail
    });

    const user = repository.createUserAccount({
      id: 'acct-default',
      emailNormalized: 'default@example.com'
    });

    const result = await service.deliverRegistrationConfirmation({
      userAccount: user,
      confirmationToken: 'token-value'
    });

    expect(result.emailDelivery).toBe('sent');
  });

  it('processes due retries and handles sent, skipped, and failed branches', async () => {
    const repository = createInMemoryRepository();
    let callCount = 0;

    const service = createEmailDeliveryService({
      repository,
      sendEmail: vi.fn(async () => {
        callCount += 1;
        if (callCount === 2) {
          throw new Error('retry failed');
        }

        return { accepted: true };
      }),
      nowFn: () => new Date('2026-01-01T00:00:00.000Z'),
      maxAttempts: 2
    });

    repository.createUserAccount({ id: 'acct-a', emailNormalized: 'a@example.com' });
    repository.createUserAccount({ id: 'acct-b', emailNormalized: 'b@example.com' });

    repository.createEmailDeliveryJob({
      id: 'skip-job',
      userAccountId: 'acct-a',
      template: 'registration_confirmation',
      status: 'sent',
      attemptCount: 0,
      nextAttemptAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });

    repository.createEmailDeliveryJob({
      id: 'retry-success',
      userAccountId: 'acct-a',
      template: 'registration_confirmation',
      status: 'queued_retry',
      attemptCount: 0,
      nextAttemptAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });

    repository.createEmailDeliveryJob({
      id: 'retry-failure',
      userAccountId: 'acct-b',
      template: 'registration_confirmation',
      status: 'queued_retry',
      attemptCount: 1,
      nextAttemptAt: '2026-01-01T00:00:00.000Z',
      lastError: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });

    const processedCount = await service.processDueRetries();

    expect(processedCount).toBe(3);

    const jobs = Object.fromEntries(repository.listEmailDeliveryJobs().map((job) => [job.id, job]));
    expect(jobs['skip-job'].status).toBe('sent');
    expect(jobs['retry-success'].status).toBe('sent');
    expect(jobs['retry-failure'].status).toBe('failed_terminal');
  });
});
