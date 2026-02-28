import { describe, expect, it } from 'vitest';
import { createPaperAccessAttemptStore } from '../../../src/models/paper-access-attempt.model.js';

describe('paper-access-attempt.model', () => {
  it('records attempts and lists by paper with filters', () => {
    const store = createPaperAccessAttemptStore({
      idFactory: () => 'attempt-id',
      nowFn: () => new Date('2026-02-08T00:00:00.000Z')
    });

    const granted = store.recordAttempt({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      outcome: 'granted',
      reasonCode: 'ACCESS_GRANTED',
      requestId: 'request-1',
      viewerRoleSnapshot: ['reviewer']
    });

    expect(granted.outcome).toBe('granted');

    store.recordAttempt({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      outcome: 'throttled',
      reasonCode: 'TEMP_OUTAGE_THROTTLED',
      requestId: 'request-2',
      viewerRoleSnapshot: ['reviewer'],
      retryAfterSeconds: 3,
      occurredAt: '2026-02-08T00:00:10.000Z'
    });

    const throttledOnly = store.listAttemptsForPaper('paper-1', { outcome: 'throttled', limit: 10 });
    expect(throttledOnly).toHaveLength(1);
    expect(throttledOnly[0].reasonCode).toBe('TEMP_OUTAGE_THROTTLED');

    const capped = store.listAttemptsForPaper('paper-1', { limit: 1 });
    expect(capped).toHaveLength(1);
    expect(store.listAllAttempts()).toHaveLength(2);
  });

  it('enforces reason/outcome compatibility and retry requirements', () => {
    const store = createPaperAccessAttemptStore();

    expect(() => store.recordAttempt({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      outcome: 'throttled',
      reasonCode: 'TEMP_OUTAGE_THROTTLED',
      requestId: 'request-3',
      viewerRoleSnapshot: ['reviewer']
    })).toThrow(/retryAfterSeconds/);

    expect(() => store.recordAttempt({
      reviewerId: 'reviewer-1',
      paperId: 'paper-1',
      outcome: 'granted',
      reasonCode: 'ACCESS_REVOKED',
      requestId: 'request-4',
      viewerRoleSnapshot: ['reviewer']
    })).toThrow(/reasonCode must match outcome/);

    expect(() => store.listAttemptsForPaper('paper-1', { limit: 0 })).toThrow(/positive integer/);
  });

  it('executes default idFactory/nowFn paths', () => {
    const defaultStore = createPaperAccessAttemptStore();
    const recorded = defaultStore.recordAttempt({
      reviewerId: 'reviewer-default',
      paperId: 'paper-default',
      outcome: 'granted',
      reasonCode: 'ACCESS_GRANTED',
      requestId: 'request-default',
      viewerRoleSnapshot: ['reviewer']
    });

    expect(typeof recorded.attemptId).toBe('string');
    expect(recorded.occurredAt).toMatch(/T/);
  });
});
