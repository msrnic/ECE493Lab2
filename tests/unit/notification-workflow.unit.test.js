import { describe, expect, it, vi } from 'vitest';
import { createMockResponse, invokeHandler } from '../helpers/http-harness.js';
import {
  NOTIFICATION_STATUS,
  canTransitionNotificationStatus,
  assertNotificationStatusTransition
} from '../../src/models/notification-status.js';
import { createFinalizedDecisionModel } from '../../src/models/finalized-decision-model.js';
import { createDecisionNotificationModel } from '../../src/models/decision-notification-model.js';
import { createDeliveryAttemptModel } from '../../src/models/delivery-attempt-model.js';
import { createUnresolvedFailureModel } from '../../src/models/unresolved-failure-model.js';
import { createRetrySchedulerService } from '../../src/services/retry-scheduler-service.js';
import {
  createNotificationEmailDeliveryService,
  mapProviderResult
} from '../../src/services/email-delivery-service.js';
import { createInternalServiceAuth } from '../../src/middleware/internal-service-auth.js';
import { createAdminRoleAuth } from '../../src/middleware/admin-role-auth.js';
import { createNotificationController } from '../../src/controllers/notification-controller.js';
import { createAdminFailureLogController } from '../../src/controllers/admin-failure-log-controller.js';

function createNowFn(iso) {
  const fixed = new Date(iso);
  return () => new Date(fixed);
}

describe('notification workflow units', () => {
  it('covers default constructors for UC-12 models and services', async () => {
    const finalizedDecisionModel = createFinalizedDecisionModel();
    const decision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-defaults',
      submissionId: 'submission-defaults',
      authorId: 'author-defaults',
      authorEmail: 'author-defaults@example.com',
      decisionOutcome: 'accepted',
      finalizedAt: new Date(Date.now() - 1_000).toISOString()
    });
    const content = finalizedDecisionModel.createEmailContent(decision);

    const decisionNotificationModel = createDecisionNotificationModel();
    const created = decisionNotificationModel.createOrGetFromDecision({
      decision,
      subject: content.subject,
      bodyHtml: content.bodyHtml
    });

    const deliveryAttemptModel = createDeliveryAttemptModel();
    const unresolvedFailureModel = createUnresolvedFailureModel();
    const retrySchedulerService = createRetrySchedulerService({
      decisionNotificationModel
    });
    const service = createNotificationEmailDeliveryService({
      sendEmail: async () => ({ accepted: true, providerMessageId: 'provider-defaults' }),
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService
    });

    const result = await service.sendNotification({
      notificationId: created.notification.notificationId,
      attemptNumber: 1
    });
    expect(result.result).toBe('delivered');

    const manualAttempt = deliveryAttemptModel.createAttempt({
      notificationId: 'manual-default-attempt',
      attemptNumber: 1,
      status: 'failure',
      failureReason: 'manual'
    });
    expect(manualAttempt.attemptedAt).toBeTruthy();

    const fallbackUnresolved = unresolvedFailureModel.createRecord({
      notification: {
        notificationId: 'manual-default-notification',
        submissionId: 'manual-default-submission',
        authorId: 'manual-default-author'
      },
      attempt: {
        attemptNumber: 2,
        status: 'failure',
        failureReason: 'manual unresolved'
      },
      failureReason: 'manual unresolved'
    });
    expect(fallbackUnresolved.createdAt).toBeTruthy();

    const scheduledAt = retrySchedulerService.scheduleRetry({
      notificationId: result.notification.notificationId,
      failedAt: 'bad-date'
    });
    expect(typeof scheduledAt).toBe('string');
    expect(typeof retrySchedulerService.isRetryDue({ retryDueAt: scheduledAt })).toBe('boolean');
  });

  it('validates notification status transitions', () => {
    expect(canTransitionNotificationStatus('unknown', NOTIFICATION_STATUS.DELIVERED)).toBe(false);
    expect(canTransitionNotificationStatus(NOTIFICATION_STATUS.GENERATED, NOTIFICATION_STATUS.GENERATED)).toBe(true);
    expect(canTransitionNotificationStatus(NOTIFICATION_STATUS.GENERATED, NOTIFICATION_STATUS.DELIVERY_IN_PROGRESS)).toBe(true);
    expect(canTransitionNotificationStatus(NOTIFICATION_STATUS.DELIVERED, NOTIFICATION_STATUS.RETRY_PENDING)).toBe(false);

    expect(() => {
      assertNotificationStatusTransition(NOTIFICATION_STATUS.DELIVERED, NOTIFICATION_STATUS.RETRY_PENDING);
    }).toThrow(/Invalid notification transition/);
  });

  it('creates and validates finalized decisions', () => {
    const model = createFinalizedDecisionModel({ nowFn: createNowFn('2026-02-08T12:00:00.000Z') });
    const accepted = model.createFinalizedDecision({
      decisionId: 'decision-1',
      submissionId: 'submission-1',
      authorId: 'author-1',
      authorEmail: 'Author1@Example.com',
      decisionOutcome: 'accepted',
      finalizedAt: '2026-02-08T11:00:00.000Z'
    });

    expect(accepted.dedupeKey).toBe('decision-1::author-1');
    expect(accepted.authorEmail).toBe('author1@example.com');
    expect(model.createEmailContent(accepted).subject).toContain('Accepted');

    const rejected = model.createFinalizedDecision({
      ...accepted,
      decisionId: 'decision-2',
      decisionOutcome: 'rejected'
    });
    expect(model.createEmailContent(rejected).subject).toContain('Rejected');

    const revision = model.createFinalizedDecision({
      ...accepted,
      decisionId: 'decision-3',
      decisionOutcome: 'revision'
    });
    expect(model.createEmailContent(revision).subject).toContain('Revision Requested');

    expect(() => model.createFinalizedDecision({})).toThrow(/decisionId is required/);
    expect(() => model.createFinalizedDecision({ ...accepted, decisionId: 'x', authorEmail: 'bad-email' })).toThrow(/authorEmail/);
    expect(() => model.createFinalizedDecision({ ...accepted, decisionId: 'x2', decisionOutcome: 'maybe' })).toThrow(/decisionOutcome/);
    expect(() => model.createFinalizedDecision({ ...accepted, decisionId: 'x3', finalizedAt: '2100-01-01T00:00:00.000Z' })).toThrow(/future/);
    expect(() => model.createFinalizedDecision({ ...accepted, decisionId: 'x4', finalizedAt: 'bad-date' })).toThrow(/ISO/);
  });

  it('manages notification state and dedupe', () => {
    const model = createDecisionNotificationModel({
      idFactory: () => 'notification-1',
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });

    const decision = {
      decisionId: 'decision-1',
      submissionId: 'submission-1',
      authorId: 'author-1',
      authorEmail: 'author1@example.com',
      dedupeKey: 'decision-1::author-1',
      finalizedAt: '2026-02-08T11:00:00.000Z'
    };

    const created = model.createOrGetFromDecision({
      decision,
      subject: 'subject',
      bodyHtml: '<p>body</p>'
    });
    expect(created.created).toBe(true);
    expect(created.notification.channel).toBe('email');

    const duplicate = model.createOrGetFromDecision({
      decision,
      subject: 'subject2',
      bodyHtml: '<p>body2</p>'
    });
    expect(duplicate.created).toBe(false);

    expect(model.findByDedupeKey('decision-1::author-1')?.notificationId).toBe('notification-1');
    expect(model.findByDedupeKey('missing')).toBeNull();

    expect(model.isRetryAllowed('notification-1')).toBe(false);
    model.markDeliveryInProgress('notification-1');
    model.markRetryPending('notification-1', '2026-02-08T12:01:00.000Z', 'smtp outage');
    expect(model.isRetryAllowed('notification-1')).toBe(true);
    model.markDeliveryInProgress('notification-1');
    const delivered = model.markDelivered('notification-1', 'provider-1', '2026-02-08T12:00:10.000Z');
    expect(delivered.status).toBe('delivered');

    expect(() => model.markRetryPending('notification-1', null, 'x')).toThrow(/Invalid notification transition/);
    expect(() => model.markDeliveryInProgress('missing')).toThrow(/Notification not found/);

    const unresolvedModel = createDecisionNotificationModel({
      idFactory: () => 'notification-2',
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });
    unresolvedModel.createOrGetFromDecision({ decision: { ...decision, dedupeKey: 'd2', decisionId: 'd2' }, subject: 's', bodyHtml: 'b' });
    unresolvedModel.markDeliveryInProgress('notification-2');
    const unresolved = unresolvedModel.markUnresolvedFailure('notification-2', 'failure');
    expect(unresolved.status).toBe('unresolved_failure');
    expect(unresolvedModel.listAll()).toHaveLength(1);
    expect(unresolvedModel.getById('missing')).toBeNull();
  });

  it('validates delivery attempt guard rails', () => {
    const model = createDeliveryAttemptModel({
      idFactory: () => 'attempt-1',
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });

    const success = model.createAttempt({
      notificationId: 'notification-1',
      attemptNumber: 1,
      status: 'success',
      providerMessageId: 'provider-1'
    });

    expect(success.failureReason).toBeNull();
    expect(model.getAttemptCount('notification-1')).toBe(1);
    expect(model.getLatestAttempt('notification-1')?.attemptId).toBe('attempt-1');
    expect(model.getLatestAttempt('missing')).toBeNull();
    expect(model.getAttempt('notification-1', 1)?.attemptNumber).toBe(1);

    expect(() => model.createAttempt({ notificationId: '', attemptNumber: 1, status: 'success' })).toThrow(/notificationId is required/);
    expect(() => model.createAttempt({ notificationId: 'n2', attemptNumber: 3, status: 'success' })).toThrow(/between 1 and 2/);
    expect(() => model.createAttempt({ notificationId: 'n2', attemptNumber: 1, status: 'unknown' })).toThrow(/status/);
    expect(() => model.createAttempt({ notificationId: 'n2', attemptNumber: 1, status: 'failure' })).toThrow(/failureReason/);
    expect(() => model.createAttempt({ notificationId: 'n2', attemptNumber: 1, status: 'success', failureReason: 'x' })).toThrow(/must be empty/);
    expect(() => model.createAttempt({ notificationId: 'notification-1', attemptNumber: 1, status: 'success' })).toThrow(/already exists/);
    expect(() => model.createAttempt({ notificationId: 'n3', attemptNumber: 2, status: 'failure', failureReason: 'x' })).toThrow(/must exist/);

    const failedAttemptModel = createDeliveryAttemptModel({
      idFactory: (() => {
        let counter = 0;
        return () => `attempt-f-${++counter}`;
      })(),
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });
    failedAttemptModel.createAttempt({ notificationId: 'n4', attemptNumber: 1, status: 'failure', failureReason: 'smtp' });
    failedAttemptModel.createAttempt({ notificationId: 'n4', attemptNumber: 2, status: 'failure', failureReason: 'smtp2' });
    expect(failedAttemptModel.getAttemptCount('n4')).toBe(2);

    const successThenRetryModel = createDeliveryAttemptModel({
      idFactory: (() => {
        let counter = 0;
        return () => `attempt-s-${++counter}`;
      })(),
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });
    successThenRetryModel.createAttempt({ notificationId: 'n5', attemptNumber: 1, status: 'success' });
    expect(() => successThenRetryModel.createAttempt({
      notificationId: 'n5',
      attemptNumber: 2,
      status: 'failure',
      failureReason: 'x'
    })).toThrow(/only after attempt 1 fails/);
  });

  it('manages unresolved failure records and retention', () => {
    const model = createUnresolvedFailureModel({
      idFactory: (() => {
        let counter = 0;
        return () => `failure-${++counter}`;
      })(),
      nowFn: createNowFn('2026-02-08T12:00:00.000Z')
    });

    const baseNotification = {
      notificationId: 'notification-1',
      submissionId: 'submission-1',
      authorId: 'author-1'
    };

    const record = model.createRecord({
      notification: baseNotification,
      attempt: {
        attemptNumber: 2,
        status: 'failure',
        attemptedAt: '2026-02-08T12:00:00.000Z',
        failureReason: 'smtp failed'
      },
      failureReason: 'smtp failed'
    });
    expect(record.finalDeliveryStatus).toBe(NOTIFICATION_STATUS.UNRESOLVED_FAILURE);

    model.createRecord({
      notification: {
        notificationId: 'notification-2',
        submissionId: 'submission-2',
        authorId: 'author-2'
      },
      attempt: {
        attemptNumber: 2,
        status: 'failure',
        attemptedAt: '2026-01-01T12:00:00.000Z',
        failureReason: 'bounce'
      },
      failureReason: 'bounce'
    });

    const filtered = model.list({ submissionId: 'submission-1', page: '1', pageSize: '1' });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.total).toBe(1);

    const filteredByToFrom = model.list({
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-02-28T23:59:59.999Z',
      pageSize: 1000
    });
    expect(filteredByToFrom.pageSize).toBe(100);
    expect(filteredByToFrom.items).toHaveLength(1);

    const invalidDatesIgnored = model.list({ from: 'bad-date', to: 'also-bad' });
    expect(invalidDatesIgnored.total).toBe(2);

    const filteredByAuthor = model.list({ authorId: 'author-missing' });
    expect(filteredByAuthor.total).toBe(0);

    const filteredByUpperTo = model.list({ to: '2025-12-31T23:59:59.999Z' });
    expect(filteredByUpperTo.total).toBe(0);

    const fallbackPaging = model.list({ page: '0', pageSize: 'abc' });
    expect(fallbackPaging.page).toBe(1);
    expect(fallbackPaging.pageSize).toBe(25);

    expect(model.getById('failure-1')?.failureRecordId).toBe('failure-1');
    expect(model.getById('missing')).toBeNull();

    const removed = model.purgeExpired('2028-02-08T12:00:00.000Z');
    expect(removed).toBe(2);

    expect(() => model.createRecord({ notification: null, attempt: null })).toThrow(/required/);
    expect(() => model.createRecord({
      notification: baseNotification,
      attempt: { attemptNumber: 1, status: 'failure', failureReason: 'x' },
      failureReason: 'x'
    })).toThrow(/attempt 2/);
    expect(() => model.createRecord({
      notification: baseNotification,
      attempt: { attemptNumber: 2, status: 'success', failureReason: null },
      failureReason: 'x'
    })).toThrow(/failed attempt/);
    expect(() => model.createRecord({
      notification: baseNotification,
      attempt: { attemptNumber: 2, status: 'failure', failureReason: '' },
      failureReason: ''
    })).toThrow(/failureReason is required/);

    const fallbackTimestampRecord = model.createRecord({
      notification: {
        notificationId: 'notification-3',
        submissionId: 'submission-3',
        authorId: 'author-3'
      },
      attempt: {
        attemptNumber: 2,
        status: 'failure',
        failureReason: 'fallback timestamp'
      },
      failureReason: 'fallback timestamp'
    });
    expect(typeof fallbackTimestampRecord.timestamp).toBe('string');
  });

  it('schedules retries and records latency metrics', () => {
    const decisionNotificationModel = {
      setRetryDueAt: vi.fn()
    };
    const scheduler = createRetrySchedulerService({
      decisionNotificationModel,
      nowFn: createNowFn('2026-02-08T12:00:00.000Z'),
      retryDelayMs: 60_000
    });

    const dueAt = scheduler.scheduleRetry({ notificationId: 'notification-1', failedAt: 'bad-date' });
    expect(dueAt).toBe('2026-02-08T12:01:00.000Z');
    expect(decisionNotificationModel.setRetryDueAt).toHaveBeenCalled();

    expect(scheduler.isRetryDue({ retryDueAt: dueAt }, '2026-02-08T12:00:59.000Z')).toBe(false);
    expect(scheduler.isRetryDue({ retryDueAt: dueAt }, '2026-02-08T12:01:00.000Z')).toBe(true);
    expect(scheduler.isRetryDue({}, '2026-02-08T12:01:00.000Z')).toBe(false);

    expect(scheduler.recordFinalizeToAttemptLatency({
      finalizedAt: '2026-02-08T11:59:45.000Z',
      attemptStartedAt: '2026-02-08T12:00:00.000Z'
    })).toBe(15_000);

    expect(scheduler.recordFailureToRetryLatency({
      failureAt: '2026-02-08T11:58:00.000Z',
      retryStartedAt: '2026-02-08T12:00:00.000Z'
    })).toBe(120_000);

    expect(scheduler.getLatencyMeasurements()).toHaveLength(2);
    expect(() => createRetrySchedulerService()).toThrow(/required/);
  });

  it('maps provider results', () => {
    expect(mapProviderResult({ accepted: true, providerMessageId: ' id-1 ' })).toEqual({
      accepted: true,
      providerMessageId: 'id-1',
      failureReason: null
    });
    expect(mapProviderResult({ accepted: true })).toEqual({
      accepted: false,
      providerMessageId: null,
      failureReason: 'Provider accepted message without providerMessageId.'
    });
    expect(mapProviderResult({ accepted: false, error: ' smtp failed ' })).toEqual({
      accepted: false,
      providerMessageId: null,
      failureReason: 'smtp failed'
    });
    expect(mapProviderResult({})).toEqual({
      accepted: false,
      providerMessageId: null,
      failureReason: 'Notification delivery failed.'
    });
  });

  it('sends notifications with success, retry pending, unresolved failure, and conflicts', async () => {
    const nowFn = createNowFn('2026-02-08T12:00:00.000Z');
    const finalizedDecisionModel = createFinalizedDecisionModel({ nowFn });
    const decisionNotificationModel = createDecisionNotificationModel({
      idFactory: (() => {
        let counter = 0;
        return () => `notification-${++counter}`;
      })(),
      nowFn
    });
    const deliveryAttemptModel = createDeliveryAttemptModel({
      idFactory: (() => {
        let counter = 0;
        return () => `attempt-${++counter}`;
      })(),
      nowFn
    });
    const unresolvedFailureModel = createUnresolvedFailureModel({
      idFactory: (() => {
        let counter = 0;
        return () => `failure-${++counter}`;
      })(),
      nowFn
    });
    const retrySchedulerService = createRetrySchedulerService({
      decisionNotificationModel,
      nowFn,
      retryDelayMs: 60_000
    });

    const decision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-1',
      submissionId: 'submission-1',
      authorId: 'author-1',
      authorEmail: 'author1@example.com',
      decisionOutcome: 'accepted',
      finalizedAt: '2026-02-08T11:59:00.000Z'
    });
    const content = finalizedDecisionModel.createEmailContent(decision);
    const created = decisionNotificationModel.createOrGetFromDecision({
      decision,
      subject: content.subject,
      bodyHtml: content.bodyHtml
    });

    const successService = createNotificationEmailDeliveryService({
      sendEmail: async () => ({ accepted: true, providerMessageId: 'provider-1' }),
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService,
      nowFn
    });

    const success = await successService.sendNotification({
      notificationId: created.notification.notificationId,
      attemptNumber: 1
    });
    expect(success.result).toBe('delivered');

    const fifthDecision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-5',
      submissionId: 'submission-5',
      authorId: 'author-5',
      authorEmail: 'author5@example.com',
      decisionOutcome: 'accepted',
      finalizedAt: '2026-02-08T11:59:00.000Z'
    });
    const fifthContent = finalizedDecisionModel.createEmailContent(fifthDecision);
    const fifthCreated = decisionNotificationModel.createOrGetFromDecision({
      decision: fifthDecision,
      subject: fifthContent.subject,
      bodyHtml: fifthContent.bodyHtml
    });
    const noNowFnService = createNotificationEmailDeliveryService({
      sendEmail: async () => ({ accepted: true, providerMessageId: 'provider-no-now' }),
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService
    });
    const noNowFnResult = await noNowFnService.sendNotification({
      notificationId: fifthCreated.notification.notificationId,
      attemptNumber: 1
    });
    expect(noNowFnResult.result).toBe('delivered');

    await expect(successService.sendNotification({
      notificationId: created.notification.notificationId,
      attemptNumber: 2
    })).rejects.toMatchObject({ status: 409 });

    const secondDecision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-2',
      submissionId: 'submission-2',
      authorId: 'author-2',
      authorEmail: 'author2@example.com',
      decisionOutcome: 'rejected',
      finalizedAt: '2026-02-08T11:59:00.000Z'
    });
    const secondContent = finalizedDecisionModel.createEmailContent(secondDecision);
    const secondCreated = decisionNotificationModel.createOrGetFromDecision({
      decision: secondDecision,
      subject: secondContent.subject,
      bodyHtml: secondContent.bodyHtml
    });

    const unresolvedService = createNotificationEmailDeliveryService({
      sendEmail: async ({ attemptNumber }) => {
        if (attemptNumber === 1) {
          return { accepted: false, error: 'smtp down' };
        }

        return { accepted: false, error: 'still down' };
      },
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService,
      nowFn
    });

    const firstFailure = await unresolvedService.sendNotification({
      notificationId: secondCreated.notification.notificationId,
      attemptNumber: 1
    });
    expect(firstFailure.result).toBe('retry_pending');

    const unresolved = await unresolvedService.sendNotification({
      notificationId: secondCreated.notification.notificationId,
      attemptNumber: 2
    });
    expect(unresolved.result).toBe('unresolved_failure');
    expect(unresolved.failureRecordId).toBe('failure-1');

    const throwService = createNotificationEmailDeliveryService({
      sendEmail: async () => {
        throw new Error('provider throw');
      },
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService,
      nowFn
    });

    const thirdDecision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-3',
      submissionId: 'submission-3',
      authorId: 'author-3',
      authorEmail: 'author3@example.com',
      decisionOutcome: 'revision',
      finalizedAt: '2026-02-08T11:59:00.000Z'
    });
    const thirdContent = finalizedDecisionModel.createEmailContent(thirdDecision);
    const thirdCreated = decisionNotificationModel.createOrGetFromDecision({
      decision: thirdDecision,
      subject: thirdContent.subject,
      bodyHtml: thirdContent.bodyHtml
    });

    const throwFailure = await throwService.sendNotification({
      notificationId: thirdCreated.notification.notificationId,
      attemptNumber: 1
    });
    expect(throwFailure.result).toBe('retry_pending');

    const stringThrowService = createNotificationEmailDeliveryService({
      sendEmail: async () => {
        throw 'not-an-error';
      },
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService,
      nowFn
    });

    const fourthDecision = finalizedDecisionModel.createFinalizedDecision({
      decisionId: 'decision-4',
      submissionId: 'submission-4',
      authorId: 'author-4',
      authorEmail: 'author4@example.com',
      decisionOutcome: 'accepted',
      finalizedAt: '2026-02-08T11:59:00.000Z'
    });
    const fourthContent = finalizedDecisionModel.createEmailContent(fourthDecision);
    const fourthCreated = decisionNotificationModel.createOrGetFromDecision({
      decision: fourthDecision,
      subject: fourthContent.subject,
      bodyHtml: fourthContent.bodyHtml
    });
    const stringThrowFailure = await stringThrowService.sendNotification({
      notificationId: fourthCreated.notification.notificationId,
      attemptNumber: 1
    });
    expect(stringThrowFailure.result).toBe('retry_pending');

    await expect(throwService.sendNotification({
      notificationId: 'missing-notification',
      attemptNumber: 1
    })).rejects.toMatchObject({ status: 404 });

    expect(() => createNotificationEmailDeliveryService({ sendEmail: null })).toThrow(/sendEmail/);
    expect(() => createNotificationEmailDeliveryService({ sendEmail: async () => ({ accepted: true }) })).toThrow(/required/);
  });

  it('enforces internal service key middleware', async () => {
    const unrestricted = createInternalServiceAuth({ serviceKey: '' });
    const unrestrictedReq = { headers: {} };
    const unrestrictedRes = createMockResponse();
    const unrestrictedNext = vi.fn();
    unrestricted(unrestrictedReq, unrestrictedRes, unrestrictedNext);
    expect(unrestrictedNext).toHaveBeenCalled();

    const middleware = createInternalServiceAuth({ serviceKey: 'secret-key' });
    const deniedRes = await invokeHandler(async (req, res) => middleware(req, res, () => {}), {
      headers: {}
    });
    expect(deniedRes.statusCode).toBe(401);

    const arrayHeaderReq = { headers: { 'x-internal-service-key': ['secret-key'] } };
    const arrayHeaderRes = createMockResponse();
    const arrayHeaderNext = vi.fn();
    middleware(arrayHeaderReq, arrayHeaderRes, arrayHeaderNext);
    expect(arrayHeaderNext).toHaveBeenCalled();

    const invalidArrayHeaderReq = { headers: { 'x-internal-service-key': [1] } };
    const invalidArrayHeaderRes = createMockResponse();
    middleware(invalidArrayHeaderReq, invalidArrayHeaderRes, vi.fn());
    expect(invalidArrayHeaderRes.statusCode).toBe(401);

    const allowedReq = { headers: { 'x-internal-service-key': 'secret-key' } };
    const allowedRes = createMockResponse();
    const allowedNext = vi.fn();
    middleware(allowedReq, allowedRes, allowedNext);
    expect(allowedNext).toHaveBeenCalled();
  });

  it('enforces admin role middleware', () => {
    const middleware = createAdminRoleAuth();

    const unauthReq = { headers: {} };
    const unauthRes = createMockResponse();
    middleware(unauthReq, unauthRes, vi.fn());
    expect(unauthRes.statusCode).toBe(401);

    const forbiddenReq = { headers: { 'x-user-role': 'reviewer' } };
    const forbiddenRes = createMockResponse();
    middleware(forbiddenReq, forbiddenRes, vi.fn());
    expect(forbiddenRes.statusCode).toBe(403);

    const editorReq = { headers: { 'x-user-role': ['editor'] } };
    const editorRes = createMockResponse();
    const next = vi.fn();
    middleware(editorReq, editorRes, next);
    expect(next).toHaveBeenCalled();
    expect(editorReq.authenticatedUserRole).toBe('admin');

    const invalidArrayRoleReq = { headers: { 'x-user-role': [1] } };
    const invalidArrayRoleRes = createMockResponse();
    middleware(invalidArrayRoleReq, invalidArrayRoleRes, vi.fn());
    expect(invalidArrayRoleRes.statusCode).toBe(403);

    const emptyArrayRoleReq = { headers: { 'x-user-role': [] } };
    const emptyArrayRoleRes = createMockResponse();
    middleware(emptyArrayRoleReq, emptyArrayRoleRes, vi.fn());
    expect(emptyArrayRoleRes.statusCode).toBe(401);

    const adminReq = { authenticatedUserRole: 'admin', headers: {} };
    const adminRes = createMockResponse();
    const adminNext = vi.fn();
    middleware(adminReq, adminRes, adminNext);
    expect(adminNext).toHaveBeenCalled();
  });

  it('handles notification and admin controller responses', async () => {
    const nowFn = createNowFn('2026-02-08T12:00:00.000Z');
    const finalizedDecisionModel = createFinalizedDecisionModel({ nowFn });
    const decisionNotificationModel = createDecisionNotificationModel({
      idFactory: (() => {
        let counter = 0;
        return () => `notification-${++counter}`;
      })(),
      nowFn
    });
    const deliveryAttemptModel = createDeliveryAttemptModel({
      idFactory: (() => {
        let counter = 0;
        return () => `attempt-${++counter}`;
      })(),
      nowFn
    });
    const unresolvedFailureModel = createUnresolvedFailureModel({
      idFactory: (() => {
        let counter = 0;
        return () => `failure-${++counter}`;
      })(),
      nowFn
    });
    const retrySchedulerService = createRetrySchedulerService({
      decisionNotificationModel,
      nowFn,
      retryDelayMs: 60_000
    });

    const emailDeliveryService = createNotificationEmailDeliveryService({
      sendEmail: async ({ attemptNumber }) => {
        if (attemptNumber === 1) {
          return { accepted: true, providerMessageId: 'provider-1' };
        }

        return { accepted: false, error: 'forced' };
      },
      decisionNotificationModel,
      deliveryAttemptModel,
      unresolvedFailureModel,
      retrySchedulerService,
      nowFn
    });

    const notificationController = createNotificationController({
      finalizedDecisionModel,
      decisionNotificationModel,
      deliveryAttemptModel,
      emailDeliveryService
    });

    const trigger = await invokeHandler(notificationController.triggerDecisionNotification, {
      params: { decisionId: 'decision-1' },
      body: {
        submissionId: 'submission-1',
        authorId: 'author-1',
        authorEmail: 'author1@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(trigger.statusCode).toBe(202);

    const duplicate = await invokeHandler(notificationController.triggerDecisionNotification, {
      params: { decisionId: 'decision-1' },
      body: {
        submissionId: 'submission-1',
        authorId: 'author-1',
        authorEmail: 'author1@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(duplicate.statusCode).toBe(200);

    const retryPendingController = createNotificationController({
      finalizedDecisionModel,
      decisionNotificationModel,
      deliveryAttemptModel,
      emailDeliveryService: createNotificationEmailDeliveryService({
        sendEmail: async () => ({ accepted: false, error: 'pending now' }),
        decisionNotificationModel,
        deliveryAttemptModel,
        unresolvedFailureModel,
        retrySchedulerService,
        nowFn
      })
    });

    const retryPendingTrigger = await invokeHandler(retryPendingController.triggerDecisionNotification, {
      params: { decisionId: 'decision-queued-unit' },
      body: {
        submissionId: 'submission-queued-unit',
        authorId: 'author-queued-unit',
        authorEmail: 'author-queued-unit@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(retryPendingTrigger.statusCode).toBe(202);
    expect(retryPendingTrigger.body.status).toBe('queued');

    const queuedDuplicate = await invokeHandler(retryPendingController.triggerDecisionNotification, {
      params: { decisionId: 'decision-queued-unit' },
      body: {
        submissionId: 'submission-queued-unit',
        authorId: 'author-queued-unit',
        authorEmail: 'author-queued-unit@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(queuedDuplicate.statusCode).toBe(200);
    expect(queuedDuplicate.body.status).toBe('already_processed');

    const badDecisionPath = await invokeHandler(notificationController.triggerDecisionNotification, {
      params: {},
      body: {}
    });
    expect(badDecisionPath.statusCode).toBe(400);

    const badRetry = await invokeHandler(notificationController.retryNotificationDelivery, {
      params: { notificationId: 'n' },
      body: { attemptNumber: 1 }
    });
    expect(badRetry.statusCode).toBe(400);

    const missingNotificationIdRetry = await invokeHandler(notificationController.retryNotificationDelivery, {
      params: {},
      body: { attemptNumber: 2 }
    });
    expect(missingNotificationIdRetry.statusCode).toBe(400);

    const missingRetry = await invokeHandler(notificationController.retryNotificationDelivery, {
      params: { notificationId: 'missing' },
      body: { attemptNumber: 2 }
    });
    expect(missingRetry.statusCode).toBe(404);

    const unresolvedDecisionController = createNotificationController({
      finalizedDecisionModel,
      decisionNotificationModel,
      deliveryAttemptModel,
      emailDeliveryService: createNotificationEmailDeliveryService({
        sendEmail: async () => ({ accepted: false, error: 'always fails' }),
        decisionNotificationModel,
        deliveryAttemptModel,
        unresolvedFailureModel,
        retrySchedulerService,
        nowFn
      })
    });

    const unresolvedTrigger = await invokeHandler(unresolvedDecisionController.triggerDecisionNotification, {
      params: { decisionId: 'decision-unresolved-unit' },
      body: {
        submissionId: 'submission-unresolved-unit',
        authorId: 'author-unresolved-unit',
        authorEmail: 'author-unresolved-unit@example.com',
        decisionOutcome: 'rejected',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(unresolvedTrigger.statusCode).toBe(202);

    const unresolvedRetry = await invokeHandler(unresolvedDecisionController.retryNotificationDelivery, {
      params: { notificationId: unresolvedTrigger.body.notificationId },
      body: { attemptNumber: 2 }
    });
    expect(unresolvedRetry.body.result).toBe('unresolved_failure');

    const unresolvedDuplicate = await invokeHandler(unresolvedDecisionController.triggerDecisionNotification, {
      params: { decisionId: 'decision-unresolved-unit' },
      body: {
        submissionId: 'submission-unresolved-unit',
        authorId: 'author-unresolved-unit',
        authorEmail: 'author-unresolved-unit@example.com',
        decisionOutcome: 'rejected',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(unresolvedDuplicate.statusCode).toBe(200);
    expect(unresolvedDuplicate.body.status).toBe('unresolved_failure');

    const adminController = createAdminFailureLogController({ unresolvedFailureModel });

    const listResponse = await invokeHandler(adminController.listUnresolvedFailures, {
      query: { page: '1', pageSize: '25' }
    });
    expect(listResponse.statusCode).toBe(200);

    const missingDetail = await invokeHandler(adminController.getUnresolvedFailure, {
      params: { failureRecordId: 'missing' }
    });
    expect(missingDetail.statusCode).toBe(404);

    const invalidDetail = await invokeHandler(adminController.getUnresolvedFailure, {
      params: { failureRecordId: '  ' }
    });
    expect(invalidDetail.statusCode).toBe(400);

    const missingParamsDetail = await invokeHandler(adminController.getUnresolvedFailure, {});
    expect(missingParamsDetail.statusCode).toBe(400);

    const throwingController = createAdminFailureLogController({
      unresolvedFailureModel: {
        list() {
          throw new Error('boom');
        },
        getById() {
          throw new Error('boom');
        }
      }
    });

    const listError = await invokeHandler(throwingController.listUnresolvedFailures, {
      query: {}
    });
    expect(listError.statusCode).toBe(500);

    const detailError = await invokeHandler(throwingController.getUnresolvedFailure, {
      params: { failureRecordId: 'x' }
    });
    expect(detailError.statusCode).toBe(500);

    const customErrorController = createAdminFailureLogController({
      unresolvedFailureModel: {
        list() {
          const error = new Error('custom');
          error.status = 418;
          error.code = 'TEAPOT';
          throw error;
        },
        getById() {
          const error = new Error('custom-detail');
          error.status = 409;
          error.code = 'CUSTOM_DETAIL';
          throw error;
        }
      }
    });

    const customListError = await invokeHandler(customErrorController.listUnresolvedFailures, {
      query: {}
    });
    expect(customListError.statusCode).toBe(418);
    expect(customListError.body.code).toBe('TEAPOT');

    const customDetailError = await invokeHandler(customErrorController.getUnresolvedFailure, {
      params: { failureRecordId: 'x' }
    });
    expect(customDetailError.statusCode).toBe(409);
    expect(customDetailError.body.code).toBe('CUSTOM_DETAIL');

    const fallbackErrorController = createAdminFailureLogController({
      unresolvedFailureModel: {
        list() {
          throw {};
        },
        getById() {
          throw {};
        }
      }
    });

    const fallbackListError = await invokeHandler(fallbackErrorController.listUnresolvedFailures, {
      query: {}
    });
    expect(fallbackListError.statusCode).toBe(500);
    expect(fallbackListError.body.message).toBe('Unexpected error.');

    const fallbackNotificationController = createNotificationController({
      finalizedDecisionModel,
      decisionNotificationModel,
      deliveryAttemptModel,
      emailDeliveryService: {
        async sendNotification() {
          throw {};
        }
      }
    });

    const notificationFallback = await invokeHandler(fallbackNotificationController.triggerDecisionNotification, {
      params: { decisionId: 'decision-fallback-error' },
      body: {
        submissionId: 'submission-fallback-error',
        authorId: 'author-fallback-error',
        authorEmail: 'author-fallback-error@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });
    expect(notificationFallback.statusCode).toBe(500);
    expect(notificationFallback.body.code).toBe('INTERNAL_ERROR');

    expect(() => createNotificationController()).toThrow(/required/);
    expect(() => createAdminFailureLogController()).toThrow(/required/);
  });
});
