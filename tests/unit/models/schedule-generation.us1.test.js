import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import GeneratedScheduleModel from '../../../src/models/GeneratedScheduleModel.js';
import GenerationRunModel from '../../../src/models/GenerationRunModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';
import SessionAssignmentModel from '../../../src/models/SessionAssignmentModel.js';

const tempDirs = [];

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'us1-model-'));
  tempDirs.push(dir);
  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));

  return {
    runs: new GenerationRunModel(repository, { makeId: () => 'run-1', now: () => '2026-01-01T00:00:00.000Z' }),
    schedules: new GeneratedScheduleModel(repository, { makeId: () => 'schedule-1', now: () => '2026-01-01T00:00:01.000Z' }),
    assignments: new SessionAssignmentModel(repository, { makeId: () => 'assignment-1', now: () => '2026-01-01T00:00:02.000Z' })
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('US1 schedule generation model behavior', () => {
  it('enforces single in-progress run and active schedule switching', () => {
    const ctx = setup();

    const run = ctx.runs.createRequested({ initiatedByUserId: 'admin', initiatedByRole: 'admin' });
    ctx.runs.startRun(run.runId);
    expect(ctx.runs.hasInProgress()).toBe(true);

    const schedule = ctx.schedules.createFromRun({
      runId: run.runId,
      createdByUserId: 'admin',
      assignmentCount: 1,
      conflictCount: 0
    });

    ctx.assignments.createForSchedule(schedule.scheduleId, [
      { paperId: 'paper-1', sessionSlotId: 'slot-1', orderInSlot: 1 }
    ]);

    ctx.runs.completeRun(run.runId, schedule.scheduleId);
    expect(ctx.runs.hasInProgress()).toBe(false);
    expect(ctx.schedules.list({ activeOnly: true })).toHaveLength(1);
  });
});
