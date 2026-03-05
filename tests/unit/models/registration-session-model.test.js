import { describe, expect, it } from 'vitest';
import { createRegistrationCheckoutSession } from '../../../src/models/registration-session-model.js';

describe('registration-session-model', () => {
  it('creates a session and marks it complete', () => {
    const session = createRegistrationCheckoutSession({
      sessionId: '11111111-1111-4111-8111-111111111111',
      attendeeId: '22222222-2222-4222-8222-222222222222'
    });

    expect(session.value.registrationStatus).toBe('incomplete');
    const completed = session.markComplete('2026-02-01T00:00:00.000Z');
    expect(completed.registrationStatus).toBe('complete');
    expect(completed.completedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('ignores duplicate complete transitions and validates status values', () => {
    const session = createRegistrationCheckoutSession({
      sessionId: '33333333-3333-4333-8333-333333333333',
      attendeeId: '44444444-4444-4444-8444-444444444444',
      registrationStatus: 'complete',
      completedAt: '2026-02-01T00:00:00.000Z'
    });

    const first = session.markComplete('2026-03-01T00:00:00.000Z');
    expect(first.completedAt).toBe('2026-02-01T00:00:00.000Z');

    expect(() => {
      createRegistrationCheckoutSession({
        sessionId: '33333333-3333-4333-8333-333333333333',
        attendeeId: '44444444-4444-4444-8444-444444444444',
        registrationStatus: 'invalid'
      });
    }).toThrow('registrationStatus must be incomplete or complete.');
  });
});

