import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import SessionAssignmentModel from '../../../src/models/SessionAssignmentModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

function setupModel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assignment-model-'));
  tempDirs.push(dir);
  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));

  let idCounter = 0;
  let tsCounter = 0;

  return new SessionAssignmentModel(repository, {
    makeId: () => `assignment-${++idCounter}`,
    now: () => `2026-01-01T00:00:${String(tsCounter++).padStart(2, '0')}Z`
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('SessionAssignmentModel', () => {
  it('creates assignments and sorts schedule listing', () => {
    const model = setupModel();

    const created = model.createForSchedule('schedule-1', [
      { paperId: 'paper-2', sessionSlotId: 'slot-b', orderInSlot: 2 },
      { paperId: 'paper-1', sessionSlotId: 'slot-a', orderInSlot: 1 }
    ]);

    expect(created).toHaveLength(2);

    const listed = model.listBySchedule('schedule-1');
    expect(listed.map((item) => item.paperId)).toEqual(['paper-1', 'paper-2']);
  });

  it('rejects duplicate papers in same call and existing schedule', () => {
    const model = setupModel();

    expect(() => model.createForSchedule('schedule-1', [
      { paperId: 'paper-1', sessionSlotId: 'slot-a', orderInSlot: 1 },
      { paperId: 'paper-1', sessionSlotId: 'slot-b', orderInSlot: 1 }
    ])).toThrow('Duplicate paper assignment for paper-1.');

    model.createForSchedule('schedule-1', [
      { paperId: 'paper-1', sessionSlotId: 'slot-a', orderInSlot: 1 }
    ]);

    expect(() => model.createForSchedule('schedule-1', [
      { paperId: 'paper-1', sessionSlotId: 'slot-b', orderInSlot: 1 }
    ])).toThrow('Paper paper-1 already exists in schedule schedule-1.');
  });

  it('sorts assignments within the same slot and supports default factories', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assignment-model-default-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const model = new SessionAssignmentModel(repository);

    model.createForSchedule('schedule-1', [
      { paperId: 'paper-1', sessionSlotId: 'slot-a', orderInSlot: 2 },
      { paperId: 'paper-2', sessionSlotId: 'slot-a', orderInSlot: 1 }
    ]);

    const listed = model.listBySchedule('schedule-1');
    expect(listed[0].paperId).toBe('paper-2');
    expect(listed[0].createdAt).toBeTypeOf('string');
  });
});
