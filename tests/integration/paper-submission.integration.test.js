import { describe, expect, it } from 'vitest';
import { createSubmissionApi } from '../../src/assets/js/submit-paper-page.js';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/models/user-account-model.js';
import { invokeAppRoute, invokeHandler } from '../helpers/http-harness.js';

function extractInputValue(html, inputName) {
  const match = html.match(new RegExp(`<input[^>]*name="${inputName}"[^>]*value="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function buildSubmissionApiFetchHarness({ app, sessionId, authorId }) {
  const authHeaders = {
    'x-session-id': sessionId,
    'x-author-id': authorId
  };

  return async (url, options = {}) => {
    const method = String(options.method ?? 'GET').toLowerCase();
    const body = typeof options.body === 'string' && options.body.length > 0
      ? JSON.parse(options.body)
      : {};

    let response;

    if (url === '/api/v1/submissions' && method === 'post') {
      response = await invokeAppRoute(app, {
        method: 'post',
        path: '/api/v1/submissions',
        headers: authHeaders,
        body
      });
    } else {
      const match = String(url).match(/^\/api\/v1\/submissions\/([^/]+)\/(files|validate|submit)$/);
      if (!match) {
        throw new Error(`Unexpected API URL: ${url}`);
      }

      const submissionId = match[1];
      const operation = match[2];

      if (operation === 'files' && method === 'post') {
        response = await invokeAppRoute(app, {
          method: 'post',
          path: '/api/v1/submissions/:submissionId/files',
          params: { submissionId },
          headers: authHeaders,
          body
        });
      } else if (operation === 'validate' && method === 'post') {
        response = await invokeAppRoute(app, {
          method: 'post',
          path: '/api/v1/submissions/:submissionId/validate',
          params: { submissionId },
          headers: authHeaders,
          body
        });
      } else if (operation === 'submit' && method === 'post') {
        response = await invokeAppRoute(app, {
          method: 'post',
          path: '/api/v1/submissions/:submissionId/submit',
          params: { submissionId },
          headers: {
            ...authHeaders,
            'idempotency-key': options.headers?.['Idempotency-Key']
          },
          body
        });
      } else {
        throw new Error(`Unsupported API operation: ${method.toUpperCase()} ${url}`);
      }
    }

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      json: async () => response.body
    };
  };
}

describe('integration: paper submission api', () => {
  it('shows current role on dashboard, supports role changes, and gates submit-paper access by role', async () => {
    const app = createApp();
    app.locals.repository.createUserAccount({
      id: 'role-int-1',
      fullName: 'Role Integration',
      emailNormalized: 'role.integration@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'editor',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'role.integration@example.com',
        password: 'StrongPass!2026'
      }
    });
    expect(loginResponse.statusCode).toBe(200);
    const sessionCookie = String(loginResponse.headers['Set-Cookie']).split(';')[0];
    const sessionId = sessionCookie.split('=')[1];

    const dashboardAsEditor = await invokeAppRoute(app, {
      method: 'get',
      path: '/dashboard',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(dashboardAsEditor.statusCode).toBe(200);
    expect(dashboardAsEditor.text).toContain('Current role: Editor');
    expect(dashboardAsEditor.text).toContain('data-dashboard-submit-paper-disabled');

    const blockedSubmitPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/submit-paper',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(blockedSubmitPage.statusCode).toBe(302);
    expect(blockedSubmitPage.redirectLocation).toBe('/dashboard?roleUpdated=author_required');

    const roleUpdate = await invokeAppRoute(app, {
      method: 'post',
      path: '/account/role',
      headers: {
        cookie: sessionCookie
      },
      body: {
        role: 'author'
      }
    });
    expect(roleUpdate.statusCode).toBe(302);
    expect(roleUpdate.redirectLocation).toBe('/dashboard?roleUpdated=updated');

    const dashboardAsAuthor = await invokeAppRoute(app, {
      method: 'get',
      path: '/dashboard',
      headers: {
        cookie: sessionCookie
      },
      query: {
        roleUpdated: 'updated'
      }
    });
    expect(dashboardAsAuthor.statusCode).toBe(200);
    expect(dashboardAsAuthor.text).toContain('Current role: Author');
    expect(dashboardAsAuthor.text).toContain('Role updated successfully.');
    expect(dashboardAsAuthor.text).toContain('data-dashboard-submit-paper');

    const submitPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/submit-paper',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(submitPage.statusCode).toBe(200);
    expect(submitPage.text).toContain('data-submit-paper-form');
    expect(extractInputValue(submitPage.text, 'sessionId')).toBe(sessionId);
    expect(extractInputValue(submitPage.text, 'actionSequenceId')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(submitPage.text).toContain('Current role: Author.');
    expect(submitPage.text).toContain('data-submit-paper-role-change');
    expect(submitPage.text).toContain('data-submit-paper-role-form');
    expect(submitPage.text).toContain('data-submit-paper-role-select');
    expect(submitPage.text).toContain('data-submit-paper-role-submit');
    expect(submitPage.text).toContain('data-submit-paper-draft');
    expect(submitPage.text).toContain('data-draft-save');
    expect(submitPage.text).toContain('data-draft-load');
    expect(submitPage.text).toContain('data-draft-history-refresh');
    expect(submitPage.text).toContain('data-draft-history-list');
  });

  it('completes create -> upload -> validate -> submit -> status successfully', async () => {
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
        metadata: {
          title: 'Paper title',
          abstract: 'Paper abstract',
          authorList: ['Author One']
        }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.status).toBe('draft');
    const submissionId = createResponse.body.submissionId;

    const uploadResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        category: 'manuscript',
        file: {
          name: 'paper.txt',
          type: 'text/plain',
          size: 1024
        }
      }
    });

    expect(uploadResponse.statusCode).toBe(201);
    expect(uploadResponse.body.file.scanStatus).toBe('passed');

    const validateResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/validate',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {}
    });

    expect(validateResponse.statusCode).toBe(200);
    expect(validateResponse.body).toEqual({
      submissionId,
      valid: true,
      errors: []
    });

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
      body: {}
    });

    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.body.status).toBe('submitted');
    expect(submitResponse.body.confirmationCode).toContain('CONF-');

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
    expect(statusResponse.body.retryAllowed).toBe(false);
    expect(statusResponse.body.outcome).toBe('submitted');
  });

  it('prompts retry on upload failure and succeeds after retry', async () => {
    const app = createApp();
    app.locals.storageService.setFailNextSave();

    const authHeaders = {
      'x-session-id': 'session-2',
      'x-author-id': 'author-2'
    };

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-2',
        sessionId: 'session-2',
        metadata: {
          title: 'Retry title',
          abstract: 'Retry abstract',
          authorList: ['Retry Author']
        }
      }
    });

    const submissionId = createResponse.body.submissionId;

    const failedUpload = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-2',
        category: 'manuscript',
        file: {
          name: 'paper.pdf',
          type: 'application/pdf',
          size: 1024
        }
      }
    });

    expect(failedUpload.statusCode).toBe(503);
    expect(failedUpload.body.outcome).toBe('retry_required');

    const retryUpload = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-2',
        category: 'manuscript',
        file: {
          name: 'paper.pdf',
          type: 'application/pdf',
          size: 1024
        }
      }
    });

    expect(retryUpload.statusCode).toBe(201);

    const submitResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId
      },
      headers: {
        ...authHeaders,
        'idempotency-key': 'idem-2'
      },
      body: {
        sessionId: 'session-2'
      }
    });

    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.body.status).toBe('submitted');
  });

  it('blocks invalid metadata and scan failures from final submission', async () => {
    const app = createApp();
    const authHeaders = {
      'x-session-id': 'session-3',
      'x-author-id': 'author-3'
    };

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-3',
        sessionId: 'session-3',
        metadata: {
          title: '',
          abstract: '',
          authorList: []
        }
      }
    });

    const submissionId = createResponse.body.submissionId;

    const invalidSubmit = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId
      },
      headers: {
        ...authHeaders,
        'idempotency-key': 'idem-3'
      },
      body: {
        sessionId: 'session-3'
      }
    });

    expect(invalidSubmit.statusCode).toBe(422);
    expect(invalidSubmit.body.code).toBe('SUBMISSION_BLOCKED');

    const scanFailUpload = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-3',
        category: 'manuscript',
        file: {
          name: 'virus-file.pdf',
          type: 'application/pdf',
          size: 500
        }
      }
    });

    expect(scanFailUpload.statusCode).toBe(201);
    expect(scanFailUpload.body.file.scanStatus).toBe('failed');

    const statusResponse = await invokeAppRoute(app, {
      method: 'get',
      path: '/api/v1/submissions/:submissionId',
      params: {
        submissionId
      },
      headers: authHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.body.status).toBe('scan_failed');
  });

  it('accepts PDF and text uploads through submit-page API payload format', async () => {
    const app = createApp();
    const api = createSubmissionApi({
      fetchImpl: buildSubmissionApiFetchHarness({
        app,
        sessionId: 'session-frontend-1',
        authorId: 'author-frontend-1'
      })
    });

    const createPdf = await api.createSubmission({
      metadata: {
        title: 'Frontend PDF',
        abstract: 'Frontend upload flow',
        authorList: ['Frontend Author']
      }
    });
    expect(createPdf.ok).toBe(true);

    const uploadPdf = await api.uploadFile({
      submissionId: createPdf.payload.submissionId,
      category: 'manuscript',
      file: {
        name: 'frontend-paper.pdf',
        type: 'application/pdf',
        size: 512
      }
    });
    expect(uploadPdf.ok).toBe(true);
    expect(uploadPdf.payload.file.mimeType).toBe('application/pdf');

    const createText = await api.createSubmission({
      metadata: {
        title: 'Frontend Text',
        abstract: 'Frontend upload flow',
        authorList: ['Frontend Author']
      }
    });
    expect(createText.ok).toBe(true);

    const uploadText = await api.uploadFile({
      submissionId: createText.payload.submissionId,
      category: 'manuscript',
      file: {
        name: 'frontend-paper.txt',
        type: 'text/plain',
        size: 256
      }
    });
    expect(uploadText.ok).toBe(true);
    expect(uploadText.payload.file.mimeType).toBe('text/plain');
  });
});
