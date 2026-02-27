/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPasswordChangeApiController,
  createPasswordChangePageController
} from '../../../src/controllers/password-change-controller.js';
import { enhancePasswordChangeForm } from '../../../src/controllers/password-change-form-controller.js';
import { createMockResponse, invokeHandler } from '../../helpers/http-harness.js';

function setPasswordChangeHtml() {
  document.body.innerHTML = `
    <form data-password-change-form>
      <input name="currentPassword" />
      <input name="newPassword" />
      <button type="submit">Update</button>
    </form>
    <p data-password-change-status></p>
  `;
}

describe('password-change-controller', () => {
  beforeEach(() => {
    setPasswordChangeHtml();
  });

  it('returns unauthenticated response when no session is present', async () => {
    const handler = createPasswordChangeApiController({
      authController: {
        getAuthenticatedSession: () => null
      },
      passwordChangeModel: {
        changePassword: vi.fn()
      }
    });

    const response = await invokeHandler(handler, {
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication is required.'
    });
  });

  it('forwards model responses and handles internal exceptions', async () => {
    const authController = {
      getAuthenticatedSession: () => ({
        sessionId: 'session-1',
        user: {
          id: 'usr-1',
          email: 'user@example.com'
        }
      })
    };

    const successHandler = createPasswordChangeApiController({
      authController,
      passwordChangeModel: {
        changePassword: vi.fn().mockResolvedValue({
          httpStatus: 429,
          headers: {
            'Retry-After': '30'
          },
          body: {
            status: 'rejected',
            code: 'TEMPORARILY_BLOCKED'
          }
        })
      }
    });

    const response = createMockResponse();
    await successHandler(
      {
        body: {
          currentPassword: 'StrongPass!2026',
          newPassword: 'NewStrongPass!2027'
        },
        headers: {
          'user-agent': 'vitest'
        },
        ip: '127.0.0.1'
      },
      response
    );

    expect(response.statusCode).toBe(429);
    expect(response.headers['Retry-After']).toBe('30');
    expect(response.body.code).toBe('TEMPORARILY_BLOCKED');

    const noHeadersHandler = createPasswordChangeApiController({
      authController,
      passwordChangeModel: {
        changePassword: vi.fn().mockResolvedValue({
          httpStatus: 200,
          body: {
            status: 'updated'
          }
        })
      }
    });

    const noHeadersResponse = createMockResponse();
    await noHeadersHandler(
      {
        body: {
          currentPassword: 'StrongPass!2026',
          newPassword: 'NewStrongPass!2027'
        }
      },
      noHeadersResponse
    );
    expect(noHeadersResponse.statusCode).toBe(200);
    expect(noHeadersResponse.body.status).toBe('updated');

    const failureHandler = createPasswordChangeApiController({
      authController,
      passwordChangeModel: {
        changePassword: vi.fn().mockRejectedValue(new Error('boom'))
      }
    });

    const failureResponse = await invokeHandler(failureHandler, {
      body: {
        currentPassword: 'StrongPass!2026',
        newPassword: 'NewStrongPass!2027'
      }
    });

    expect(failureResponse.statusCode).toBe(500);
    expect(failureResponse.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.'
    });
  });

  it('renders password-change page for authenticated users and redirects otherwise', async () => {
    const pageController = createPasswordChangePageController({
      authController: {
        getAuthenticatedSession: (req) => (req.headers.cookie ? {
          user: {
            email: 'user@example.com'
          }
        } : null)
      }
    });

    const redirectResponse = await invokeHandler(pageController, {
      headers: {}
    });
    expect(redirectResponse.statusCode).toBe(302);
    expect(redirectResponse.redirectLocation).toBe('/login');

    const pageResponse = await invokeHandler(pageController, {
      headers: {
        cookie: 'cms_session=session-1'
      }
    });
    expect(pageResponse.statusCode).toBe(200);
    expect(pageResponse.contentType).toBe('html');
    expect(pageResponse.text).toContain('data-password-change-form');
    expect(pageResponse.text).toContain('user@example.com');
  });

  it('returns null when password-change form elements are unavailable', () => {
    expect(enhancePasswordChangeForm({ documentRef: null })).toBeNull();

    document.body.innerHTML = '<div>missing elements</div>';
    expect(enhancePasswordChangeForm({ documentRef: document })).toBeNull();
  });

  it('handles required validation, successful submissions, and error submissions', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue(null)
        },
        json: async () => ({
          status: 'updated',
          message: 'Password updated successfully.'
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: vi.fn().mockReturnValue('25')
        },
        json: async () => ({
          code: 'TEMPORARILY_BLOCKED',
          message: 'Too many incorrect password attempts. Try again later.',
          retryAfterSeconds: 25
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue(null)
        },
        json: async () => ({
          status: 'updated'
        })
      });

    const enhanced = enhancePasswordChangeForm({
      documentRef: document,
      fetchImpl
    });

    const { form, statusNode } = enhanced;

    form.querySelector('[name="currentPassword"]').value = '';
    form.querySelector('[name="newPassword"]').value = '';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(statusNode.textContent).toBe('Current password and new password are required.');
    expect(statusNode.dataset.status).toBe('error');

    form.querySelector('[name="currentPassword"]').value = 'StrongPass!2026';
    form.querySelector('[name="newPassword"]').value = 'NewStrongPass!2027';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(statusNode.textContent).toBe('Password updated successfully.');
    expect(statusNode.dataset.status).toBe('success');

    form.querySelector('[name="currentPassword"]').value = 'WrongPassword!2026';
    form.querySelector('[name="newPassword"]').value = 'NewStrongPass!2027';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(statusNode.textContent).toContain('(25s)');
    expect(statusNode.dataset.status).toBe('error');

    form.querySelector('[name="currentPassword"]').value = 'StrongPass!2026';
    form.querySelector('[name="newPassword"]').value = 'AnotherStrongPass!2028';
    await enhanced.onSubmit({ preventDefault() {} });

    expect(statusNode.textContent).toBe('Password updated successfully.');
    expect(statusNode.dataset.status).toBe('success');
  });

  it('renders fallback error message when request submission throws', async () => {
    const enhanced = enhancePasswordChangeForm({
      documentRef: document,
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline'))
    });

    enhanced.form.querySelector('[name="currentPassword"]').value = 'StrongPass!2026';
    enhanced.form.querySelector('[name="newPassword"]').value = 'NewStrongPass!2027';

    await enhanced.onSubmit({ preventDefault() {} });

    expect(enhanced.statusNode.textContent).toBe('Password change failed. Please try again.');
    expect(enhanced.statusNode.dataset.status).toBe('error');
  });
});
