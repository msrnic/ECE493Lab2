export default class GenerationPreconditionService {
  validate({ acceptedPapers, sessionSlots }) {
    if (!Array.isArray(acceptedPapers) || acceptedPapers.length === 0) {
      return {
        ok: false,
        code: 'NO_ACCEPTED_PAPERS',
        message: 'At least one accepted paper is required before generation can start.'
      };
    }

    const hasPaperMetadataIssue = acceptedPapers.some((paper) => (
      !paper.paperId
      || !paper.trackId
      || !Number.isInteger(paper.durationMinutes)
      || paper.durationMinutes <= 0
    ));

    if (hasPaperMetadataIssue) {
      return {
        ok: false,
        code: 'MISSING_PAPER_METADATA',
        message: 'Accepted papers are missing required scheduling metadata.'
      };
    }

    if (!Array.isArray(sessionSlots) || sessionSlots.length === 0) {
      return {
        ok: false,
        code: 'NO_SESSION_SLOTS',
        message: 'At least one session slot is required before generation can start.'
      };
    }

    const hasSlotMetadataIssue = sessionSlots.some((slot) => {
      if (!slot.sessionSlotId || !slot.trackId) {
        return true;
      }
      if (!Number.isInteger(slot.capacity) || slot.capacity <= 0) {
        return true;
      }
      const start = Date.parse(slot.startAt);
      const end = Date.parse(slot.endAt);
      return Number.isNaN(start) || Number.isNaN(end) || end <= start;
    });

    if (hasSlotMetadataIssue) {
      return {
        ok: false,
        code: 'MISSING_SESSION_METADATA',
        message: 'Session slots are missing required scheduling metadata.'
      };
    }

    return { ok: true };
  }
}
