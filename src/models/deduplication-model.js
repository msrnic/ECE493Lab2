import path from 'node:path';
import { createJsonFileStore } from '../repositories/json-file-store.js';

export function createDeduplicationModel({
  databaseFilePath = path.join(process.cwd(), 'database', 'deduplication.json')
} = {}) {
  const store = createJsonFileStore({
    filePath: databaseFilePath,
    initialState: {
      finalizedByActionSequence: {},
      finalizedByIdempotencyKey: {}
    }
  });

  function readState() {
    const state = store.read();
    return {
      finalizedByActionSequence: state.finalizedByActionSequence ?? {},
      finalizedByIdempotencyKey: state.finalizedByIdempotencyKey ?? {}
    };
  }

  function checkDuplicate({ actionSequenceId, idempotencyKey }) {
    const state = readState();
    if (state.finalizedByActionSequence[actionSequenceId]) {
      return {
        duplicate: true,
        reason: 'ACTION_SEQUENCE_FINALIZED',
        submissionId: state.finalizedByActionSequence[actionSequenceId]
      };
    }

    if (idempotencyKey && state.finalizedByIdempotencyKey[idempotencyKey]) {
      return {
        duplicate: true,
        reason: 'IDEMPOTENCY_REPLAY',
        submissionId: state.finalizedByIdempotencyKey[idempotencyKey]
      };
    }

    return {
      duplicate: false
    };
  }

  function markFinalized({ actionSequenceId, idempotencyKey, submissionId }) {
    const state = readState();
    state.finalizedByActionSequence[actionSequenceId] = submissionId;

    if (idempotencyKey) {
      state.finalizedByIdempotencyKey[idempotencyKey] = submissionId;
    }

    store.write(state);
  }

  return {
    checkDuplicate,
    markFinalized
  };
}
