import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

function makeTempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-test-'));
  tempDirs.push(dir);
  return path.join(dir, 'data.json');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ScheduleRepository', () => {
  it('creates the default file on first read and merges defaults', () => {
    const filePath = makeTempFile();
    const repository = new ScheduleRepository(filePath);

    const data = repository.read();

    expect(fs.existsSync(filePath)).toBe(true);
    expect(data.acceptedPapers).toEqual([]);
    expect(data.conflictFlags).toEqual([]);
  });

  it('writes and mutates state', () => {
    const filePath = makeTempFile();
    const repository = new ScheduleRepository(filePath);

    repository.write({
      acceptedPapers: [{ paperId: 'p1' }],
      sessionSlots: [],
      generationRuns: [],
      generatedSchedules: [],
      sessionAssignments: [],
      conflictFlags: []
    });

    repository.mutate((state) => {
      state.generatedSchedules.push({ scheduleId: 's1' });
      return state;
    });

    const data = repository.read();
    expect(data.acceptedPapers).toHaveLength(1);
    expect(data.generatedSchedules).toHaveLength(1);
  });
});
