export default class ScheduleGenerationEngine {
  generate({ acceptedPapers, sessionSlots }) {
    if (!acceptedPapers.length || !sessionSlots.length) {
      return { assignments: [], conflicts: [] };
    }

    const papers = [...acceptedPapers].sort((a, b) => a.paperId.localeCompare(b.paperId));
    const slots = [...sessionSlots].sort((a, b) => {
      const diff = Date.parse(a.startAt) - Date.parse(b.startAt);
      return diff === 0 ? a.sessionSlotId.localeCompare(b.sessionSlotId) : diff;
    });

    const usage = new Map();
    const assignments = [];
    const conflicts = [];

    papers.forEach((paper, index) => {
      const preferredSlots = slots.filter((slot) => slot.trackId === paper.trackId);
      const pool = preferredSlots.length > 0 ? preferredSlots : slots;

      if (preferredSlots.length === 0) {
        conflicts.push({
          violationType: 'optimization_mismatch',
          ruleId: 'TRACK_PREFERENCE',
          paperId: paper.paperId,
          severity: 'info',
          details: `Paper ${paper.paperId} was assigned without a matching track slot.`
        });
      }

      const slot = pool[index % pool.length];
      const currentCount = usage.get(slot.sessionSlotId) ?? 0;
      const nextCount = currentCount + 1;
      usage.set(slot.sessionSlotId, nextCount);

      assignments.push({
        paperId: paper.paperId,
        sessionSlotId: slot.sessionSlotId,
        orderInSlot: nextCount
      });

      if (slot.trackId !== paper.trackId) {
        conflicts.push({
          violationType: 'preference_mismatch',
          ruleId: 'TRACK_MISMATCH',
          paperId: paper.paperId,
          sessionSlotId: slot.sessionSlotId,
          severity: 'warning',
          details: `Paper ${paper.paperId} track (${paper.trackId}) differs from slot track (${slot.trackId}).`
        });
      }
    });

    slots.forEach((slot) => {
      const count = usage.get(slot.sessionSlotId) ?? 0;
      if (count > slot.capacity) {
        assignments
          .filter((assignment) => assignment.sessionSlotId === slot.sessionSlotId)
          .forEach((assignment) => {
            conflicts.push({
              violationType: 'assignment_conflict',
              ruleId: 'SLOT_CAPACITY',
              paperId: assignment.paperId,
              sessionSlotId: slot.sessionSlotId,
              severity: 'critical',
              details: `Slot ${slot.sessionSlotId} exceeds capacity ${slot.capacity}.`
            });
          });
      }
    });

    return { assignments, conflicts };
  }
}
