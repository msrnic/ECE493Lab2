import { randomUUID } from 'node:crypto';

export default class SessionAssignmentModel {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.makeId = options.makeId ?? (() => randomUUID());
  }

  createForSchedule(scheduleId, assignments) {
    const paperIds = new Set();

    for (const assignment of assignments) {
      if (paperIds.has(assignment.paperId)) {
        const error = new Error(`Duplicate paper assignment for ${assignment.paperId}.`);
        error.code = 'DUPLICATE_PAPER_ASSIGNMENT';
        throw error;
      }
      paperIds.add(assignment.paperId);
    }

    let created = [];

    this.repository.mutate((data) => {
      const existingPaperIds = new Set(
        data.sessionAssignments
          .filter((item) => item.scheduleId === scheduleId)
          .map((item) => item.paperId)
      );

      for (const assignment of assignments) {
        if (existingPaperIds.has(assignment.paperId)) {
          const error = new Error(`Paper ${assignment.paperId} already exists in schedule ${scheduleId}.`);
          error.code = 'DUPLICATE_PAPER_ASSIGNMENT';
          throw error;
        }
      }

      created = assignments.map((assignment) => ({
        assignmentId: this.makeId(),
        scheduleId,
        paperId: assignment.paperId,
        sessionSlotId: assignment.sessionSlotId,
        orderInSlot: assignment.orderInSlot,
        createdAt: this.now()
      }));

      data.sessionAssignments.push(...created);
      return data;
    });

    return created;
  }

  listBySchedule(scheduleId) {
    const { sessionAssignments } = this.repository.read();
    return sessionAssignments
      .filter((item) => item.scheduleId === scheduleId)
      .sort((a, b) => {
        if (a.sessionSlotId === b.sessionSlotId) {
          return a.orderInSlot - b.orderInSlot;
        }
        return a.sessionSlotId.localeCompare(b.sessionSlotId);
      });
  }
}
