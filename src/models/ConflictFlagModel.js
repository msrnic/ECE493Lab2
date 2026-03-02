import { randomUUID } from 'node:crypto';

export function buildDedupKey(conflict) {
  return [
    conflict.violationType,
    conflict.paperId,
    conflict.sessionSlotId ?? 'none',
    conflict.ruleId
  ].join(':');
}

export default class ConflictFlagModel {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.makeId = options.makeId ?? (() => randomUUID());
  }

  createForSchedule(runId, scheduleId, conflicts) {
    let created = [];

    this.repository.mutate((data) => {
      const existingForRun = new Set(
        data.conflictFlags.filter((item) => item.runId === runId).map((item) => item.dedupKey)
      );
      const batchKeys = new Set();

      created = conflicts
        .map((conflict) => {
          const dedupKey = conflict.dedupKey ?? buildDedupKey(conflict);
          return {
            conflictFlagId: this.makeId(),
            runId,
            scheduleId,
            violationType: conflict.violationType,
            ruleId: conflict.ruleId,
            paperId: conflict.paperId,
            sessionSlotId: conflict.sessionSlotId,
            severity: conflict.severity,
            details: conflict.details,
            dedupKey,
            createdAt: this.now()
          };
        })
        .filter((item) => {
          if (existingForRun.has(item.dedupKey) || batchKeys.has(item.dedupKey)) {
            return false;
          }
          batchKeys.add(item.dedupKey);
          return true;
        });

      data.conflictFlags.push(...created);
      return data;
    });

    return created;
  }

  listBySchedule(scheduleId) {
    const { conflictFlags } = this.repository.read();
    return conflictFlags.filter((item) => item.scheduleId === scheduleId);
  }
}
