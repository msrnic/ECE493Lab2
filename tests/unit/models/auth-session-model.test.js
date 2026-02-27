import { describe, expect, it } from 'vitest';
import {
  createAuthenticatedSessionState,
  createUnauthenticatedSessionState,
  deriveSessionState,
  isAuthenticatedSession
} from '../../../src/models/auth-session-model.js';

describe('auth-session-model', () => {
  it('creates base session states', () => {
    expect(createUnauthenticatedSessionState()).toEqual({ authenticated: false });

    expect(
      createAuthenticatedSessionState({
        id: 'usr-1',
        email: 'user@example.com'
      })
    ).toEqual({
      authenticated: true,
      user: {
        id: 'usr-1',
        email: 'user@example.com'
      },
      dashboardUrl: '/dashboard'
    });
  });

  it('derives unauthenticated session states for invalid payloads', () => {
    expect(deriveSessionState(null)).toEqual({ authenticated: false });
    expect(deriveSessionState({ authenticated: false })).toEqual({ authenticated: false });
    expect(deriveSessionState({ authenticated: true })).toEqual({ authenticated: false });
    expect(deriveSessionState({ authenticated: true, user: { id: '', email: 'user@example.com' } })).toEqual({
      authenticated: false
    });
    expect(deriveSessionState({ authenticated: true, user: { id: 'usr-1', email: '' } })).toEqual({
      authenticated: false
    });
  });

  it('derives authenticated session state and keeps custom dashboard url', () => {
    expect(
      deriveSessionState({
        authenticated: true,
        user: { id: 'usr-1', email: 'user@example.com' }
      })
    ).toEqual({
      authenticated: true,
      user: {
        id: 'usr-1',
        email: 'user@example.com'
      },
      dashboardUrl: '/dashboard'
    });

    expect(
      deriveSessionState({
        authenticated: true,
        user: { id: 'usr-1', email: 'user@example.com' },
        dashboardUrl: '/custom-dashboard'
      })
    ).toEqual({
      authenticated: true,
      user: {
        id: 'usr-1',
        email: 'user@example.com'
      },
      dashboardUrl: '/custom-dashboard'
    });
  });

  it('checks authentication status from state objects', () => {
    expect(isAuthenticatedSession(null)).toBe(false);
    expect(isAuthenticatedSession({ authenticated: false })).toBe(false);
    expect(isAuthenticatedSession({ authenticated: true })).toBe(false);
    expect(isAuthenticatedSession({ authenticated: true, user: { id: '', email: 'user@example.com' } })).toBe(
      false
    );
    expect(isAuthenticatedSession({ authenticated: true, user: { id: 'usr-1', email: '' } })).toBe(false);
    expect(
      isAuthenticatedSession({
        authenticated: true,
        user: {
          id: 'usr-1',
          email: 'user@example.com'
        }
      })
    ).toBe(true);
  });
});
