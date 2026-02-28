import { describe, expect, it } from 'vitest';
import { createPaperSubmissionModel } from '../../../src/models/PaperSubmissionModel.js';

describe('PaperSubmissionModel', () => {
  it('lists only submitted papers and returns paper by id', () => {
    const model = createPaperSubmissionModel();
    const papers = model.listSubmittedPapers();
    expect(papers.every((paper) => paper.state === 'submitted')).toBe(true);
    expect(model.getPaperById('paper-001')?.paperId).toBe('paper-001');
    expect(model.getPaperById('missing')).toBeNull();
  });

  it('validates assignability and state transitions', () => {
    const model = createPaperSubmissionModel();
    expect(model.assertPaperIsAssignable('paper-001').paperId).toBe('paper-001');
    expect(() => model.assertPaperIsAssignable('paper-003')).toThrow(/no longer assignable/);
    expect(() => model.assertPaperIsAssignable('missing')).toThrow(/not found/);

    const updated = model.updatePaperState('paper-002', 'withdrawn');
    expect(updated.state).toBe('withdrawn');
    expect(() => model.updatePaperState('missing', 'submitted')).toThrow(/not found/);
  });

  it('increments assignment versions', () => {
    const model = createPaperSubmissionModel();
    expect(model.incrementAssignmentVersion('paper-001')).toBe(1);
    expect(model.incrementAssignmentVersion('paper-001')).toBe(2);
    expect(() => model.incrementAssignmentVersion('missing')).toThrow(/not found/);
  });
});
