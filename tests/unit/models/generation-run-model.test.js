import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import GenerationRunModel from '../../../src/models/GenerationRunModel.js';
import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';

const tempDirs = [];

function setupModel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-model-'));
  tempDirs.push(dir);
  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));

  let idCounter = 0;
  let tsCounter = 0;

  return new GenerationRunModel(repository, {
    makeId: () => `run-${++idCounter}`,
    now: () => `2026-01-01T00:00:${String(tsCounter++).padStart(2, '0')}Z`
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('GenerationRunModel', () => {
  it('rejects non-admin run creation', () => {
    const model = setupModel();

    expect(() => model.createRequested({ initiatedByUserId: 'u1', initiatedByRole: 'editor' })).toThrow(
      'Only administrators can start schedule generation.'
    );
  });

  it('tracks run transitions and in-progress lock', () => {
    const model = setupModel();

    const requested = model.createRequested({ initiatedByUserId: 'admin-1', initiatedByRole: 'admin' });
    expect(model.hasInProgress()).toBe(false);

    const started = model.startRun(requested.runId);
    expect(started.status).toBe('in_progress');
    expect(model.hasInProgress()).toBe(true);

    const completed = model.completeRun(started.runId, 'schedule-1');
    expect(completed.status).toBe('completed');
    expect(completed.generatedScheduleId).toBe('schedule-1');
    expect(model.hasInProgress()).toBe(false);
  });

  it('fails runs and handles lookups', () => {
    const model = setupModel();

    const requested = model.createRequested({ initiatedByUserId: 'admin-1', initiatedByRole: 'admin' });
    model.startRun(requested.runId);
    const failed = model.failRun(requested.runId, 'Missing metadata');

    expect(failed.status).toBe('failed');
    expect(failed.failureReason).toBe('Missing metadata');
    expect(model.getById('missing')).toBeNull();
    expect(model.list()).toHaveLength(1);
  });

  it('throws on missing run and invalid transitions', () => {
    const model = setupModel();

    expect(() => model.startRun('missing')).toThrow('Generation run was not found.');

    const requested = model.createRequested({ initiatedByUserId: 'admin-1', initiatedByRole: 'admin' });
    model.startRun(requested.runId);

    expect(() => model.startRun(requested.runId)).toThrow('Cannot start run from status in_progress.');
    expect(() => model.completeRun('missing', 'schedule-x')).toThrow('Generation run was not found.');
  });

  it('supports default id and time factories', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-model-default-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const model = new GenerationRunModel(repository);

    const created = model.createRequested({ initiatedByUserId: 'admin', initiatedByRole: 'admin' });
    expect(created.runId).toBeTypeOf('string');
    expect(created.requestedAt).toBeTypeOf('string');
  });
});
