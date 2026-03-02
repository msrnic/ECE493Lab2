import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import GeneratedScheduleModel from '../../../src/models/GeneratedScheduleModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

function setupModel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-model-'));
  tempDirs.push(dir);
  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));

  let idCounter = 0;
  let tsCounter = 0;

  return new GeneratedScheduleModel(repository, {
    makeId: () => `schedule-${++idCounter}`,
    now: () => `2026-01-01T00:00:${String(tsCounter++).padStart(2, '0')}Z`
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('GeneratedScheduleModel', () => {
  it('creates monotonic versions and activates only latest', () => {
    const model = setupModel();

    const one = model.createFromRun({
      runId: 'run-1',
      createdByUserId: 'admin',
      assignmentCount: 1,
      conflictCount: 0
    });
    const two = model.createFromRun({
      runId: 'run-2',
      createdByUserId: 'admin',
      assignmentCount: 2,
      conflictCount: 1
    });

    expect(one.versionNumber).toBe(1);
    expect(two.versionNumber).toBe(2);

    const all = model.list();
    expect(all[0].isActive).toBe(true);
    expect(all[1].isActive).toBe(false);

    const activeOnly = model.list({ activeOnly: true });
    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0].scheduleId).toBe(two.scheduleId);
  });

  it('updates counts and returns null for missing updates', () => {
    const model = setupModel();
    const created = model.createFromRun({
      runId: 'run-1',
      createdByUserId: 'admin',
      assignmentCount: 1,
      conflictCount: 0
    });

    const updated = model.updateCounts(created.scheduleId, 3, 4);
    expect(updated.assignmentCount).toBe(3);
    expect(updated.conflictCount).toBe(4);

    expect(model.updateCounts('missing', 0, 0)).toBeNull();
    expect(model.getByRunId('run-1')?.scheduleId).toBe(created.scheduleId);
    expect(model.getById('missing')).toBeNull();
    expect(model.getByRunId('missing-run')).toBeNull();
  });

  it('supports default id and time factories', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-model-default-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const model = new GeneratedScheduleModel(repository);

    const created = model.createFromRun({
      runId: 'run-default',
      createdByUserId: 'admin',
      assignmentCount: 0,
      conflictCount: 0
    });

    expect(created.scheduleId).toBeTypeOf('string');
    expect(created.createdAt).toBeTypeOf('string');
  });
});
