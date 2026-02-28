import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function normalizeDirectory(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return path.resolve(trimmed);
}

function buildDefaultRoot(nodeEnv) {
  if (nodeEnv === 'test') {
    return mkdtempSync(path.join(tmpdir(), 'ece493-persist-'));
  }

  return process.cwd();
}

export function resolvePersistencePaths({
  nodeEnv = process.env.NODE_ENV,
  rootDirectory,
  databaseDirectory,
  uploadsDirectory
} = {}) {
  const normalizedRoot = normalizeDirectory(rootDirectory);
  const normalizedDatabaseDirectory = normalizeDirectory(databaseDirectory);
  const normalizedUploadsDirectory = normalizeDirectory(uploadsDirectory);
  const derivedRoot = normalizedDatabaseDirectory
    ? path.dirname(normalizedDatabaseDirectory)
    : normalizedUploadsDirectory
      ? path.dirname(normalizedUploadsDirectory)
      : buildDefaultRoot(nodeEnv);
  const baseRoot = normalizedRoot ?? derivedRoot;

  const resolvedDatabaseDirectory = normalizedDatabaseDirectory ?? path.join(baseRoot, 'database');
  const resolvedUploadsDirectory = normalizedUploadsDirectory ?? path.join(baseRoot, 'uploads');

  return {
    rootDirectory: baseRoot,
    databaseDirectory: resolvedDatabaseDirectory,
    uploadsDirectory: resolvedUploadsDirectory,
    authDataFilePath: path.join(resolvedDatabaseDirectory, 'auth.json'),
    submissionDataFilePath: path.join(resolvedDatabaseDirectory, 'submissions.json'),
    fileDataFilePath: path.join(resolvedDatabaseDirectory, 'files.json'),
    sessionStateDataFilePath: path.join(resolvedDatabaseDirectory, 'session-states.json'),
    deduplicationDataFilePath: path.join(resolvedDatabaseDirectory, 'deduplication.json'),
    storageDataFilePath: path.join(resolvedDatabaseDirectory, 'stored-files.json')
  };
}
