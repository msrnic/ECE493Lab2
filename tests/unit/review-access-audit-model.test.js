import { describe, expect, it } from 'vitest';
import { createReviewAccessAuditModel } from '../../src/models/review-access-audit-model.js';

describe('review-access-audit-model', () => {
  it('records successful access with one-year retention metadata', () => {
    const model = createReviewAccessAuditModel({
      idFactory: () => 'audit-1'
    });

    const entry = model.recordAccess({
      editorId: 'editor-1',
      paperId: 'PAPER-1',
      accessedAt: '2026-02-08T00:00:00.000Z'
    });

    expect(entry).toEqual({
      auditId: 'audit-1',
      editorId: 'editor-1',
      paperId: 'PAPER-1',
      accessedAt: '2026-02-08T00:00:00.000Z',
      retentionUntil: '2027-02-08T00:00:00.000Z'
    });
  });

  it('lists and filters entries', () => {
    const model = createReviewAccessAuditModel({
      nowFn: () => new Date('2026-02-08T00:00:00.000Z'),
      idFactory: (() => {
        let count = 0;
        return () => `audit-${++count}`;
      })()
    });

    model.recordAccess({ editorId: 'editor-1', paperId: 'PAPER-1' });
    model.recordAccess({ editorId: 'editor-2', paperId: 'PAPER-1' });
    model.recordAccess({ editorId: 'editor-2', paperId: 'PAPER-2' });

    expect(model.listEntries()).toHaveLength(3);
    expect(model.listEntries({ editorId: 'editor-2' })).toHaveLength(2);
    expect(model.listEntries({ paperId: 'PAPER-1' })).toHaveLength(2);
    expect(model.listEntries({ editorId: 'editor-2', paperId: 'PAPER-2' })).toHaveLength(1);
  });

  it('purges expired entries based on retention window', () => {
    const model = createReviewAccessAuditModel({
      idFactory: (() => {
        let count = 0;
        return () => `audit-${++count}`;
      })()
    });

    model.recordAccess({
      editorId: 'editor-old',
      paperId: 'PAPER-OLD',
      accessedAt: '2024-02-01T00:00:00.000Z'
    });
    model.recordAccess({
      editorId: 'editor-new',
      paperId: 'PAPER-NEW',
      accessedAt: '2026-02-01T00:00:00.000Z'
    });

    const removed = model.purgeExpiredEntries({ now: '2026-02-08T00:00:00.000Z' });
    expect(removed).toBe(1);
    expect(model.listEntries()).toHaveLength(1);
    expect(model.listEntries()[0].paperId).toBe('PAPER-NEW');
  });

  it('hydrates seed entries through the same normalization path as runtime records', () => {
    const model = createReviewAccessAuditModel({
      idFactory: (() => {
        let count = 0;
        return () => `audit-seed-${++count}`;
      })(),
      seedEntries: [
        {
          editorId: 'editor-seed-1',
          paperId: 'PAPER-SEED-1',
          accessedAt: new Date('2026-02-01T00:00:00.000Z')
        },
        {
          editorId: 'editor-seed-2',
          paperId: 'PAPER-SEED-2',
          accessedAt: '2026-02-02T00:00:00.000Z'
        }
      ]
    });

    const seededEntries = model.listEntries();
    expect(seededEntries).toHaveLength(2);
    expect(seededEntries[0].accessedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(seededEntries[1].accessedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('validates audit entry input and date values', () => {
    const model = createReviewAccessAuditModel({
      idFactory: () => 'audit-valid'
    });

    expect(() => model.recordAccess({ editorId: '', paperId: 'PAPER-1' })).toThrow(/editorId must be a non-empty string/);
    expect(() => model.recordAccess({ editorId: 'editor-1', paperId: '' })).toThrow(/paperId must be a non-empty string/);
    expect(() => model.recordAccess({ editorId: 'editor-1', paperId: 'PAPER-1', accessedAt: 'bad-date' })).toThrow(
      /accessedAt must be a valid date/
    );
    const invalidIdModel = createReviewAccessAuditModel({
      idFactory: () => ''
    });
    expect(() => invalidIdModel.recordAccess({ editorId: 'editor-1', paperId: 'PAPER-1' })).toThrow(
      /auditId must be a non-empty string/
    );

    const validModel = createReviewAccessAuditModel({
      idFactory: () => 'audit-valid'
    });
    expect(() => validModel.purgeExpiredEntries({ now: 'bad-date' })).toThrow(/now must be a valid date/);
  });
});
