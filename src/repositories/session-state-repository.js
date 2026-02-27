import path from 'node:path';
import { createJsonFileStore } from './json-file-store.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSessionStateRepository({
  databaseFilePath = path.join(process.cwd(), 'database', 'session-states.json'),
  nowFn = () => new Date()
} = {}) {
  const store = createJsonFileStore({
    filePath: databaseFilePath,
    initialState: {
      states: {}
    }
  });

  function readState() {
    const state = store.read();
    return {
      states: state.states ?? {}
    };
  }

  function upsert(state) {
    const currentState = readState();
    currentState.states[state.sessionId] = clone(state);
    store.write(currentState);
    return clone(state);
  }

  function findBySessionId(sessionId, now = nowFn()) {
    const currentState = readState();
    const state = currentState.states[sessionId];
    if (!state) {
      return null;
    }

    const expiresAtMs = new Date(state.expiresAt).getTime();
    if (expiresAtMs <= now.getTime()) {
      delete currentState.states[sessionId];
      store.write(currentState);
      return null;
    }

    return clone(state);
  }

  function deleteBySessionId(sessionId) {
    const currentState = readState();
    if (!currentState.states[sessionId]) {
      return false;
    }

    delete currentState.states[sessionId];
    store.write(currentState);
    return true;
  }

  function deleteBySubmissionId(submissionId) {
    const currentState = readState();
    for (const [sessionId, state] of Object.entries(currentState.states)) {
      if (state.submissionId === submissionId) {
        delete currentState.states[sessionId];
        store.write(currentState);
        return true;
      }
    }

    return false;
  }

  function list() {
    const currentState = readState();
    return Object.values(currentState.states).map((state) => clone(state));
  }

  return {
    upsert,
    findBySessionId,
    deleteBySessionId,
    deleteBySubmissionId,
    list
  };
}
