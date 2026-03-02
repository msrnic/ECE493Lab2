import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('UC-12-AS delivery acceptance', () => {
  it('Given a finalized decision, when notification is sent, then the author receives the decision', async () => {
    const app = createApp({
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async () => ({ accepted: true, providerMessageId: 'provider-1' })
    });

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-acceptance-delivery-1' },
      body: {
        submissionId: 'submission-acceptance-delivery-1',
        authorId: 'author-acceptance-delivery-1',
        authorEmail: 'author-acceptance-delivery-1@example.com',
        decisionOutcome: 'accepted',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.body.status).toBe('delivered');
    expect(response.body.attemptsUsed).toBe(1);
  });

  it('Given duplicate trigger requests, when the same decision is retriggered, then idempotent response is returned', async () => {
    const app = createApp({
      notificationInternalServiceKey: 'internal-secret',
      sendDecisionEmailFn: async () => ({ accepted: true, providerMessageId: 'provider-2' })
    });

    const first = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-acceptance-delivery-2' },
      body: {
        submissionId: 'submission-acceptance-delivery-2',
        authorId: 'author-acceptance-delivery-2',
        authorEmail: 'author-acceptance-delivery-2@example.com',
        decisionOutcome: 'rejected',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });

    const second = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/internal/decisions/:decisionId/notifications',
      headers: { 'x-internal-service-key': 'internal-secret' },
      params: { decisionId: 'decision-acceptance-delivery-2' },
      body: {
        submissionId: 'submission-acceptance-delivery-2',
        authorId: 'author-acceptance-delivery-2',
        authorEmail: 'author-acceptance-delivery-2@example.com',
        decisionOutcome: 'rejected',
        finalizedAt: '2026-02-08T11:59:00.000Z'
      }
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(200);
    expect(second.body.status).toBe('delivered');
  });
});
