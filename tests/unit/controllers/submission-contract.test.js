import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { invokeAppRoute } from '../../helpers/http-harness.js';

describe('submission contract status codes', () => {
  it('returns 401 for create/upload/validate/submit/status with invalid sessions', async () => {
    const app = createApp();

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      body: {
        actionSequenceId: 'action-1',
        sessionId: 'session-1',
        metadata: {
          title: 'Title',
          abstract: 'Abstract',
          authorList: ['Author']
        }
      }
    });

    const uploadResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1',
        category: 'manuscript'
      }
    });

    const validateResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/validate',
      params: {
        submissionId: 'sub-1'
      },
      body: {
        sessionId: 'session-1'
      }
    });

    const submitResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId: 'sub-1'
      },
      headers: {
        'idempotency-key': 'idem-1'
      },
      body: {
        sessionId: 'session-1'
      }
    });

    const statusResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/v1/submissions/:submissionId',
      params: {
        submissionId: 'sub-1'
      }
    });

    for (const response of [
      createResponse,
      uploadResponse,
      validateResponse,
      submitResponse,
      statusResponse
    ]) {
      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual({
        code: 'SESSION_INVALID',
        message: 'Session is invalid or expired; author must re-authenticate.'
      });
    }
  });

  it('follows expected 201 -> 201 -> 200 -> 200 -> 200 path for valid submission flow', async () => {
    const app = createApp();
    const authHeaders = {
      'x-session-id': 'session-1',
      'x-author-id': 'author-1'
    };

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-1',
        sessionId: 'session-1',
        metadata: {
          title: 'Paper title',
          abstract: 'Paper abstract',
          authorList: ['Author One']
        }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const { submissionId } = createResponse.body;

    const uploadResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-1',
        category: 'manuscript',
        file: {
          name: 'paper.pdf',
          type: 'application/pdf',
          size: 512
        }
      }
    });
    expect(uploadResponse.statusCode).toBe(201);

    const validateResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/validate',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-1'
      }
    });
    expect(validateResponse.statusCode).toBe(200);
    expect(validateResponse.body.valid).toBe(true);

    const submitResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId
      },
      headers: {
        ...authHeaders,
        'idempotency-key': 'idem-1'
      },
      body: {
        sessionId: 'session-1'
      }
    });
    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.body.status).toBe('submitted');

    const statusResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/v1/submissions/:submissionId',
      params: {
        submissionId
      },
      headers: authHeaders
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.body.status).toBe('submitted');
  });
});
