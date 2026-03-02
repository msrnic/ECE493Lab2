import { randomUUID } from 'node:crypto';

export default class GeneratedScheduleModel {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.makeId = options.makeId ?? (() => randomUUID());
  }

  createFromRun({ runId, createdByUserId, assignmentCount, conflictCount }) {
    let created;

    this.repository.mutate((data) => {
      const nextVersion = data.generatedSchedules.length === 0
        ? 1
        : Math.max(...data.generatedSchedules.map((item) => item.versionNumber)) + 1;

      data.generatedSchedules.forEach((item) => {
        item.isActive = false;
      });

      created = {
        scheduleId: this.makeId(),
        runId,
        versionNumber: nextVersion,
        isActive: true,
        createdAt: this.now(),
        createdByUserId,
        assignmentCount,
        conflictCount
      };
      data.generatedSchedules.push(created);

      return data;
    });

    return created;
  }

  updateCounts(scheduleId, assignmentCount, conflictCount) {
    let updated = null;

    this.repository.mutate((data) => {
      const schedule = data.generatedSchedules.find((item) => item.scheduleId === scheduleId);
      if (!schedule) {
        return data;
      }

      schedule.assignmentCount = assignmentCount;
      schedule.conflictCount = conflictCount;
      updated = { ...schedule };

      return data;
    });

    return updated;
  }

  list({ activeOnly = false } = {}) {
    const { generatedSchedules } = this.repository.read();
    const items = activeOnly ? generatedSchedules.filter((item) => item.isActive) : generatedSchedules;

    return [...items].sort((a, b) => b.versionNumber - a.versionNumber);
  }

  getById(scheduleId) {
    const { generatedSchedules } = this.repository.read();
    return generatedSchedules.find((item) => item.scheduleId === scheduleId) ?? null;
  }

  getByRunId(runId) {
    const { generatedSchedules } = this.repository.read();
    return generatedSchedules.find((item) => item.runId === runId) ?? null;
  }
}
