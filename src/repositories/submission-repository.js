import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createJsonFileStore } from './json-file-store.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSubmissionRepository({
  databaseFilePath = path.join(process.cwd(), 'database', 'submissions.json'),
  idFactory = () => randomUUID(),
  nowFn = () => new Date()
} = {}) {
  const store = createJsonFileStore({
    filePath: databaseFilePath,
    initialState: {
      submissions: {},
      submittedByActionSequence: {}
    }
  });
  let failNextPersist = false;

  function readState() {
    const state = store.read();
    return {
      submissions: state.submissions ?? {},
      submittedByActionSequence: state.submittedByActionSequence ?? {}
    };
  }

  function persist(record) {
    if (failNextPersist) {
      failNextPersist = false;
      throw new Error('SUBMISSION_PERSISTENCE_FAILED');
    }

    const state = readState();
    const nowIso = nowFn().toISOString();
    const normalized = {
      ...record,
      createdAt: record.createdAt ?? nowIso,
      updatedAt: nowIso
    };

    state.submissions[normalized.submissionId] = clone(normalized);

    if (normalized.actionSequenceId && normalized.status === 'submitted') {
      state.submittedByActionSequence[normalized.actionSequenceId] = normalized.submissionId;
    } else if (
      normalized.actionSequenceId
      && state.submittedByActionSequence[normalized.actionSequenceId] === normalized.submissionId
    ) {
      delete state.submittedByActionSequence[normalized.actionSequenceId];
    }

    store.write(state);
    return clone(normalized);
  }

  function create(record) {
    return persist({
      ...record,
      submissionId: record.submissionId ?? idFactory()
    });
  }

  function replace(record) {
    if (!record?.submissionId) {
      return null;
    }

    const state = readState();
    if (!state.submissions[record.submissionId]) {
      return null;
    }

    return persist(record);
  }

  function update(submissionId, patch) {
    const state = readState();
    const current = state.submissions[submissionId];
    if (!current) {
      return null;
    }

    return persist({
      ...current,
      ...patch,
      submissionId
    });
  }

  function findById(submissionId) {
    const state = readState();
    const current = state.submissions[submissionId];
    return current ? clone(current) : null;
  }

  function findSubmittedByActionSequence(actionSequenceId) {
    const state = readState();
    const submissionId = state.submittedByActionSequence[actionSequenceId];
    if (!submissionId) {
      return null;
    }

    return findById(submissionId);
  }

  function list() {
    const state = readState();
    return Object.values(state.submissions).map((item) => clone(item));
  }

  function setFailNextPersist(value = true) {
    failNextPersist = Boolean(value);
  }

  return {
    create,
    replace,
    update,
    findById,
    findSubmittedByActionSequence,
    list,
    setFailNextPersist
  };
}
