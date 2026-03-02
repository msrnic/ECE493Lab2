import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import ScheduleRepository from '../../../src/models/repositories/ScheduleRepository.js';
import ScheduleEditService from '../../../src/models/services/ScheduleEditService.js';

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

function createService(seed = {}, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc14-service-'));
  tempDirs.push(dir);

  const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
  repository.write({
    acceptedPapers: [],
    sessionSlots: [],
    generationRuns: [],
    generatedSchedules: [],
    sessionAssignments: [],
    conflictFlags: [],
    scheduleEditConflicts: [],
    scheduleOverrideAudits: [],
    ...seed
  });

  let idCounter = 0;
  const service = new ScheduleEditService(repository, {
    now: options.now ?? (() => '2026-03-02T10:00:00.000Z'),
    makeId: options.makeId ?? (() => `audit-${++idCounter}`)
  });

  return { repository, service };
}

function baseSeed() {
  return {
    generatedSchedules: [
      {
        scheduleId: 'schedule-1',
        runId: 'run-1',
        versionNumber: 3,
        isActive: true,
        createdAt: '2026-03-01T10:00:00.000Z',
        createdByUserId: 'admin-1'
      }
    ],
    sessionAssignments: [
      {
        assignmentId: 'session-1',
        scheduleId: 'schedule-1',
        paperId: 'paper-1',
        startTime: '2026-06-01T09:00:00.000Z',
        endTime: '2026-06-01T10:00:00.000Z',
        roomId: 'room-a'
      },
      {
        assignmentId: 'session-2',
        scheduleId: 'schedule-1',
        paperId: 'paper-2',
        startTime: '2026-06-01T10:00:00.000Z',
        endTime: '2026-06-01T11:00:00.000Z',
        roomId: 'room-a'
      }
    ]
  };
}

describe('ScheduleEditService', () => {
  it('returns null when a schedule does not exist', () => {
    const { service } = createService();
    expect(service.getSchedule('missing')).toBeNull();
  });

  it('supports constructor defaults when no options are provided', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc14-default-options-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const seed = baseSeed();
    repository.write({
      acceptedPapers: [],
      sessionSlots: [],
      generationRuns: [],
      generatedSchedules: seed.generatedSchedules,
      sessionAssignments: seed.sessionAssignments,
      conflictFlags: [],
      scheduleEditConflicts: [],
      scheduleOverrideAudits: []
    });

    const service = new ScheduleEditService(repository);
    const result = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [
        {
          sessionId: 'session-2',
          startTime: '2026-06-01T11:00:00.000Z',
          endTime: '2026-06-01T12:00:00.000Z',
          roomId: 'room-a'
        }
      ]
    });

    expect(result.status).toBe(200);
    expect(repository.read().generatedSchedules[0].updatedAt).toMatch(/T/);
  });

  it('uses default id factory when makeId option is omitted', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc14-default-id-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const seed = baseSeed();
    repository.write({
      acceptedPapers: [],
      sessionSlots: [],
      generationRuns: [],
      generatedSchedules: seed.generatedSchedules,
      sessionAssignments: seed.sessionAssignments,
      conflictFlags: [],
      scheduleEditConflicts: [],
      scheduleOverrideAudits: []
    });

    const service = new ScheduleEditService(repository, {
      now: () => '2026-03-02T10:00:00.000Z'
    });

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    const override = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'Need temporary overlap.',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    expect(override.status).toBe(200);
    expect(typeof override.body.auditEntry.auditEntryId).toBe('string');
    expect(override.body.auditEntry.auditEntryId.length).toBeGreaterThan(0);
  });

  it('handles Date-based timestamps and null array fields in repository state', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc14-date-now-'));
    tempDirs.push(dir);
    const repository = new ScheduleRepository(path.join(dir, 'schedules.json'));
    const seed = baseSeed();
    repository.write({
      acceptedPapers: [],
      sessionSlots: [],
      generationRuns: [],
      generatedSchedules: seed.generatedSchedules,
      sessionAssignments: seed.sessionAssignments,
      conflictFlags: [],
      scheduleEditConflicts: null,
      scheduleOverrideAudits: null
    });

    const service = new ScheduleEditService(repository, {
      now: () => new Date('2026-03-02T10:00:00.000Z'),
      makeId: () => 'audit-date'
    });

    const schedule = service.getSchedule('schedule-1');
    expect(schedule.conflicts).toEqual([]);

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    const override = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'Need temporary overlap.',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    expect(override.status).toBe(200);
    expect(repository.read().generatedSchedules[0].updatedAt).toBe('2026-03-02T10:00:00.000Z');
    expect(repository.read().scheduleOverrideAudits).toHaveLength(1);
  });

  it('returns enriched schedule payload including persisted conflicts', () => {
    const { service } = createService({
      ...baseSeed(),
      scheduleEditConflicts: [
        {
          conflictId: 'conflict-1',
          scheduleId: 'schedule-1',
          conflictType: 'room_collision',
          sessionIds: ['session-1', 'session-2'],
          status: 'unresolved',
          message: 'conflict'
        }
      ]
    });

    const schedule = service.getSchedule('schedule-1');
    expect(schedule.version).toBe(3);
    expect(schedule.status).toBe('draft');
    expect(schedule.sessions).toHaveLength(2);
    expect(schedule.conflicts).toHaveLength(1);
    expect(schedule.assignments).toHaveLength(2);
  });

  it('validates save request for missing schedule and invalid payloads', () => {
    const { service } = createService(baseSeed());

    expect(service.attemptSave({
      scheduleId: 'missing',
      expectedVersion: 1,
      changes: [{}]
    }).status).toBe(404);

    expect(service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 0,
      changes: [{}]
    }).status).toBe(422);

    expect(service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: []
    }).status).toBe(422);
  });

  it('returns stale response when expected version mismatches', () => {
    const { service } = createService(baseSeed());
    const result = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 2,
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T11:00:00.000Z', endTime: '2026-06-01T12:00:00.000Z', roomId: 'room-a' }]
    });

    expect(result.status).toBe(412);
    expect(result.body.code).toBe('STALE_SCHEDULE');
    expect(result.body.currentVersion).toBe(3);
  });

  it('validates session ids and time fields during save', () => {
    const { service } = createService(baseSeed());

    expect(service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ roomId: 'room-a' }]
    }).status).toBe(422);

    expect(service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'unknown', startTime: '2026-06-01T11:00:00.000Z', endTime: '2026-06-01T12:00:00.000Z', roomId: 'room-a' }]
    }).body.code).toBe('SESSION_UNAVAILABLE');

    expect(service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-1', startTime: 'bad', endTime: '2026-06-01T12:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(422);
  });

  it('returns conflict warning when save introduces overlapping room collisions', () => {
    const { service } = createService(baseSeed());
    const result = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [
        {
          sessionId: 'session-2',
          startTime: '2026-06-01T09:30:00.000Z',
          endTime: '2026-06-01T10:30:00.000Z',
          roomId: 'room-a'
        }
      ]
    });

    expect(result.status).toBe(409);
    expect(result.body.conflicts).toHaveLength(1);
    expect(result.body.warningMessage).toMatch(/override/i);
    expect(result.body.decisionToken).toBeTruthy();
  });

  it('saves non-conflicting edits and clears persisted conflicts', () => {
    const { repository, service } = createService({
      ...baseSeed(),
      scheduleEditConflicts: [
        {
          conflictId: 'stale-conflict',
          scheduleId: 'schedule-1',
          conflictType: 'room_collision',
          sessionIds: ['session-1', 'session-2'],
          status: 'unresolved',
          message: 'old'
        }
      ]
    });

    const result = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [
        {
          assignmentId: 'session-2',
          startTime: '2026-06-01T11:00:00.000Z',
          endTime: '2026-06-01T12:00:00.000Z',
          roomId: 'room-a'
        }
      ]
    });

    expect(result.status).toBe(200);
    expect(result.body.savedVersion).toBe(4);
    expect(result.body.unresolvedConflicts).toBe(0);

    const saved = repository.read();
    expect(saved.generatedSchedules[0].versionNumber).toBe(4);
    expect(saved.generatedSchedules[0].status).toBe('ready_to_publish');
    expect(saved.generatedSchedules[0].updatedBy).toBe('system-editor');
    expect(saved.scheduleEditConflicts).toHaveLength(0);
  });

  it('keeps unrelated schedule assignments unchanged during normal save persistence', () => {
    const seed = baseSeed();
    const { repository, service } = createService({
      ...seed,
      generatedSchedules: [
        ...seed.generatedSchedules,
        {
          scheduleId: 'schedule-2',
          runId: 'run-2',
          versionNumber: 1,
          isActive: false,
          createdAt: '2026-03-01T10:00:00.000Z',
          createdByUserId: 'admin-2'
        }
      ],
      sessionAssignments: [
        ...seed.sessionAssignments,
        {
          assignmentId: 'session-x',
          scheduleId: 'schedule-2',
          paperId: 'paper-x',
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T10:00:00.000Z',
          roomId: 'room-z'
        }
      ]
    });

    const saveResult = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [
        {
          sessionId: 'session-2',
          startTime: '2026-06-01T11:00:00.000Z',
          endTime: '2026-06-01T12:00:00.000Z',
          roomId: 'room-a'
        }
      ]
    });

    expect(saveResult.status).toBe(200);
    const unrelated = repository.read().sessionAssignments.find((item) => item.assignmentId === 'session-x');
    expect(unrelated.scheduleId).toBe('schedule-2');
    expect(unrelated.roomId).toBe('room-z');
  });

  it('validates override-specific inputs and stale checks', () => {
    const { service } = createService(baseSeed());

    expect(service.attemptOverrideSave({
      scheduleId: 'missing',
      expectedVersion: 1,
      decisionToken: 'x',
      reason: 'needed',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(404);

    expect(service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 0,
      decisionToken: 'x',
      reason: 'needed',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(422);

    expect(service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: 'x',
      reason: ' ',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(400);

    expect(service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: 'x',
      reason: 'needed',
      affectedConflictIds: [],
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(422);

    expect(service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 2,
      decisionToken: 'x',
      reason: 'needed',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 'session-1', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(412);

    expect(service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: 'x',
      reason: 'needed',
      affectedConflictIds: ['c1'],
      changes: [{ sessionId: 'unknown', startTime: '2026-06-01T09:00:00.000Z', endTime: '2026-06-01T10:00:00.000Z', roomId: 'room-a' }]
    }).status).toBe(412);
  });

  it('returns validation error when override has no unresolved conflicts', () => {
    const { service } = createService(baseSeed());
    const result = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: 'token',
      reason: 'needed',
      affectedConflictIds: ['conflict-1'],
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T11:00:00.000Z', endTime: '2026-06-01T12:00:00.000Z', roomId: 'room-b' }]
    });

    expect(result.status).toBe(422);
  });

  it('returns warning when override token or conflict ids are stale', () => {
    const { service } = createService(baseSeed());

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });
    expect(warning.status).toBe(409);

    const badToken = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: 'outdated-token',
      reason: 'approve',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });
    expect(badToken.status).toBe(409);

    const badIds = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'approve',
      affectedConflictIds: ['different-id'],
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });
    expect(badIds.status).toBe(409);
  });

  it('persists override save audit entries and unresolved conflicts', () => {
    const { repository, service } = createService(baseSeed());

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    const result = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'Need temporary overlap.',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }],
      editorId: 'editor-7'
    });

    expect(result.status).toBe(200);
    expect(result.body.unresolvedConflicts).toBe(1);
    expect(result.body.auditEntry.editorId).toBe('editor-7');

    const state = repository.read();
    expect(state.generatedSchedules[0].versionNumber).toBe(4);
    expect(state.generatedSchedules[0].status).toBe('conflicted');
    expect(state.scheduleEditConflicts).toHaveLength(1);
    expect(state.scheduleOverrideAudits).toHaveLength(1);
    expect(state.scheduleOverrideAudits[0].reason).toBe('Need temporary overlap.');
  });

  it('keeps unrelated schedule assignments unchanged during override persistence', () => {
    const seed = baseSeed();
    const { repository, service } = createService({
      ...seed,
      generatedSchedules: [
        {
          scheduleId: 'schedule-2',
          runId: 'run-2',
          versionNumber: 1,
          isActive: false,
          createdAt: '2026-03-01T10:00:00.000Z',
          createdByUserId: 'admin-2'
        },
        ...seed.generatedSchedules
      ],
      sessionAssignments: [
        ...seed.sessionAssignments,
        {
          assignmentId: 'session-x',
          scheduleId: 'schedule-2',
          paperId: 'paper-x',
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T10:00:00.000Z',
          roomId: 'room-z'
        }
      ]
    });

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    const override = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'Need temporary overlap.',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }],
      editorId: 'editor-7'
    });

    expect(override.status).toBe(200);
    const unrelated = repository.read().sessionAssignments.find((item) => item.assignmentId === 'session-x');
    expect(unrelated.scheduleId).toBe('schedule-2');
    expect(unrelated.roomId).toBe('room-z');
  });

  it('uses system-editor fallback for override saves when editor id is missing', () => {
    const { repository, service } = createService(baseSeed());

    const warning = service.attemptSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    const override = service.attemptOverrideSave({
      scheduleId: 'schedule-1',
      expectedVersion: 3,
      decisionToken: warning.body.decisionToken,
      reason: 'Need temporary overlap.',
      affectedConflictIds: warning.body.conflicts.map((item) => item.conflictId),
      changes: [{ sessionId: 'session-2', startTime: '2026-06-01T09:30:00.000Z', endTime: '2026-06-01T10:30:00.000Z', roomId: 'room-a' }]
    });

    expect(override.status).toBe(200);
    expect(override.body.auditEntry.editorId).toBe('system-editor');
    expect(repository.read().generatedSchedules[0].updatedBy).toBe('system-editor');
  });

  it('validates publish attempts, blocks unresolved conflicts, and publishes clean schedules', () => {
    const { repository, service } = createService({
      ...baseSeed(),
      scheduleEditConflicts: [
        {
          conflictId: 'conflict-1',
          scheduleId: 'schedule-1',
          conflictType: 'room_collision',
          sessionIds: ['session-1', 'session-2'],
          status: 'unresolved',
          message: 'conflict'
        }
      ]
    });

    expect(service.attemptPublish({
      scheduleId: 'missing',
      expectedVersion: 1
    }).status).toBe(404);

    expect(service.attemptPublish({
      scheduleId: 'schedule-1',
      expectedVersion: 0
    }).status).toBe(422);

    expect(service.attemptPublish({
      scheduleId: 'schedule-1',
      expectedVersion: 2
    }).status).toBe(412);

    const blocked = service.attemptPublish({
      scheduleId: 'schedule-1',
      expectedVersion: 3
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.unresolvedConflictCount).toBe(1);

    repository.mutate((state) => {
      state.scheduleEditConflicts = [];
      return state;
    });

    const published = service.attemptPublish({
      scheduleId: 'schedule-1',
      expectedVersion: 3
    });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');
    expect(repository.read().generatedSchedules[0].status).toBe('published');
  });
});
