import { randomUUID } from 'node:crypto';

function toIso(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSessionId(change) {
  const fromSession = normalizeString(change?.sessionId);
  if (fromSession) {
    return fromSession;
  }
  return normalizeString(change?.assignmentId);
}

function hasValidTimes(startTime, endTime) {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

function overlaps(left, right) {
  return Date.parse(left.startTime) < Date.parse(right.endTime)
    && Date.parse(right.startTime) < Date.parse(left.endTime);
}

function buildConflictId(scheduleId, sessionIds, roomId) {
  const sorted = [...sessionIds].sort();
  return `conflict:${scheduleId}:${roomId}:${sorted.join(':')}`;
}

export default class ScheduleEditService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.makeId = options.makeId ?? (() => randomUUID());
  }

  getSchedule(scheduleId) {
    const data = this.repository.read();
    const schedule = data.generatedSchedules.find((item) => item.scheduleId === scheduleId);
    if (!schedule) {
      return null;
    }

    const assignments = this.#listAssignments(data, scheduleId);
    return {
      scheduleId: schedule.scheduleId,
      version: schedule.versionNumber,
      status: schedule.status ?? 'draft',
      sessions: this.#toSessions(assignments),
      conflicts: this.#listPersistedConflicts(data, scheduleId),
      assignments
    };
  }

  attemptSave({ scheduleId, expectedVersion, changes, editorId }) {
    const data = this.repository.read();
    const schedule = data.generatedSchedules.find((item) => item.scheduleId === scheduleId);
    if (!schedule) {
      return this.#error(404, 'NOT_FOUND', 'Schedule version not found.');
    }

    const validationError = this.#validateSaveInputs({ expectedVersion, changes });
    if (validationError) {
      return validationError;
    }

    if (schedule.versionNumber !== expectedVersion) {
      return this.#stale(schedule.versionNumber);
    }

    const assignments = this.#listAssignments(data, scheduleId);
    const applied = this.#applyChanges(assignments, changes);
    if (!applied.ok) {
      return applied.error;
    }

    const conflicts = this.#detectConflicts(scheduleId, applied.assignments);
    if (conflicts.length > 0) {
      return {
        status: 409,
        body: this.#buildWarningBody({
          scheduleId,
          expectedVersion,
          conflicts
        })
      };
    }

    const now = toIso(this.now());
    const nextVersion = schedule.versionNumber + 1;
    const actor = normalizeString(editorId) || 'system-editor';

    this.repository.mutate((state) => {
      const untouchedAssignments = state.sessionAssignments.filter((item) => item.scheduleId !== scheduleId);
      state.sessionAssignments = untouchedAssignments.concat(applied.assignments);

      const target = state.generatedSchedules.find((item) => item.scheduleId === scheduleId);
      target.versionNumber = nextVersion;
      target.status = 'ready_to_publish';
      target.updatedAt = now;
      target.updatedBy = actor;
      state.scheduleEditConflicts = normalizeArray(state.scheduleEditConflicts)
        .filter((conflict) => conflict.scheduleId !== scheduleId);
      return state;
    });

    return {
      status: 200,
      body: {
        scheduleId,
        savedVersion: nextVersion,
        unresolvedConflicts: 0,
        message: 'Schedule changes saved.'
      }
    };
  }

  attemptOverrideSave({
    scheduleId,
    expectedVersion,
    decisionToken,
    reason,
    affectedConflictIds,
    changes,
    editorId
  }) {
    const data = this.repository.read();
    const schedule = data.generatedSchedules.find((item) => item.scheduleId === scheduleId);
    if (!schedule) {
      return this.#error(404, 'NOT_FOUND', 'Schedule version not found.');
    }

    const validationError = this.#validateSaveInputs({ expectedVersion, changes });
    if (validationError) {
      return validationError;
    }

    const normalizedReason = normalizeString(reason);
    if (!normalizedReason) {
      return this.#error(400, 'INVALID_OVERRIDE_REASON', 'Override reason is required.');
    }

    if (!Array.isArray(affectedConflictIds) || affectedConflictIds.length === 0) {
      return this.#error(422, 'VALIDATION_ERROR', 'affectedConflictIds must include at least one conflict.');
    }

    if (schedule.versionNumber !== expectedVersion) {
      return this.#stale(schedule.versionNumber);
    }

    const assignments = this.#listAssignments(data, scheduleId);
    const applied = this.#applyChanges(assignments, changes);
    if (!applied.ok) {
      return applied.error;
    }

    const conflicts = this.#detectConflicts(scheduleId, applied.assignments);
    if (conflicts.length === 0) {
      return this.#error(422, 'VALIDATION_ERROR', 'No unresolved conflicts remain for override.');
    }

    const warningBody = this.#buildWarningBody({
      scheduleId,
      expectedVersion,
      conflicts
    });
    const expectedToken = warningBody.decisionToken;
    if (decisionToken !== expectedToken) {
      return {
        status: 409,
        body: warningBody
      };
    }

    const normalizedAffected = [...new Set(affectedConflictIds.map((item) => normalizeString(item)).filter(Boolean))].sort();
    const currentConflictIds = conflicts.map((conflict) => conflict.conflictId).sort();
    if (normalizedAffected.length !== currentConflictIds.length
      || normalizedAffected.some((id, index) => id !== currentConflictIds[index])) {
      return {
        status: 409,
        body: warningBody
      };
    }

    const now = toIso(this.now());
    const nextVersion = schedule.versionNumber + 1;
    const actor = normalizeString(editorId) || 'system-editor';
    const auditEntry = {
      auditEntryId: this.makeId(),
      editorId: actor,
      createdAt: now,
      reason: normalizedReason,
      affectedConflictIds: currentConflictIds
    };

    this.repository.mutate((state) => {
      const untouchedAssignments = state.sessionAssignments.filter((item) => item.scheduleId !== scheduleId);
      state.sessionAssignments = untouchedAssignments.concat(applied.assignments);

      const target = state.generatedSchedules.find((item) => item.scheduleId === scheduleId);
      target.versionNumber = nextVersion;
      target.status = 'conflicted';
      target.updatedAt = now;
      target.updatedBy = actor;

      const persistedConflicts = conflicts.map((conflict) => ({
        ...conflict,
        status: 'unresolved',
        detectedAt: now,
        lastUpdatedAt: now
      }));

      state.scheduleEditConflicts = normalizeArray(state.scheduleEditConflicts)
        .filter((conflict) => conflict.scheduleId !== scheduleId)
        .concat(persistedConflicts);

      state.scheduleOverrideAudits = normalizeArray(state.scheduleOverrideAudits)
        .concat({
          ...auditEntry,
          scheduleId,
          saveAttemptId: this.makeId(),
          savedVersion: nextVersion
        });

      return state;
    });

    return {
      status: 200,
      body: {
        scheduleId,
        savedVersion: nextVersion,
        unresolvedConflicts: conflicts.length,
        auditEntry
      }
    };
  }

  attemptPublish({ scheduleId, expectedVersion }) {
    const data = this.repository.read();
    const schedule = data.generatedSchedules.find((item) => item.scheduleId === scheduleId);
    if (!schedule) {
      return this.#error(404, 'NOT_FOUND', 'Schedule version not found.');
    }

    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return this.#error(422, 'VALIDATION_ERROR', 'expectedVersion must be an integer >= 1.');
    }

    if (schedule.versionNumber !== expectedVersion) {
      return this.#stale(schedule.versionNumber);
    }

    const unresolvedConflictCount = this.#listPersistedConflicts(data, scheduleId)
      .filter((conflict) => conflict.status === 'unresolved')
      .length;

    if (unresolvedConflictCount > 0) {
      return {
        status: 409,
        body: {
          code: 'UNRESOLVED_CONFLICTS',
          unresolvedConflictCount,
          message: 'Resolve all conflicts before publish.'
        }
      };
    }

    this.repository.mutate((state) => {
      const target = state.generatedSchedules.find((item) => item.scheduleId === scheduleId);
      target.status = 'published';
      target.updatedAt = toIso(this.now());
      return state;
    });

    return {
      status: 200,
      body: {
        scheduleId,
        publishedVersion: schedule.versionNumber,
        status: 'published'
      }
    };
  }

  #listAssignments(data, scheduleId) {
    return normalizeArray(data.sessionAssignments)
      .filter((item) => item.scheduleId === scheduleId)
      .sort((left, right) => left.assignmentId.localeCompare(right.assignmentId))
      .map((item) => ({ ...item }));
  }

  #toSessions(assignments) {
    return assignments.map((assignment) => ({
      sessionId: assignment.assignmentId,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      roomId: assignment.roomId,
      title: assignment.title ?? assignment.paperId
    }));
  }

  #listPersistedConflicts(data, scheduleId) {
    return normalizeArray(data.scheduleEditConflicts)
      .filter((item) => item.scheduleId === scheduleId)
      .map((item) => ({ ...item }));
  }

  #validateSaveInputs({ expectedVersion, changes }) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return this.#error(422, 'VALIDATION_ERROR', 'expectedVersion must be an integer >= 1.');
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return this.#error(422, 'VALIDATION_ERROR', 'changes must include at least one item.');
    }

    return null;
  }

  #applyChanges(assignments, changes) {
    const updated = assignments.map((assignment) => ({ ...assignment }));
    const byId = new Map(updated.map((assignment) => [assignment.assignmentId, assignment]));

    for (const change of changes) {
      const sessionId = normalizeSessionId(change);
      if (!sessionId) {
        return {
          ok: false,
          error: this.#error(422, 'VALIDATION_ERROR', 'Each change must include sessionId.')
        };
      }

      const current = byId.get(sessionId);
      if (!current) {
        return {
          ok: false,
          error: {
            status: 412,
            body: {
              code: 'SESSION_UNAVAILABLE',
              currentVersion: 0,
              message: `Session ${sessionId} is no longer available.`
            }
          }
        };
      }

      const nextStartTime = normalizeString(change.startTime);
      const nextEndTime = normalizeString(change.endTime);
      const nextRoomId = normalizeString(change.roomId);

      if (!nextStartTime || !nextEndTime || !nextRoomId || !hasValidTimes(nextStartTime, nextEndTime)) {
        return {
          ok: false,
          error: this.#error(422, 'VALIDATION_ERROR', 'Each change must include valid startTime, endTime, and roomId.')
        };
      }

      current.startTime = nextStartTime;
      current.endTime = nextEndTime;
      current.roomId = nextRoomId;
      const nextTitle = normalizeString(change.title);
      current.title = nextTitle || current.title || current.paperId;
    }

    return {
      ok: true,
      assignments: updated
    };
  }

  #detectConflicts(scheduleId, assignments) {
    const conflicts = [];

    for (let index = 0; index < assignments.length; index += 1) {
      for (let peerIndex = index + 1; peerIndex < assignments.length; peerIndex += 1) {
        const left = assignments[index];
        const right = assignments[peerIndex];

        if (left.roomId !== right.roomId) {
          continue;
        }

        if (!overlaps(left, right)) {
          continue;
        }

        const sessionIds = [left.assignmentId, right.assignmentId];
        conflicts.push({
          conflictId: buildConflictId(scheduleId, sessionIds, left.roomId),
          scheduleId,
          conflictType: 'room_collision',
          sessionIds,
          status: 'unresolved',
          message: `Room ${left.roomId} has overlapping sessions.`
        });
      }
    }

    return conflicts;
  }

  #buildWarningBody({ scheduleId, expectedVersion, conflicts }) {
    const fingerprint = `${scheduleId}:${expectedVersion}:${conflicts.map((item) => item.conflictId).sort().join('|')}`;

    return {
      scheduleId,
      expectedVersion,
      decisionToken: Buffer.from(fingerprint, 'utf8').toString('base64url'),
      conflicts,
      warningMessage: 'Unresolved conflicts detected. Confirm override to continue.'
    };
  }

  #stale(currentVersion) {
    return {
      status: 412,
      body: {
        code: 'STALE_SCHEDULE',
        currentVersion,
        message: 'Schedule changed. Reload and reapply unsaved edits.'
      }
    };
  }

  #error(status, code, message) {
    return {
      status,
      body: {
        code,
        message
      }
    };
  }
}
