import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createJsonFileStore } from './json-file-store.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createFileRepository({
  databaseFilePath = path.join(process.cwd(), 'database', 'files.json'),
  idFactory = () => randomUUID()
} = {}) {
  const store = createJsonFileStore({
    filePath: databaseFilePath,
    initialState: {
      files: {},
      fileIdsBySubmission: {}
    }
  });

  function readState() {
    const state = store.read();
    return {
      files: state.files ?? {},
      fileIdsBySubmission: state.fileIdsBySubmission ?? {}
    };
  }

  function create(fileRecord) {
    const state = readState();
    const normalized = {
      ...fileRecord,
      fileId: fileRecord.fileId ?? idFactory()
    };

    state.files[normalized.fileId] = clone(normalized);

    const ids = state.fileIdsBySubmission[normalized.submissionId] ?? [];
    ids.push(normalized.fileId);
    state.fileIdsBySubmission[normalized.submissionId] = ids;

    store.write(state);
    return clone(normalized);
  }

  function findById(fileId) {
    const state = readState();
    const file = state.files[fileId];
    return file ? clone(file) : null;
  }

  function listBySubmissionId(submissionId) {
    const state = readState();
    const ids = state.fileIdsBySubmission[submissionId] ?? [];
    return ids
      .map((fileId) => state.files[fileId])
      .filter(Boolean)
      .map((record) => clone(record));
  }

  function update(fileId, patch) {
    const state = readState();
    const current = state.files[fileId];
    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...patch,
      fileId
    };

    state.files[fileId] = clone(next);
    store.write(state);
    return clone(next);
  }

  return {
    create,
    findById,
    listBySubmissionId,
    update
  };
}
