import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSubmissionRepository } from '../../../src/repositories/submission-repository.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('submission-repository', () => {
  it('creates, updates, replaces, and lists submissions', () => {
    const paths = createTempPersistencePaths('submission-repo-');
    const now = new Date('2026-02-01T00:00:00.000Z');
    const repository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath,
      idFactory: () => 'sub-1',
      nowFn: () => now
    });

    const created = repository.create({
      actionSequenceId: 'action-1',
      status: 'draft'
    });
    expect(created.submissionId).toBe('sub-1');
    expect(created.createdAt).toBe(now.toISOString());

    const updated = repository.update('sub-1', {
      status: 'validation_failed'
    });
    expect(updated.status).toBe('validation_failed');

    const replaced = repository.replace({
      ...updated,
      status: 'submitted'
    });
    expect(replaced.status).toBe('submitted');

    expect(repository.findById('sub-1')).toEqual(replaced);
    expect(repository.findByActionSequenceId?.('action-1')).toBeUndefined();
    expect(repository.findSubmittedByActionSequence('action-1')).toEqual(replaced);
    expect(repository.list()).toEqual([replaced]);

    expect(repository.update('missing', { status: 'draft' })).toBeNull();
    expect(repository.replace({ submissionId: 'missing' })).toBeNull();
    expect(repository.findById('missing')).toBeNull();
    expect(repository.findSubmittedByActionSequence('missing')).toBeNull();
  });

  it('throws when persistence failure is injected and resets after one attempt', () => {
    const paths = createTempPersistencePaths('submission-repo-failure-');
    const repository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath,
      idFactory: () => 'sub-2',
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    repository.setFailNextPersist();

    expect(() =>
      repository.create({
        actionSequenceId: 'action-2',
        status: 'draft'
      })
    ).toThrow('SUBMISSION_PERSISTENCE_FAILED');

    const created = repository.create({
      actionSequenceId: 'action-2',
      status: 'draft'
    });
    expect(created.submissionId).toBe('sub-2');

    repository.setFailNextPersist(false);
    expect(() =>
      repository.update('sub-2', {
        status: 'validation_failed'
      })
    ).not.toThrow();

    const defaultRepository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath
    });
    const createdWithDefaultId = defaultRepository.create({
      actionSequenceId: 'action-default',
      status: 'draft'
    });
    expect(typeof createdWithDefaultId.submissionId).toBe('string');
    expect(createdWithDefaultId.submissionId.length).toBeGreaterThan(0);

    const reloadedRepository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath
    });
    expect(reloadedRepository.findById('sub-2')).toEqual(
      expect.objectContaining({
        submissionId: 'sub-2'
      })
    );
  });

  it('falls back to empty persisted state and removes submitted index when status changes', () => {
    const paths = createTempPersistencePaths('submission-repo-fallback-');
    mkdirSync(path.dirname(paths.submissionDataFilePath), { recursive: true });
    writeFileSync(paths.submissionDataFilePath, JSON.stringify({}));

    const repository = createSubmissionRepository({
      databaseFilePath: paths.submissionDataFilePath,
      idFactory: () => 'sub-9',
      nowFn: () => new Date('2026-02-01T00:00:00.000Z')
    });

    const submitted = repository.create({
      actionSequenceId: 'action-9',
      status: 'submitted'
    });
    expect(repository.findSubmittedByActionSequence('action-9')).toEqual(submitted);

    const downgraded = repository.replace({
      ...submitted,
      status: 'draft'
    });
    expect(downgraded.status).toBe('draft');
    expect(repository.findSubmittedByActionSequence('action-9')).toBeNull();
    expect(repository.replace({ status: 'draft' })).toBeNull();
  });
});
