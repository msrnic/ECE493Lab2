import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSessionStateRepository } from '../../../src/repositories/session-state-repository.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('session-state-repository', () => {
  it('upserts, expires, and deletes session state records', () => {
    const paths = createTempPersistencePaths('session-state-repo-');
    const now = new Date('2026-02-01T00:00:00.000Z');
    const repository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath,
      nowFn: () => now
    });

    repository.upsert({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Paper'
      },
      preservedFileIds: ['f1'],
      expiresAt: '2026-02-01T00:01:00.000Z'
    });

    expect(repository.findBySessionId('session-1')).toEqual({
      sessionId: 'session-1',
      submissionId: 'sub-1',
      preservedMetadata: {
        title: 'Paper'
      },
      preservedFileIds: ['f1'],
      expiresAt: '2026-02-01T00:01:00.000Z'
    });

    repository.upsert({
      sessionId: 'session-expired',
      submissionId: 'sub-expired',
      preservedMetadata: {},
      preservedFileIds: [],
      expiresAt: '2026-01-31T23:59:59.000Z'
    });

    expect(repository.findBySessionId('session-expired')).toBeNull();
    expect(repository.findBySessionId('missing')).toBeNull();

    expect(repository.deleteBySubmissionId('sub-1')).toBe(true);
    expect(repository.deleteBySubmissionId('sub-1')).toBe(false);

    repository.upsert({
      sessionId: 'session-2',
      submissionId: 'sub-2',
      preservedMetadata: {},
      preservedFileIds: [],
      expiresAt: '2026-02-01T00:01:00.000Z'
    });

    expect(repository.deleteBySessionId('session-2')).toBe(true);
    expect(repository.deleteBySessionId('session-2')).toBe(false);
    expect(repository.list()).toEqual([]);

    const defaultNowRepository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });
    defaultNowRepository.upsert({
      sessionId: 'session-default',
      submissionId: 'sub-default',
      preservedMetadata: {},
      preservedFileIds: [],
      expiresAt: '2099-01-01T00:00:00.000Z'
    });
    expect(defaultNowRepository.findBySessionId('session-default')).toEqual(
      expect.objectContaining({
        submissionId: 'sub-default'
      })
    );

    const reloadedRepository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });
    expect(reloadedRepository.findBySessionId('session-default')).toEqual(
      expect.objectContaining({
        submissionId: 'sub-default'
      })
    );
  });

  it('falls back to empty state when persisted shape is missing states', () => {
    const paths = createTempPersistencePaths('session-state-fallback-');
    mkdirSync(path.dirname(paths.sessionStateDataFilePath), { recursive: true });
    writeFileSync(paths.sessionStateDataFilePath, JSON.stringify({}));

    const repository = createSessionStateRepository({
      databaseFilePath: paths.sessionStateDataFilePath
    });

    expect(repository.list()).toEqual([]);
    expect(repository.findBySessionId('missing')).toBeNull();
  });
});
