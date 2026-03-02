import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../../../src/app.js';

const EMPTY_STATE = {
  acceptedPapers: [],
  sessionSlots: [],
  generationRuns: [],
  generatedSchedules: [],
  sessionAssignments: [],
  conflictFlags: [],
  scheduleEditConflicts: [],
  scheduleOverrideAudits: []
};

export function createTestServer(seed = {}, options = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc13-'));
  const repositoryFilePath = path.join(tempDir, 'schedules.json');

  writeState(repositoryFilePath, {
    ...EMPTY_STATE,
    ...seed
  });

  let idCounter = 0;
  let timestampCounter = 0;
  const pendingTimers = new Set();

  const scheduleTask = (task, delayMs = 0) => {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      task();
    }, delayMs);
    pendingTimers.add(timer);
    return timer;
  };

  const app = createApp({
    repositoryFilePath,
    makeId: () => `id-${++idCounter}`,
    ...(options.includeNow === false
      ? {}
      : { now: () => `2026-01-01T00:00:${String(timestampCounter++).padStart(2, '0')}.000Z` }),
    ...(options.useNativeScheduleTask ? {} : { scheduleTask })
  });

  return {
    app,
    repositoryFilePath,
    readState: () => readState(repositoryFilePath),
    writeState: (state) => writeState(repositoryFilePath, state),
    cleanup: () => {
      pendingTimers.forEach((timer) => clearTimeout(timer));
      pendingTimers.clear();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

export function readState(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function waitFor(assertion, options = {}) {
  const timeoutMs = options.timeoutMs ?? 1500;
  const intervalMs = options.intervalMs ?? 10;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const result = assertion();
      if (result) {
        return result;
      }
    } catch {
      // Keep retrying until timeout.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  throw new Error('Timed out waiting for expected condition.');
}
