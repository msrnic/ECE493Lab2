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

    if (url === '/api/v1/submissions' && method === 'post') {
      const response = await invokeAppRoute(app, {
        method: 'post',
        path: '/api/v1/submissions',
        headers: authHeaders,
        body
      });

      return {
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        json: async () => response.body
      };
    }

    const match = String(url).match(/^\/api\/v1\/submissions\/([^/]+)\/files$/);
    if (!match || method !== 'post') {
      throw new Error(`Unexpected API operation: ${method.toUpperCase()} ${url}`);
    }

    const response = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId: match[1]
      },
      headers: authHeaders,
      body
    });

    return {
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      json: async () => response.body
    };
  };
}

describe('UC-04-AS acceptance suite', () => {
  it('Given a logged-in editor When viewing dashboard and switching role to author Then role is visible and submit-paper entry becomes available', async () => {
    const app = createApp();
    app.locals.repository.createUserAccount({
      id: 'uc04-role-1',
      fullName: 'Acceptance Role User',
      emailNormalized: 'accept.role@example.com',
      passwordHash: hashPassword('StrongPass!2026'),
      role: 'editor',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      activatedAt: '2026-02-01T00:00:00.000Z'
    });

    const loginResponse = await invokeHandler(app.locals.authController.login, {
      body: {
        email: 'accept.role@example.com',
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
    expect(dashboardAsEditor.text).toContain('data-dashboard-role-form');
    expect(dashboardAsEditor.text).toContain('data-dashboard-submit-paper-disabled');
    expect(dashboardAsEditor.text).toContain('data-dashboard-assign-reviewers');
    expect(dashboardAsEditor.text).not.toContain('data-dashboard-assign-reviewers-disabled');

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
    expect(dashboardAsAuthor.text).toContain('data-dashboard-assign-reviewers-disabled');

    const submitPage = await invokeAppRoute(app, {
      method: 'get',
      path: '/submit-paper',
      headers: {
        cookie: sessionCookie
      }
    });
    expect(submitPage.statusCode).toBe(200);
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

  it('Given the author is logged in When all required metadata and files are submitted Then the paper is stored and marked as submitted', async () => {
    const app = createApp();
    const authHeaders = {
      'x-session-id': 'session-accept-1',
      'x-author-id': 'author-accept-1'
    };

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-accept-1',
        sessionId: 'session-accept-1',
        metadata: {
          title: 'Acceptance Paper',
          abstract: 'Acceptance abstract',
          authorList: ['Acceptance Author']
        }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const submissionId = createResponse.body.submissionId;

    const uploadResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/files',
      params: {
        submissionId
      },
      headers: authHeaders,
      body: {
        sessionId: 'session-accept-1',
        category: 'manuscript',
        file: {
          name: 'acceptance-paper.txt',
          type: 'text/plain',
          size: 256
        }
      }
    });

    expect(uploadResponse.statusCode).toBe(201);

    const submitResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions/:submissionId/submit',
      params: {
        submissionId
      },
      headers: {
        ...authHeaders,
        'idempotency-key': 'idem-accept-1'
      },
      body: {
        sessionId: 'session-accept-1'
      }
    });

    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.body.status).toBe('submitted');
  });

  it('Given file upload fails When submission is attempted Then the system prompts the author to retry', async () => {
    const app = createApp();
    app.locals.storageService.setFailNextSave();

    const authHeaders = {
      'x-session-id': 'session-accept-2',
      'x-author-id': 'author-accept-2'
    };

    const createResponse = await invokeAppRoute(app, {
      method: 'post',
      path: '/api/v1/submissions',
      headers: authHeaders,
      body: {
        actionSequenceId: 'action-accept-2',
        sessionId: 'session-accept-2',
        metadata: {
          title: 'Retry Paper',
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
        sessionId: 'session-accept-2',
        category: 'manuscript',
        file: {
          name: 'retry-paper.pdf',
          type: 'application/pdf',
          size: 200
        }
      }
    });

    expect(failedUpload.statusCode).toBe(503);
    expect(failedUpload.body).toEqual({
      submissionId,
      outcome: 'retry_required',
      retryAllowed: true,
      message: 'File upload failed. Please retry.'
    });
  });

  it('Given submit-page API payloads are used When uploading PDF and text files Then both uploads are accepted', async () => {
    const app = createApp();
    const api = createSubmissionApi({
      fetchImpl: buildSubmissionApiFetchHarness({
        app,
        sessionId: 'session-accept-upload-types',
        authorId: 'author-accept-upload-types'
      })
    });

    const createPdf = await api.createSubmission({
      metadata: {
        title: 'PDF upload',
        abstract: 'Acceptance upload scenario',
        authorList: ['Acceptance Author']
      }
    });
    expect(createPdf.ok).toBe(true);
    const uploadPdf = await api.uploadFile({
      submissionId: createPdf.payload.submissionId,
      category: 'manuscript',
      file: {
        name: 'paper.pdf',
        type: 'application/pdf',
        size: 128
      }
    });
    expect(uploadPdf.ok).toBe(true);

    const createText = await api.createSubmission({
      metadata: {
        title: 'Text upload',
        abstract: 'Acceptance upload scenario',
        authorList: ['Acceptance Author']
      }
    });
    expect(createText.ok).toBe(true);
    const uploadText = await api.uploadFile({
      submissionId: createText.payload.submissionId,
      category: 'manuscript',
      file: {
        name: 'paper.txt',
        type: 'text/plain',
        size: 128
      }
    });
    expect(uploadText.ok).toBe(true);
  });
});
