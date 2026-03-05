import { describe, expect, it } from 'vitest';
import { createReconciliationEvent } from '../../../src/models/reconciliation-event-model.js';

describe('reconciliation-event-model', () => {
  it('creates a valid reconciliation event', () => {
    const event = createReconciliationEvent({
      eventId: 'evt-1',
      attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      source: 'poll',
      resolvedOutcome: 'approved',
      receivedAt: '2026-02-01T00:00:00.000Z'
    });

    expect(event).toEqual({
      eventId: 'evt-1',
      attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      source: 'poll',
      resolvedOutcome: 'approved',
      receivedAt: '2026-02-01T00:00:00.000Z'
    });
  });

  it('validates required fields', () => {
    expect(() => createReconciliationEvent({ attemptId: 'a', resolvedOutcome: 'approved' })).toThrow('eventId is required.');
    expect(() => createReconciliationEvent({ eventId: 'evt', resolvedOutcome: 'approved' })).toThrow('attemptId is required.');
    expect(() => createReconciliationEvent({ eventId: 'evt', attemptId: 'a', resolvedOutcome: 'pending' }))
      .toThrow('resolvedOutcome must be approved or declined.');
    expect(() => createReconciliationEvent({ eventId: 'evt', attemptId: 'a', source: 'bad', resolvedOutcome: 'approved' }))
      .toThrow('source must be webhook or poll.');
  });
});

