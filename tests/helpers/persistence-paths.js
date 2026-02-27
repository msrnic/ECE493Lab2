import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function createTempPersistencePaths(prefix = 'ece493-test-') {
  const rootDirectory = mkdtempSync(path.join(tmpdir(), prefix));
  const databaseDirectory = path.join(rootDirectory, 'database');
  const uploadsDirectory = path.join(rootDirectory, 'uploads');

  return {
    rootDirectory,
    databaseDirectory,
    uploadsDirectory,
    submissionDataFilePath: path.join(databaseDirectory, 'submissions.json'),
    fileDataFilePath: path.join(databaseDirectory, 'files.json'),
    sessionStateDataFilePath: path.join(databaseDirectory, 'session-states.json'),
    deduplicationDataFilePath: path.join(databaseDirectory, 'deduplication.json'),
    storageDataFilePath: path.join(databaseDirectory, 'stored-files.json')
  };
}
