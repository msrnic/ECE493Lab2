import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { invokeAppRoute } from '../helpers/http-harness.js';

describe('UC-04 performance scenario', () => {
  it('completes successful submit flow well within SC-002 threshold', async () => {
    const app = createApp();
    const authHeaders = {
      'x-session-id': 'session-perf-1',
      'x-author-id': 'author-perf-1'
    };

    const start = Date.now();

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-perf-1',
        sessionId: 'session-perf-1',
        metadata: {
          title: 'Performance Paper',
          abstract: 'Performance abstract',
          authorList: ['Perf Author']
        }
      }
    });

    const submissionId = createResponse.body.submissionId;

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-perf-1',
        category: 'manuscript',
        file: {
          name: 'perf-paper.pdf',
          type: 'application/pdf',
          size: 512
        }
      }
    });

    await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId
      },
      headers: {
        ...authHeaders,
        'idempotency-key': 'idem-perf-1'
      },
      body: {
        sessionId: 'session-perf-1'
      }
    });

    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(3 * 60 * 1000);
  });
});
