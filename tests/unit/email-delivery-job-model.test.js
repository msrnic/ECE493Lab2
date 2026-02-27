import { describe, expect, it } from 'vitest';
import {
  createEmailDeliveryJob,
  markEmailDeliveryFailure,
  markEmailDeliverySent
} from '../../src/models/email-delivery-job-model.js';

describe('email-delivery-job-model', () => {
  it('creates queued delivery job with defaults', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const job = createEmailDeliveryJob({ userAccountId: 'acct-1', now });

    expect(job.template).toBe('registration_confirmation');
    expect(job.status).toBe('queued');
    expect(job.attemptCount).toBe(0);
    expect(job.nextAttemptAt).toBe(now.toISOString());
    expect(job.lastError).toBeNull();
  });

  it('marks delivery as sent', () => {
    const job = createEmailDeliveryJob({ userAccountId: 'acct-1' });
    const sent = markEmailDeliverySent(job, new Date('2026-01-01T00:00:10.000Z'));

    expect(sent.status).toBe('sent');
    expect(sent.lastError).toBeNull();
    expect(sent.nextAttemptAt).toBe('2026-01-01T00:00:10.000Z');
  });

  it('marks delivery as queued retry when attempts remain', () => {
    const job = createEmailDeliveryJob({
      userAccountId: 'acct-1',
      now: new Date('2026-01-01T00:00:00.000Z')
    });

    const retry = markEmailDeliveryFailure(job, {
      error: new Error('smtp down'),
      now: new Date('2026-01-01T00:00:05.000Z'),
      maxAttempts: 3,
      backoffMs: 30_000
    });

    expect(retry.status).toBe('queued_retry');
    expect(retry.attemptCount).toBe(1);
    expect(retry.nextAttemptAt).toBe('2026-01-01T00:00:35.000Z');
    expect(retry.lastError).toBe('smtp down');
  });

  it('marks delivery as terminal failure when retries exhausted', () => {
    const job = {
      ...createEmailDeliveryJob({
        userAccountId: 'acct-1',
        now: new Date('2026-01-01T00:00:00.000Z')
      }),
      attemptCount: 1,
      status: 'queued_retry'
    };

    const failed = markEmailDeliveryFailure(job, {
      error: 'still failing',
      now: new Date('2026-01-01T00:01:00.000Z'),
      maxAttempts: 2
    });

    expect(failed.status).toBe('failed_terminal');
    expect(failed.attemptCount).toBe(2);
    expect(failed.lastError).toBe('still failing');
  });

  it('stores string errors for queued retry path', () => {
    const job = createEmailDeliveryJob({
      userAccountId: 'acct-2',
      now: new Date('2026-01-01T00:00:00.000Z')
    });

    const retry = markEmailDeliveryFailure(job, {
      error: 'provider timeout',
      now: new Date('2026-01-01T00:00:05.000Z'),
      maxAttempts: 3
    });

    expect(retry.status).toBe('queued_retry');
    expect(retry.lastError).toBe('provider timeout');
  });
});
