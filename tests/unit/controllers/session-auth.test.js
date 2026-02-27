import { describe, expect, it, vi } from 'vitest';
import { createSessionAuthMiddleware } from '../../../src/middleware/session-auth.js';
import { createMockResponse } from '../../helpers/http-harness.js';

describe('session-auth middleware', () => {
  it('uses explicit submission headers when present', () => {
    const middleware = createSessionAuthMiddleware();
    const req = {
      headers: {
        'x-session-id': 'session-1',
        'x-author-id': 'author-1'
      }
    };
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.submissionSession).toEqual({
      sessionId: 'session-1',
      authorId: 'author-1'
    });
  });

  it('falls back to authenticated auth-controller session', () => {
    const middleware = createSessionAuthMiddleware({
      authController: {
        getAuthenticatedSession: () => ({
          sessionId: 'cookie-session',
          user: {
            id: 'author-cookie'
          }
        })
      }
    });

    const req = {
      headers: {}
    };
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.submissionSession).toEqual({
      sessionId: 'cookie-session',
      authorId: 'author-cookie'
    });
  });

  it('returns 401 when no valid session context exists', () => {
    const middleware = createSessionAuthMiddleware({
      authController: {
        getAuthenticatedSession: () => null
      }
    });

    const req = {
      headers: {
        'x-session-id': '   '
      }
    };
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      code: 'SESSION_INVALID',
      message: 'Session is invalid or expired; author must re-authenticate.'
    });
  });
});
