import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePersistencePaths } from '../../../src/config/persistence-paths.js';

describe('persistence-paths', () => {
  it('resolves production defaults from cwd', () => {
    const paths = resolvePersistencePaths({
      nodeEnv: 'production'
    });

    expect(paths.rootDirectory).toBe(process.cwd());
    expect(paths.databaseDirectory).toBe(path.join(process.cwd(), 'database'));
    expect(paths.uploadsDirectory).toBe(path.join(process.cwd(), 'uploads'));
    expect(paths.submissionDataFilePath).toBe(path.join(process.cwd(), 'database', 'submissions.json'));
  });

  it('resolves isolated test defaults', () => {
    const paths = resolvePersistencePaths({
      nodeEnv: 'test'
    });

    expect(paths.rootDirectory).toContain(path.join(path.sep, 'tmp', 'ece493-persist-'));
    expect(paths.databaseDirectory).toBe(path.join(paths.rootDirectory, 'database'));
    expect(paths.uploadsDirectory).toBe(path.join(paths.rootDirectory, 'uploads'));
  });

  it('resolves explicit root, database, and uploads directories', () => {
    const fromRoot = resolvePersistencePaths({
      nodeEnv: 'production',
      rootDirectory: '  /tmp/custom-root  '
    });
    expect(fromRoot.rootDirectory).toBe('/tmp/custom-root');
    expect(fromRoot.databaseDirectory).toBe('/tmp/custom-root/database');
    expect(fromRoot.uploadsDirectory).toBe('/tmp/custom-root/uploads');

    const fromDatabase = resolvePersistencePaths({
      nodeEnv: 'production',
      rootDirectory: '',
      databaseDirectory: '/tmp/custom-database',
      uploadsDirectory: '   '
    });
    expect(fromDatabase.rootDirectory).toBe('/tmp');
    expect(fromDatabase.databaseDirectory).toBe('/tmp/custom-database');
    expect(fromDatabase.uploadsDirectory).toBe('/tmp/uploads');

    const fromUploads = resolvePersistencePaths({
      nodeEnv: 'production',
      rootDirectory: null,
      databaseDirectory: 101,
      uploadsDirectory: '/tmp/custom-uploads'
    });
    expect(fromUploads.rootDirectory).toBe('/tmp');
    expect(fromUploads.databaseDirectory).toBe('/tmp/database');
    expect(fromUploads.uploadsDirectory).toBe('/tmp/custom-uploads');
  });
});
