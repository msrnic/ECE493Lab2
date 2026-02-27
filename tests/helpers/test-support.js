import { createApp } from '../../src/app.js';

export function createClock(start = '2026-01-01T00:00:00.000Z') {
  let nowMs = new Date(start).getTime();

  return {
    now() {
      return new Date(nowMs);
    },
    advanceMs(ms) {
      nowMs += ms;
    },
    set(isoTime) {
      nowMs = new Date(isoTime).getTime();
    }
  };
}

export function extractTokenFromConfirmationUrl(confirmationUrl) {
  const url = new URL(confirmationUrl, 'http://localhost');
  return url.searchParams.get('token');
}

export function createTestContext({
  start = '2026-01-01T00:00:00.000Z',
  sendEmailImpl,
  tokenTtlMs,
  hashPasswordFn
} = {}) {
  const clock = createClock(start);
  const sentEmails = [];

  const sendEmail = async (payload) => {
    sentEmails.push(payload);
    if (typeof sendEmailImpl === 'function') {
      return sendEmailImpl(payload);
    }

    return { accepted: true };
  };

  const app = createApp({
    sendEmail,
    nowFn: clock.now,
    tokenTtlMs,
    hashPasswordFn
  });

  return {
    app,
    repository: app.locals.repository,
    clock,
    sentEmails
  };
}

export function validRegistrationPayload(overrides = {}) {
  return {
    fullName: 'Test User',
    email: 'test.user@example.com',
    password: 'StrongPass!2026',
    confirmPassword: 'StrongPass!2026',
    ...overrides
  };
}
