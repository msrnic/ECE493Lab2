import { describe, expect, it } from 'vitest';
import {
  createSessionState,
  isRetryAllowed,
  mergeSessionState,
  shouldPreserveRetryData
} from '../../../src/models/session-state-model.js';

describe('session-state-model', () => {
  it('creates and merges session state snapshots', () => {
    const now = new Date('2026-02-01T00:00:00.000Z');
    const state = createSessionState({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      metadata: {
        title: 'Paper'
      },
      preservedFileIds: ['f1'],
      now,
      ttlMs: 1_000
    });

    expect(state).toEqual({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Paper'
      },
      preservedFileIds: ['f1'],
      expiresAt: '2026-02-01T00:00:01.000Z'
    });

    const merged = mergeSessionState(state, {
      metadata: {
        title: 'Updated'
      },
      now,
      ttlMs: 5_000
    });
    expect(merged).toEqual({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Updated'
      },
      preservedFileIds: ['f1'],
      expiresAt: '2026-02-01T00:00:05.000Z'
    });

    const mergedWithDefaults = mergeSessionState(state, {
      now,
      ttlMs: 2_000
    });
    expect(mergedWithDefaults).toEqual({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Paper'
      },
      preservedFileIds: ['f1'],
      expiresAt: '2026-02-01T00:00:02.000Z'
    });

    expect(mergeSessionState(null, {})).toBeNull();
  });

  it('derives retry-allowed and preservation decisions', () => {
    expect(
      isRetryAllowed({
        submissionStatus: 'draft',
        sessionState: {
          sessionId: 'session-1'
        }
      })
    ).toBe(true);

    expect(
      isRetryAllowed({
        submissionStatus: 'submitted',
        sessionState: {
          sessionId: 'session-1'
        }
      })
    ).toBe(false);

    expect(
      isRetryAllowed({
        submissionStatus: 'draft',
        sessionState: null
      })
    ).toBe(false);

    expect(shouldPreserveRetryData('submitted')).toBe(false);
    expect(shouldPreserveRetryData('validation_failed')).toBe(true);
  });
});
