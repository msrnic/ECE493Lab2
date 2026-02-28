import { describe, expect, it } from 'vitest';
import { createPaperModel } from '../../src/models/paper-model.js';

describe('paper-model', () => {
  it('supports upsert, lookup, list, and remove operations', () => {
    const model = createPaperModel({ seedPapers: [] });

    const created = model.upsertPaper({
      paperId: 'PAPER-1',
      trackId: 'TRACK-1',
      title: 'Paper One',
      currentState: 'under_review'
    });

    expect(created.paperId).toBe('PAPER-1');
    expect(model.listPapers()).toHaveLength(1);
    expect(model.getPaperById('PAPER-1')?.title).toBe('Paper One');

    expect(model.removePaper('PAPER-1')).toBe(true);
    expect(model.removePaper('PAPER-1')).toBe(false);
    expect(model.getPaperById('PAPER-1')).toBeNull();

    const defaultStatePaper = model.upsertPaper({
      paperId: 'PAPER-2',
      trackId: 'TRACK-2',
      title: 'Paper Two'
    });
    expect(defaultStatePaper.currentState).toBe('under_review');
  });

  it('validates required fields for paper operations', () => {
    const model = createPaperModel({ seedPapers: [] });

    expect(() => model.upsertPaper({ paperId: '', trackId: 'TRACK', title: 'X', currentState: 'under_review' })).toThrow(
      /paperId must be a non-empty string/
    );
    expect(() => model.upsertPaper({ paperId: 'P', trackId: '', title: 'X', currentState: 'under_review' })).toThrow(
      /trackId must be a non-empty string/
    );
    expect(() => model.upsertPaper({ paperId: 'P', trackId: 'T', title: '', currentState: 'under_review' })).toThrow(
      /title must be a non-empty string/
    );
    expect(() => model.upsertPaper({ paperId: 'P', trackId: 'T', title: 'X', currentState: '' })).toThrow(
      /currentState must be a non-empty string/
    );

    expect(() => model.getPaperById('')).toThrow(/paperId must be a non-empty string/);
    expect(() => model.removePaper('')).toThrow(/paperId must be a non-empty string/);
  });
});
