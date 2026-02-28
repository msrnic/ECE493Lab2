import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { invokeAppRoute } from '../../helpers/http-harness.js';

async function triggerInvitation(app, assignmentId) {
  const startedAt = performance.now();
  const response = await invokeAppRoute(app, {
    method: 'post',
    path: '/api/reviewer-assignments/:assignmentId/invitations',
    params: { assignmentId },
    body: {
      paperId: `paper-${assignmentId}`,
      reviewerId: `reviewer-${assignmentId}`
    }
  });
  const elapsedMs = performance.now() - startedAt;
  return { response, elapsedMs };
}

describe('SC-002 invitation latency', () => {
  it('keeps at least 95% of invitation dispatches under 2 minutes', async () => {
    const app = createApp({
      sendInvitationFn: async () => ({ accepted: true, providerMessageId: 'provider-sc002' })
    });

    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      const sample = await triggerInvitation(app, `sc002-${index}`);
      expect(sample.response.statusCode).toBe(202);
      expect(sample.response.body.status).toBe('delivered');
      samples.push(sample.elapsedMs);
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const percentile95 = sorted[Math.ceil(sorted.length * 0.95) - 1];

    expect(percentile95).toBeLessThan(120000);
  });
});
