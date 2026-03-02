import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import ConflictFlagModel from '../../../src/models/ConflictFlagModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('US2 conflict dedup behavior', () => {
  it('prevents duplicate conflict flags for the same run/dedup key', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'us2-model-'));
    tempDirs.push(dir);

    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const model = new ConflictFlagModel(repository, { makeId: () => 'conflict-1', now: () => '2026-01-01T00:00:00.000Z' });

    const created = model.createForSchedule('run-1', 'schedule-1', [
      {
        violationType: 'assignment_conflict',
        ruleId: 'SLOT_CAPACITY',
        paperId: 'paper-1',
        sessionSlotId: 'slot-1',
        severity: 'critical',
        details: 'conflict-1'
      },
      {
        violationType: 'assignment_conflict',
        ruleId: 'SLOT_CAPACITY',
        paperId: 'paper-1',
        sessionSlotId: 'slot-1',
        severity: 'critical',
        details: 'duplicate'
      }
    ]);

    expect(created).toHaveLength(1);
  });
});
