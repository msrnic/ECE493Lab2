import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileRepository } from '../../../src/repositories/file-repository.js';
import { createTempPersistencePaths } from '../../helpers/persistence-paths.js';

describe('file-repository', () => {
  it('creates files, indexes by submission, and updates existing records', () => {
    const paths = createTempPersistencePaths('file-repo-');
    const repository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath,
      idFactory: () => 'file-1'
    });

    const created = repository.create({
      submissionId: 'sub-1',
      category: 'manuscript',
      scanStatus: 'passed'
    });

    expect(created).toEqual({
      fileId: 'file-1',
      submissionId: 'sub-1',
      category: 'manuscript',
      scanStatus: 'passed'
    });

    const createdWithProvidedId = repository.create({
      fileId: 'file-2',
      submissionId: 'sub-1',
      category: 'supplementary',
      scanStatus: 'passed'
    });

    expect(repository.findById('file-1')).toEqual(created);
    expect(createdWithProvidedId.fileId).toBe('file-2');
    expect(repository.listBySubmissionId('sub-1')).toEqual([created, createdWithProvidedId]);
    expect(repository.listBySubmissionId('missing')).toEqual([]);

    const updated = repository.update('file-1', {
      scanStatus: 'failed'
    });
    expect(updated.scanStatus).toBe('failed');

    expect(repository.update('missing', { scanStatus: 'passed' })).toBeNull();
    expect(repository.findById('missing')).toBeNull();

    const reloadedRepository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath
    });
    expect(reloadedRepository.findById('file-1')).toEqual(updated);
    expect(reloadedRepository.findById('file-2')).toEqual(createdWithProvidedId);
  });

  it('falls back to empty persisted collections when expected fields are missing', () => {
    const paths = createTempPersistencePaths('file-repo-fallback-');
    mkdirSync(path.dirname(paths.fileDataFilePath), { recursive: true });
    writeFileSync(paths.fileDataFilePath, JSON.stringify({}));

    const repository = createFileRepository({
      databaseFilePath: paths.fileDataFilePath,
      idFactory: () => 'file-fallback'
    });

    expect(repository.listBySubmissionId('sub-fallback')).toEqual([]);
    expect(
      repository.create({
        submissionId: 'sub-fallback',
        category: 'manuscript'
      })
    ).toEqual(
      expect.objectContaining({
        fileId: 'file-fallback'
      })
    );
  });
});
