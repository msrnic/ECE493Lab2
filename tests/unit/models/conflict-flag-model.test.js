import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import ConflictFlagModel, { buildDedupKey } from '../../../src/models/ConflictFlagModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

function setupModel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflict-model-'));
  tempDirs.push(dir);
  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));

  let idCounter = 0;
  let tsCounter = 0;

  return new ConflictFlagModel(repository, {
    makeId: () => `conflict-${++idCounter}`,
    now: () => `2026-01-01T00:00:${String(tsCounter++).padStart(2, '0')}Z`
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ConflictFlagModel', () => {
  it('builds dedup keys with optional session slot', () => {
    expect(buildDedupKey({
      violationType: 'assignment_conflict',
      paperId: 'paper-1',
      sessionSlotId: 'slot-1',
      ruleId: 'R1'
    })).toBe('assignment_conflict:paper-1:slot-1:R1');

    expect(buildDedupKey({
      violationType: 'metadata_violation',
      paperId: 'paper-1',
      ruleId: 'R2'
    })).toBe('metadata_violation:paper-1:none:R2');
  });

  it('deduplicates by run and key', () => {
    const model = setupModel();

    const created = model.createForSchedule('run-1', 'schedule-1', [
      {
        violationType: 'assignment_conflict',
        ruleId: 'SLOT_CAPACITY',
        paperId: 'paper-1',
        sessionSlotId: 'slot-1',
        severity: 'critical',
        details: 'First'
      },
      {
        violationType: 'assignment_conflict',
        ruleId: 'SLOT_CAPACITY',
        paperId: 'paper-1',
        sessionSlotId: 'slot-1',
        severity: 'critical',
        details: 'Duplicate in batch'
      }
    ]);

    expect(created).toHaveLength(1);

    const createdAgain = model.createForSchedule('run-1', 'schedule-1', [
      {
        violationType: 'assignment_conflict',
        ruleId: 'SLOT_CAPACITY',
        paperId: 'paper-1',
        sessionSlotId: 'slot-1',
        severity: 'critical',
        details: 'Duplicate existing'
      },
      {
        violationType: 'preference_mismatch',
        ruleId: 'TRACK',
        paperId: 'paper-2',
        sessionSlotId: 'slot-2',
        severity: 'warning',
        details: 'New one',
        dedupKey: 'custom-key'
      }
    ]);

    expect(createdAgain).toHaveLength(1);
    expect(createdAgain[0].dedupKey).toBe('custom-key');

    const listed = model.listBySchedule('schedule-1');
    expect(listed).toHaveLength(2);
  });

  it('supports default id and time factories', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conflict-model-default-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const model = new ConflictFlagModel(repository);

    const created = model.createForSchedule('run-9', 'schedule-9', [{
      violationType: 'metadata_violation',
      ruleId: 'META',
      paperId: 'paper-9',
      severity: 'warning',
      details: 'meta issue'
    }]);

    expect(created[0].conflictFlagId).toBeTypeOf('string');
    expect(created[0].createdAt).toBeTypeOf('string');
  });
});
